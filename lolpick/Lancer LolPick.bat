@echo off
chcp 65001 >nul
title LolPick
pyw "%~dp0app.py" 2>nul || pythonw "%~dp0app.py" 2>nul || python "%~dp0app.py"
exit /b 0
