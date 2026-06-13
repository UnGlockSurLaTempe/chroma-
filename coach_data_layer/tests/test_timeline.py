from coachdata import timeline as tl


def test_basic_identity(match, timeline, puuid):
    facts = tl.parse(match, timeline, puuid)
    assert facts["player"]["champion"] == "Jinx"
    assert facts["player"]["role"] == "BOTTOM"
    assert facts["player"]["lane_opponent"]["champion"] == "Caitlyn"
    assert facts["match"]["patch"] == "14.11"
    assert facts["match"]["win"] is False
    assert facts["match"]["duration_s"] == 1834


def test_cs_and_diffs_match_frames(match, timeline, puuid):
    facts = tl.parse(match, timeline, puuid)
    tm = facts["timeline_metrics"]
    # Generator: player cs = round(6.4*m), so cs@10 = 64.
    assert tm["cs_at_10"] == 64
    # Opponent ahead -> negative diffs for the player.
    assert tm["cs_diff_at_10"] < 0
    assert tm["gold_diff_at_10"] < 0
    assert tm["gold_diff_at_15"] < tm["gold_diff_at_10"]  # deficit grows


def test_deaths_before_14(match, timeline, puuid):
    facts = tl.parse(match, timeline, puuid)
    assert facts["timeline_metrics"]["deaths_before_14"] == 3
    victims = [e for e in facts["key_events"]
               if e["type"] == "CHAMPION_KILL" and e["role"] == "victim"]
    assert len(victims) == 3
    assert all(e.get("lane_zone") for e in victims)


def test_objective_participation(match, timeline, puuid):
    facts = tl.parse(match, timeline, puuid)
    tm = facts["timeline_metrics"]
    # Player's team (100) secured 1 dragon at 16:00, player assisted.
    assert tm["objectives_team_total"] == 1
    assert tm["objectives_participated"] == 1
    assert tm["objective_participation"] == 1.0


def test_series_lengths_align(match, timeline, puuid):
    facts = tl.parse(match, timeline, puuid)
    s = facts["series"]
    assert len(s["minute"]) == len(s["cs"]) == len(s["gold"]) == len(s["gold_diff"])
