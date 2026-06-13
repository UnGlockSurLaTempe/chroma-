from coachdata import benchmarks as bench
from coachdata import timeline as tl


def test_evaluate_flags_weaknesses(match, timeline, table, puuid):
    facts = tl.parse(match, timeline, puuid)
    results = bench.evaluate(facts, table, "DIAMOND", "BOTTOM")
    assert results, "expected benchmark results for DIAMOND/BOTTOM"

    by_metric = {r["metric"]: r for r in results}
    # deaths_before_14 = 3 == 'bad' threshold (lower is better) -> weak/high.
    assert by_metric["deaths_before_14"]["verdict"] == "weak"
    assert by_metric["deaths_before_14"]["severity"] == "high"
    # cs_at_10 = 64 is below expected 75 -> below.
    assert by_metric["cs_at_10"]["verdict"] in ("below", "weak")

    # Results are sorted worst-first.
    sev = {"high": 0, "moderate": 1, "low": 2, "none": 3}
    sevs = [sev[r["severity"]] for r in results]
    assert sevs == sorted(sevs)


def test_headline_findings_nonempty_and_mention_deaths(match, timeline, table, puuid):
    facts = tl.parse(match, timeline, puuid)
    results = bench.evaluate(facts, table, "DIAMOND", "BOTTOM")
    findings = bench.headline_findings(results, facts)
    assert findings
    joined = " ".join(findings).lower()
    assert "death" in joined  # the 3 early deaths should surface


def test_direction_lower_is_better():
    spec = {"expected": 1.0, "good": 0, "bad": 3, "direction": "lower"}
    good = bench._verdict(0.0, spec)
    bad = bench._verdict(3.0, spec)
    assert good["verdict"] == "strength"
    assert bad["verdict"] == "weak"
