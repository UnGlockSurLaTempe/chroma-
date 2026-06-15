"""
pipeline.py — orchestrate the agents over a FactPack.

Flow (matches the existing design: recap -> debate -> conclusion):

    FactPack
       │
       ├─ recap         (cheap model)  -> factual recap
       ├─ debate        (cheap models) -> N rounds, expert vs OTP, alternating
       └─ conclusion    (Claude)       -> prioritized coaching plan

Each stage can use a different LLM adapter — that's the whole point: bulk work on
a local 7B/14B, the reasoning-heavy synthesis on Claude. Pass an `llms` dict:

    {"recap": ollama, "debate": ollama, "conclusion": claude}

Missing keys fall back to `default`. With everything set to EchoLLM, the pipeline
runs fully offline and returns the assembled prompts — useful for inspection.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from . import prompts
from .llm import EchoLLM


def _llm_for(stage: str, llms: Dict[str, Any], default: Any):
    return llms.get(stage, default)


def run_debate(pack: Dict[str, Any], llm, rounds: int = 2,
               first: str = "expert") -> List[Dict[str, str]]:
    """Alternate expert/OTP for `rounds` turns each. Returns the transcript."""
    transcript: List[Dict[str, str]] = []
    order = [first, "otp" if first == "expert" else "expert"]

    # Opening statements.
    for speaker in order:
        spec = prompts.build_debate_opening(pack, speaker)
        transcript.append({"speaker": speaker, "text": llm.generate(spec)})

    # Subsequent rebuttal rounds.
    for _ in range(max(0, rounds - 1)):
        for speaker in order:
            spec = prompts.build_debate_reply(pack, speaker, transcript)
            transcript.append({"speaker": speaker, "text": llm.generate(spec)})
    return transcript


def run_pipeline(pack: Dict[str, Any], *, llms: Optional[Dict[str, Any]] = None,
                 default: Any = None, debate_rounds: int = 2) -> Dict[str, Any]:
    """Run recap -> debate -> conclusion and return all stage outputs.

    Returns:
        {
          "recap": str,
          "debate": [{"speaker", "text"}, ...],
          "conclusion": str,
          "providers": {"recap": "...", "debate": "...", "conclusion": "..."},
        }
    """
    default = default or EchoLLM()
    llms = llms or {}

    recap_llm = _llm_for("recap", llms, default)
    debate_llm = _llm_for("debate", llms, default)
    concl_llm = _llm_for("conclusion", llms, default)

    recap = recap_llm.generate(prompts.build_recap(pack))
    debate = run_debate(pack, debate_llm, rounds=debate_rounds)
    conclusion = concl_llm.generate(prompts.build_conclusion(pack, recap, debate))

    return {
        "recap": recap,
        "debate": debate,
        "conclusion": conclusion,
        "providers": {
            "recap": getattr(recap_llm, "name", "?"),
            "debate": getattr(debate_llm, "name", "?"),
            "conclusion": getattr(concl_llm, "name", "?"),
        },
    }
