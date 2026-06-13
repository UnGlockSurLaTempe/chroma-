"""
retrieve.py — turn a FactPack's findings into queries, fetch coaching snippets.

The point of RAG here is NOT to answer the game for you — it's to hand the debate
agents the relevant *principles* ("how should an ADC trade pre-6 vs Caitlyn",
"vision routes when behind") so they reason from real coaching knowledge instead
of the 7B model's vague memory.

We build one query per headline finding (plus champion/role context) and merge
the de-duplicated results.
"""

from __future__ import annotations

from typing import Any, Dict, List


def _queries_from_factpack(pack: Dict[str, Any]) -> List[str]:
    champ = pack["player"].get("champion", "")
    role = pack["player"].get("role", "")
    opp = (pack["player"].get("lane_opponent") or {}).get("champion", "")
    ctx = f"{champ} {role} vs {opp}".strip()

    queries: List[str] = []
    for finding in pack.get("headline_findings", []):
        queries.append(f"{ctx}: {finding}")
    # Always include a couple of structural queries so we get role fundamentals.
    queries.append(f"{role} laning fundamentals {champ}")
    if opp:
        queries.append(f"{champ} matchup vs {opp}")
    return queries


def retrieve_for_factpack(pack: Dict[str, Any], kb, k: int = 4,
                          per_query: int = 2) -> List[Dict[str, Any]]:
    """Retrieve and merge coaching snippets relevant to this FactPack.

    Returns a list of {id, text, metadata, score, matched_query}. De-duplicated
    by id, best score wins, capped at `k`.
    """
    role = pack["player"].get("role")
    best: Dict[str, Dict[str, Any]] = {}

    for q in _queries_from_factpack(pack):
        # Prefer role-matched docs, but don't hard-fail if the corpus lacks them.
        hits = kb.query(q, k=per_query, where={"role": role}) if role else []
        if not hits:
            hits = kb.query(q, k=per_query)
        for h in hits:
            hid = h.get("id")
            h = {**h, "matched_query": q}
            if hid not in best or (h.get("score") or 0) > (best[hid].get("score") or 0):
                best[hid] = h

    merged = sorted(best.values(), key=lambda d: d.get("score") or 0, reverse=True)
    return merged[:k]
