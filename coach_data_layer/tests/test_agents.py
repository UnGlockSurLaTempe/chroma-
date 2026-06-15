from coachdata import factpack
from coachdata.agents import prompts, pipeline
from coachdata.agents.llm import EchoLLM


def _pack(match, timeline, table, puuid):
    return factpack.build_fact_pack(
        match, timeline, puuid=puuid, rank="DIAMOND", benchmark_table=table)


def test_briefing_contains_key_facts(match, timeline, table, puuid):
    pack = _pack(match, timeline, table, puuid)
    briefing = prompts.render_briefing(pack)
    assert "Jinx" in briefing
    assert "Caitlyn" in briefing
    assert "HEADLINE FINDINGS" in briefing
    assert "BENCHMARKS" in briefing
    # The early deaths should be surfaced for specific coaching.
    assert "DEATHS" in briefing


def test_recap_prompt_shape(match, timeline, table, puuid):
    pack = _pack(match, timeline, table, puuid)
    spec = prompts.build_recap(pack)
    assert spec["system"]
    assert spec["messages"][0]["role"] == "user"
    assert spec["stage"] == "recap"


def test_debate_reply_alternates_roles(match, timeline, table, puuid):
    pack = _pack(match, timeline, table, puuid)
    transcript = [
        {"speaker": "expert", "text": "Vision was the problem."},
        {"speaker": "otp", "text": "No, it was the level-2 trade."},
    ]
    spec = prompts.build_debate_reply(pack, "expert", transcript)
    # From the expert's view: own turns are assistant, opponent's are user.
    roles = [m["role"] for m in spec["messages"]]
    assert "assistant" in roles and "user" in roles
    assert spec["messages"][-1]["role"] == "user"  # cue to respond


def test_conclusion_flags_thinking(match, timeline, table, puuid):
    pack = _pack(match, timeline, table, puuid)
    spec = prompts.build_conclusion(pack, "recap text", [
        {"speaker": "expert", "text": "a"}, {"speaker": "otp", "text": "b"}])
    assert spec.get("think") is True  # routed to adaptive thinking on Claude


def test_full_pipeline_offline(match, timeline, table, puuid):
    pack = _pack(match, timeline, table, puuid)
    result = pipeline.run_pipeline(pack, default=EchoLLM(), debate_rounds=2)
    assert "recap" in result and "conclusion" in result
    # 2 rounds x 2 speakers = 4 debate turns.
    assert len(result["debate"]) == 4
    assert {t["speaker"] for t in result["debate"]} == {"expert", "otp"}
    assert all(p == "echo" for p in result["providers"].values())
