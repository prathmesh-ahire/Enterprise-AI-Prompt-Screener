@echo off
REM Double-click this to start the Enterprise AI Prompt Screener.
REM Checks Docker Desktop is running first, then starts all 4 containers.

cd /d "%~dp0"

echo Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo Docker is not running.
    echo Please start Docker Desktop first, wait for it to finish starting, then run this again.
    echo.
    pause
    exit /b 1
)

echo Docker is running. Starting the app...
echo.
docker compose up -d
if errorlevel 1 (
    echo.
    echo Something went wrong starting the containers. See the error above.
    pause
    exit /b 1
)

echo.
echo Containers are starting. Giving the backend a few seconds to come up...
ping -n 16 127.0.0.1 >nul

echo Opening the app in your browser...
start http://localhost:5173

echo.
echo Done. If the page shows an error, wait a few more seconds and refresh -
echo the backend can take a bit longer to finish starting on the first run.
pause
