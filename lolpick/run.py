#!/usr/bin/env python3
"""LolPick — lance l'assistant de draft.

    python run.py              → http://127.0.0.1:8787 + ouverture du navigateur
    python run.py --port 9000  → autre port
    python run.py --no-browser → ne pas ouvrir le navigateur

Uniquement la bibliothèque standard : aucune installation, aucune dépendance.
Le serveur ne sert que sur 127.0.0.1 (rien n'est exposé sur le réseau).
"""

import argparse
import json
import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import lcu  # noqa: E402

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path.split("?")[0].rstrip("/").endswith("api/champselect"):
            return self._api()
        return super().do_GET()

    def _api(self):
        try:
            payload = lcu.champ_select()
        except Exception as exc:  # le pont ne doit jamais tuer le serveur
            payload = {"clientFound": False, "active": False, "error": str(exc)}
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # pas de bruit dans la console


def main():
    ap = argparse.ArgumentParser(description="LolPick — assistant de draft LoL")
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
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
