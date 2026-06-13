"""
coachdata — the data layer for the League of Legends AI coaching pipeline.

Feed the agents PRE-COMPUTED FACTS (a FactPack), not an early LLM summary.

    from coachdata import factpack, ddragon, benchmarks
    from coachdata.rag.store import KnowledgeBase

    dd = ddragon.load_latest_local("./ddragon_cache")     # optional grounding
    table = benchmarks.load_table("data/benchmarks/benchmarks.sample.json")
    kb = KnowledgeBase()                                   # optional RAG

    pack = factpack.build_fact_pack(
        match_json, timeline_json, puuid="...", rank="DIAMOND",
        ddragon=dd, benchmark_table=table, knowledge_base=kb)

`pack` is plain JSON — hand it straight to your debate / recap / coaching agents.
"""

from . import benchmarks, ddragon, factpack, timeline  # noqa: F401

__all__ = ["benchmarks", "ddragon", "factpack", "timeline"]
__version__ = "0.1.0"
