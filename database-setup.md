# Database Setup Guide

## 📝 แนะนำชื่อฐานข้อมูล

### สำหรับ Development/Testing:
```
face_attendance_db
face_attendance_dev
attendance_system_db
```

### สำหรับ Production:
```
face_attendance_prod
hr_attendance_db
company_attendance_db
```

## 🎯 แนะนำ: `face_attendance_db`

**เหตุผล:**
- ชื่อตรงตัว อ่านง่าย
- บอกว่าเป็นระบบเช็คชื่อด้วยใบหน้า
- มี underscore ตาม convention ของ MySQL/PostgreSQL

---

## 📋 ข้อมูล Database Server

### ถ้ามี Database Server อยู่แล้ว:
กรุณาแจ้งข้อมูล:
- **Database Type**: MySQL, PostgreSQL, SQL Server?
- **Host**: localhost/IP Address
- **Port**: 3306 (MySQL), 5432 (PostgreSQL), 1433 (SQL Server)
- **Username**:
- **Password**:
- **มี permission สร้าง database หรือไม่?**

---

## 🛠 ขั้นตอนการ Setup

### 1. สร้าง Database
```sql
-- สำหรับ MySQL
CREATE DATABASE face_attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- สำหรับ PostgreSQL
CREATE DATABASE face_attendance_db;
```

### 2. สร้าง Tables
ดูไฟล์ schema ที่: `database/schema.sql`

### 3. เชื่อมต่อจาก API Server
อัปเดทไฟล์: `api-server/.env`

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=face_attendance_db
```

---

## ❓ กรุณาระบุข้อมูล Database Server ของคุณ:

1. **ชนิดของ Database**:
2. **Connection Host**:
3. **Port**:
4. **Username**:
5. **Password**: (ถ้าต้องการ)
6. **ต้องการสร้าง database ใหม่หรือใช้ที่มีอยู่**:

เมื่อได้ข้อมูลแล้ว ผมจะช่วยสร้าง:
- SQL script สำหรับสร้าง tables
- Configuration สำหรับเชื่อมต่อ
- ORM entities สำหรับ NestJS