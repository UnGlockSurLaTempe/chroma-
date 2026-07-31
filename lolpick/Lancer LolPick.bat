@echo off
chcp 65001 >nul
title LolPick
start "" pythonw "%~dp0app.py"
exit /b 0
