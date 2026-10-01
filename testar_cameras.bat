@echo off
title GestureCar AI - Testador de Cameras
echo ========================================================
echo        Testador e Comparador de Cameras - CETAM
echo ========================================================
echo.
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual .venv nao encontrado!
    pause
    exit /b 1
)

echo Abrindo visualizacao de cameras...
".venv\Scripts\python.exe" testar_cameras.py
pause
