"""
make_samples.py — generate small, valid-shaped Riot Match-V5 sample payloads.

Run:  python tools/make_samples.py
Writes data/samples/match.sample.json and data/samples/timeline.sample.json.

The shapes mirror the real Riot endpoints (abridged) so the parser is exercised
the same way it would be on live data. The numbers are crafted so the player
(Jinx, BOTTOM) is behind their lane opponent (Caitlyn) and dies 3x before 14:00.
"""

import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "data", "samples")

PLAYER_PUUID = "PUUID_PLAYER_JINX"
OPP_PUUID = "PUUID_OPP_CAITLYN"

# 10 participants. pid 1 = player (team 100 BOTTOM), pid 6 = lane opp (team 200).
PARTICIPANTS = [
    (1, 100, "Jinx", "BOTTOM", PLAYER_PUUID, "Player"),
    (2, 100, "Leona", "UTILITY", "p2", "Sup1"),
    (3, 100, "Ahri", "MIDDLE", "p3", "Mid1"),
    (4, 100, "Darius", "TOP", "p4", "Top1"),
    (5, 100, "LeeSin", "JUNGLE", "p5", "Jg1"),
    (6, 200, "Caitlyn", "BOTTOM", OPP_PUUID, "Opp"),
    (7, 200, "Lux", "UTILITY", "p7", "Sup2"),
    (8, 200, "Khazix", "JUNGLE", "p8", "Jg2"),
    (9, 200, "Syndra", "MIDDLE", "p9", "Mid2"),
    (10, 200, "Sett", "TOP", "p10", "Top2"),
]


def build_match():
    participants = []
    for pid, team, champ, pos, puuid, name in PARTICIPANTS:
        is_player = pid == 1
        participants.append({
            "participantId": pid,
            "puuid": puuid,
            "teamId": team,
            "championName": champ,
            "teamPosition": pos,
            "individualPosition": pos,
            "riotIdGameName": name,
            "summonerName": name,
            "win": team == 200,  # team 100 (player) loses
            "kills": 4 if is_player else 5,
            "deaths": 7 if is_player else 3,
            "assists": 6 if is_player else 8,
            "totalMinionsKilled": 188 if is_player else 235,
            "neutralMinionsKilled": 13 if is_player else 5,
            "goldEarned": 11200 if is_player else 14600,
            "totalDamageDealtToChampions": 21030 if is_player else 28800,
            "visionScore": 17 if is_player else 26,
            "wardsPlaced": 9 if is_player else 16,
            "wardsKilled": 2 if is_player else 5,
            "challenges": {"controlWardsPlaced": 1 if is_player else 4},
        })
    return {
        "metadata": {"matchId": "EUW1_SAMPLE_0001",
                     "participants": [p[4] for p in PARTICIPANTS]},
        "info": {
            "gameVersion": "14.11.589.4012",
            "gameDuration": 1834,  # seconds
            "queueId": 420,
            "participants": participants,
        },
    }


def participant_frame(pid, minute, cs, gold, xp, level):
    # spread units roughly along the diagonal for the player's lane
    x = 1500 + minute * 120
    return {
        "participantId": pid,
        "minionsKilled": cs,
        "jungleMinionsKilled": 0,
        "totalGold": gold,
        "currentGold": max(0, gold - 1000),
        "xp": xp,
        "level": level,
        "position": {"x": x, "y": x - 300},
    }


def build_timeline():
    frames = []
    # Player (Jinx) behind; Caitlyn ahead. Linear-ish growth with a gap.
    for m in range(0, 31):
        ts = m * 60000
        pframes = {}
        for pid, team, *_ in PARTICIPANTS:
            if pid == 1:        # player: behind
                cs = round(6.4 * m)
                gold = 500 + round(360 * m)
                xp = round(560 * m)
                level = min(18, 1 + m * 9 // 10)
            elif pid == 6:      # lane opponent: ahead
                cs = round(7.2 * m)
                gold = 500 + round(395 * m)
                xp = round(610 * m)
                level = min(18, 1 + m)
            else:               # filler teammates/enemies
                cs = round(6.0 * m)
                gold = 500 + round(350 * m)
                xp = round(540 * m)
                level = min(18, 1 + m * 9 // 10)
            pframes[str(pid)] = participant_frame(pid, m, cs, gold, xp, level)

        events = []
        # Player deaths before 14:00 (bot-side, no vision) -> deaths_before_14 = 3
        if m == 5:
            events.append({"type": "CHAMPION_KILL", "timestamp": 5 * 60000 + 12000,
                           "killerId": 8, "victimId": 1,
                           "assistingParticipantIds": [6],
                           "position": {"x": 10500, "y": 3500}})  # BOT_RIVER-ish
        if m == 8:
            events.append({"type": "CHAMPION_KILL", "timestamp": 8 * 60000 + 30000,
                           "killerId": 6, "victimId": 1,
                           "assistingParticipantIds": [8],
                           "position": {"x": 11200, "y": 3000}})
        if m == 11:
            events.append({"type": "CHAMPION_KILL", "timestamp": 11 * 60000,
                           "killerId": 8, "victimId": 1,
                           "assistingParticipantIds": [6, 7],
                           "position": {"x": 10800, "y": 3200}})
        # A player kill (gets a takedown) at 17:00
        if m == 17:
            events.append({"type": "CHAMPION_KILL", "timestamp": 17 * 60000,
                           "killerId": 1, "victimId": 6,
                           "assistingParticipantIds": [2],
                           "position": {"x": 9000, "y": 4000}})
        # Item purchases for the player (Infinity Edge = 3031 legendary at ~12:30)
        if m == 4:
            events.append({"type": "ITEM_PURCHASED", "timestamp": 4 * 60000,
                           "participantId": 1, "itemId": 1038})  # B.F. Sword (component)
        if m == 12:
            events.append({"type": "ITEM_PURCHASED", "timestamp": 12 * 60000 + 30000,
                           "participantId": 1, "itemId": 3031})  # Infinity Edge
        # Elite monsters: enemy team takes dragons; player team takes one at 16
        if m == 12:
            events.append({"type": "ELITE_MONSTER_KILL", "timestamp": 12 * 60000,
                           "killerId": 8, "killerTeamId": 200,
                           "assistingParticipantIds": [6, 7],
                           "monsterType": "DRAGON", "monsterSubType": "FIRE_DRAGON"})
        if m == 16:
            events.append({"type": "ELITE_MONSTER_KILL", "timestamp": 16 * 60000,
                           "killerId": 5, "killerTeamId": 100,
                           "assistingParticipantIds": [1, 2],
                           "monsterType": "DRAGON", "monsterSubType": "OCEAN_DRAGON"})
        if m == 20:
            events.append({"type": "ELITE_MONSTER_KILL", "timestamp": 20 * 60000,
                           "killerId": 8, "killerTeamId": 200,
                           "assistingParticipantIds": [6],
                           "monsterType": "BARON_NASHOR"})
        # Player wards
        if m in (3, 7, 13):
            events.append({"type": "WARD_PLACED", "timestamp": ts + 5000,
                           "creatorId": 1, "wardType": "YELLOW_TRINKET"})

        frames.append({"timestamp": ts, "participantFrames": pframes, "events": events})

    return {
        "metadata": {"matchId": "EUW1_SAMPLE_0001"},
        "info": {"frameInterval": 60000, "frames": frames,
                 "participants": [{"participantId": p[0], "puuid": p[4]} for p in PARTICIPANTS]},
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "match.sample.json"), "w") as f:
        json.dump(build_match(), f, indent=2)
    with open(os.path.join(OUT, "timeline.sample.json"), "w") as f:
        json.dump(build_timeline(), f, indent=2)
    print("wrote match.sample.json and timeline.sample.json to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
