# Mobile App Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ionic 8 + Angular 18 |
| Native | Capacitor 8 |
| Storage | Ionic Storage (IndexedDB) |
| Face AI | @vladmandic/face-api@1.7.15 |
| Language | TypeScript 5.x |

## Folder Structure

```
mobile-app/src/app/
├── components/          # Shared components
│   ├── live-camera/     # Camera + face overlay
│   ├── pin-entry/       # PIN entry (legacy)
│   └── pin-change/      # Credential management (username/password)
├── pages/               # Full-page views
│   ├── admin-dashboard/ # Admin panel
│   ├── admin-settings/  # Settings management
│   ├── employees/       # Employee list
│   ├── manual-checkin/  # Manual attendance
│   ├── notification/    # Result alerts
│   ├── register/        # Face registration
│   └── test-connection/ # API diagnostics
├── services/            # Business logic
│   ├── face-detection.service.ts   # TF.js face detection
│   ├── storage.service.ts          # IndexedDB CRUD
│   ├── api.service.ts              # HTTP + offline fallback
│   ├── live-camera.service.ts      # Camera stream
│   ├── settings.service.ts         # App settings
│   ├── sync-scheduler.service.ts   # Background sync
│   ├── auto-checkout.service.ts    # Auto check-out
│   ├── supabase.service.ts         # Supabase client
│   ├── auth.service.ts             # Authentication (username/password + CompanyProfile)
│   └── permission.service.ts       # Native permissions
├── scan/                # Main scan page (check-in/out)
├── history/             # Attendance history
├── home/                # Home/landing
├── tabs/                # Tab navigation
├── guards/              # Route guards
└── models/              # TypeScript interfaces
```

## Data Flow

```
User → Scan Page → LiveCameraComponent → FaceDetectionService
                                              ↓
                                     identifyFace(descriptor)
                                              ↓
                                     StorageService (IndexedDB)
                                              ↓
                                     Save AttendanceRecord {synced: false}
                                              ↓
                                     Navigate → NotificationPage
```

## Key Models

```typescript
interface AttendanceRecord {
  id: string;
  type: 'check-in' | 'check-out';
  timestamp: number;
  date: string;
  time: string;
  location?: { latitude: number; longitude: number };
  faceDescriptor?: number[];
  photoDataUrl?: string;
  confidence?: number;
  employeeId: string;
  employeeName: string;
  synced: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  employeeId: string;
  faceDescriptor: number[];  // 128D vector
  registeredAt: number;
}
```

## Conventions

- **Angular 18** — NgModules (not standalone), lazy-loaded routes
- **SCSS** — Ionic theme variables in `theme/variables.scss`
- **Thai UI** — All user-facing text in Thai, hardcoded in templates
- **Capacitor Plugins** — Camera, Geolocation, Network, StatusBar, Haptics
