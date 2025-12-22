# วิธี Build APK สำหรับ Android

## 1. เตรียม Environment

### ติดตั้ง Android Studio
- ดาวน์โหลดจาก: https://developer.android.com/studio
- ติดตั้ง Android SDK (API Level 34 หรือสูงกว่า)
- ติดตั้ง Android Build Tools

### ตั้งค่า Environment Variables
สำหรับ Windows:
```cmd
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
```

## 2. Build APK ผ่าน Command Line

### สร้าง Signed APK (สำหรับติดตั้งจริง)

```bash
cd mobile-app
cd android

# สร้าง keystore (ทำครั้งแรกเท่านั้น)
keytool -genkey -v -keystore face-attendance.keystore -alias face-attendance -keyalg RSA -keysize 2048 -validity 10000

# สร้าง APK แบบ debug (สำหรับทดสอบ)
./gradlew assembleDebug

# หรือสร้าง APK แบบ release (สำหรับติดตั้งจริง)
./gradlew assembleRelease
```

## 3. APK Output Location

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

## 4. ถ้าไม่มี Android Studio

ให้ติดตั้งผ่าน command line:

```bash
# ดาวน์โหลด command line tools
# https://developer.android.com/studio#command-tools

# ติดตั้ง SDK และ build tools
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```