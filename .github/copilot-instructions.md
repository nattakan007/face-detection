# Face Attendance System - AI Agent Instructions

## Project Overview

Face attendance system with real-time face recognition for check-in/check-out. The mobile app is designed to work **100% offline** - all core features (registration, check-in/out, face recognition) must function without internet.

## Development Phases (Implementation Order)

### Phase 1: Mobile App - Offline First (CURRENT PRIORITY)

- All features work completely offline using IndexedDB
- Face registration and recognition runs locally via TensorFlow.js
- Attendance records stored locally with `synced: false` flag
- No API dependency for core functionality

### Phase 2: API & Database - Sync Support

- NestJS API receives data FROM mobile app (not the other way)
- Endpoints designed around sync queue pattern
- PostgreSQL stores synced records from multiple devices
- API validates and deduplicates incoming records

### Phase 3: Web Dashboard - Admin View

- Read-only dashboard for managers/admins
- Reports and analytics from synced data
- Employee management interface

## Architecture

### Three-Tier Structure

```
mobile-app/     → Ionic 8 + Angular 18 + Capacitor (PHASE 1 - ACTIVE)
api-server/     → NestJS backend (PHASE 2 - PLANNED)
web-dashboard/  → Admin dashboard (PHASE 3 - PLANNED)
```

### Mobile App Data Flow

1. **Face Detection**: @vladmandic/face-api@1.7.15 (128D face descriptors) → `FaceDetectionService`
2. **Local Storage**: Ionic Storage (IndexedDB) → `StorageService`
3. **Offline-First**: All attendance records stored locally, synced when online
4. **API Integration**: `ApiService` with fallback to default values when offline
5. **Duplicate Prevention**: 5-minute window for attendance, face matching in registration

## Key Patterns

### Services Location: [mobile-app/src/app/services/](mobile-app/src/app/services/)

- `face-detection.service.ts` - TensorFlow.js face detection with Capacitor Camera
- `storage.service.ts` - IndexedDB wrapper for attendance records and user profiles
- `api.service.ts` - HTTP client with offline fallback pattern
- `permission.service.ts` - Camera/location permissions handling

### Offline-First Pattern (CRITICAL)

**Core Principle**: Mobile app must NEVER require API for core functionality.

```typescript
// 1. All records saved locally first with synced: false
const record: AttendanceRecord = { ...data, synced: false };
await this._storage.set('attendance_records', records);

// 2. API calls always have fallback - see api.service.ts
async getScheduleWithFallback(): Promise<ScheduleConfig> {
  if (await this.checkNetworkStatus()) {
    try { return await this.getScheduleSettings().toPromise(); }
    catch { /* fall through */ }
  }
  return this.getDefaultSchedule(); // Always return valid data
}

// 3. Sync queue pattern for uploading to API (Phase 2)
const unsynced = records.filter(r => !r.synced);
await this.uploadToApi(unsynced);
await this.markAsSynced(unsynced.map(r => r.id));
```

### Storage Models: [mobile-app/src/app/services/storage.service.ts](mobile-app/src/app/services/storage.service.ts)

- `AttendanceRecord` - check-in/out with location, face descriptor, sync status
- `UserProfile` - employee with face descriptor for recognition

## Build Commands

### Mobile App (most common)

```bash
cd mobile-app
npm install
ionic serve                    # Dev server
ionic build --prod             # Production build
ionic capacitor sync android   # Sync to Android
```

### Android APK

```bash
cd mobile-app/android
./gradlew assembleDebug        # Debug APK → app/build/outputs/apk/debug/
./gradlew assembleRelease      # Release APK → app/build/outputs/apk/release/
```

### Docker (full stack)

```bash
docker-compose up              # PostgreSQL, Redis, API, Dashboard
```

## Important Conventions

1. **Camera**: Always use `facingMode: 'user'` (front camera only)
2. **Thai Language**: UI text is in Thai, keep Thai strings in templates
3. **Face Detection**: @vladmandic/face-api@1.7.15 with 0.6 Euclidean distance threshold
4. **Auto-Capture**: 98% confidence, 3-second cooldown, camera stops after successful scan
5. **Capacitor Plugins**: Camera, Geolocation, Network for native features
6. **Angular Version**: 18.x with standalone components supported

## Database Schema

### Mobile (Phase 1) - IndexedDB via Ionic Storage

- `AttendanceRecord` - check-in/out with `synced` flag
- `UserProfile` - employee with `faceDescriptor` array
- All data persisted locally, no server required

### Server (Phase 2) - PostgreSQL

- Multi-company support via `company_id` foreign keys
- Face vectors stored as BLOB in `users.face_vector`
- See [database/schema-multi-company.sql](database/schema-multi-company.sql) for full schema

## Current Status (v2.0.5 - 22 Dec 2025)

**Phase 1 (Mobile Offline): ✅ COMPLETE**

- ✅ Core UI complete (check-in/out, history, manual check-in, registration)
- ✅ IndexedDB storage working with offline-first architecture
- ✅ Real face recognition with @vladmandic/face-api@1.7.15
- ✅ Auto-capture at 98% confidence with duplicate prevention
- ✅ Face matching (0.6 threshold) and duplicate face detection in registration
- ✅ Employee name display in attendance history
- ✅ UX enhancements: required field indicators, camera stop after scan
- ✅ APK v2.0.5 built successfully (~18.4 MB)

**Phase 2 (API/Database):** Not started
**Phase 3 (Dashboard):** Not started
