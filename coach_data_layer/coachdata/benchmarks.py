"""
benchmarks.py — compare a player's numbers to expected values for rank+role.

This is what turns "you should farm better" into "6.6 CS/min vs 7.8 expected for
Diamond ADC — ~16% behind". No AI: pure comparison against a table.

The table (data/benchmarks/benchmarks.sample.json) ships with rough placeholder
values. REPLACE them with values you aggregate from your own collected match
data (mean/percentiles per rank+role) — that is where real accuracy comes from.

Each metric entry:
  {
    "expected": <typical value at this rank/role>,
    "good":     <a clearly-strong value>,
    "bad":      <a clearly-weak value>,
    "direction":"higher" | "lower",   # is higher better, or lower better?
    "unit": "cs/min", "label": "CS per minute"
  }
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

# Where each benchmark metric pulls its value from in the parsed facts.
# (section, key). section is "timeline_metrics" or "outcome_stats".
_METRIC_SOURCE = {
    "cs_per_min": ("outcome_stats", "cs_per_min"),
    "cs_at_10": ("timeline_metrics", "cs_at_10"),
    "cs_at_14": ("timeline_metrics", "cs_at_14"),
    "gold_diff_at_10": ("timeline_metrics", "gold_diff_at_10"),
    "gold_diff_at_15": ("timeline_metrics", "gold_diff_at_15"),
    "deaths_before_14": ("timeline_metrics", "deaths_before_14"),
    "vision_score_per_min": ("outcome_stats", "vision_score_per_min"),
    "kill_participation": ("outcome_stats", "kill_participation"),
    "objective_participation": ("timeline_metrics", "objective_participation"),
}


def load_table(path: str) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _value_for(metric: str, facts: Dict[str, Any]) -> Optional[float]:
    src = _METRIC_SOURCE.get(metric)
    if not src:
        return None
    section, key = src
    val = (facts.get(section) or {}).get(key)
    return None if val is None else float(val)


def _verdict(value: float, spec: Dict[str, Any]) -> Dict[str, Any]:
    """Classify value vs expected/good/bad into verdict + severity."""
    expected = float(spec["expected"])
    good = float(spec.get("good", expected))
    bad = float(spec.get("bad", expected))
    higher_better = spec.get("direction", "higher") == "higher"

    delta = round(value - expected, 2)

    # Normalise so "positive = better" regardless of direction.
    if higher_better:
        better_than_good = value >= good
        worse_than_bad = value <= bad
        on_track = value >= expected
    else:
        better_than_good = value <= good
        worse_than_bad = value >= bad
        on_track = value <= expected

    if better_than_good:
        verdict, severity = "strength", "none"
    elif on_track:
        verdict, severity = "on_track", "none"
    elif worse_than_bad:
        verdict, severity = "weak", "high"
    else:
        # between expected and bad
        span = abs(bad - expected) or 1.0
        frac = abs(value - expected) / span
        verdict = "below"
        severity = "moderate" if frac >= 0.5 else "low"

    return {"verdict": verdict, "severity": severity, "delta": delta}


def _explain(metric: str, value: float, spec: Dict[str, Any], v: Dict[str, Any]) -> str:
    label = spec.get("label", metric)
    expected = spec["expected"]
    unit = spec.get("unit", "")
    unit_s = f" {unit}" if unit else ""
    higher_better = spec.get("direction", "higher") == "higher"
    if v["verdict"] == "strength":
        return f"{label}: {value}{unit_s} — better than the {expected}{unit_s} benchmark. Strength."
    if v["verdict"] == "on_track":
        return f"{label}: {value}{unit_s} — around the expected {expected}{unit_s}."
    # Direction-aware wording: for 'lower is better' metrics, a weak result is
    # numerically *above* the benchmark (e.g. too many deaths).
    side = "below" if higher_better else "above"
    word = f"well {side}" if v["severity"] == "high" else side
    # percentage when expected is a non-trivial magnitude
    pct = ""
    try:
        if abs(float(expected)) >= 1:
            pct = f" (~{round(abs(value - expected) / abs(float(expected)) * 100)}% off)"
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    return f"{label}: {value}{unit_s} — {word} the {expected}{unit_s} benchmark{pct}."


def evaluate(facts: Dict[str, Any], table: Dict[str, Any],
             rank: str, role: str) -> List[Dict[str, Any]]:
    """Return a list of benchmark result dicts for the given rank+role.

    `facts` is the dict returned by timeline.parse(). `rank`/`role` select the
    table row, e.g. rank="DIAMOND", role="BOTTOM".
    """
    rows = table.get("benchmarks", {})
    role_specs = (rows.get(rank.upper(), {}) or {}).get(role.upper(), {})
    results: List[Dict[str, Any]] = []

    for metric, spec in role_specs.items():
        value = _value_for(metric, facts)
        if value is None:
            continue
        v = _verdict(value, spec)
        results.append({
            "metric": metric,
            "label": spec.get("label", metric),
            "value": value,
            "expected": spec["expected"],
            "unit": spec.get("unit", ""),
            "direction": spec.get("direction", "higher"),
            "delta": v["delta"],
            "verdict": v["verdict"],
            "severity": v["severity"],
            "explanation": _explain(metric, value, spec, v),
        })

    # Order: high-severity weaknesses first, then moderate/low, strengths last.
    sev_rank = {"high": 0, "moderate": 1, "low": 2, "none": 3}
    verdict_rank = {"weak": 0, "below": 1, "on_track": 2, "strength": 3}
    results.sort(key=lambda r: (sev_rank[r["severity"]], verdict_rank[r["verdict"]]))
    return results


def headline_findings(benchmarks: List[Dict[str, Any]], facts: Dict[str, Any],
                      max_items: int = 4) -> List[str]:
    """The top deterministic takeaways — fed to agents as the 'what to focus on'."""
    findings: List[str] = []
    weaknesses = [b for b in benchmarks if b["verdict"] in ("weak", "below")]
    for b in weaknesses[: max_items - 1]:
        findings.append(b["explanation"])

    # Contextual, event-derived finding: where did the early deaths happen?
    deaths_before_14 = (facts.get("timeline_metrics") or {}).get("deaths_before_14")
    if deaths_before_14 and deaths_before_14 >= 2:
        zones = [e.get("lane_zone") for e in facts.get("key_events", [])
                 if e.get("type") == "CHAMPION_KILL" and e.get("role") == "victim"
                 and e.get("min", 99) < 14 and e.get("lane_zone")]
        if zones:
            common = max(set(zones), key=zones.count)
            findings.append(
                f"{deaths_before_14} deaths before 14:00, most around {common} — "
                f"likely vision/positioning, not mechanics.")

    # Always surface at least one strength if present (for the debate balance).
    strengths = [b for b in benchmarks if b["verdict"] == "strength"]
    if strengths and len(findings) < max_items:
        findings.append(strengths[0]["explanation"])
    return findings[:max_items]
