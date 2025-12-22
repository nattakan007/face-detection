@echo off
echo Building APK for Face Attendance App...
echo.

echo 1. Checking prerequisites...

:: Check Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java JDK from: https://adoptium.net/
    pause
    exit /b 1
)

:: Check Android SDK
if not defined ANDROID_HOME (
    echo WARNING: ANDROID_HOME is not set
    echo Please set ANDROID_HOME to your Android SDK path
    pause
)

echo.
echo 2. Building APK...
cd android

:: Clean and build
call gradlew clean
call gradlew assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! APK built successfully!
    echo Location: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo You can now install this APK on your Android device
    pause
) else (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)