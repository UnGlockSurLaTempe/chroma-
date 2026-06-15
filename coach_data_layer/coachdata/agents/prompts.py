"""
prompts.py — turn a FactPack into the prompt each coaching agent reads.

This is the contract between the data layer and the agents. Every agent reads
the SAME factual briefing (rendered from the FactPack), then gets a role-specific
instruction. Nothing here calls an LLM — these are pure (FactPack -> messages)
builders, so you can inspect exactly what each agent would receive.

A "PromptSpec" is {system: str, messages: [{role, content}]} — provider-neutral.
The llm.py adapters translate it to Claude / Ollama / echo.
"""

from __future__ import annotations

from typing import Any, Dict, List

PromptSpec = Dict[str, Any]


# ---------------------------------------------------------------------------
# Render the FactPack into a compact, agent-readable briefing
# ---------------------------------------------------------------------------

def render_briefing(pack: Dict[str, Any]) -> str:
    """The shared, factual context block. Every agent reads this verbatim."""
    p = pack["player"]
    m = pack["match"]
    opp = (p.get("lane_opponent") or {}).get("champion", "?")
    lines: List[str] = []

    lines.append("=== MATCH FACTS (pre-computed — treat as ground truth) ===")
    lines.append(
        f"{p.get('champion')} | {p.get('role')} | rank context {p.get('rank_context')} "
        f"| vs {opp} | {'WIN' if m.get('win') else 'LOSS'} "
        f"| patch {m.get('patch')} | {round((m.get('duration_s') or 0)/60)} min")

    findings = pack.get("headline_findings") or []
    if findings:
        lines.append("\nHEADLINE FINDINGS (computed, not opinion):")
        lines.extend(f"  - {f}" for f in findings)

    benchmarks = pack.get("benchmarks") or []
    if benchmarks:
        lines.append("\nBENCHMARKS (you vs expected for this rank+role):")
        for b in benchmarks:
            lines.append(
                f"  - {b['label']}: {b['value']} (expected {b['expected']}) "
                f"-> {b['verdict']}/{b['severity']}")

    tm = pack.get("timeline_metrics") or {}
    keys = ["cs_at_10", "cs_diff_at_10", "gold_diff_at_10", "gold_diff_at_15",
            "deaths_before_14", "first_legendary_item_min", "objective_participation"]
    picked = [(k, tm[k]) for k in keys if tm.get(k) is not None]
    if picked:
        lines.append("\nKEY TIMELINE METRICS:")
        lines.extend(f"  - {k}: {v}" for k, v in picked)

    # Notable early deaths with map context (great for specific coaching).
    deaths = [e for e in pack.get("key_events", [])
              if e.get("type") == "CHAMPION_KILL" and e.get("role") == "victim"]
    if deaths:
        lines.append("\nDEATHS (timeline):")
        for e in deaths[:6]:
            lines.append(f"  - {e.get('min')}min in {e.get('lane_zone')} "
                         f"to {e.get('killer')} (+{e.get('assist_count')} assists)")

    g = pack.get("grounding") or {}
    if g.get("champion"):
        c = g["champion"]
        lines.append(f"\nGROUNDING: {c.get('name')} — range {c.get('attack_range')}, "
                     f"tags {', '.join(c.get('tags', []))}")
    if g.get("opponent_champion"):
        c = g["opponent_champion"]
        lines.append(f"GROUNDING: opponent {c.get('name')} — range {c.get('attack_range')}, "
                     f"tags {', '.join(c.get('tags', []))}")

    ctx = pack.get("coaching_context") or []
    if ctx:
        lines.append("\nRETRIEVED COACHING PRINCIPLES (reference these, don't contradict them):")
        for c in ctx:
            snippet = " ".join((c.get("text") or "").split())[:240]
            lines.append(f"  - [{(c.get('metadata') or {}).get('source','?')}] {snippet}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Stage 1 — Recap
# ---------------------------------------------------------------------------

RECAP_SYSTEM = (
    "You are a precise League of Legends match analyst. You write factual, "
    "specific recaps using ONLY the numbers in the briefing. Never invent stats, "
    "never speculate beyond the data. Cite concrete numbers (CS@10, gold diffs, "
    "death timings). 120 words max.")


def build_recap(pack: Dict[str, Any]) -> PromptSpec:
    briefing = render_briefing(pack)
    user = (f"{briefing}\n\n"
            "TASK: Write a tight factual recap of how this game went for the player. "
            "Lead with the single most important fact. Reference specific numbers.")
    return {"system": RECAP_SYSTEM, "messages": [{"role": "user", "content": user}],
            "stage": "recap"}


# ---------------------------------------------------------------------------
# Stage 2 — Debate (Challenger expert vs OTP)
# ---------------------------------------------------------------------------

EXPERT_SYSTEM = (
    "You are a Challenger-level coach with a macro, role-agnostic view. In this "
    "debate you argue what the player should prioritize to climb, grounded in the "
    "briefing's benchmarks and timeline. You value fundamentals: wave management, "
    "vision, death timing, gold efficiency. Be specific and cite the numbers. "
    "Disagree with the OTP when their champion-specific take ignores macro. "
    "2-4 sentences per turn. No filler.")

OTP_SYSTEM = (
    "You are a one-trick-pony (OTP) main of the player's champion, top of the "
    "leaderboard on it. You argue from deep champion-specific knowledge: power "
    "spikes, matchup patterns, build/trade timings for THIS champion. Push back on "
    "generic macro advice when the champion's kit or the specific matchup changes "
    "the answer. Cite the matchup and item timings from the briefing. "
    "2-4 sentences per turn. No filler.")


def build_debate_opening(pack: Dict[str, Any], speaker: str) -> PromptSpec:
    """First turn of the debate for `speaker` ('expert' or 'otp')."""
    briefing = render_briefing(pack)
    system = EXPERT_SYSTEM if speaker == "expert" else OTP_SYSTEM
    user = (f"{briefing}\n\n"
            "TASK: Open the coaching debate. State the ONE thing you believe cost "
            "this player the most, and why — using the numbers above.")
    return {"system": system, "messages": [{"role": "user", "content": user}],
            "stage": f"debate_open_{speaker}"}


def build_debate_reply(pack: Dict[str, Any], speaker: str,
                       transcript: List[Dict[str, str]]) -> PromptSpec:
    """A debate turn for `speaker`, having seen the transcript so far.

    transcript: [{"speaker": "expert"|"otp", "text": "..."}]
    Rendered as alternating user/assistant so the model sees the back-and-forth.
    """
    briefing = render_briefing(pack)
    system = EXPERT_SYSTEM if speaker == "expert" else OTP_SYSTEM
    messages: List[Dict[str, str]] = [
        {"role": "user", "content": f"{briefing}\n\nThis is a coaching debate. "
         "Respond to the other coach; defend or refine your position."}]
    for turn in transcript:
        role = "assistant" if turn["speaker"] == speaker else "user"
        tag = "YOU" if turn["speaker"] == speaker else turn["speaker"].upper()
        messages.append({"role": role, "content": f"[{tag}] {turn['text']}"})
    # Ensure the last message is a user turn (the cue to respond).
    if messages[-1]["role"] != "user":
        messages.append({"role": "user", "content": "Your turn — respond."})
    return {"system": system, "messages": messages, "stage": f"debate_{speaker}"}


# ---------------------------------------------------------------------------
# Stage 3 — Conclusion / coaching plan (reasoning-heavy → Claude)
# ---------------------------------------------------------------------------

CONCLUSION_SYSTEM = (
    "You are the head coach. You synthesize the match facts and the debate between "
    "the Challenger expert and the OTP into a concrete, prioritized improvement "
    "plan. Resolve their disagreement with judgment. Output EXACTLY this structure:\n"
    "TOP PRIORITY: <one sentence>\n"
    "WHY (from the data): <cite specific numbers>\n"
    "3 FIXES THIS WEEK:\n"
    "  1. <action> — drill: <concrete practice>\n"
    "  2. ...\n"
    "  3. ...\n"
    "ONE THING THEY DID WELL: <grounded in a strength benchmark>\n"
    "Be specific and numeric. No platitudes like 'farm better' without a target.")


def build_conclusion(pack: Dict[str, Any], recap: str,
                     transcript: List[Dict[str, str]]) -> PromptSpec:
    briefing = render_briefing(pack)
    debate_text = "\n".join(f"[{t['speaker'].upper()}] {t['text']}" for t in transcript)
    user = (f"{briefing}\n\n=== RECAP ===\n{recap}\n\n"
            f"=== COACH DEBATE ===\n{debate_text}\n\n"
            "TASK: Produce the final coaching plan in the required structure.")
    return {"system": CONCLUSION_SYSTEM,
            "messages": [{"role": "user", "content": user}],
            "stage": "conclusion", "think": True}
