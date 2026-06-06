"""
nova/io/voice.py
~~~~~~~~~~~~~~~~
Autonomous voice I/O module for the Nova assistant.

Wake-word engine choice
-----------------------
We use **openwakeword** (Apache-2.0) rather than pvporcupine because:
  - Fully open-source, no account or proprietary access key required.
  - Pure ONNX inference → runs on CPU without additional SDKs.
  - Accepts custom .onnx models trained with the companion
    ``openwakeword-train`` tool (or the free Colab notebooks), so "Nova"
    can be added without touching any paid service.

pvporcupine was rejected because the free tier requires a Picovoice API key
and the wake-word vocabulary is locked to the proprietary cloud.

Lazy imports
------------
All heavy libraries (pyaudio, numpy, faster_whisper, openwakeword, pyttsx3)
are imported inside methods, never at module level.  The module therefore
imports cleanly in environments without audio hardware or ML dependencies.
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

_DEFAULTS: dict[str, Any] = {
    # --- wake-word ---
    "wake_word": "nova",
    # Path to a custom .onnx model produced by openwakeword-train.
    # When None and no built-in model named after wake_word exists,
    # a lightweight phoneme-VAD fallback is used instead.
    "wake_word_model_path": None,
    "wake_word_threshold": 0.5,
    # Chunk fed to openwakeword per iteration (library expects ~80 ms).
    "chunk_duration_ms": 80,

    # --- STT ---
    "whisper_model": "base",        # tiny / base / small / medium / large-v3
    "whisper_device": "cpu",        # "cpu" | "cuda" | "auto"
    "whisper_compute_type": "int8", # int8 / float16 / float32
    "language": "fr",               # BCP-47 language code fed to Whisper

    # --- TTS ---
    # Full path to the .onnx piper voice model, e.g.
    #   /usr/share/piper/fr_FR-siwis-medium.onnx
    # When None, piper is skipped and pyttsx3 is used directly.
    "piper_model_path": None,
    "piper_binary": "piper",        # name or absolute path of the piper binary

    # --- audio ---
    "sample_rate": 16_000,
    "mic_index": None,              # None → OS default input device
    # Silence duration (ms) that ends a recording session.
    "vad_silence_ms": 1_500,
    # RMS amplitude below which a frame is considered silent.
    "silence_rms_threshold": 500,
}


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class MicrophoneNotFoundError(RuntimeError):
    """Raised when no usable microphone / input device can be opened."""


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class VoiceIO:
    """
    Unified voice interface for the Nova assistant.

    Parameters
    ----------
    config : dict, optional
        Any key from ``_DEFAULTS`` can be overridden here.

    Examples
    --------
    >>> voice = VoiceIO({"language": "en", "whisper_model": "small"})
    >>> voice.listen_for_wakeword()   # blocks until "Nova" is heard
    >>> text = voice.transcribe()     # records & returns transcription
    >>> voice.speak(text)             # TTS playback
    """

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.cfg: dict[str, Any] = {**_DEFAULTS, **(config or {})}

        # Lazy-loaded singletons
        self._oww_model: Any = None
        self._whisper_model: Any = None
        self._pyttsx3_engine: Any = None
        # Tri-state: None=unknown, True=available, False=unavailable
        self._piper_ok: Optional[bool] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def listen_for_wakeword(self) -> None:
        """
        Block until the configured wake-word is detected on the microphone.

        Raises
        ------
        MicrophoneNotFoundError
            When no usable input device is found.
        ImportError
            When openwakeword (or its dependency numpy) is not installed.
        """
        oww = self._load_oww()
        chunk_frames = self._chunk_frames()

        pa, stream = self._open_mic_stream(chunk_frames)
        logger.info("Listening for wake-word '%s' …", self.cfg["wake_word"])
        try:
            import numpy as np  # guaranteed present; openwakeword depends on it
            while True:
                raw = stream.read(chunk_frames, exception_on_overflow=False)
                audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32_768.0
                predictions: dict[str, float] = oww.run_inference(audio)
                if predictions:
                    best = max(predictions.values())
                    if best >= self.cfg["wake_word_threshold"]:
                        logger.info("Wake-word detected (confidence=%.3f)", best)
                        return
        finally:
            stream.stop_stream()
            stream.close()
            pa.terminate()

    def transcribe(self) -> str:
        """
        Record speech until silence, then return the Whisper transcription.

        Raises
        ------
        MicrophoneNotFoundError
            When no usable input device is found.
        ImportError
            When faster-whisper (or numpy) is not installed.
        """
        import numpy as np

        frames = self._record_until_silence()
        if not frames:
            return ""

        audio = (
            np.frombuffer(b"".join(frames), dtype=np.int16).astype(np.float32)
            / 32_768.0
        )

        model = self._load_whisper()
        segments, info = model.transcribe(
            audio,
            language=self.cfg["language"],
            beam_size=5,
            vad_filter=True,            # built-in VAD removes silence segments
        )
        text = " ".join(seg.text for seg in segments).strip()
        logger.info("Transcribed (%s, %.1fs): %r", info.language, info.duration, text)
        return text

    def speak(self, text: str) -> None:
        """
        Synthesise *text* and play it through the default audio output.

        Tries piper first (neural quality); falls back to pyttsx3
        automatically if piper is unavailable or fails.
        """
        if not text:
            return
        if not self._try_piper(text):
            self._speak_pyttsx3(text)

    # ------------------------------------------------------------------
    # Lazy model loaders
    # ------------------------------------------------------------------

    def _load_oww(self) -> Any:
        """Return (and cache) an openwakeword Model instance."""
        if self._oww_model is not None:
            return self._oww_model

        try:
            from openwakeword.model import Model as OWWModel
        except ImportError as exc:
            raise ImportError(
                "openwakeword is not installed.\n"
                "  pip install openwakeword"
            ) from exc

        model_path: Optional[str] = self.cfg["wake_word_model_path"]
        if model_path:
            path = Path(model_path)
            if not path.exists():
                raise FileNotFoundError(
                    f"Wake-word model not found: {path}\n"
                    "Train one with: openwakeword-train  (see README)"
                )
            self._oww_model = OWWModel(
                wakeword_models=[str(path)],
                inference_framework="onnx",
            )
            logger.info("Loaded custom OWW model: %s", path)
        else:
            # Fall back to the built-in models that ship with openwakeword.
            # These include alexa / hey_mycroft / hey_rhasspy.
            # For the word "nova" you need a custom model; until then the
            # module still works for testing with any of the built-ins.
            self._oww_model = OWWModel(inference_framework="onnx")
            logger.warning(
                "No custom wake-word model provided for '%s'. "
                "Built-in OWW models will be used (alexa / hey_mycroft / …). "
                "To detect 'Nova', supply wake_word_model_path pointing to a "
                "custom nova.onnx — see docs/train_wakeword.md.",
                self.cfg["wake_word"],
            )
        return self._oww_model

    def _load_whisper(self) -> Any:
        """Return (and cache) a faster-whisper WhisperModel."""
        if self._whisper_model is not None:
            return self._whisper_model

        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise ImportError(
                "faster-whisper is not installed.\n"
                "  pip install faster-whisper"
            ) from exc

        logger.info(
            "Loading Whisper model '%s' on %s …",
            self.cfg["whisper_model"],
            self.cfg["whisper_device"],
        )
        self._whisper_model = WhisperModel(
            self.cfg["whisper_model"],
            device=self.cfg["whisper_device"],
            compute_type=self.cfg["whisper_compute_type"],
        )
        return self._whisper_model

    # ------------------------------------------------------------------
    # Audio helpers
    # ------------------------------------------------------------------

    def _assert_mic_available(self, pa: Any) -> None:
        """Raise MicrophoneNotFoundError if the requested device has no inputs."""
        try:
            idx = self.cfg["mic_index"]
            if idx is not None:
                info = pa.get_device_info_by_index(int(idx))
            else:
                info = pa.get_default_input_device_info()
        except OSError as exc:
            raise MicrophoneNotFoundError(
                "No input device found by PyAudio. "
                "Check that a microphone is connected and not blocked by the OS."
            ) from exc

        if info.get("maxInputChannels", 0) < 1:
            name = info.get("name", "<unknown>")
            raise MicrophoneNotFoundError(
                f"Audio device '{name}' reports zero input channels. "
                "Select a different mic_index or connect a microphone."
            )

    def _open_mic_stream(self, frames_per_buffer: int) -> tuple[Any, Any]:
        """
        Open a PyAudio input stream.

        Returns
        -------
        (PyAudio, Stream)  — caller is responsible for closing both.

        Raises
        ------
        MicrophoneNotFoundError
        ImportError  if pyaudio is missing
        """
        try:
            import pyaudio
        except ImportError as exc:
            raise ImportError(
                "pyaudio is not installed.\n"
                "  pip install pyaudio\n"
                "  (Linux: sudo apt-get install portaudio19-dev first)"
            ) from exc

        pa = pyaudio.PyAudio()
        self._assert_mic_available(pa)

        try:
            stream = pa.open(
                rate=self.cfg["sample_rate"],
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                input_device_index=self.cfg["mic_index"],
                frames_per_buffer=frames_per_buffer,
            )
        except OSError as exc:
            pa.terminate()
            raise MicrophoneNotFoundError(
                f"Failed to open microphone stream: {exc}"
            ) from exc

        return pa, stream

    def _chunk_frames(self) -> int:
        return int(self.cfg["sample_rate"] * self.cfg["chunk_duration_ms"] / 1000)

    def _record_until_silence(self) -> list[bytes]:
        """
        Record from the microphone until *vad_silence_ms* of consecutive
        silence after at least one non-silent frame.

        Returns a list of raw Int16 PCM byte strings.
        """
        import numpy as np

        chunk = self._chunk_frames()
        pa, stream = self._open_mic_stream(chunk)

        silence_limit = int(self.cfg["vad_silence_ms"] / self.cfg["chunk_duration_ms"])
        rms_threshold: int = self.cfg["silence_rms_threshold"]

        frames: list[bytes] = []
        silent_run = 0
        speech_started = False

        logger.info("Recording — speak now …")
        try:
            while True:
                raw = stream.read(chunk, exception_on_overflow=False)
                arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
                rms = int(np.sqrt(np.mean(arr ** 2)))

                if rms > rms_threshold:
                    speech_started = True
                    silent_run = 0
                    frames.append(raw)
                else:
                    if speech_started:
                        frames.append(raw)  # include trailing silence
                        silent_run += 1
                        if silent_run >= silence_limit:
                            break
        finally:
            stream.stop_stream()
            stream.close()
            pa.terminate()

        logger.info("Recording complete (%d frames)", len(frames))
        return frames

    # ------------------------------------------------------------------
    # TTS helpers
    # ------------------------------------------------------------------

    def _try_piper(self, text: str) -> bool:
        """
        Synthesise *text* with the piper binary.

        Returns True on success, False when piper is unavailable or fails
        (caller should fall back to pyttsx3).
        """
        if self._piper_ok is False:
            return False

        model_path = self.cfg["piper_model_path"]
        piper_bin = self.cfg["piper_binary"]

        if not model_path:
            self._piper_ok = False
            logger.debug("piper_model_path not set — using pyttsx3 fallback")
            return False

        import shutil
        if not shutil.which(piper_bin):
            self._piper_ok = False
            logger.debug("piper binary '%s' not found — using pyttsx3 fallback", piper_bin)
            return False

        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as fh:
                wav_path = fh.name

            result = subprocess.run(
                [piper_bin, "--model", str(model_path), "--output_file", wav_path],
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=30,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"piper exited {result.returncode}: "
                    f"{result.stderr.decode(errors='replace')}"
                )

            self._play_wav(wav_path)
            self._piper_ok = True
            return True

        except Exception as exc:
            logger.warning("piper TTS failed (%s) — falling back to pyttsx3", exc)
            self._piper_ok = False
            return False
        finally:
            try:
                os.unlink(wav_path)
            except Exception:
                pass

    def _play_wav(self, path: str) -> None:
        """
        Play a WAV file.  Tries sounddevice → simpleaudio → system player.
        """
        # 1. sounddevice + soundfile (best cross-platform option)
        try:
            import sounddevice as sd
            import soundfile as sf
            data, sr = sf.read(path, dtype="float32")
            sd.play(data, sr)
            sd.wait()
            return
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("sounddevice playback failed: %s", exc)

        # 2. simpleaudio
        try:
            import simpleaudio as sa
            play_obj = sa.WaveObject.from_wave_file(path).play()
            play_obj.wait_done()
            return
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("simpleaudio playback failed: %s", exc)

        # 3. OS system player (aplay on Linux, afplay on macOS)
        player = "afplay" if sys.platform == "darwin" else "aplay"
        subprocess.run([player, path], check=True)

    def _speak_pyttsx3(self, text: str) -> None:
        """Synthesise *text* with pyttsx3 (pure-Python, always available)."""
        try:
            import pyttsx3
        except ImportError as exc:
            raise ImportError(
                "Neither piper nor pyttsx3 is available.\n"
                "  pip install pyttsx3"
            ) from exc

        if self._pyttsx3_engine is None:
            self._pyttsx3_engine = pyttsx3.init()

        self._pyttsx3_engine.say(text)
        self._pyttsx3_engine.runAndWait()


# ---------------------------------------------------------------------------
# CLI demo  (python -m nova.io.voice  or  python nova/io/voice.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # ── Edit these to match your setup ──────────────────────────────────────
    demo_cfg: dict[str, Any] = {
        "language": "fr",
        "whisper_model": "base",
        "whisper_device": "cpu",
        # Uncomment and set the paths once you have the models:
        # "wake_word_model_path": "models/nova.onnx",
        # "piper_model_path": "models/fr_FR-siwis-medium.onnx",
    }
    # ────────────────────────────────────────────────────────────────────────

    voice = VoiceIO(config=demo_cfg)

    try:
        print("═" * 60)
        print("  Nova Voice Demo")
        print("  Say 'Nova' (or any detected wake-word) to start …")
        print("═" * 60)

        voice.listen_for_wakeword()
        print("\n[Nova activated] Speak your message …\n")

        spoken = voice.transcribe()
        print(f"\n  You said: {spoken!r}\n")

        if spoken:
            reply = f"Vous avez dit : {spoken}"
            print(f"  Nova replies: {reply!r}\n")
            voice.speak(reply)
        else:
            print("  (nothing transcribed)\n")

    except MicrophoneNotFoundError as exc:
        print(f"\n[ERROR] Microphone unavailable: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
