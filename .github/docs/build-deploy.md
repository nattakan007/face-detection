# Build & Deploy

## Development

```bash
cd mobile-app
ionic serve                           # Dev server → http://localhost:8100
START-DEV.bat                         # Dev server + auto-build APK (every 10 min)
```

## Android APK

```bash
# Manual build
cd mobile-app
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Auto-build (keeps only latest 3 APKs)
cd mobile-app && auto-build-apk.bat
# Output: mobile-app/apk-builds/face-attendance-YYYYMMDD_HHmm.apk
```

## Run on Device (USB Debug)

```bash
# List connected devices
npx cap run android --list

# Run on specific device
cd mobile-app && npx cap run android --target <DEVICE_ID>

# Example: Xiaomi
npx cap run android --target d46782c0
```

## Docker (Full Stack)

```bash
docker-compose up                     # PostgreSQL, Redis, API, Dashboard
```

## API Server

```bash
cd api-server
npm run start:dev                     # Dev → http://localhost:3000
npm run start:prod                    # Production
# Swagger docs: http://localhost:3000/api/docs
```

## Output Locations

| Build | Location |
|-------|----------|
| Ionic build | `mobile-app/www/` |
| Debug APK | `mobile-app/android/app/build/outputs/apk/debug/` |
| Auto-build APKs | `mobile-app/apk-builds/` (latest 3 kept) |
| Build logs | `mobile-app/logs/` |

## APK Versioning

Version format: `v{major}.{minor}.{patch}` in `mobile-app/android/app/build.gradle`
