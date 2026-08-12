# Nova Voice I/O — Installation & Model Setup

## 1. Python dependencies

```bash
# Linux: PortAudio headers are required before pyaudio
sudo apt-get install -y portaudio19-dev espeak-ng libsndfile1

pip install -r requirements.txt
```

macOS:
```bash
brew install portaudio libsndfile espeak
pip install -r requirements.txt
```

---

## 2. STT — faster-whisper model

Models are downloaded automatically on first use from Hugging Face.
To pre-download them explicitly:

```bash
# "base" (74 M params, ~150 MB) — good balance of speed/accuracy
python - <<'EOF'
from faster_whisper import WhisperModel
WhisperModel("base", device="cpu", compute_type="int8")   # downloads & caches
print("Whisper base model ready.")
EOF
```

Available sizes: `tiny`, `base`, `small`, `medium`, `large-v3`
GPU users: set `whisper_device="cuda"` and `whisper_compute_type="float16"`.

---

## 3. Wake-word — openwakeword

Built-in models (alexa, hey_mycroft, hey_rhasspy) are downloaded
automatically. For the **"nova"** wake-word you need a custom model:

### 3a. Train a custom "Nova" model (free, ~30 min on Colab)

```bash
pip install openwakeword-train

# Generate 5 000 synthetic positives + negatives and train
owwt generate --word "nova" --language fr --samples 5000 --out data/nova/
owwt train --data data/nova/ --out models/nova.onnx
```

Or use the official Google Colab notebook:
https://colab.research.google.com/drive/1q1oe2zOyZp7UsB3jJiQ1IFn8z5YfjwEb

### 3b. Point VoiceIO at the model

```python
voice = VoiceIO({
    "wake_word_model_path": "models/nova.onnx",
    "wake_word_threshold": 0.5,   # lower → more sensitive, more false positives
})
```

---

## 4. TTS — piper (optional, recommended for voice quality)

piper is a standalone binary, not a Python package.

### Linux x86-64

```bash
VERSION="2023.11.14-2"
wget "https://github.com/rhasspy/piper/releases/download/${VERSION}/piper_linux_x86_64.tar.gz"
tar -xzf piper_linux_x86_64.tar.gz -C /usr/local/
export PATH="$PATH:/usr/local/piper"
```

### Download a voice model

```bash
mkdir -p models
# French (Siwis, medium quality)
wget -P models/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"
wget -P models/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json"

# English (lessac, high quality)
wget -P models/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx"
wget -P models/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json"
```

### Test piper

```bash
echo "Bonjour, je suis Nova." | \
  piper --model models/fr_FR-siwis-medium.onnx --output_file /tmp/test.wav && \
  aplay /tmp/test.wav
```

### Configure VoiceIO

```python
voice = VoiceIO({
    "piper_model_path": "models/fr_FR-siwis-medium.onnx",
    "piper_binary": "piper",   # or absolute path
})
```

If piper is absent or `piper_model_path` is not set, Nova falls back
automatically to **pyttsx3** (no setup required).

---

## 5. Quick smoke-test (no microphone needed)

```python
# Verify the module imports cleanly — no audio hardware required
import nova.io.voice as v
print("VoiceIO class:", v.VoiceIO)
print("MicrophoneNotFoundError:", v.MicrophoneNotFoundError)
print("Import OK — no crash even without a microphone.")
```

---

## 6. Run the demo

```bash
python -m nova.io.voice
# or
python nova/io/voice.py
```

Say the wake-word → speak a sentence → Nova repeats it via TTS.
