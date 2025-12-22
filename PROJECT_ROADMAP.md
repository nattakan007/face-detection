# Face Attendance System - Project Roadmap

## 📋 สถานะปัจจุบัน (22 ธ.ค. 2567)

### ✅ เสร็จสมบูรณ์

#### 1. Mobile App (Android) - 100%
- [x] สร้าง Ionic Angular App แบบ Single Page (ไม่มีแท็บ)
- [x] ติดตั้ง Plugins: Camera, Geolocation, Storage
- [x] สร้าง Services: Face Detection (Mock Mode), Storage, Settings
- [x] Build APK สำเร็จ (app-debug.apk) - 8.1 MB
- [x] Build Release APK (unsigned) - 6.4 MB
- [x] พร้อมติดตั้งบนมือถือ Android
- [x] ปรับปรุง UI ให้ทันสมัยและใช้งานง่าย
- [x] ลบแถบเมนู Home/Scan/History
- [x] ลบหน้า Settings และย้ายเมนูไปที่หน้าหลัก
- [x] ปุ่ม 3 จุด (⋮) ที่มุมขวาบน แสดงเฉพาะข้อความไม่มีไอคอน
- [x] ปรับโปรไฟล์พนักงานแบบกระชับ 2 แถว
- [x] Banner สีเดียวกับปุ่มสแกน
- [x] พื้นหลังสีขาวทั่วแอป
- [x] ลบส่วนสถานะวันนี้ ขยายพื้นที่สแกนใบหน้า
- [x] เพิ่มปุ่ม "เข้างานด้วยตนเอง" และ "ลงทะเบียนพนักงาน"
- [x] ทำ Responsive Design สำหรับทุกขนาดหน้าจอ (Mobile, Tablet, Desktop)
- [x] ใช้ API-based scheduling แทน static time พร้อม offline fallback
- [x] Real Face Detection ด้วย @vladmandic/face-api@1.7.15
- [x] แก้ไข duplicate attendance records (5-minute window)
- [x] เพิ่ม employee name display ในหน้า history
- [x] เพิ่มฟีเจอร์ "เข้างานด้วยตนเอง" (manual check-in)
- [x] เพิ่มฟีเจอร์ตรวจจับใบหน้าซ้ำในการลงทะเบียน
- [x] ปรับ auto-capture behavior - หยุดหลังสแกนสำเร็จ
- [x] เพิ่มหมายเหตุ required fields ในหน้าลงทะเบียน
- [x] Build APK v2.0.5 สำเร็จ (22 ธ.ค. 2567)

#### 2. API Server Structure - 35%
- [x] สร้างโครงสร้าง NestJS Project
- [x] ติดตั้ง Dependencies (TypeORM, JWT, etc.)
- [x] Database: CAF (Company Attendance Face) - SQL Server
- [x] Connection: 13.214.55.161:1433 (SQL Server 2017)
- [x] Schema: Multi-company support (companies, users, attendance, etc.)
- [x] สร้าง API Service สำหรับดึงตารางเวลาแบบ dynamic
- [x] ใช้ HttpClientModule สำหรับการเชื่อมต่อ API
- [x] พัฒนา offline fallback mechanism (default 8:00-17:00)
- [ ] 🔄 สร้าง tables ใน database
- [ ] ❌ ยังไม่ได้ implement endpoints
- [ ] ❌ ยังไม่ได้ develop business logic

#### 3. Web Dashboard - 10%
- [x] สร้างโครงสร้าง Angular Project
- [ ] ❌ ยังไม่ได้ develop components และ pages
- [ ] ❌ ยังไม่ได้เชื่อมต่อ API
- [ ] ❌ ยังไม่ได้ออกแบบ UI

#### 4. Database - 70%
- [x] ✅ Database Name: CAF (Company Attendance Face)
- [x] ✅ SQL Server 2017 on 13.214.55.161:1433
- [x] ✅ Connection test successful
- [x] ✅ Multi-company schema created (10 tables)
- [x] ✅ SQL Server specific queries (mssql)
- [ ] 🔄 Execute schema to create tables
- [ ] ❌ ยังไม่ได้ test with actual data

---

## 🎯 Phase 1: Minimum Viable Product (MVP) - สร้างให้ทำงานได้

### 1.1 Backend API Server (Priority 1)
**Time Estimate: 3-5 วัน**

#### Endpoints ที่ต้องสร้าง:
```typescript
// Authentication
POST   /api/auth/login          // Login ด้วย employee_id
POST   /api/auth/register       // Register ผู้ใช้ใหม่
GET    /api/auth/profile         // Get user profile

// Attendance Management
POST   /api/attendance/check-in    // เช็คอิน
POST   /api/attendance/check-out   // เช็คเอาท์
GET    /api/attendance/history     // ดูประวัติ
GET    /api/attendance/today       // ดูสถานะวันนี้

// Sync & Data Management
POST   /api/sync/upload           // อัปโหลดข้อมูล offline
GET    /api/sync/pending          // ดูข้อมูลรอซิงค์
POST   /api/face/register          // ลงทะเบียนใบหน้า

// File Upload
POST   /api/upload/face-photo     // อัปโหลดรูปใบหน้า
```

#### Features ที่ต้อง implement:
- [ ] JWT Authentication
- [ ] File Upload Service
- [ ] Face Recognition Integration
- [ ] Data Validation
- [ ] Error Handling
- [ ] API Documentation (Swagger)

---

### 1.2 Database Setup (Priority 1)
**Time Estimate: 1-2 วัน**

#### Database Schema:
```sql
-- Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    department VARCHAR(100),
    face_vector BLOB,  -- Face encoding
    face_photo_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type ENUM('check-in', 'check-out') NOT NULL,
    timestamp DATETIME NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    photo_path VARCHAR(255),
    face_confidence DECIMAL(3, 2),
    sync_status BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Offline Sync Queue
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    data_type VARCHAR(50) NOT NULL,  -- 'attendance', 'photo', etc.
    data JSON NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Device Registration
CREATE TABLE device_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL,  -- 'android', 'ios'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### 1.3 Mobile App - Real Integration (Priority 2)
**Time Estimate: 5-7 วัน**

#### Tasks:
- [ ] Connect กับ Backend API
- [ ] Implement Real Face Recognition
  - ใช้ Face Recognition API หรือ
  - Integrate TensorFlow.js + Face-Net
- [ ] Offline Sync Queue
- [ ] Push Notifications (Firebase)
- [ ] Improve UI/UX
  - แสดงรูปใบหน้าตอน check-in
  - Loading states
  - Error messages
- [ ] User Profile Management
- [ ] Settings Page

---

### 1.4 Web Dashboard (Priority 2)
**Time Estimate: 5-7 วัน**

#### Pages/Components:
- [ ] Login Page
- [ ] Dashboard Overview
  - สถิติการเข้างานวันนี้
  - กราฟการเข้างานรายสัปดาห์
  - จำนวนพนักงานที่เข้างาน/ลา/มาสาย
- [ ] Employee Management
  - ลงทะเบียนพนักงานใหม่
  - ลงทะเบียนใบหน้า
  - แก้ไขข้อมูล
- [ ] Attendance Reports
  - ดูประวัติตามวัน/เดือน/ปี
  - Export to Excel/CSV
  - Summary Reports
- [ ] Settings
  - Company settings
  - Working hours configuration

---

---

## 🔄 การอัพเดทล่าสุด (22 ธ.ค. 2567)

### Mobile App Updates - Version 2.0.5:

1. **Face Recognition Implementation (22 ธ.ค.):**
   - ✅ ติดตั้ง @vladmandic/face-api@1.7.15 สำหรับ face detection
   - ✅ ใช้ 128D face descriptors สำหรับการจดจำใบหน้า
   - ✅ Auto-capture ที่ confidence 98% พร้อม 3-second cooldown
   - ✅ Face matching threshold: 0.6 Euclidean distance
   - ✅ ตรวจจับใบหน้าซ้ำในการลงทะเบียนพนักงาน

2. **Attendance Recording Improvements (22 ธ.ค.):**
   - ✅ แก้ไข duplicate records ด้วย 5-minute window
   - ✅ บันทึก employeeId, employeeName, employeeDepartment ใน attendance record
   - ✅ แสดงชื่อพนักงานในหน้า history
   - ✅ เพิ่มฟีเจอร์ "เข้างานด้วยตนเอง" (manual check-in without face detection)

3. **UX Enhancements (22 ธ.ค.):**
   - ✅ ปรับ auto-scan behavior - กล้องหยุดหลังสแกนสำเร็จ ไม่ถ่ายซ้ำ
   - ✅ ผู้ใช้ต้องกดปุ่ม "สแกนใบหน้า" เพื่อเริ่มสแกนใหม่
   - ✅ เพิ่มหมายเหตุ required fields ในหน้าลงทะเบียน:
     - เครื่องหมาย * สีแดงที่ "ถ่ายรูปโปรไฟล์" และ "ชื่อ-นามสกุล"
     - ข้อความแจ้งเตือน "ข้อมูลที่จำเป็น: ชื่อ-นามสกุล, รูปถ่ายใบหน้า"

4. **UI/UX Improvements (17 ธ.ค.):**
   - ลบ Settings page และย้ายเมนูไปที่หน้าหลัก
   - ปุ่ม 3 จุด (⋮) ที่มุมขวาบน ไม่มีไอคอน เฉพาะข้อความ
   - Popover menu ไม่มีไอคอน แสดงเฉพาะข้อความ
   - ลบส่วน "สถานะวันนี้" และขยายพื้นที่กล้องใหญ่ขึ้น
   - เพิ่มปุ่ม "เข้างานด้วยตนเอง" และ "ลงทะเบียนพนักงาน" ในส่วนกล้อง

5. **Responsive Design Implementation:**
   - ปรับ layout ให้รองรับทุกขนาดหน้าจอ
   - Mobile (< 480px): พื้นที่กล้อง 300px, ปุ่มเล็กลง
   - Tablet (768px+): พื้นที่กล้อง 450px, ปุ่มใหญ่ขึ้น
   - Desktop (1024px+): พื้นที่กล้อง 500px, ปุ่มใหญ่สุด

6. **Dynamic Scheduling Feature:**
   - เปลี่ยนจากเวลา fix 8:00-17:00 เป็นดึงจาก API
   - สร้าง API Service สำหรับเชื่อมต่อกับเซิร์ฟเวอร์
   - Offline fallback: ใช้เวลาเดิม 8:00-17:00 ถ้าไม่มีเน็ต
   - มีการ cache ข้อมูล 5 นาที

7. **Previous Improvements:**
   - เปลี่ยนจาก 3 แท็บเป็น Single Page Design
   - ใช้สีฟ้าสว่างทั่วแอป (Bright Theme)
   - พื้นหลังการ์ดสีขาวทั้งหมด
   - Banner แบบไร้ไอคอน มีแต่ข้อความ

5. **Profile Section:**
   - แสดงแค่ข้อมูลจำเป็น: ชื่อ, รหัสพนักงาน, สถานะ
   - Layout 2 แถวแนวตั้งกระชับ
   - รูปโปรไฟล์ปรับขนาดตามหน้าจอ

8. **Navigation:**
   - ไม่มีแถบเมนูด้านล่าง
   - ปุ่มเมนูแบบ floating มุมขวาบน

### APK Information:
- **Version:** 2.0.5 (Build 22 ธ.ค. 2567)
- **Debug APK:** app-debug.apk - ~18.4 MB
- **Features:** Real face detection, offline-first, duplicate prevention
- **Location:** C:\Users\Nutth\OneDrive\Documents\face-attendance\mobile-app\android\app\build\outputs\apk\debug\

---

## 🚀 Phase 2: Features เพิ่มเติม (Post-MVP)

### 2.1 Advanced Features
**Time Estimate: 2-3 สัปดาห์**

- [ ] **Role-based Access Control**
  - Admin, Manager, Employee roles
  - Permission management

- [ ] **Leave Management**
  - ลางานออนไลน์
  - อนุมัติการลา
  - คำนวณวันลาคงเหลือ

- [ ] **Overtime Management**
  - บันทึก OT
  - คำนวนค่าล่วงเวลา
  - Approval workflow

### 2.2 Mobile Enhancements
**Time Estimate: 1-2 สัปดาห์**

- [ ] **Push Notifications**
  - แจ้งเตือนเวลาเข้างาน
  - แจ้งเตือนลืม check-in/out
  - แจ้งเตือนการอนุมัติ

- [ ] **Face Recognition Improvement**
  - Liveness detection (ป้องกัน photo spoofing)
  - Multiple face angles
  - ใบหน้าในมืด/สว่าง

- [ ] **Geofencing**
  - กำหนดพื้นที่ทำงาน
  - Check-in ได้เฉพาะในพื้นที่

### 2.3 Analytics & Reports
**Time Estimate: 1-2 สัปดาห์**

- [ ] **Advanced Analytics**
  - รายงานการมาสาย
  - รายงานสรุปประจำเดือน
  - Productivity analytics

- [ ] **Export Features**
  - PDF Reports
  - Excel with charts
  - API for third-party integration

---

## 📅 Timeline และ Milestones

### Current Status (22 ธ.ค. 2567):
- ✅ Mobile App: 100% (v2.0.5 with real face recognition, offline-first, UX enhancements)
- ✅ Database: 70% (Connected, schema ready, need to create tables)
- 🔄 API Server: 35% (Structure ready, API service created for scheduling)
- ❌ Web Dashboard: 10% (Structure only)

### Sprint 1 (2 สัปดาห์)
- [x] Database setup and connection ✅
- [x] Create tables in CAF database ✅
- [x] Real Face Recognition Integration ✅ (22 ธ.ค.)
- [x] Mobile App UX Improvements ✅ (22 ธ.ค.)
- [ ] Create basic API endpoints (auth, attendance)
- [ ] Connect mobile app to backend

### Sprint 2 (2 สัปดาห์)
- [x] Implement Face Recognition ✅ (22 ธ.ค.)
- [ ] Create Web Dashboard UI
- [ ] Testing & QA
- [ ] Mobile app backend integration

### Phase 2 (4-6 สัปดาห์)
- [ ] Advanced features
- [ ] Performance optimization
- [ ] Production deployment

---

## 🛠 Technical Debt & Improvements

### Immediate:
- [x] เปลี่ยน Mock Face Detection เป็น Real Implementation ✅ (22 ธ.ค.)
- [x] Add error handling ใน mobile app ✅
- [ ] Implement proper logging
- [ ] Add unit tests

### Future:
- [ ] Microservices architecture
- [ ] Containerization (Docker)
- [ ] CI/CD pipeline
- [ ] Load balancing

---

## 📝 Notes & Considerations

1. **Face Recognition Options:**
   - Cloud API: AWS Rekognition, Google Vision API
   - On-premise: OpenCV + Face-Net, Microsoft Cognitive Services
   - Hybrid: Edge computing บน mobile + Cloud verification

2. **Security:**
   - Encryption ข้อมูลใบหน้า
   - Secure API endpoints
   - GDPR compliance

3. **Performance:**
   - Image compression
   - Caching strategies
   - Offline-first architecture

4. **Testing:**
   - ทดสอบกับอุปกรณ์หลายรุ่น
   - ทดสอบในสภาพแวดล้อมจริง
   - Performance testing

---

## 🤔 Next Steps Recommendation

**ถ้าต้องการ MVP เร็วที่สุด:**
1. ทำ Backend API ก่อน (Priority 1)
2. เชื่อมต่อ Mobile App กับ API
3. ทำ Web Dashboard แบบพื้นฐาน

**ถ้าต้องการทดสอบกับผู้ใช้จริงก่อน:**
1. ปรับปรุง Mobile App UI/UX
2. ทดสอบ Face Recognition กับผู้ใช้จริง
3. เก็บ feedback และ iterate

**อัพเดทล่าสุด:** 22 ธันวาคม 2567
**ผู้รับผิดชอบ:** Development Team
**Version:** Mobile App v2.0.5 (Face Recognition Complete)

---
## 📝 Next Actions (Prioritized)

### Immediate (Today):
1. **Create Tables in CAF Database**
   - Run schema-mssql.sql via SSMS or create-tables.js
   - Verify all 10 tables are created
   - Insert default test data

2. **Start Building API Endpoints**
   - Auth module (login/register)
   - Attendance module (check-in/out)
   - User management

### Mobile App Next Steps:
1. **Backend Integration**
   - Connect to real API endpoints
   - Implement sync queue for offline data
   - Add error handling for network issues

2. **Face Recognition Improvements**
   - Add liveness detection (ป้องกัน photo spoofing)
   - Test with various lighting conditions
   - Optimize performance

3. **User Testing**
   - Deploy APK to test users
   - Collect feedback on UI/UX
   - Test with real face recognition

### This Week:
- Complete basic CRUD operations
- Connect mobile app to backend
- Test end-to-end flow

### Next Week:
- Web Dashboard development
- Face Recognition integration