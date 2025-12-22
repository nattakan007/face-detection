# Database: CAF (Company Attendance Face)

## 📊 Database Information
- **Full Name**: Company Attendance Face
- **Abbreviation**: **CAF**
- **Database Name**: `company_attendance_face` (หรือ `caf_db`)
- **Purpose**: ระบบเช็คชื่อด้วยใบหน้าสำหรับหลายบริษัท

---

## 🏗️ Why CAF Works Well:

### ✅ Pros:
- **Short & Memorable** - 3 characters เท่านั้น
- **Professional** - ใช้ได้ในทุกบริบท (dev, prod, docs)
- **Unique** - ไม่ซ้ำกับ systems อื่นๆ ทั่วไป
- **Descriptive** - บอกได้ว่าเกี่ยวกับ Company, Attendance, Face

### 📝 Usage Examples:
```
Environment Variables:
CAF_DB_HOST=localhost
CAF_DB_PASSWORD=***

Database Name:
company_attendance_face
# หรือสั้นๆ:
caf_db

Connection String:
connectionString="mysql://user:pass@localhost:3306/company_attendance_face"
```

---

## 🗂️ แนะนำ Database Name:

### Full Name (Production):
```
company_attendance_face
```

### Short Name (Development/Testing):
```
caf_db
caf_dev
caf_test
```

### เลือกอันไหนดี?
- **Full Name** (`company_attendance_face`) - ชัดเจน อ่านง่าย แนะนำสำหรับ Production
- **Short Name** (`caf_db`) - กระชับ แนะนำสำหรับ Development

---

## 📋 Next Steps:

### 1. สร้าง Database
```sql
-- Full name version
CREATE DATABASE company_attendance_face
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- หรือ short version
CREATE DATABASE caf_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 2. รัน Schema
```bash
mysql -u username -p company_attendance_face < schema-multi-company.sql
```

### 3. Update API Configuration
```env
# api-server/.env
DB_NAME=company_attendance_face
# หรือ
DB_NAME=caf_db
```

---

## 🎯 คำแนะนำ:

**ใช้ชื่อเต็ม (`company_attendance_face`) สำหรับ:**
- Production environment
- Documentations
- เมื่อต้องการความชัดเจน

**ใช้ชื่อย่อ (`caf_db`) สำหรับ:**
- Development
- Testing
- Container names
- เมื่อต้องการความกระชับ

**CAF เป็นชื่อย่อที่เยี่ยมมาก!** สื่อถึงระบบได้ครบถ้วนและดู professional 👍