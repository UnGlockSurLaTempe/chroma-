@echo off
chcp 65001 >nul
title Mise a jour de LolPick
echo   Recuperation de la derniere version...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/UnGlockSurLaTempe/chroma-/refs/heads/claude/lol-champion-picker-flyo1g/lolpick/bootstrap.ps1 | iex"
pause
