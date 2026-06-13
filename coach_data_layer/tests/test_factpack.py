import os

from coachdata import factpack
from coachdata.rag.store import KnowledgeBase
from coachdata.rag.ingest import ingest_dir

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def test_factpack_shape(match, timeline, table, puuid):
    pack = factpack.build_fact_pack(
        match, timeline, puuid=puuid, rank="DIAMOND", benchmark_table=table)
    for key in ("schema_version", "match", "player", "outcome_stats",
                "timeline_metrics", "benchmarks", "headline_findings"):
        assert key in pack
    assert pack["player"]["rank_context"] == "DIAMOND"
    assert pack["headline_findings"]


def test_factpack_validates_against_schema(match, timeline, table, puuid):
    jsonschema = __import__("importlib").util.find_spec("jsonschema")
    if jsonschema is None:
        import pytest
        pytest.skip("jsonschema not installed")
    import json
    import jsonschema as js
    with open(os.path.join(ROOT, "schemas/fact_pack.schema.json")) as f:
        schema = json.load(f)
    pack = factpack.build_fact_pack(
        match, timeline, puuid=puuid, rank="DIAMOND", benchmark_table=table)
    js.validate(pack, schema)


def test_factpack_with_rag(match, timeline, table, puuid):
    kb = KnowledgeBase(backend="keyword")
    ingest_dir(kb, os.path.join(ROOT, "data/knowledge"))
    pack = factpack.build_fact_pack(
        match, timeline, puuid=puuid, rank="DIAMOND",
        benchmark_table=table, knowledge_base=kb)
    assert "coaching_context" in pack
    assert pack["coaching_context"], "expected at least one retrieved snippet"
    # The early-death finding should pull the vision/laning docs.
    sources = " ".join(c["metadata"].get("source", "") for c in pack["coaching_context"]).lower()
    assert "vision" in sources or "laning" in sources
