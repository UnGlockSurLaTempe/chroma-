"""
ddragon.py — load Riot's Data Dragon static data and provide simple lookups.

Data Dragon is the *factual grounding* layer: champion kits & base stats, item
stats & costs, runes. It is static per-patch — perfect for a local cache.

Two parts:
  * fetch_ddragon(...)  -> downloads the JSON files (run on YOUR machine; this
                           sandbox has no outbound access).
  * DataDragon          -> loads the cached JSON and answers lookups, returning
                           plain dicts so it slots into a JSON-interface project.

What Data Dragon does NOT contain (don't expect it here): win rates, matchup
difficulty, build popularity, rank benchmarks. Those come from your own
collected match data (-> benchmarks.py) and your coaching corpus (-> rag/).
"""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Dict, List, Optional

DDRAGON_BASE = "https://ddragon.leagueoflegends.com"
DEFAULT_LOCALE = "en_US"


# ----------------------------------------------------------------------------
# Fetch (run on a machine with internet; downloads ~a few MB per patch)
# ----------------------------------------------------------------------------

def latest_version() -> str:
    url = f"{DDRAGON_BASE}/api/versions.json"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())[0]


def fetch_ddragon(out_dir: str, version: Optional[str] = None,
                  locale: str = DEFAULT_LOCALE) -> str:
    """Download champion/item/rune/summoner JSON into out_dir/<version>/.

    Returns the version downloaded. Re-run after each patch.
    """
    version = version or latest_version()
    dest = os.path.join(out_dir, version)
    os.makedirs(dest, exist_ok=True)
    files = {
        "champion.json": f"{DDRAGON_BASE}/cdn/{version}/data/{locale}/champion.json",
        "championFull.json": f"{DDRAGON_BASE}/cdn/{version}/data/{locale}/championFull.json",
        "item.json": f"{DDRAGON_BASE}/cdn/{version}/data/{locale}/item.json",
        "runesReforged.json": f"{DDRAGON_BASE}/cdn/{version}/data/{locale}/runesReforged.json",
        "summoner.json": f"{DDRAGON_BASE}/cdn/{version}/data/{locale}/summoner.json",
    }
    for fname, url in files.items():
        with urllib.request.urlopen(url, timeout=60) as r:
            data = r.read()
        with open(os.path.join(dest, fname), "wb") as f:
            f.write(data)
    with open(os.path.join(dest, "_VERSION"), "w") as f:
        f.write(version)
    return version


# ----------------------------------------------------------------------------
# Load + lookups
# ----------------------------------------------------------------------------

# Heuristic fallback set of "completed/legendary" items if championFull/item depth
# is unavailable. Extend as needed; the data-driven path below is preferred.
# Also used by timeline.py so legendary detection works without Data Dragon.
FALLBACK_LEGENDARY_ITEM_IDS = {
    3031, 3036, 3072, 3094, 3124, 3142, 3153, 6672, 6673, 6675, 6676,  # ADC-ish
    3157, 3089, 3135, 3116, 4645, 3137,  # AP-ish
    3068, 3742, 3193, 3001, 3110, 3143,  # tank-ish
}


class DataDragon:
    """Loads a cached Data Dragon version directory and answers lookups."""

    def __init__(self, version_dir: str):
        self.dir = version_dir
        self._champ_by_name: Dict[str, Dict[str, Any]] = {}
        self._champ_by_key: Dict[int, Dict[str, Any]] = {}
        self._items: Dict[int, Dict[str, Any]] = {}
        self._runes: Dict[int, Dict[str, Any]] = {}
        self._load()

    def _read(self, name: str) -> Optional[Dict[str, Any]]:
        path = os.path.join(self.dir, name)
        if not os.path.exists(path):
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _load(self) -> None:
        champ = self._read("championFull.json") or self._read("champion.json")
        if champ:
            for cname, c in champ.get("data", {}).items():
                self._champ_by_name[cname] = c
                try:
                    self._champ_by_key[int(c.get("key"))] = c
                except (TypeError, ValueError):
                    pass
        item = self._read("item.json")
        if item:
            for iid, idata in item.get("data", {}).items():
                try:
                    self._items[int(iid)] = idata
                except ValueError:
                    pass
        runes = self._read("runesReforged.json")
        if runes:
            for tree in runes:
                self._runes[tree["id"]] = {"name": tree["name"], "is_tree": True}
                for slot in tree.get("slots", []):
                    for rune in slot.get("runes", []):
                        self._runes[rune["id"]] = rune

    # -- champions ----------------------------------------------------------
    def champion(self, name_or_key: Any) -> Optional[Dict[str, Any]]:
        if isinstance(name_or_key, int) or (isinstance(name_or_key, str) and name_or_key.isdigit()):
            c = self._champ_by_key.get(int(name_or_key))
        else:
            c = self._champ_by_name.get(name_or_key)
        if not c:
            return None
        return self._slim_champion(c)

    @staticmethod
    def _slim_champion(c: Dict[str, Any]) -> Dict[str, Any]:
        """Return the coaching-relevant subset (keeps FactPacks small)."""
        stats = c.get("stats", {})
        out = {
            "name": c.get("name"),
            "id": c.get("id"),
            "key": c.get("key"),
            "tags": c.get("tags", []),
            "resource": c.get("partype"),
            "attack_range": stats.get("attackrange"),
            "base_stats": {k: stats.get(k) for k in
                           ("hp", "armor", "spellblock", "attackdamage", "movespeed")
                           if k in stats},
        }
        if "passive" in c:
            out["passive"] = c["passive"].get("name")
        if "spells" in c:
            out["abilities"] = {
                slot: {"name": s.get("name"), "cooldown": s.get("cooldownBurn")}
                for slot, s in zip("QWER", c.get("spells", []))
            }
        return out

    # -- items --------------------------------------------------------------
    def item(self, item_id: Any) -> Optional[Dict[str, Any]]:
        if item_id is None:
            return None
        idata = self._items.get(int(item_id))
        if not idata:
            return None
        gold = idata.get("gold", {})
        return {
            "id": int(item_id),
            "name": idata.get("name"),
            "total_cost": gold.get("total"),
            "stats": idata.get("stats", {}),
            "tags": idata.get("tags", []),
        }

    def is_legendary(self, item_id: Any) -> bool:
        """Best-effort 'is this a completed item?' check.

        Data-driven when item.json is loaded (no 'into', has depth/high cost),
        otherwise falls back to a hardcoded id set.
        """
        if item_id is None:
            return False
        iid = int(item_id)
        idata = self._items.get(iid)
        if not idata:
            return iid in FALLBACK_LEGENDARY_ITEM_IDS
        gold = idata.get("gold", {})
        no_upgrade = not idata.get("into")
        pricey = (gold.get("total", 0) or 0) >= 2200
        deep = idata.get("depth", 1) >= 3
        purchasable = gold.get("purchasable", True)
        return bool(purchasable and no_upgrade and (deep or pricey))

    # -- runes --------------------------------------------------------------
    def rune(self, rune_id: Any) -> Optional[Dict[str, Any]]:
        if rune_id is None:
            return None
        r = self._runes.get(int(rune_id))
        return {"id": int(rune_id), "name": r.get("name")} if r else None


def load_latest_local(cache_root: str) -> Optional[DataDragon]:
    """Load the newest version subdir under cache_root, or None if empty."""
    if not os.path.isdir(cache_root):
        return None
    versions = [d for d in os.listdir(cache_root)
                if os.path.isdir(os.path.join(cache_root, d))]
    if not versions:
        return None

    def vkey(v: str):
        try:
            return tuple(int(x) for x in v.split("."))
        except ValueError:
            return (0,)

    newest = sorted(versions, key=vkey)[-1]
    return DataDragon(os.path.join(cache_root, newest))
