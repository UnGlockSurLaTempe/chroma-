#!/bin/sh
# LolPick — installation (macOS / Linux)
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
    exec python3 install.py "$@"
fi
echo "Python 3 est requis (macOS : brew install python, Linux : paquet python3)."
exit 1
