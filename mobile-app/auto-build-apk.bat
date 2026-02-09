@echo off
:: Auto Build APK Script - รันทุก 10 นาที
setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0
set LOG_DIR=%PROJECT_DIR%logs
set APK_OUTPUT=%PROJECT_DIR%apk-builds
set BUILD_INTERVAL=600

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%APK_OUTPUT%" mkdir "%APK_OUTPUT%"

:BUILD_LOOP
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set BUILD_DATE=%%c%%a%%b)
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set BUILD_TIME=%%a%%b)
    set TIMESTAMP=%BUILD_DATE%_%BUILD_TIME%
    set LOG_FILE=%LOG_DIR%\build_%TIMESTAMP%.log

    echo ======================================== >> "%LOG_FILE%"
    echo Auto Build Started: %date% %time% >> "%LOG_FILE%"
    echo ======================================== >> "%LOG_FILE%"

    :: Build Ionic app
    echo [%time%] Building Ionic app... >> "%LOG_FILE%"
    cd "%PROJECT_DIR%"
    call npm run build >> "%LOG_FILE%" 2>&1
    if !errorlevel! neq 0 (
        echo ERROR: Ionic build failed! >> "%LOG_FILE%"
        goto WAIT_NEXT
    )

    :: Sync Capacitor
    echo [%time%] Syncing Capacitor... >> "%LOG_FILE%"
    call npx cap sync android >> "%LOG_FILE%" 2>&1
    if !errorlevel! neq 0 (
        echo ERROR: Capacitor sync failed! >> "%LOG_FILE%"
        goto WAIT_NEXT
    )

    :: Build APK
    echo [%time%] Building APK... >> "%LOG_FILE%"
    cd "%PROJECT_DIR%android"
    call gradlew assembleDebug >> "%LOG_FILE%" 2>&1
    if !errorlevel! neq 0 (
        echo ERROR: Gradle build failed! >> "%LOG_FILE%"
        goto WAIT_NEXT
    )

    :: Copy APK
    set APK_SOURCE=%PROJECT_DIR%android\app\build\outputs\apk\debug\app-debug.apk
    set APK_DEST=%APK_OUTPUT%\face-attendance-%TIMESTAMP%.apk

    if exist "%APK_SOURCE%" (
        copy "%APK_SOURCE%" "%APK_DEST%" >> "%LOG_FILE%" 2>&1
        echo SUCCESS: APK saved to %APK_DEST% >> "%LOG_FILE%"
        
        :: Delete old APK files (keep only latest 3)
        echo [%time%] Cleaning old APK files... >> "%LOG_FILE%"
        cd "%APK_OUTPUT%"
        for /f "skip=3 delims=" %%f in ('dir /b /o-d face-attendance-*.apk') do (
            del "%%f" >> "%LOG_FILE%" 2>&1
            echo Deleted old APK: %%f >> "%LOG_FILE%"
        )
    ) else (
        echo ERROR: APK file not found >> "%LOG_FILE%"
    )

:WAIT_NEXT
    echo Build completed: %date% %time% >> "%LOG_FILE%"
    echo Next build in 10 minutes... >> "%LOG_FILE%"
    
    cls
    echo ========================================
    echo Auto Build APK System
    echo ========================================
    echo Last Build: %date% %time%
    echo Log: %LOG_FILE%
    echo APK Output: %APK_OUTPUT%
    echo.
    echo Next build in 10 minutes...
    echo Press Ctrl+C to stop
    echo ========================================

    ping 127.0.0.1 -n 600 > nul 2>&1

goto BUILD_LOOP
