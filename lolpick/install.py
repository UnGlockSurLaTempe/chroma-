#!/usr/bin/env python3
"""Installe LolPick comme application, et son lancement automatique avec League.

    python install.py              installe
    python install.py --uninstall  désinstalle
    python install.py --status     affiche ce qui est installé

Ce qui est posé, selon le système :

  Windows   un raccourci « LolPick » dans le menu Démarrer et sur le Bureau,
            + un raccourci dans le dossier Démarrage qui lance le mode veille
            (pythonw : aucune fenêtre de console).
  macOS     un LaunchAgent ~/Library/LaunchAgents/com.lolpick.watch.plist
  Linux     un fichier ~/.config/autostart/lolpick.desktop

Rien n'est écrit dans le registre, rien n'est installé en tant qu'administrateur :
la désinstallation se résume à supprimer ces fichiers.
"""

import argparse
import os
import platform
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "app.py")
ICON_ICO = os.path.join(HERE, "web", "icon.ico")
ICON_PNG = os.path.join(HERE, "web", "icon.png")
NAME = "LolPick"


# --------------------------------------------------------------------------
def python_gui():
    """Interpréteur sans console (pythonw.exe sous Windows)."""
    exe = sys.executable
    if platform.system() == "Windows":
        cand = os.path.join(os.path.dirname(exe), "pythonw.exe")
        if os.path.exists(cand):
            return cand
    return exe


# ============================== WINDOWS ===================================
def _win_dirs():
    appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
    return {
        "startup": os.path.join(appdata, "Microsoft", "Windows", "Start Menu",
                                "Programs", "Startup"),
        "startmenu": os.path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs"),
        "desktop": os.path.join(os.path.expanduser("~"), "Desktop"),
    }


def _win_shortcut(path, target, arguments, icon, description):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    script = (
        '$s = (New-Object -ComObject WScript.Shell).CreateShortcut({lnk})\n'
        '$s.TargetPath = {target}\n'
        '$s.Arguments = {args}\n'
        '$s.WorkingDirectory = {wd}\n'
        '$s.Description = {desc}\n'
        '{icon}'
        '$s.Save()\n'
    ).format(
        lnk=_ps(path), target=_ps(target), args=_ps(arguments),
        wd=_ps(HERE), desc=_ps(description),
        icon=('$s.IconLocation = %s\n' % _ps(ICON_ICO)) if os.path.exists(ICON_ICO) else "",
    )
    with tempfile.NamedTemporaryFile("w", suffix=".ps1", delete=False, encoding="utf-8") as fh:
        fh.write(script)
        tmp = fh.name
    try:
        subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
                       check=True, capture_output=True, timeout=30)
    finally:
        os.unlink(tmp)


def _ps(value):
    """Chaîne littérale PowerShell (les quotes simples se doublent)."""
    return "'" + str(value).replace("'", "''") + "'"


def install_windows():
    d = _win_dirs()
    py = python_gui()
    made = []

    _win_shortcut(os.path.join(d["startup"], NAME + ".lnk"), py,
                  '"%s" --watch' % APP, ICON_ICO,
                  "Ouvre LolPick automatiquement au lancement de League")
    made.append(os.path.join(d["startup"], NAME + ".lnk"))

    for key in ("startmenu", "desktop"):
        if os.path.isdir(d[key]):
            target = os.path.join(d[key], NAME + ".lnk")
            _win_shortcut(target, py, '"%s"' % APP, ICON_ICO, "Assistant de draft LoL")
            made.append(target)
    return made


def uninstall_windows():
    d = _win_dirs()
    removed = []
    for key in ("startup", "startmenu", "desktop"):
        path = os.path.join(d[key], NAME + ".lnk")
        if os.path.exists(path):
            os.remove(path)
            removed.append(path)
    return removed


# =============================== MACOS ====================================
PLIST_PATH = os.path.expanduser("~/Library/LaunchAgents/com.lolpick.watch.plist")

PLIST = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.lolpick.watch</string>
  <key>ProgramArguments</key>
  <array><string>{python}</string><string>{app}</string><string>--watch</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>WorkingDirectory</key><string>{here}</string>
</dict>
</plist>
"""


def install_macos():
    os.makedirs(os.path.dirname(PLIST_PATH), exist_ok=True)
    with open(PLIST_PATH, "w", encoding="utf-8") as fh:
        fh.write(PLIST.format(python=sys.executable, app=APP, here=HERE))
    subprocess.run(["launchctl", "unload", PLIST_PATH], capture_output=True)
    subprocess.run(["launchctl", "load", PLIST_PATH], capture_output=True)
    return [PLIST_PATH]


def uninstall_macos():
    if os.path.exists(PLIST_PATH):
        subprocess.run(["launchctl", "unload", PLIST_PATH], capture_output=True)
        os.remove(PLIST_PATH)
        return [PLIST_PATH]
    return []


# =============================== LINUX ====================================
DESKTOP_PATH = os.path.expanduser("~/.config/autostart/lolpick.desktop")

DESKTOP = """[Desktop Entry]
Type=Application
Name=LolPick
Comment=Assistant de draft League of Legends
Exec={python} "{app}" --watch
Icon={icon}
Terminal=false
X-GNOME-Autostart-enabled=true
"""


def install_linux():
    os.makedirs(os.path.dirname(DESKTOP_PATH), exist_ok=True)
    with open(DESKTOP_PATH, "w", encoding="utf-8") as fh:
        fh.write(DESKTOP.format(python=sys.executable, app=APP, icon=ICON_PNG))
    os.chmod(DESKTOP_PATH, 0o755)
    return [DESKTOP_PATH]


def uninstall_linux():
    if os.path.exists(DESKTOP_PATH):
        os.remove(DESKTOP_PATH)
        return [DESKTOP_PATH]
    return []


# ================================ CLI =====================================
INSTALLERS = {"Windows": (install_windows, uninstall_windows),
              "Darwin": (install_macos, uninstall_macos),
              "Linux": (install_linux, uninstall_linux)}


def installed_paths():
    system = platform.system()
    if system == "Windows":
        d = _win_dirs()
        return [os.path.join(d[k], NAME + ".lnk") for k in ("startup", "startmenu", "desktop")]
    if system == "Darwin":
        return [PLIST_PATH]
    return [DESKTOP_PATH]


def main():
    ap = argparse.ArgumentParser(description="Installe LolPick et son lancement automatique")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--status", action="store_true")
    args = ap.parse_args()

    system = platform.system()
    if system not in INSTALLERS:
        print("Système non géré : %s" % system)
        return 1
    install, uninstall = INSTALLERS[system]

    if args.status:
        print("LolPick — état de l'installation (%s)" % system)
        for p in installed_paths():
            print("  %s %s" % ("✓" if os.path.exists(p) else "·", p))
        return 0

    if args.uninstall:
        removed = uninstall()
        print("Désinstallé." if removed else "Rien à désinstaller.")
        for p in removed:
            print("  supprimé : %s" % p)
        return 0

    # Vérifie qu'un navigateur Chromium est disponible pour la fenêtre d'app
    sys.path.insert(0, HERE)
    from server import desktop  # noqa: E402
    browser = desktop.find_browser()

    made = install()
    print("LolPick installé.\n")
    for p in made:
        print("  créé : %s" % p)
    print("\nAu prochain démarrage de la session, LolPick se met en veille et")
    print("ouvre sa fenêtre dès que tu lances League.")
    print("Pour démarrer la veille tout de suite, sans redémarrer :")
    print('    "%s" "%s" --watch' % (python_gui(), APP))
    if browser:
        print("\nFenêtre d'app : %s" % os.path.basename(browser))
    else:
        print("\n⚠ Aucun navigateur Chromium (Edge/Chrome/Brave) trouvé : LolPick")
        print("  s'ouvrira dans ton navigateur par défaut, dans un onglet normal.")
    print("\nDésinstallation : python install.py --uninstall")
    return 0


if __name__ == "__main__":
    sys.exit(main())
