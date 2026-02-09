## Quick Start Guide

### 1. ติดตั้ง Dependencies

```bash
cd api-server
npm install
```

### 2. สร้าง Supabase Project

1. ไปที่ [https://supabase.com](https://supabase.com) และสร้างบัญชี
2. คลิก **New Project**
3. กรอกข้อมูล:
   - Name: `face-attendance`
   - Database Password: สร้างรหัสผ่านที่แข็งแรง (เก็บไว้)
   - Region: เลือก Southeast Asia (Singapore) หรือใกล้ที่สุด
4. คลิก **Create new project** (รอประมาณ 2 นาที)

### 3. เตรียม Environment Variables

1. คัดลอกไฟล์ตัวอย่าง:
```bash
cp .env.example .env
```

2. ไปที่ Supabase Dashboard → **Project Settings** → **API**
3. คัดลอกข้อมูลมากรอกใน `.env`:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
NODE_ENV=development
```

⚠️ **สำคัญ**: ใช้ **Service Role Key** (ไม่ใช่ anon key) เพราะต้องข้าม RLS

### 4. สร้าง Database Schema

1. ไปที่ Supabase Dashboard → **SQL Editor**
2. คลิก **New Query**
3. เปิดไฟล์ `database/schema.sql` และคัดลอกทั้งหมด
4. วางใน SQL Editor แล้วคลิก **Run**
5. ตรวจสอบว่าสร้างตารางครบ 6 ตาราง:
   - companies
   - employees
   - attendance
   - settings
   - admins
   - sync_logs

### 5. รัน API Server

```bash
npm run start:dev
```

เปิดเบราว์เซอร์ไปที่:
- API: [http://localhost:3000](http://localhost:3000)
- Swagger Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### 6. ทดสอบ API

#### สร้างบริษัท (Company)

```bash
curl -X POST http://localhost:3000/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "บริษัทตัวอย่าง จำกัด",
    "code": "EXAMPLE001"
  }'
```

เก็บ `id` ที่ได้ไว้ใช้กับ API อื่น

#### สร้างพนักงาน

```bash
curl -X POST http://localhost:3000/employees \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "uuid-จากขั้นตอนก่อน",
    "employee_code": "EMP001",
    "name": "สมชาย ใจดี",
    "position": "พนักงานเสิร์ฟ",
    "department": "แผนกบริการ"
  }'
```

#### ลงทะเบียนใบหน้า

```bash
curl -X PUT http://localhost:3000/employees/{employee-id}/face \
  -H "Content-Type: application/json" \
  -d '{
    "faceDescriptor": [0.1, 0.2, ..., 0.128]
  }'
```

(ต้องมี 128 ตัวเลข จาก @vladmandic/face-api)

#### Check-In

```bash
curl -X POST http://localhost:3000/attendance/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "company_id": "uuid",
    "face_descriptor": [0.1, 0.2, ..., 0.128],
    "latitude": 13.7563,
    "longitude": 100.5018
  }'
```

## ขั้นตอนถัดไป

✅ **สำเร็จแล้ว - Week 1**:
- Project setup
- Database schema
- 3 core modules (Employees, Attendance, Settings)
- Batch/Sync module สำหรับ HR integration
- Swagger documentation

📋 **Week 2-5 (ยังไม่ได้ทำ)**:
- [ ] Authentication module (login admin)
- [ ] เชื่อม Mobile App กับ API
- [ ] Background sync สำหรับ offline-first
- [ ] Web Dashboard สำหรับ admin
- [ ] Deploy production
- [ ] Integration testing

## ปัญหาที่อาจพบ

### 1. pgvector extension not found

```sql
-- รันใน SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. RLS blocking queries

ตรวจสอบว่าใช้ **Service Role Key** ใน `.env` (ไม่ใช่ anon key)

### 3. CORS errors จาก Mobile App

แก้ใน `src/main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:8100', // Mobile app URL
  credentials: true,
});
```

### 4. Face descriptor validation error

ตรวจสอบว่า array มี 128 ตัวเลขพอดี:
```typescript
faceDescriptor.length === 128
```

## Supabase Free Tier Limits

- **Database**: 500 MB
- **Bandwidth**: 5 GB/month
- **API Requests**: Unlimited
- **File Storage**: 1 GB

สำหรับ 1,000-3,000 พนักงาน:
- Employee + Face vectors: ~150 MB
- Attendance (1 year): ~100 MB
- **รวม**: ~250 MB (**พอใช้งานได้**)

## Database Schema Overview

```
companies (บริษัท/สาขา)
├── employees (พนักงาน + ใบหน้า)
│   ├── face_descriptor (JSONB, 128 numbers)
│   └── face_vector (vector(128), for similarity search)
├── attendance (เข้า-ออกงาน)
│   ├── check_in_time
│   └── check_out_time
├── settings (การตั้งค่า)
│   ├── face detection config
│   └── work schedule
├── admins (ผู้ดูแลระบบ)
└── sync_logs (ประวัติการ sync กับ HR)
```

## HR Integration Flow

### 1. Import Employees (ขาเข้า)

```
HR System → POST /batch/employees/import → Supabase
```

รัน cron job หรือเรียก manual เมื่อมีพนักงานใหม่

### 2. Export Attendance (ขาออก)

```
Supabase → POST /batch/attendance/export → HR System
```

รันอัตโนมัติทุก 1 ชั่วโมง (configurable)

### 3. Sync Logs

ตรวจสอบประวัติการ sync:
```
GET /batch/sync-logs?company_id=xxx
```
