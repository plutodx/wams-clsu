@echo off
REM Double-click to start WAMS on Windows (backend + frontend).
cd /d "%~dp0"

echo ===============================================
echo    Starting WAMS - two windows will open.
echo    Keep BOTH open while you use the app.
echo ===============================================
echo.

REM Backend (installs packages on first run, then starts the API on http://localhost:4000)
start "WAMS Backend" cmd /k "cd /d %~dp0server && (if not exist node_modules npm install) && npm start"

REM Frontend (installs packages on first run, then starts the site on http://localhost:5173)
start "WAMS Frontend" cmd /k "cd /d %~dp0client && (if not exist node_modules npm install) && npm run dev"

REM Give them a few seconds, then open the browser
timeout /t 12 >nul
start "" http://localhost:5173

echo.
echo If the browser did not open, go to http://localhost:5173 yourself.
echo To stop WAMS, close both the Backend and Frontend windows.
pause
