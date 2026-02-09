# วิธีเริ่ม Development

## เริ่มทำงาน (แบบง่าย)

ดับเบิลคลิก: **`START-DEV.bat`**

จะเปิด:
1. ✅ Ionic dev server → http://localhost:8100
2. ✅ Auto-build APK ทุก 15 นาที → `apk-builds/`

---

## เริ่มทำงาน (แบบแยก)

### 1. รัน Ionic dev server อย่างเดียว
```bash
ionic serve
```

### 2. รัน Auto-build APK อย่างเดียว
```bash
auto-build-apk.bat
```

---

## Output Folders

- **APK builds**: `mobile-app/apk-builds/` (เก็บ 3 ไฟล์ล่าสุด)
- **Build logs**: `mobile-app/logs/`
- **Ionic build**: `mobile-app/www/`

---

## หยุดการทำงาน

- กด `Ctrl+C` ในหน้าต่าง terminal แต่ละตัว
- หรือปิดหน้าต่าง cmd ทิ้ง
