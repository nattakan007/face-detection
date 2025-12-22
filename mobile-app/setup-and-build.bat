@echo off
echo ========================================
echo Face Attendance App - Setup and Build
echo ========================================
echo.

echo Step 1: Setting up environment variables...

:: Set JAVA_HOME (adjust path as needed)
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

:: Set ANDROID_HOME (if installed)
if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    set PATH=%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools;%PATH%
    echo Android SDK found
) else (
    echo Android SDK not found. Please install Android Studio first.
    echo Download from: https://developer.android.com/studio
    pause
    exit /b 1
)

echo.
echo Step 2: Verifying installation...

:: Check Java
java -version
if %errorlevel% neq 0 (
    echo ERROR: Java not found
    pause
    exit /b 1
)

:: Check Android tools
adb version
if %errorlevel% neq 0 (
    echo WARNING: ADB not found
)

echo.
echo Step 3: Building APK...
cd android

:: Build APK
echo Building debug APK...
call gradlew assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! APK built successfully!
    echo ========================================
    echo.
    echo APK Location:
    echo android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Next steps:
    echo 1. Transfer the APK to your Android device
    echo 2. Enable "Install from unknown sources" in device settings
    echo 3. Install and test the app
    echo.
    pause
) else (
    echo.
    echo Build failed! Please check the error messages above.
    pause
    exit /b 1
)