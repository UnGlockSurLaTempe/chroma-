@echo off
chcp 65001 >nul
title Desinstallation de LolPick
set "PY="
py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY set "PY=python"
%PY% "%~dp0install.py" --uninstall
echo.
pause
