#!/usr/bin/env python3
"""LolPick — lancement dans le navigateur (mode « serveur simple »).

    python run.py              → http://127.0.0.1:8787 et ouvre le navigateur
    python run.py --port 9000 --no-browser

Pour la vraie application de bureau (fenêtre dédiée, lancement automatique
avec League), utilise plutôt `app.py` — et `install.py` pour l'installer.

Uniquement la bibliothèque standard : aucune installation, aucune dépendance.
Le serveur n'écoute que sur 127.0.0.1 : rien n'est exposé sur le réseau.
"""

import argparse
import os
import sys
import threading
import webbrowser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import lcu, web  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="LolPick — assistant de draft LoL")
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    server = web.serve(args.port)
    url = "http://127.0.0.1:%d/" % args.port

    print("LolPick  →  %s" % url)
    creds = lcu.find_credentials()
    if creds:
        print("Client League détecté (port %d) : la draft se remplira toute seule." % creds.port)
    else:
        print("Client League non détecté : saisie manuelle (la détection reprend "
              "automatiquement dès que le client est lancé).")
    print("Ctrl+C pour arrêter.")

    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")
        server.shutdown()


if __name__ == "__main__":
    main()
