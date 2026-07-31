"""Fenêtre d'application dédiée + surveillance du client League.

LolPick s'ouvre dans une vraie fenêtre d'app (pas un onglet de navigateur) :
on lance un navigateur Chromium en mode `--app=`, avec son propre profil.
Résultat : pas de barre d'adresse, pas d'onglets, sa propre entrée dans la
barre des tâches. Aucune dépendance à installer — Edge est présent sur toutes
les machines Windows récentes, Chrome/Brave/Chromium font aussi l'affaire.
"""

import os
import platform
import shutil
import subprocess
import time

from . import lcu

APP_NAME = "LolPick"


# --------------------------------------------------------------------------
# Emplacement des données de l'app (profil de la fenêtre, réglages)
# --------------------------------------------------------------------------
def data_dir():
    system = platform.system()
    if system == "Windows":
        base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
    elif system == "Darwin":
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share")
    path = os.path.join(base, APP_NAME)
    os.makedirs(path, exist_ok=True)
    return path


# --------------------------------------------------------------------------
# Détection d'un navigateur Chromium
# --------------------------------------------------------------------------
def _windows_candidates():
    roots = [os.environ.get("PROGRAMFILES", r"C:\Program Files"),
             os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"),
             os.environ.get("LOCALAPPDATA", "")]
    rel = [r"Microsoft\Edge\Application\msedge.exe",
           r"Google\Chrome\Application\chrome.exe",
           r"BraveSoftware\Brave-Browser\Application\brave.exe",
           r"Chromium\Application\chrome.exe"]
    return [os.path.join(r, x) for r in roots if r for x in rel]


def _macos_candidates():
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            "/Applications/Chromium.app/Contents/MacOS/Chromium"]


def find_browser():
    system = platform.system()
    if system == "Windows":
        candidates = _windows_candidates()
    elif system == "Darwin":
        candidates = _macos_candidates()
    else:
        candidates = []
        for name in ("google-chrome", "chromium", "chromium-browser",
                     "brave-browser", "microsoft-edge"):
            found = shutil.which(name)
            if found:
                candidates.append(found)
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None


def open_app_window(url, width=1280, height=920):
    """Ouvre l'interface dans une fenêtre d'app dédiée.

    Renvoie le process du navigateur, ou None si on est retombé sur le
    navigateur par défaut (auquel cas on ne peut pas suivre sa durée de vie).
    """
    browser = find_browser()
    if not browser:
        import webbrowser
        webbrowser.open(url)
        return None

    profile = os.path.join(data_dir(), "window")
    args = [browser,
            "--app=" + url,
            "--user-data-dir=" + profile,
            "--window-size=%d,%d" % (width, height),
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=Translate,MediaRouter"]
    if platform.system() == "Linux":
        args.append("--class=" + APP_NAME)

    creation = 0
    if platform.system() == "Windows":
        creation = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        return subprocess.Popen(args, creationflags=creation) if creation \
            else subprocess.Popen(args)
    except OSError:
        import webbrowser
        webbrowser.open(url)
        return None


# --------------------------------------------------------------------------
# « League est-il lancé ? »
# --------------------------------------------------------------------------
class LeagueWatcher:
    """Détecte le lancement et la fermeture du client, sans coûter cher.

    Le lockfile du client n'existe que pendant qu'il tourne : une fois son
    chemin connu, chaque vérification est un simple os.path.exists. Le scan
    complet (liste des process) n'est refait qu'occasionnellement.
    """

    def __init__(self, rescan_every=20.0):
        self.lockfile = None
        self.rescan_every = rescan_every
        self._last_scan = 0.0

    def running(self):
        if self.lockfile and os.path.exists(self.lockfile):
            return True
        self.lockfile = None
        now = time.monotonic()
        if now - self._last_scan < self.rescan_every:
            return False
        self._last_scan = now
        try:
            self.lockfile = lcu.lockfile_path()
        except Exception:
            self.lockfile = None
        return bool(self.lockfile)
