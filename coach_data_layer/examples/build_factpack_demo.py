"""
build_factpack_demo.py — end-to-end demo, runnable offline with the sample data.

    cd coach_data_layer
    python examples/build_factpack_demo.py

It loads the sample match + timeline, builds a FactPack (benchmarks + RAG, no
Data Dragon since this sandbox can't download it), and prints the parts your
agents would actually read.
"""

import json
import os
import sys

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, ROOT)

from coachdata import factpack, benchmarks, ddragon          # noqa: E402
from coachdata.rag.store import KnowledgeBase                 # noqa: E402
from coachdata.rag.ingest import ingest_dir                   # noqa: E402


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


def main():
    match = load("data/samples/match.sample.json")
    timeline = load("data/samples/timeline.sample.json")
    table = benchmarks.load_table(
        os.path.join(ROOT, "data/benchmarks/benchmarks.sample.json"))

    # Optional: Data Dragon grounding (None here — run ddragon.fetch_ddragon on
    # a machine with internet, then ddragon.load_latest_local("./ddragon_cache")).
    dd = ddragon.load_latest_local(os.path.join(ROOT, "ddragon_cache"))

    # Optional: RAG knowledge base (keyword backend unless chromadb is installed).
    kb = KnowledgeBase()
    n = ingest_dir(kb, os.path.join(ROOT, "data/knowledge"))
    print(f"[rag] backend={kb.backend_name}, ingested {n} chunks\n")

    pack = factpack.build_fact_pack(
        match, timeline, puuid="PUUID_PLAYER_JINX", rank="DIAMOND",
        ddragon=dd, benchmark_table=table, knowledge_base=kb)

    p = pack["player"]
    print(f"=== {p['champion']} {p['role']} ({p['rank_context']}) vs "
          f"{(p.get('lane_opponent') or {}).get('champion')} — "
          f"{'WIN' if pack['match']['win'] else 'LOSS'} ===\n")

    print("HEADLINE FINDINGS (computed, not AI):")
    for f in pack["headline_findings"]:
        print(f"  - {f}")

    print("\nBENCHMARKS:")
    for b in pack["benchmarks"]:
        flag = {"weak": "XX", "below": "X ", "on_track": "ok", "strength": "++"}[b["verdict"]]
        print(f"  [{flag}] {b['label']:<26} {b['value']:<7} (exp {b['expected']})  {b['severity']}")

    print("\nKEY TIMELINE METRICS:")
    tm = pack["timeline_metrics"]
    for k in ("cs_at_10", "cs_diff_at_10", "gold_diff_at_10", "gold_diff_at_15",
              "deaths_before_14", "first_legendary_item_min", "objective_participation"):
        print(f"  {k}: {tm.get(k)}")

    print("\nRETRIEVED COACHING CONTEXT (RAG):")
    for c in pack.get("coaching_context", []):
        snippet = c["text"].split("\n", 1)[0][:80]
        print(f"  ({c.get('score')}) {c['metadata'].get('source','?')}: {snippet}...")

    out = os.path.join(ROOT, "factpack.out.json")
    with open(out, "w") as f:
        json.dump(pack, f, indent=2)
    print(f"\nFull FactPack written to {out}")


if __name__ == "__main__":
    main()
