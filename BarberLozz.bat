@echo off
title BarberLozz Launcher

echo ==================================
echo      Iniciando BarberLozz
echo ==================================

echo.
echo Iniciando Ollama...
start "Ollama" cmd /k "ollama serve"

timeout /t 3 >nul

echo.
echo Iniciando Backend IA...
start "BarberLozz Backend" cmd /k "cd /d C:\Users\pedro\Desktop\Peluqueria\server && npm run dev"

timeout /t 5 >nul

echo.
echo Iniciando Frontend...
start "BarberLozz Frontend" cmd /k "cd /d C:\Users\pedro\Desktop\Peluqueria && npm run dev"

timeout /t 8 >nul

echo.
echo Abriendo BarberLozz...
start "" http://localhost:5173

echo.
echo ==================================
echo BarberLozz iniciado correctamente
echo ==================================

pause