@echo off
title Criar Instalador - To'iro Maues (CETAM)
echo ========================================================
echo        Gerador do Instalador - To'iro Maues
echo               Tema Oficial CETAM 2026
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Verificando dependencias do Node.js...
if not exist "node_modules\electron-builder" (
    echo Instalando electron-builder...
    call npm install
)

echo.
echo [2/3] Compilando e gerando o Instalador Windows (Setup .exe)...
call npm run dist

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo      SUCESSO! O INSTALADOR FOI GERADO COM SUCESSO!
    echo ========================================================
    echo.
    echo O instalador esta localizado na pasta: dist\
    echo Abrindo a pasta do instalador...
    explorer "%~dp0dist"
) else (
    echo.
    echo [ERRO] Ocorreu uma falha ao gerar o instalador. Verifique as mensagens acima.
)

pause
