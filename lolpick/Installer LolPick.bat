@echo off
chcp 65001 >nul
title Installation de LolPick
echo.
echo   LolPick - installation
echo   ----------------------
echo.

where python >nul 2>&1
if errorlevel 1 goto nopython

python "%~dp0install.py"
echo.
pause
exit /b 0

:nopython
echo   Python n'est pas installe sur cette machine.
echo   LolPick en a besoin (une seule fois, rien d'autre a installer).
echo.
echo   Ouvre un terminal et lance :
echo       winget install -e --id Python.Python.3.12
echo.
echo   ...ou telecharge-le sur https://www.python.org/downloads/
echo   Pense a cocher "Add python.exe to PATH" pendant l'installation.
echo.
pause
exit /b 1
