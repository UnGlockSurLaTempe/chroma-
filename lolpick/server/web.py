"""Serveur HTTP local de LolPick.

Sert l'interface statique (`web/`) et expose `api/champselect`, qui relaie en
lecture seule l'état du champ select lu sur le client League.

Écoute uniquement sur 127.0.0.1 : rien n'est exposé sur le réseau.
"""

import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from . import lcu

WEB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path.split("?")[0].rstrip("/").endswith("api/champselect"):
            return self._json(self._champ_select())
        return super().do_GET()

    def _champ_select(self):
        try:
            return lcu.champ_select()
        except Exception as exc:  # le pont ne doit jamais tuer le serveur
            return {"clientFound": False, "active": False, "error": str(exc)}

    def _json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # pas de bruit dans la console


def serve(port=8787):
    """Démarre le serveur et le rend (bloquant : à l'appelant de servir)."""
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def serve_in_thread(port=8787):
    """Démarre le serveur dans un thread démon. Renvoie (server, port).

    Si le port est déjà pris, c'est qu'une autre instance de LolPick tourne
    déjà : on renvoie (None, port) et l'appelant se contente d'ouvrir la
    fenêtre sur l'instance existante.
    """
    try:
        server = serve(port)
    except OSError:
        return None, port
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, port
