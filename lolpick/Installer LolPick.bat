@echo off
chcp 65001 >nul
title Installation de LolPick
echo.
echo   LolPick - installation
echo   ----------------------
echo.

set "PY="
py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY (
  python -c "import sys" >nul 2>&1 && set "PY=python"
)
if not defined PY goto nopython

%PY% "%~dp0install.py"
echo.
pause
exit /b 0

:nopython
echo   Python n'est pas installe sur cette machine.
echo   LolPick en a besoin (une seule fois, rien d'autre a installer).
echo.
echo   Le plus simple, dans PowerShell :
echo       winget install -e --id Python.Python.3.12
echo.
echo   ...ou telecharge-le sur https://www.python.org/downloads/
echo   Pense a cocher "Add python.exe to PATH" pendant l'installation.
echo.
pause
exit /b 1
