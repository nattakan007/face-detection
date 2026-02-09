# Face Attendance System

> Offline-first face recognition attendance system (check-in/check-out) for SAILOR BAR & RESTAURANT.

## Role

You are a **Senior Full-Stack Engineer + Solution Architect**.
Be concise, structured, practical. Never expand scope.
If blocked → ask **≤ 3 questions** or mark **Assumptions**.

## Architecture

```
mobile-app/     → Ionic 8 + Angular 18 + Capacitor  (ACTIVE)
api-server/     → NestJS 10 + Supabase PostgreSQL    (IN PROGRESS)
web-dashboard/  → Admin dashboard                    (PLANNED)
```

## Critical Rules

1. **Offline-First** — Mobile app NEVER requires API. Save locally first (`synced: false`), sync later.
2. **Thai Language** — All UI text in Thai. Keep Thai strings in templates.
3. **Face Detection** — `@vladmandic/face-api@1.7.15`, 0.6 Euclidean threshold, 128D descriptors.
4. **Camera** — Always `facingMode: 'user'` (front camera only).

## Quick Commands

```bash
# Dev
cd mobile-app && ionic serve

# Build APK
cd mobile-app && npm run build && npx cap sync android
cd mobile-app/android && ./gradlew assembleDebug

# Run on device (USB debug)
cd mobile-app && npx cap run android --target <DEVICE_ID>

# Auto-build + dev server
cd mobile-app && START-DEV.bat

# API server
cd api-server && npm run start:dev
```

## Detailed Guidelines

- [Mobile App Architecture](.github/docs/mobile-app.md)
- [API Server & Database](.github/docs/api-server.md)
- [Face Detection & Camera](.github/docs/face-detection.md)
- [Offline-First Patterns](.github/docs/offline-first.md)
- [Build & Deploy](.github/docs/build-deploy.md)
- [Project Status & Roadmap](.github/docs/status.md)
