@echo off
:: Quick Start Development Environment
:: รัน Ionic dev server + Auto-build APK พร้อมกัน

echo ========================================
echo Starting Face Attendance Development
echo ========================================
echo - Ionic dev server: http://localhost:8100
echo - Auto-build APK every 10 minutes
echo ========================================
echo.

cd /d "%~dp0"

:: Start Auto-build in background (minimized)
start /min "Auto-build APK" cmd /k auto-build-apk.bat

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start Ionic dev server
start "Ionic Dev Server" cmd /k ionic serve

echo.
echo ========================================
echo Development environment started!
echo ========================================
echo - Ionic Dev: http://localhost:8100
echo - Auto-build: Running in background
echo ========================================
echo.
pause
