"""
factpack.py — assemble the FactPack: the single JSON object you feed the agents
INSTEAD of an early LLM summary.

Pipeline:
    match.json + timeline.json   --(timeline.parse)-->   facts
    facts + Data Dragon          --(grounding)------->   champion/item facts
    facts + benchmark table      --(benchmarks)------>   you-vs-expected
    facts                        --(headline_findings)-> top takeaways
    [optional] facts + knowledge --(rag.retrieve)----->  coaching principles
                                  ==> FactPack (validated by schemas/fact_pack.schema.json)

Everything is JSON-serialisable. The agents consume `headline_findings`,
`benchmarks`, `grounding`, and (optionally) `coaching_context`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from . import benchmarks as bench
from . import timeline as tl

SCHEMA_VERSION = "1.0"


def _grounding(facts: Dict[str, Any], ddragon) -> Dict[str, Any]:
    """Pull Data Dragon facts for the champ, opponent, and items built."""
    if ddragon is None:
        return {}
    g: Dict[str, Any] = {}
    champ = facts["player"].get("champion")
    if champ:
        g["champion"] = ddragon.champion(champ)
    opp = (facts["player"].get("lane_opponent") or {}).get("champion")
    if opp:
        g["opponent_champion"] = ddragon.champion(opp)
    built_ids = []
    for e in facts.get("key_events", []):
        if e.get("type") == "ITEM_PURCHASED" and e.get("legendary"):
            if e.get("item_id") not in built_ids:
                built_ids.append(e.get("item_id"))
    g["items_built"] = [ddragon.item(i) for i in built_ids if ddragon.item(i)]
    return g


def build_fact_pack(match_json: Dict[str, Any], timeline_json: Dict[str, Any],
                    puuid: str, rank: str, *,
                    ddragon=None, benchmark_table: Optional[Dict[str, Any]] = None,
                    knowledge_base=None, rag_k: int = 4,
                    include_series: bool = True) -> Dict[str, Any]:
    """Build a complete FactPack for one player in one match.

    Args:
        match_json, timeline_json: raw Riot Match-V5 payloads.
        puuid: the player to analyse.
        rank: rank tier used to pick the benchmark row, e.g. "DIAMOND".
        ddragon: a DataDragon instance (optional but recommended for grounding).
        benchmark_table: dict from benchmarks.load_table (optional).
        knowledge_base: a rag KnowledgeBase (optional).
    """
    facts = tl.parse(match_json, timeline_json, puuid, ddragon=ddragon)
    role = facts["player"].get("role") or "UTILITY"

    benchmark_results: List[Dict[str, Any]] = []
    findings: List[str] = []
    if benchmark_table is not None:
        benchmark_results = bench.evaluate(facts, benchmark_table, rank, role)
        findings = bench.headline_findings(benchmark_results, facts)

    pack: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "match": facts["match"],
        "player": {**facts["player"], "rank_context": rank.upper()},
        "outcome_stats": facts["outcome_stats"],
        "timeline_metrics": facts["timeline_metrics"],
        "key_events": facts["key_events"],
        "benchmarks": benchmark_results,
        "headline_findings": findings,
        "grounding": _grounding(facts, ddragon),
    }
    if include_series:
        pack["series"] = facts["series"]

    if knowledge_base is not None:
        from .rag import retrieve  # local import keeps rag deps optional
        pack["coaching_context"] = retrieve.retrieve_for_factpack(
            pack, knowledge_base, k=rag_k)

    return pack
