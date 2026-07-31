@echo off
chcp 65001 >nul
title Desinstallation de LolPick
python "%~dp0install.py" --uninstall
echo.
pause
