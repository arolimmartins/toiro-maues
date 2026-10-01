@echo off
title GestureCar AI - CETAM
echo ========================================================
echo        Iniciando GestureCar AI - Pro Racing Edition
echo ========================================================
echo.
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual .venv nao encontrado!
    pause
    exit /b 1
)

echo Abrindo o jogo...
start "" ".\.venv\Scripts\python.exe" app.py
