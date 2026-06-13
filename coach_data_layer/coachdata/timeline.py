"""
timeline.py — turn a Riot Match-V5 match + timeline into pre-computed facts.

This is the heart of the data layer. Instead of summarising a game with an LLM
(which loses the specifics a coach needs), we compute hard numbers in Python:
CS@10, gold/xp diffs vs the lane opponent, deaths before 14:00, objective
participation, key events with map zones, etc.

Pure stdlib. Input/output are plain JSON-serialisable dicts.

Riot data shapes (abridged):
  match.info.participants[]   -> puuid, championName, teamPosition, teamId,
                                 kills/deaths/assists, totalMinionsKilled,
                                 neutralMinionsKilled, goldEarned, visionScore,
                                 wardsPlaced, wardsKilled, win, challenges{...}
  match.info.gameDuration     -> seconds (newer) or ms (older); we normalise
  match.info.gameVersion      -> e.g. "14.11.123.456" -> patch "14.11"
  timeline.info.frameInterval -> usually 60000 (1 min)
  timeline.info.frames[]      -> timestamp, participantFrames{"1":{...}}, events[]
    participantFrame          -> totalGold, currentGold, level, xp,
                                 minionsKilled, jungleMinionsKilled, position{x,y}
    event types used          -> CHAMPION_KILL, ITEM_PURCHASED,
                                 ELITE_MONSTER_KILL, BUILDING_KILL, WARD_PLACED
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .ddragon import FALLBACK_LEGENDARY_ITEM_IDS as _FALLBACK_LEGENDARY_ITEM_IDS

# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------

def _normalise_duration_s(game_duration: int) -> int:
    """gameDuration is seconds when gameEndTimestamp exists, else milliseconds."""
    return game_duration // 1000 if game_duration > 10000 else game_duration


def _patch_from_version(game_version: str) -> str:
    parts = (game_version or "").split(".")
    return ".".join(parts[:2]) if len(parts) >= 2 else (game_version or "unknown")


def _find_participant(match_info: Dict[str, Any], puuid: str) -> Dict[str, Any]:
    for p in match_info.get("participants", []):
        if p.get("puuid") == puuid:
            return p
    raise ValueError(f"puuid {puuid!r} not found in match participants")


def _participant_id_for_puuid(match_info: Dict[str, Any], puuid: str) -> int:
    return _find_participant(match_info, puuid)["participantId"]


def _lane_opponent(match_info: Dict[str, Any], player: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Enemy in the same teamPosition (lane). Returns None if not resolvable."""
    pos = player.get("teamPosition") or player.get("individualPosition")
    team = player.get("teamId")
    if not pos:
        return None
    for p in match_info.get("participants", []):
        if p.get("teamId") != team and (p.get("teamPosition") or p.get("individualPosition")) == pos:
            return p
    return None


def _frame_at(frames: List[Dict[str, Any]], target_ms: int) -> Optional[Dict[str, Any]]:
    """Frame whose timestamp is closest to target_ms (frames ~1/min)."""
    if not frames:
        return None
    return min(frames, key=lambda f: abs(f.get("timestamp", 0) - target_ms))


def _pframe(frame: Dict[str, Any], pid: int) -> Dict[str, Any]:
    return (frame.get("participantFrames") or {}).get(str(pid), {})


def _cs(pf: Dict[str, Any]) -> int:
    return int(pf.get("minionsKilled", 0)) + int(pf.get("jungleMinionsKilled", 0))


def _round(x: Optional[float], n: int = 2) -> Optional[float]:
    return None if x is None else round(x, n)


# Rough Summoner's Rift map zones from event x/y (map is ~0..15000).
def _lane_zone(pos: Optional[Dict[str, Any]]) -> Optional[str]:
    if not pos:
        return None
    x, y = pos.get("x", 0), pos.get("y", 0)
    # diagonal: above the main diagonal -> top side, below -> bottom side
    side = "TOP" if y > x else "BOT"
    if abs(x - y) < 2500:
        band = "MID"
    else:
        band = side
    # river-ish band near the centre diagonal
    near_river = abs((15000 - x) - y) < 2200
    if near_river and band != "MID":
        return f"{band}_RIVER"
    return band


# ----------------------------------------------------------------------------
# Per-minute series and snapshot metrics
# ----------------------------------------------------------------------------

def _series(frames: List[Dict[str, Any]], pid: int, opp_pid: Optional[int]) -> Dict[str, List]:
    minute, cs, gold, xp, gold_diff, cs_diff = [], [], [], [], [], []
    for f in frames:
        pf = _pframe(f, pid)
        if not pf:
            continue
        m = round(f.get("timestamp", 0) / 60000)
        minute.append(m)
        cs.append(_cs(pf))
        gold.append(int(pf.get("totalGold", 0)))
        xp.append(int(pf.get("xp", 0)))
        if opp_pid is not None:
            opf = _pframe(f, opp_pid)
            gold_diff.append(int(pf.get("totalGold", 0)) - int(opf.get("totalGold", 0)))
            cs_diff.append(_cs(pf) - _cs(opf))
        else:
            gold_diff.append(None)
            cs_diff.append(None)
    return {
        "minute": minute, "cs": cs, "gold": gold, "xp": xp,
        "gold_diff": gold_diff, "cs_diff": cs_diff,
    }


def _snapshot_metrics(frames: List[Dict[str, Any]], pid: int, opp_pid: Optional[int],
                      events: List[Dict[str, Any]]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}

    def at(minute: int, key: str):
        f = _frame_at(frames, minute * 60000)
        if not f:
            return None
        return _pframe(f, pid).get(key)

    def cs_at(minute: int):
        f = _frame_at(frames, minute * 60000)
        return _cs(_pframe(f, pid)) if f else None

    def diff_at(minute: int, kind: str):
        if opp_pid is None:
            return None
        f = _frame_at(frames, minute * 60000)
        if not f:
            return None
        if kind == "cs":
            return _cs(_pframe(f, pid)) - _cs(_pframe(f, opp_pid))
        return int(_pframe(f, pid).get(kind, 0)) - int(_pframe(f, opp_pid).get(kind, 0))

    for m in (10, 14, 20):
        out[f"cs_at_{m}"] = cs_at(m)
    out["cs_diff_at_10"] = diff_at(10, "cs")
    out["cs_diff_at_14"] = diff_at(14, "cs")
    out["gold_diff_at_10"] = diff_at(10, "totalGold")
    out["gold_diff_at_15"] = diff_at(15, "totalGold")
    out["gold_diff_at_20"] = diff_at(20, "totalGold")
    out["xp_diff_at_10"] = diff_at(10, "xp")
    out["xp_diff_at_15"] = diff_at(15, "xp")
    out["level_at_10"] = at(10, "level")
    out["level_at_14"] = at(14, "level")

    deaths = [e for e in events if e.get("type") == "CHAMPION_KILL" and e.get("victimId") == pid]
    out["deaths_total_timeline"] = len(deaths)
    out["deaths_before_14"] = sum(1 for e in deaths if e.get("timestamp", 0) < 14 * 60000)
    return out


# ----------------------------------------------------------------------------
# Key events
# ----------------------------------------------------------------------------

def _key_events(events: List[Dict[str, Any]], match_info: Dict[str, Any], pid: int,
                ddragon=None) -> List[Dict[str, Any]]:
    name_by_pid = {p["participantId"]: p.get("championName")
                   for p in match_info.get("participants", [])}
    team_by_pid = {p["participantId"]: p.get("teamId")
                   for p in match_info.get("participants", [])}
    player_team = team_by_pid.get(pid)
    out: List[Dict[str, Any]] = []

    for e in events:
        t = e.get("timestamp", 0)
        base = {"t_s": round(t / 1000), "min": _round(t / 60000, 1), "type": e.get("type")}
        et = e.get("type")

        if et == "CHAMPION_KILL" and (e.get("victimId") == pid or e.get("killerId") == pid
                                      or pid in (e.get("assistingParticipantIds") or [])):
            role = "victim" if e.get("victimId") == pid else (
                "killer" if e.get("killerId") == pid else "assist")
            out.append({**base, "role": role,
                        "killer": name_by_pid.get(e.get("killerId")),
                        "victim": name_by_pid.get(e.get("victimId")),
                        "assist_count": len(e.get("assistingParticipantIds") or []),
                        "position": e.get("position"),
                        "lane_zone": _lane_zone(e.get("position"))})

        elif et == "ITEM_PURCHASED" and e.get("participantId") == pid:
            item_id = e.get("itemId")
            entry = {**base, "item_id": item_id}
            if ddragon is not None:
                item = ddragon.item(item_id)
                if item:
                    entry["item_name"] = item.get("name")
                entry["legendary"] = ddragon.is_legendary(item_id)
            else:
                # No grounding available: fall back to the known-id heuristic so
                # first_legendary_item_min still works.
                entry["legendary"] = item_id in _FALLBACK_LEGENDARY_ITEM_IDS
            out.append(entry)

        elif et == "ELITE_MONSTER_KILL":
            participated = (e.get("killerId") == pid
                            or pid in (e.get("assistingParticipantIds") or [])
                            or e.get("killerTeamId") == player_team)
            out.append({**base, "monster": e.get("monsterType"),
                        "subtype": e.get("monsterSubType"),
                        "by_player_team": e.get("killerTeamId") == player_team,
                        "participated": participated})

        elif et == "BUILDING_KILL" and e.get("teamId") is not None:
            out.append({**base, "building": e.get("buildingType"),
                        "tower": e.get("towerType"),
                        "by_player_team": e.get("teamId") != player_team})  # teamId = team that LOST building

        elif et == "WARD_PLACED" and e.get("creatorId") == pid:
            out.append({**base, "ward_type": e.get("wardType")})

    return out


def _first_legendary_min(key_events: List[Dict[str, Any]]) -> Optional[float]:
    for e in key_events:
        if e.get("type") == "ITEM_PURCHASED" and e.get("legendary"):
            return e.get("min")
    return None


# ----------------------------------------------------------------------------
# Outcome stats (from the post-game participant row)
# ----------------------------------------------------------------------------

def _outcome_stats(player: Dict[str, Any], duration_s: int,
                   match_info: Dict[str, Any]) -> Dict[str, Any]:
    dmin = max(duration_s / 60.0, 1e-9)
    cs = int(player.get("totalMinionsKilled", 0)) + int(player.get("neutralMinionsKilled", 0))
    k, d, a = (int(player.get("kills", 0)), int(player.get("deaths", 0)),
               int(player.get("assists", 0)))
    challenges = player.get("challenges") or {}

    kp = challenges.get("killParticipation")
    if kp is None:
        team_kills = sum(int(p.get("kills", 0)) for p in match_info.get("participants", [])
                         if p.get("teamId") == player.get("teamId"))
        kp = (k + a) / team_kills if team_kills else None

    return {
        "kda": {"k": k, "d": d, "a": a, "ratio": _round((k + a) / d if d else float(k + a))},
        "cs": cs, "cs_per_min": _round(cs / dmin),
        "gold": int(player.get("goldEarned", 0)),
        "gold_per_min": _round(int(player.get("goldEarned", 0)) / dmin),
        "damage_to_champions": int(player.get("totalDamageDealtToChampions", 0)),
        "vision_score": int(player.get("visionScore", 0)),
        "vision_score_per_min": _round(int(player.get("visionScore", 0)) / dmin),
        "wards_placed": int(player.get("wardsPlaced", 0)),
        "wards_killed": int(player.get("wardsKilled", 0)),
        "control_wards": int(challenges.get("controlWardsPlaced", 0)),
        "kill_participation": _round(kp) if kp is not None else None,
    }


# ----------------------------------------------------------------------------
# Public entry point
# ----------------------------------------------------------------------------

def parse(match_json: Dict[str, Any], timeline_json: Dict[str, Any], puuid: str,
          ddragon=None) -> Dict[str, Any]:
    """Parse one player's perspective into a structured 'match facts' dict.

    Returns a dict with: match, player, outcome_stats, timeline_metrics,
    series, key_events. This is consumed by factpack.build_fact_pack().
    """
    match_info = match_json["info"]
    tinfo = timeline_json["info"]
    frames = tinfo.get("frames", [])
    events = [e for f in frames for e in f.get("events", [])]

    player = _find_participant(match_info, puuid)
    pid = player["participantId"]
    opponent = _lane_opponent(match_info, player)
    opp_pid = opponent["participantId"] if opponent else None

    duration_s = _normalise_duration_s(int(match_info.get("gameDuration", 0)))
    key_events = _key_events(events, match_info, pid, ddragon=ddragon)

    timeline_metrics = _snapshot_metrics(frames, pid, opp_pid, events)
    timeline_metrics["first_legendary_item_min"] = _first_legendary_min(key_events)
    # Objective participation: elite-monster events the player helped secure.
    elite = [e for e in key_events if e.get("type") == "ELITE_MONSTER_KILL" and e.get("by_player_team")]
    timeline_metrics["objectives_participated"] = sum(1 for e in elite if e.get("participated"))
    timeline_metrics["objectives_team_total"] = len(elite)
    timeline_metrics["objective_participation"] = (
        _round(sum(1 for e in elite if e.get("participated")) / len(elite)) if elite else None)

    out = {
        "match": {
            "match_id": match_json.get("metadata", {}).get("matchId"),
            "patch": _patch_from_version(match_info.get("gameVersion", "")),
            "queue_id": match_info.get("queueId"),
            "duration_s": duration_s,
            "win": bool(player.get("win")),
        },
        "player": {
            "puuid": puuid,
            "summoner": player.get("riotIdGameName") or player.get("summonerName"),
            "champion": player.get("championName"),
            "role": player.get("teamPosition") or player.get("individualPosition"),
            "team_id": player.get("teamId"),
            "lane_opponent": {
                "champion": opponent.get("championName"),
                "puuid": opponent.get("puuid"),
            } if opponent else None,
        },
        "outcome_stats": _outcome_stats(player, duration_s, match_info),
        "timeline_metrics": timeline_metrics,
        "series": _series(frames, pid, opp_pid),
        "key_events": key_events,
    }
    return out
