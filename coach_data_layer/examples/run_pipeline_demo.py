"""
run_pipeline_demo.py — recap -> debate -> conclusion over the sample FactPack.

    cd coach_data_layer
    python examples/run_pipeline_demo.py            # offline: prints the prompts
    python examples/run_pipeline_demo.py --live     # uses Claude + Ollama (needs setup)

Offline (default) uses EchoLLM, so it prints the EXACT prompt each agent receives.
--live wires the reasoning-heavy conclusion to Claude (needs ANTHROPIC_API_KEY)
and the bulk stages to a local Ollama model (needs Ollama running).
"""

import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from coachdata import factpack, benchmarks            # noqa: E402
from coachdata.agents import pipeline                 # noqa: E402
from coachdata.agents.llm import make_llm             # noqa: E402


def load(p):
    with open(os.path.join(ROOT, p)) as f:
        return json.load(f)


def main():
    live = "--live" in sys.argv
    match = load("data/samples/match.sample.json")
    timeline = load("data/samples/timeline.sample.json")
    table = benchmarks.load_table(os.path.join(ROOT, "data/benchmarks/benchmarks.sample.json"))

    pack = factpack.build_fact_pack(
        match, timeline, puuid="PUUID_PLAYER_JINX", rank="DIAMOND",
        benchmark_table=table)

    if live:
        llms = {
            "recap": make_llm("ollama", model="qwen2.5:7b"),
            "debate": make_llm("ollama", model="qwen2.5:7b"),
            "conclusion": make_llm("claude"),   # reasoning-heavy
        }
        result = pipeline.run_pipeline(pack, llms=llms, debate_rounds=2)
    else:
        result = pipeline.run_pipeline(pack, debate_rounds=2)  # EchoLLM default

    print(f"providers: {result['providers']}\n")
    print("=" * 70, "\nRECAP\n", "=" * 70, sep="")
    print(result["recap"])
    print("\n", "=" * 70, "\nDEBATE\n", "=" * 70, sep="")
    for t in result["debate"]:
        print(f"\n[{t['speaker'].upper()}] {t['text']}")
    print("\n", "=" * 70, "\nCONCLUSION\n", "=" * 70, sep="")
    print(result["conclusion"])


if __name__ == "__main__":
    main()
