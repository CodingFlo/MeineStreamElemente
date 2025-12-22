@echo off
title Controller View Server
color 0A

echo.
echo ========================================
echo   Controller View Server wird gestartet
echo ========================================
echo.

cd /d "%~dp0Backend"

echo Starte Server auf Port 3001...
echo.
echo Oeffne http://localhost:3001 im Browser
echo oder fuege es als Browser-Source in OBS hinzu
echo.
echo Druecke Strg+C zum Beenden
echo.

node server.js

pause
