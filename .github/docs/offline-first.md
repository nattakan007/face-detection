# Offline-First Patterns

## Core Principle

> Mobile app NEVER requires API for core functionality.

All features (registration, check-in/out, face recognition) work **100% offline** using IndexedDB.

## Pattern 1: Local-First Save

```typescript
// Always save locally first with synced: false
const record: AttendanceRecord = { ...data, synced: false };
await this._storage.set('attendance_records', records);
```

## Pattern 2: API Fallback

```typescript
// All API calls have offline fallback
async getScheduleWithFallback(): Promise<ScheduleConfig> {
  if (await this.checkNetworkStatus()) {
    try { return await this.getScheduleSettings().toPromise(); }
    catch { /* fall through */ }
  }
  return this.getDefaultSchedule(); // Always return valid data
}
```

## Pattern 3: Sync Queue

```typescript
// Background sync when online (SyncSchedulerService, every 5 min)
const unsynced = records.filter(r => !r.synced);
await this.uploadToApi(unsynced);
await this.markAsSynced(unsynced.map(r => r.id));
```

## Storage Keys (IndexedDB)

| Key | Type | Description |
|-----|------|-------------|
| `attendance_records` | AttendanceRecord[] | All attendance records |
| `user_profiles` | UserProfile[] | Registered faces |
| `face_data` | FaceData[] | Face descriptors for matching |
| `app_settings` | Settings | App configuration |

## Rules

1. **Never block UI** on network requests
2. **Always provide defaults** when API is unreachable
3. **Sync is background** — user never waits for sync
4. **Conflict resolution** — server timestamp wins on merge
5. **Duplicate prevention** — 5-minute window per employee per type
