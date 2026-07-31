#!/usr/bin/env python3
"""Tests de l'application de bureau — `python3 tests/test_app.py`

Couvre le serveur local, la détection du lancement de League, la fenêtre d'app
et l'installation/désinstallation. Aucun de ces tests ne touche au client League
ni n'ouvre de vraie fenêtre : le navigateur est remplacé par un script factice.
"""

import json
import os
import platform
import stat
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from server import desktop, lcu, web  # noqa: E402

checks = 0
fails = 0


def ok(cond, label, extra=""):
    global checks, fails
    checks += 1
    if cond:
        print("  ✓ " + label)
    else:
        fails += 1
        print("  ✗ " + label + (("  → " + str(extra)) if extra else ""))


def section(title):
    print("\n" + title)


# --------------------------------------------------------------- serveur --
section("Serveur local")
server, port = web.serve_in_thread(8815)
ok(server is not None, "le serveur démarre")

with urllib.request.urlopen("http://127.0.0.1:8815/") as r:
    body = r.read().decode("utf-8", "replace")
ok(r.status == 200 and "LolPick" in body, "l'interface est servie")

with urllib.request.urlopen("http://127.0.0.1:8815/api/champselect") as r:
    payload = json.loads(r.read().decode("utf-8"))
ok("clientFound" in payload and "active" in payload,
   "api/champselect répond même sans client League", payload)

second, _ = web.serve_in_thread(8815)
ok(second is None, "une deuxième instance détecte le port déjà pris")

for asset in ("engine.js", "app.js", "styles.css", "icon.png",
              "data/champions.js", "data/matchups.js", "data/builds.js", "data/counterpicks.js"):
    with urllib.request.urlopen("http://127.0.0.1:8815/" + asset) as r:
        served = r.status == 200 and int(r.headers.get("Content-Length", "0")) > 0
    ok(served, "asset servi : " + asset)

# ------------------------------------------------------- veille / League --
section("Détection du lancement de League")
tmp = tempfile.mkdtemp()
lock = os.path.join(tmp, "lockfile")
real_lockfile_path = lcu.lockfile_path
lcu.lockfile_path = lambda: lock if os.path.exists(lock) else None
try:
    watcher = desktop.LeagueWatcher(rescan_every=0.05)
    ok(watcher.running() is False, "League fermé → pas de détection")

    open(lock, "w").write("LeagueClient:1:2999:token:https")
    time.sleep(0.1)
    ok(watcher.running() is True, "lockfile présent → League détecté")

    os.remove(lock)
    time.sleep(0.1)
    ok(watcher.running() is False, "lockfile supprimé → fermeture détectée")

    open(lock, "w").write("x")
    time.sleep(0.1)
    ok(watcher.running() is True, "relance détectée")
finally:
    lcu.lockfile_path = real_lockfile_path

# ----------------------------------------------------------- fenêtre app --
section("Fenêtre d'application")
fake_dir = tempfile.mkdtemp()
fake = os.path.join(fake_dir, "chromium")
argv_file = os.path.join(fake_dir, "argv.txt")
with open(fake, "w") as fh:
    fh.write('#!/bin/sh\nprintf "%s\\n" "$@" > ' + argv_file + "\nsleep 20\n")
os.chmod(fake, os.stat(fake).st_mode | stat.S_IEXEC)

if platform.system() == "Windows":
    print("  (test de la fenêtre ignoré sous Windows : script factice POSIX)")
else:
    os.environ["PATH"] = fake_dir + os.pathsep + os.environ["PATH"]
    ok(desktop.find_browser() == fake, "un navigateur Chromium est trouvé dans le PATH")

    win = desktop.open_app_window("http://127.0.0.1:8815/")
    time.sleep(0.8)
    args = open(argv_file).read().split("\n") if os.path.exists(argv_file) else []
    ok(any(a.startswith("--app=") for a in args), "lancé en mode application (--app=)", args)
    ok(any(a.startswith("--user-data-dir=") for a in args), "profil dédié (--user-data-dir)", args)
    ok(win is not None and win.poll() is None, "la fenêtre reste ouverte")
    win.terminate()
    time.sleep(0.3)
    ok(win.poll() is not None, "la fenêtre se ferme sur demande")

# ---------------------------------------------------------- installation --
section("Installation / désinstallation")
install_py = os.path.join(ROOT, "install.py")
res = subprocess.run([sys.executable, install_py, "--status"], capture_output=True, text=True)
ok(res.returncode == 0, "install.py --status s'exécute", res.stderr)

if platform.system() == "Linux":
    target = os.path.expanduser("~/.config/autostart/lolpick.desktop")
    existed = os.path.exists(target)
    backup = open(target, "rb").read() if existed else None
    try:
        subprocess.run([sys.executable, install_py], capture_output=True, text=True, timeout=30)
        ok(os.path.exists(target), "le lancement automatique est installé", target)
        content = open(target, encoding="utf-8").read()
        ok("--watch" in content and "app.py" in content,
           "l'entrée d'autostart lance bien le mode veille")

        subprocess.run([sys.executable, install_py, "--uninstall"],
                       capture_output=True, text=True, timeout=30)
        ok(not os.path.exists(target), "la désinstallation supprime tout")
    finally:
        if backup is not None:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            open(target, "wb").write(backup)
else:
    print("  (installation testée uniquement sous Linux dans ce harnais)")

# --------------------------------------------------------------- icônes ---
section("Icône")
png = os.path.join(ROOT, "web", "icon.png")
ico = os.path.join(ROOT, "web", "icon.ico")
ok(os.path.exists(png) and open(png, "rb").read(4) == b"\x89PNG", "icon.png est un PNG valide")
raw = open(ico, "rb").read() if os.path.exists(ico) else b""
ok(len(raw) > 6 and raw[2] == 1 and raw[4] >= 3, "icon.ico contient plusieurs tailles")

server.shutdown()
print("\n" + ("✗ %d échec(s) sur %d" % (fails, checks) if fails else "✓ %d vérifications OK" % checks))
sys.exit(1 if fails else 0)
