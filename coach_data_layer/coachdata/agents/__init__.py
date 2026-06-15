"""
agents — wire the FactPack into the coaching agents.

    from coachdata.agents import prompts, pipeline
    from coachdata.agents.llm import make_llm

    llms = {
        "recap":      make_llm("ollama", model="qwen2.5:7b"),
        "debate":     make_llm("ollama", model="qwen2.5:7b"),
        "conclusion": make_llm("claude"),   # reasoning-heavy -> Claude
    }
    result = pipeline.run_pipeline(factpack, llms=llms)

Use make_llm("echo") (the default) to run offline and inspect the exact prompts
each agent receives.
"""

from . import pipeline, prompts  # noqa: F401

__all__ = ["pipeline", "prompts"]
