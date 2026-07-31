"""Pont LECTURE SEULE avec le client League of Legends (API locale LCU).

Ce module ne fait que LIRE l'état du champ select :
  - il trouve le port et le token d'authentification du client (lockfile ou
    ligne de commande du process),
  - il interroge /lol-champ-select/v1/session,
  - il traduit les championId en noms via les données embarquées DANS le client
    (donc aucun accès Internet nécessaire, et jamais périmé).

Aucune écriture, aucune action n'est envoyée au client : rien n'est automatisé
côté jeu (pas d'auto-pick, pas d'auto-accept).
"""

import base64
import glob
import http.client
import json
import os
import platform
import re
import ssl
import subprocess
import time

POSITION_MAP = {
    "top": "TOP",
    "jungle": "JGL",
    "middle": "MID",
    "mid": "MID",
    "bottom": "BOT",
    "bot": "BOT",
    "utility": "SUP",
    "support": "SUP",
}

_LOCKFILE_CANDIDATES = [
    r"C:\Riot Games\League of Legends\lockfile",
    r"C:\Program Files\Riot Games\League of Legends\lockfile",
    r"C:\Program Files (x86)\Riot Games\League of Legends\lockfile",
    "/Applications/League of Legends.app/Contents/LoL/lockfile",
    os.path.expanduser("~/Applications/League of Legends.app/Contents/LoL/lockfile"),
]


class Credentials:
    def __init__(self, port, token):
        self.port = int(port)
        self.token = token

    def header(self):
        raw = ("riot:%s" % self.token).encode("utf-8")
        return "Basic " + base64.b64encode(raw).decode("ascii")


def _from_lockfile(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            parts = fh.read().strip().split(":")
        if len(parts) >= 4:
            return Credentials(parts[2], parts[3])
    except OSError:
        pass
    return None


def _from_process():
    """Récupère port + token depuis la ligne de commande de LeagueClientUx."""
    system = platform.system()
    try:
        if system == "Windows":
            out = subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\""
                 " | Select-Object -ExpandProperty CommandLine"],
                capture_output=True, text=True, timeout=8).stdout
        else:
            out = subprocess.run(["ps", "x", "-o", "args"],
                                 capture_output=True, text=True, timeout=8).stdout
    except (OSError, subprocess.SubprocessError):
        return None

    port = re.search(r"--app-port=(\d+)", out or "")
    token = re.search(r"--remoting-auth-token=([\w-]+)", out or "")
    if port and token:
        return Credentials(port.group(1), token.group(1))
    return None


def install_directory():
    """Dossier d'installation du client, lu sur sa ligne de commande.

    Sert à connaître le chemin du lockfile : ce fichier n'existe QUE pendant
    que le client tourne, c'est donc le test « League est lancé ? » le moins
    coûteux qui soit (un simple os.path.exists).
    """
    system = platform.system()
    try:
        if system == "Windows":
            out = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq LeagueClientUx.exe", "/NH"],
                capture_output=True, text=True, timeout=8).stdout
            if "LeagueClientUx" not in (out or ""):
                return None
            out = subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\""
                 " | Select-Object -ExpandProperty CommandLine"],
                capture_output=True, text=True, timeout=10).stdout
        else:
            out = subprocess.run(["ps", "x", "-o", "args"],
                                 capture_output=True, text=True, timeout=8).stdout
    except (OSError, subprocess.SubprocessError):
        return None

    m = re.search(r'--install-directory=(?:"([^"]+)"|(\S+))', out or "")
    if m:
        return m.group(1) or m.group(2)
    return None


def lockfile_path():
    """Chemin du lockfile du client, ou None."""
    d = install_directory()
    if d:
        p = os.path.join(d, "lockfile")
        if os.path.exists(p):
            return p
    for p in _LOCKFILE_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def find_credentials():
    creds = _from_process()
    if creds:
        return creds
    paths = list(_LOCKFILE_CANDIDATES)
    # installations Riot moins classiques + Lutris/Wine sous Linux
    paths += glob.glob(os.path.expanduser("~/**/League of Legends/lockfile"), recursive=False)
    paths += glob.glob(os.path.expanduser("~/Games/**/lockfile"), recursive=False)
    for p in paths:
        creds = _from_lockfile(p)
        if creds:
            return creds
    return None


_CTX = ssl.create_default_context()
_CTX.check_hostname = False
_CTX.verify_mode = ssl.CERT_NONE  # le client utilise un certificat auto-signé


def request(creds, path):
    conn = http.client.HTTPSConnection("127.0.0.1", creds.port, context=_CTX, timeout=4)
    try:
        conn.request("GET", path, headers={"Authorization": creds.header(),
                                           "Accept": "application/json"})
        resp = conn.getresponse()
        body = resp.read()
        if resp.status != 200:
            return None
        return json.loads(body.decode("utf-8"))
    except (OSError, ValueError, http.client.HTTPException):
        return None
    finally:
        conn.close()


_champ_cache = {"at": 0, "by_id": {}}


def champion_names(creds):
    """championId -> nom, lu depuis les données du client (pas d'Internet)."""
    if _champ_cache["by_id"] and time.time() - _champ_cache["at"] < 3600:
        return _champ_cache["by_id"]
    data = request(creds, "/lol-game-data/assets/v1/champion-summary.json")
    if not isinstance(data, list):
        return _champ_cache["by_id"]
    by_id = {}
    for entry in data:
        cid = entry.get("id")
        name = entry.get("name")
        if isinstance(cid, int) and cid > 0 and name:
            by_id[cid] = name
    if by_id:
        _champ_cache["by_id"] = by_id
        _champ_cache["at"] = time.time()
    return _champ_cache["by_id"]


def _player(entry, names):
    cid = entry.get("championId") or entry.get("championPickIntent") or 0
    return {
        "champion": names.get(cid),
        "position": POSITION_MAP.get((entry.get("assignedPosition") or "").lower()),
        "cellId": entry.get("cellId"),
        "locked": bool(entry.get("championId")),
    }


def champ_select():
    """État courant du champ select, prêt à être consommé par l'interface."""
    creds = find_credentials()
    if not creds:
        return {"clientFound": False, "active": False}

    session = request(creds, "/lol-champ-select/v1/session")
    if not session:
        return {"clientFound": True, "active": False}

    names = champion_names(creds)
    my_team = [_player(p, names) for p in session.get("myTeam", [])]
    their_team = [_player(p, names) for p in session.get("theirTeam", [])]

    my_cell = session.get("localPlayerCellId")
    my_position = None
    for p in session.get("myTeam", []):
        if p.get("cellId") == my_cell:
            my_position = POSITION_MAP.get((p.get("assignedPosition") or "").lower())

    bans = []
    for group in session.get("actions", []) or []:
        for action in group:
            if action.get("type") == "ban" and action.get("completed"):
                name = names.get(action.get("championId"))
                if name:
                    bans.append(name)

    # le dernier pick de notre côté : personne n'a encore d'action de pick en cours après nous
    picked_after_me = 0
    for group in session.get("actions", []) or []:
        for action in group:
            if action.get("type") == "pick" and not action.get("completed"):
                if action.get("actorCellId") != my_cell and action.get("isAllyAction"):
                    picked_after_me += 1

    return {
        "clientFound": True,
        "active": True,
        "myPosition": my_position,
        "myTeam": my_team,
        "theirTeam": their_team,
        "bans": bans,
        "isLastPick": picked_after_me == 0,
    }
