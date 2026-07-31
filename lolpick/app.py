#!/usr/bin/env python3
"""LolPick — application de bureau.

    python app.py            ouvre l'app tout de suite
    python app.py --watch    reste en veille et ouvre l'app quand League démarre
    python app.py --port N   change le port local (défaut 8787)

Mode veille (`--watch`) : c'est celui qu'installe `install.py`. Le processus
dort en attendant le client League ; dès qu'il apparaît, la fenêtre s'ouvre,
et elle se referme quand tu quittes le client. Empreinte quasi nulle entre
deux parties (une vérification de fichier toutes les 4 secondes).
"""

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import desktop, web  # noqa: E402

POLL = 4.0


def _url(port):
    return "http://127.0.0.1:%d/" % port


def run_once(port):
    """Ouvre l'app maintenant et vit aussi longtemps que sa fenêtre."""
    server, port = web.serve_in_thread(port)
    if server is None:
        # une instance tourne déjà : on se contente d'ouvrir une fenêtre dessus
        desktop.open_app_window(_url(port))
        return

    window = desktop.open_app_window(_url(port))
    print("LolPick → %s" % _url(port))
    try:
        if window is None:
            # navigateur par défaut : on ne peut pas suivre la fenêtre, on sert
            while True:
                time.sleep(3600)
        else:
            window.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if window and window.poll() is None:
            window.terminate()
        server.shutdown()


def run_watch(port):
    """Veille : ouvre l'app au lancement de League, la ferme à sa fermeture."""
    server, port = web.serve_in_thread(port)
    if server is None:
        print("Une instance de LolPick tourne déjà sur le port %d." % port)
        return

    watcher = desktop.LeagueWatcher()
    window = None
    opened_this_session = False

    print("LolPick en veille — la fenêtre s'ouvrira au lancement de League.")
    try:
        while True:
            league = watcher.running()

            if league and not opened_this_session:
                window = desktop.open_app_window(_url(port))
                opened_this_session = True

            elif not league and opened_this_session:
                # League est fermé : on referme la fenêtre et on réarme
                if window and window.poll() is None:
                    window.terminate()
                window = None
                opened_this_session = False

            # fenêtre fermée à la main pendant que League tourne :
            # on ne la rouvre pas de force, on attend le prochain lancement
            if window is not None and window.poll() is not None:
                window = None

            time.sleep(POLL)
    except KeyboardInterrupt:
        pass
    finally:
        if window and window.poll() is None:
            window.terminate()
        server.shutdown()


def main():
    ap = argparse.ArgumentParser(description="LolPick — assistant de draft")
    ap.add_argument("--watch", action="store_true",
                    help="reste en veille et ouvre l'app quand League démarre")
    ap.add_argument("--port", type=int, default=8787)
    args = ap.parse_args()

    if args.watch:
        run_watch(args.port)
    else:
        run_once(args.port)


if __name__ == "__main__":
    main()
