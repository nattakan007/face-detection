# Database Schema Design - Face Attendance System

## ภาพรวม

เอกสารนี้อธิบายโครงสร้าง IndexedDB สำหรับระบบ Face Attendance ที่รองรับการเก็บ log การเปรียบเทียบใบหน้า และระบบ audit trail ครบถ้วน

## Database Configuration

```typescript
// mobile-app/src/app/config/database.config.ts
export const DATABASE_CONFIG = {
  name: 'FaceAttendanceDB',
  version: 4,
  stores: {
    EMPLOYEES: 'employees',
    ATTENDANCE: 'attendance',
    FACE_COMPARISONS: 'face_comparisons',
    AUDIT_LOGS: 'audit_logs',
    SYSTEM_LOGS: 'system_logs',
    PERFORMANCE_METRICS: 'performance_metrics',
    FACE_IMAGES: 'face_images',
    SYNC_QUEUE: 'sync_queue',
    DB_STATISTICS: 'db_statistics'
  },
  limits: {
    MAX_EMPLOYEES: 100,
    STORAGE_QUOTA_MB: 50,
    MAX_FACE_IMAGES: 1000,
    MAX_AUDIT_LOGS: 10000,
    MAX_PERFORMANCE_METRICS: 5000
  }
};
```

## 1. Employees Store

### วัตถุประสงค์
เก็บข้อมูลพนักงานและ face descriptors สำหรับการเปรียบเทียบใบหน้า

### Schema
```typescript
interface Employee {
  employeeId: string;        // Primary Key
  name: string;             // ชื่อ-นามสกุล
  department: string;       // แผนก
  position?: string;         // ตำแหน่ง
  email?: string;           // อีเมล
  phone?: string;           // เบอร์โทรศัพท์
  faceDescriptors: number[][]; // Array of face descriptors (128-512 dimensions)
  registrationPhotos: string[]; // Base64 images จากการลงทะเบียน
  registrationDate: number; // Timestamp การลงทะเบียน
  lastUpdated: number;     // Timestamp การอัปเดตล่าสุด
  isActive: boolean;        // สถานะการใช้งาน
  metadata?: {             // ข้อมูลเพิ่มเติม
    deviceInfo: string;
    appVersion: string;
    registrationLocation?: {
      latitude: number;
      longitude: number;
    };
  };
}
```

### Indexes
```typescript
// สำหรับการค้นหาที่รวดเร็ว
const EMPLOYEES_INDEXES = [
  { name: 'name', keyPath: 'name', unique: false },
  { name: 'department', keyPath: 'department', unique: false },
  { name: 'registrationDate', keyPath: 'registrationDate', unique: false },
  { name: 'isActive', keyPath: 'isActive', unique: false },
  { name: 'lastUpdated', keyPath: 'lastUpdated', unique: false }
];
```

## 2. Attendance Store

### วัตถุประสงค์
เก็บข้อมูลการเข้า-ออกงานของพนักงาน

### Schema
```typescript
interface AttendanceRecord {
  id?: number;               // Auto-increment Primary Key
  employeeId: string;        // Foreign Key to Employees
  employeeName: string;      // ชื่อพนักงาน (denormalized for performance)
  type: 'check-in' | 'check-out'; // ประเภทการเช็คชื่อ
  timestamp: number;        // Timestamp การเช็คชื่อ
  date: string;             // YYYY-MM-DD format
  time: string;             // HH:mm:ss format
  location?: {              // ตำแหน่งที่เช็คชื่อ
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  confidence: number;        // ความมั่นใจในการระบุตัวตน
  photoDataUrl: string;      // ภาพที่ใช้ในการเช็คชื่อ
  faceDescriptor: number[];   // Face descriptor ที่ใช้
  processingTime: number;    // เวลาในการประมวลผล (ms)
  algorithm: string;         // Algorithm ที่ใช้
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'; // สถานะการ sync
  syncTimestamp?: number;    // Timestamp การ sync
  retryCount: number;       // จำนวนครั้งที่พยายาม sync
  metadata?: {              // ข้อมูลเพิ่มเติม
    deviceId: string;
    appVersion: string;
    lightCondition: 'GOOD' | 'MODERATE' | 'POOR';
    cameraType: 'FRONT' | 'BACK';
  };
}
```

### Indexes
```typescript
const ATTENDANCE_INDEXES = [
  { name: 'employeeId', keyPath: 'employeeId', unique: false },
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'date', keyPath: 'date', unique: false },
  { name: 'type', keyPath: 'type', unique: false },
  { name: 'syncStatus', keyPath: 'syncStatus', unique: false },
  { name: 'employeeDate', keyPath: ['employeeId', 'date'], unique: false },
  { name: 'typeDate', keyPath: ['type', 'date'], unique: false }
];
```

## 3. Face Comparisons Store

### วัตถุประสงค์
เก็บ log ทุกการเปรียบเทียบใบหน้า ทั้งที่สำเร็จและล้มเหลว

### Schema
```typescript
interface FaceComparisonLog {
  id?: number;               // Auto-increment Primary Key
  timestamp: number;         // Timestamp การเปรียบเทียบ
  date: string;             // YYYY-MM-DD format
  time: string;             // HH:mm:ss format
  
  // ข้อมูลการเปรียบเทียบ
  employeeId?: string;        // null ถ้าไม่พบผู้ตรวจสอบ
  employeeName?: string;      // ชื่อพนักงาน (ถ้าพบ)
  result: 'SUCCESS' | 'FAILED' | 'NO_FACE_DETECTED' | 'LOW_CONFIDENCE' | 'LIVENESS_FAILED';
  
  // ค่าความมั่นใจ
  detectionConfidence: number; // ความมั่นใจในการตรวจจับใบหน้า
  identificationConfidence?: number; // ความมั่นใจในการระบุตัวตน
  livenessScore?: number;    // คะแนน liveness detection
  
  // ข้อมูลเชิงเทคนิค
  processingTime: number;    // เวลาในการประมวลผล (ms)
  algorithm: string;         // 'tensorflow', 'facenet', 'arcface', etc.
  modelVersion: string;      // Version ของ model
  
  // ข้อมูลภาพ
  capturedImagePath: string;  // path หรือ base64 ของภาพที่จับ
  faceBoundingBox?: {        // กรอบใบหน้า
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // ข้อมูล device และสภาพแวดล้อม
  deviceId: string;
  appVersion: string;
  osVersion: string;
  lightCondition?: 'GOOD' | 'MODERATE' | 'POOR';
  cameraType: 'FRONT' | 'BACK';
  
  // ข้อมูล location (ถ้ามี)
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // ข้อมูลการ sync
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  syncTimestamp?: number;
  retryCount: number;
  
  // ข้อมูลเพิ่มเติม
  notes?: string;
  metadata?: any;          // ข้อมูลเพิ่มเติมในอนาคต
}
```

### Indexes
```typescript
const FACE_COMPARISONS_INDEXES = [
  { name: 'employeeId', keyPath: 'employeeId', unique: false },
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'date', keyPath: 'date', unique: false },
  { name: 'result', keyPath: 'result', unique: false },
  { name: 'confidence', keyPath: 'identificationConfidence', unique: false },
  { name: 'syncStatus', keyPath: 'syncStatus', unique: false },
  { name: 'processingTime', keyPath: 'processingTime', unique: false },
  { name: 'algorithm', keyPath: 'algorithm', unique: false },
  { name: 'deviceId', keyPath: 'deviceId', unique: false },
  { name: 'cameraType', keyPath: 'cameraType', unique: false },
  // Composite indexes
  { name: 'employeeDate', keyPath: ['employeeId', 'date'], unique: false },
  { name: 'resultDate', keyPath: ['result', 'date'], unique: false },
  { name: 'dateResult', keyPath: ['date', 'result'], unique: false }
];
```

## 4. Audit Logs Store

### วัตถุประสงค์
เก็บ audit trail ทุกการกระทำในระบบสำหรับการตรวจสอบย้อนหลัง

### Schema
```typescript
interface AuditLog {
  id?: number;               // Auto-increment Primary Key
  timestamp: number;         // Timestamp ของเหตุการณ์
  sessionId: string;         // Session ID ของผู้ใช้
  userId: string;            // User ID ที่ทำการกระทำ
  category: 'USER_ACTION' | 'SYSTEM_EVENT' | 'SECURITY_EVENT' | 'DATA_CHANGE' | 'ATTENDANCE_EVENT' | 'FACE_RECOGNITION' | 'SYNC_EVENT';
  action: string;            // การกระทำที่เกิดขึ้น
  description: string;       // คำอธิบายการกระทำ
  details?: any;             // รายละเอียดเพิ่มเติม
  
  // ข้อมูลเชิงเทคนิค
  ipAddress: string;         // IP Address (mobile device อาจไม่มี)
  userAgent: string;         // User agent ของอุปกรณ์
  deviceId: string;          // Device ID
  
  // ข้อมูล location (ถ้ามี)
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // ข้อมูลการเปลี่ยนแปลง
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  success: boolean;          // การกระทำสำเร็จหรือไม่
  previousValue?: any;       // ค่าก่อนการเปลี่ยนแปลง
  newValue?: any;           // ค่าหลังการเปลี่ยนแปลง
  
  // ข้อมูล entity ที่เกี่ยวข้อง
  relatedEntityId?: string;   // ID ของ entity ที่เกี่ยวข้อง
  relatedEntityType?: string; // ประเภทของ entity
  
  // ข้อมูลการจัดการ
  tags: string[];            // Tags สำหรับการค้นหา
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: number;         // Timestamp การสร้าง log
}
```

### Indexes
```typescript
const AUDIT_LOGS_INDEXES = [
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'userId', keyPath: 'userId', unique: false },
  { name: 'category', keyPath: 'category', unique: false },
  { name: 'action', keyPath: 'action', unique: false },
  { name: 'severity', keyPath: 'severity', unique: false },
  { name: 'success', keyPath: 'success', unique: false },
  { name: 'sessionId', keyPath: 'sessionId', unique: false },
  { name: 'deviceId', keyPath: 'deviceId', unique: false },
  { name: 'syncStatus', keyPath: 'syncStatus', unique: false },
  { name: 'relatedEntityId', keyPath: 'relatedEntityId', unique: false },
  { name: 'relatedEntityType', keyPath: 'relatedEntityType', unique: false },
  // Composite indexes
  { name: 'userTimestamp', keyPath: ['userId', 'timestamp'], unique: false },
  { name: 'categoryTimestamp', keyPath: ['category', 'timestamp'], unique: false },
  { name: 'severityTimestamp', keyPath: ['severity', 'timestamp'], unique: false },
  { name: 'entityTypeTimestamp', keyPath: ['relatedEntityType', 'timestamp'], unique: false }
];
```

## 5. System Logs Store

### วัตถุประสงค์
เก็บ system logs สำหรับการ debug และ monitoring

### Schema
```typescript
interface SystemLog {
  id?: number;               // Auto-increment Primary Key
  timestamp: number;         // Timestamp ของ log
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  category: 'FACE_DETECTION' | 'ATTENDANCE' | 'SYNC' | 'PERFORMANCE' | 'SECURITY' | 'DATABASE';
  message: string;           // ข้อความ log
  details?: any;             // รายละเอียดเพิ่มเติม
  userId?: string;           // User ID ที่เกี่ยวข้อง (ถ้ามี)
  sessionId: string;         // Session ID
  stackTrace?: string;       // Stack trace (สำหรับ errors)
  metadata?: any;            // ข้อมูลเพิ่มเติม
}
```

### Indexes
```typescript
const SYSTEM_LOGS_INDEXES = [
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'level', keyPath: 'level', unique: false },
  { name: 'category', keyPath: 'category', unique: false },
  { name: 'sessionId', keyPath: 'sessionId', unique: false },
  { name: 'userId', keyPath: 'userId', unique: false },
  // Composite indexes
  { name: 'levelTimestamp', keyPath: ['level', 'timestamp'], unique: false },
  { name: 'categoryTimestamp', keyPath: ['category', 'timestamp'], unique: false }
];
```

## 6. Performance Metrics Store

### วัตถุประสงค์
เก็บ performance metrics สำหรับการวิเคราะห์และปรับปรุงประสิทธิภาพ

### Schema
```typescript
interface PerformanceMetric {
  id?: number;               // Auto-increment Primary Key
  timestamp: number;         // Timestamp ของการวัด
  operation: 'FACE_DETECTION' | 'FACE_COMPARISON' | 'DATABASE_QUERY' | 'SYNC_OPERATION' | 'IMAGE_PROCESSING';
  duration: number;          // เวลาที่ใช้ (ms)
  success: boolean;          // สำเร็จหรือไม่
  details?: {                // รายละเอียดเพิ่มเติม
    employeeCount?: number;    // จำนวนพนักงานที่ compare
    imageSize?: number;       // ขนาดภาพ (bytes)
    algorithm?: string;       // Algorithm ที่ใช้
    confidence?: number;      // ความมั่นใจ
    errorType?: string;       // ประเภทของ error (ถ้ามี)
    retryCount?: number;      // จำนวนครั้งที่ retry
  };
  date: string;              // YYYY-MM-DD format
  hour: number;              // Hour (0-23)
  metadata?: any;            // ข้อมูลเพิ่มเติม
}
```

### Indexes
```typescript
const PERFORMANCE_METRICS_INDEXES = [
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'operation', keyPath: 'operation', unique: false },
  { name: 'duration', keyPath: 'duration', unique: false },
  { name: 'success', keyPath: 'success', unique: false },
  { name: 'date', keyPath: 'date', unique: false },
  { name: 'hour', keyPath: 'hour', unique: false },
  // Composite indexes
  { name: 'operationTimestamp', keyPath: ['operation', 'timestamp'], unique: false },
  { name: 'operationDate', keyPath: ['operation', 'date'], unique: false },
  { name: 'durationRange', keyPath: 'duration', unique: false },
  { name: 'dateHour', keyPath: ['date', 'hour'], unique: false }
];
```

## 7. Face Images Store

### วัตถุประสงค์
เก็บภาพใบหน้าที่ใช้ในการเปรียบเทียบแยกจากข้อมูลอื่นเพื่อประสิทธิภาพ

### Schema
```typescript
interface FaceImage {
  id?: number;               // Auto-increment Primary Key
  comparisonId: number;      // Foreign Key to FaceComparisons
  timestamp: number;         // Timestamp การถ่ายภาพ
  imageData: string;         // Base64 image data
  imageSize: number;         // ขนาดภาพ (bytes)
  imageFormat: string;        // 'jpeg', 'png', etc.
  width: number;             // ความกว้างภาพ
  height: number;            // ความสูงภาพ
  quality: number;           // คุณภาพ (1-100)
  compressionRatio: number;   // อัตราส่วนการบีบอัด
  metadata?: {               // ข้อมูลเพิ่มเติม
    deviceInfo: string;
    cameraSettings: {
      flashUsed: boolean;
      autoFocus: boolean;
      exposureTime: number;
      iso: number;
    };
    processingInfo: {
      faceDetected: boolean;
      faceQuality: number;
      blurScore: number;
      brightnessScore: number;
    };
  };
}
```

### Indexes
```typescript
const FACE_IMAGES_INDEXES = [
  { name: 'comparisonId', keyPath: 'comparisonId', unique: false },
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'imageSize', keyPath: 'imageSize', unique: false },
  { name: 'quality', keyPath: 'quality', unique: false }
];
```

## 8. Sync Queue Store

### วัตถุประสงค์
เก็บข้อมูลที่ต้อง sync กับ server ในอนาคต

### Schema
```typescript
interface SyncQueueItem {
  id?: number;               // Auto-increment Primary Key
  dataType: 'attendance' | 'employee' | 'face_comparison' | 'audit_log' | 'performance_metric';
  data: any;                // ข้อมูลที่ต้อง sync
  timestamp: number;         // Timestamp การสร้าง
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'PROCESSING' | 'SYNCED' | 'FAILED' | 'RETRY';
  retryCount: number;        // จำนวนครั้งที่พยายาม sync
  maxRetries: number;        // จำนวนครั้งสูงสุดที่ retry ได้
  lastRetryTimestamp?: number; // Timestamp การ retry ล่าสุด
  nextRetryTimestamp?: number; // Timestamp ที่ควร retry ครั้งต่อไป
  errorMessage?: string;      // ข้อความ error (ถ้ามี)
  serverResponse?: any;       // Response จาก server (ถ้ามี)
  metadata?: {               // ข้อมูลเพิ่มเติม
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers: Record<string, string>;
    timeout: number;
  };
}
```

### Indexes
```typescript
const SYNC_QUEUE_INDEXES = [
  { name: 'dataType', keyPath: 'dataType', unique: false },
  { name: 'status', keyPath: 'status', unique: false },
  { name: 'priority', keyPath: 'priority', unique: false },
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'nextRetryTimestamp', keyPath: 'nextRetryTimestamp', unique: false },
  // Composite indexes
  { name: 'statusPriority', keyPath: ['status', 'priority'], unique: false },
  { name: 'dataTypeStatus', keyPath: ['dataType', 'status'], unique: false },
  { name: 'retryQueue', keyPath: ['status', 'nextRetryTimestamp'], unique: false }
];
```

## 9. Database Statistics Store

### วัตถุประสงค์
เก็บสถิติของ database สำหรับการ monitor และ maintenance

### Schema
```typescript
interface DatabaseStatistic {
  id?: number;               // Auto-increment Primary Key
  timestamp: number;         // Timestamp การบันทึก
  storeName: string;         // ชื่อ store
  statType: 'SIZE' | 'COUNT' | 'PERFORMANCE' | 'HEALTH';
  value: number;             // ค่าของสถิติ
  unit: string;              // หน่วย (bytes, records, ms, etc.)
  details?: {                // รายละเอียดเพิ่มเติม
    breakdown?: Record<string, number>;
    average?: number;
    min?: number;
    max?: number;
    trend?: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  metadata?: any;            // ข้อมูลเพิ่มเติม
}
```

### Indexes
```typescript
const DB_STATISTICS_INDEXES = [
  { name: 'timestamp', keyPath: 'timestamp', unique: false },
  { name: 'storeName', keyPath: 'storeName', unique: false },
  { name: 'statType', keyPath: 'statType', unique: false },
  // Composite indexes
  { name: 'storeStatType', keyPath: ['storeName', 'statType'], unique: false },
  { name: 'statTypeTimestamp', keyPath: ['statType', 'timestamp'], unique: false }
];
```

## Database Migration Strategy

### Version Management
```typescript
// mobile-app/src/app/services/database-migration.service.ts
export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial database setup',
    stores: ['employees', 'attendance', 'sync_queue'],
    up: async (db: IDBDatabase) => {
      // Create initial stores
    }
  },
  {
    version: 2,
    description: 'Add face comparison logging',
    stores: ['face_comparisons', 'face_images'],
    up: async (db: IDBDatabase) => {
      // Add face comparison stores
    }
  },
  {
    version: 3,
    description: 'Add audit trail system',
    stores: ['audit_logs', 'system_logs'],
    up: async (db: IDBDatabase) => {
      // Add audit trail stores
    }
  },
  {
    version: 4,
    description: 'Add performance metrics',
    stores: ['performance_metrics', 'db_statistics'],
    up: async (db: IDBDatabase) => {
      // Add performance monitoring stores
    }
  }
];
```

## Data Retention Policy

### Automatic Cleanup Rules
```typescript
// mobile-app/src/app/config/retention.config.ts
export const RETENTION_POLICY = {
  FACE_COMPARISONS: {
    RETENTION_DAYS: 90,        // เก็บ 90 วัน
    CLEANUP_INTERVAL: 7,      // ทำ cleanup ทุก 7 วัน
    EXCEPTIONS: ['SUCCESS']     // เก็บ SUCCESS ไว้นานกว่า
  },
  AUDIT_LOGS: {
    RETENTION_DAYS: 180,       // เก็บ 180 วัน
    CLEANUP_INTERVAL: 30,     // ทำ cleanup ทุก 30 วัน
    EXCEPTIONS: ['SECURITY_EVENT', 'DATA_CHANGE'] // เก็บ events สำคัญไว้ตลอด
  },
  SYSTEM_LOGS: {
    RETENTION_DAYS: 30,        // เก็บ 30 วัน
    CLEANUP_INTERVAL: 7,      // ทำ cleanup ทุก 7 วัน
    EXCEPTIONS: ['ERROR', 'FATAL'] // เก็บ errors ไว้นานกว่า
  },
  PERFORMANCE_METRICS: {
    RETENTION_DAYS: 30,        // เก็บ 30 วัน
    CLEANUP_INTERVAL: 7,      // ทำ cleanup ทุก 7 วัน
    EXCEPTIONS: []           // ไม่มี exception
  },
  FACE_IMAGES: {
    RETENTION_DAYS: 30,        // เก็บ 30 วัน
    CLEANUP_INTERVAL: 7,      // ทำ cleanup ทุก 7 วัน
    EXCEPTIONS: []           // ไม่มี exception
  }
};
```

## Performance Optimization

### Index Usage Guidelines
1. **Single Column Indexes** - สำหรับการค้นหาตามค่าเดียว
2. **Composite Indexes** - สำหรับการค้นหาตามหลายเงื่อนไข
3. **Range Queries** - ใช้ IDBKeyRange สำหรับการค้นหาช่วง
4. **Cursor-based Operations** - สำหรับการประมวลผลข้อมูลจำนวนมาก

### Query Optimization
```typescript
// ตัวอย่างการค้นหาที่ optimized
async getFaceComparisons(filters: FaceComparisonFilters): Promise<FaceComparisonLog[]> {
  const db = await this.getDatabase();
  const transaction = db.transaction(['face_comparisons'], 'readonly');
  const store = transaction.objectStore('face_comparisons');
  
  let request: IDBRequest;
  
  // ใช้ index ที่เหมาะสมกับ filters
  if (filters.employeeId && filters.startDate) {
    const index = store.index('employeeDate');
    const range = IDBKeyRange.bound(
      [filters.employeeId, filters.startDate.getTime()],
      [filters.employeeId, filters.endDate?.getTime() || Date.now()]
    );
    request = index.getAll(range);
  } else if (filters.result && filters.startDate) {
    const index = store.index('resultDate');
    const range = IDBKeyRange.bound(
      [filters.result, filters.startDate.getTime()],
      [filters.result, filters.endDate?.getTime() || Date.now()]
    );
    request = index.getAll(range);
  } else {
    request = store.getAll();
  }
  
  return request.result as FaceComparisonLog[];
}
```

## Security Considerations

### Data Encryption
```typescript
// mobile-app/src/app/services/encryption.service.ts
export class EncryptionService {
  private readonly ENCRYPTION_KEY = 'your-encryption-key';
  
  async encryptSensitiveData(data: any): Promise<string> {
    // เข้ารหัสข้อมูลที่ sensitive (face descriptors, images)
    const jsonString = JSON.stringify(data);
    return btoa(jsonString); // Simple encoding, use proper encryption in production
  }
  
  async decryptSensitiveData(encryptedData: string): Promise<any> {
    const jsonString = atob(encryptedData);
    return JSON.parse(jsonString);
  }
}
```

### Access Control
```typescript
// mobile-app/src/app/services/access-control.service.ts
export class AccessControlService {
  private readonly PERMISSIONS = {
    READ_EMPLOYEES: 'read:employees',
    WRITE_EMPLOYEES: 'write:employees',
    READ_ATTENDANCE: 'read:attendance',
    WRITE_ATTENDANCE: 'write:attendance',
    READ_LOGS: 'read:logs',
    DELETE_DATA: 'delete:data'
  };
  
  hasPermission(userRole: string, permission: string): boolean {
    const rolePermissions = this.getRolePermissions(userRole);
    return rolePermissions.includes(permission);
  }
}
```

## การบำรุงรักษา

### Regular Maintenance Tasks
1. **Database Cleanup** - ทำตาม retention policy
2. **Index Optimization** - 重建 indexes ที่จำเป็น
3. **Statistics Update** - อัปเดต database statistics
4. **Backup Verification** - ตรวจสอบความสมบูรณ์ของ backup

### Monitoring Alerts
```typescript
// mobile-app/src/app/services/database-monitor.service.ts
export class DatabaseMonitorService {
  private readonly ALERT_THRESHOLDS = {
    STORAGE_USAGE: 0.8,        // 80% ของ storage quota
    QUERY_TIME: 5000,           // 5 วินาที
    ERROR_RATE: 0.05,           // 5% error rate
    RETRY_COUNT: 3              // 3 ครั้ง retry
  };
  
  async checkDatabaseHealth(): Promise<HealthReport> {
    const stats = await this.getDatabaseStatistics();
    const performance = await this.getPerformanceMetrics();
    
    return {
      storageUsage: stats.totalSize / this.maxStorageSize,
      averageQueryTime: performance.averageQueryTime,
      errorRate: performance.errorRate,
      status: this.calculateHealthStatus(stats, performance)
    };
  }
}
```

## สรุป

Database schema นี้ถูกออกแบบมาเพื่อ:

1. **Performance** - ใช้ indexes ที่เหมาะสมสำหรับการค้นหา
2. **Scalability** รองรับข้อมูลได้ถึง 1000+ พนักงาน
3. **Audit Trail** - เก็บข้อมูลครบถ้วนสำหรับการตรวจสอบย้อนหลัง
4. **Security** - มีการเข้ารหัสและควบคุมการเข้าถึง
5. **Maintenance** - มีระบบ cleanup และ monitoring ในตัว

การ implement schema นี้จะทำให้ระบบ Face Attendance มีฐานข้อมูลที่แข็งแกร่ง ปลอดภัย และพร้อมใช้งานจริง