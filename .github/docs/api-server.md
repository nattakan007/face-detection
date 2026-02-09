# API Server & Database

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 |
| Database | Supabase PostgreSQL + pgvector |
| Auth | JWT (planned) |
| Docs | Swagger at /api/docs |

## API Modules (23 endpoints)

| Module | Endpoints | Status |
|--------|-----------|--------|
| Companies | 5 (CRUD) | ✅ |
| Employees | 7 (CRUD + face) | ✅ |
| Attendance | 6 (check-in/out + history) | ✅ |
| Settings | 2 (company config) | ✅ |
| Batch | 3 (HR sync) | ✅ |
| Auth | — | ⏳ Planned |

## Database Schema (6 tables)

```
companies        → company_id, name, settings
employees        → employee_id, company_id, name, face_descriptor
attendance       → id, employee_id, type, timestamp, synced
settings         → company_id, schedule, thresholds
admins           → id, company_id, role, pin_hash
sync_logs        → id, device_id, synced_at, records_count
```

- Face vectors: `vector(128)` via pgvector + JSONB backup
- Multi-company: `company_id` foreign keys throughout
- Supabase URL: `https://zjyrciehnvjouakzvwxk.supabase.co`
- Full schema: [api-server/database/schema.sql](../../api-server/database/schema.sql)

## Commands

```bash
cd api-server
npm install
npm run start:dev          # Dev server → http://localhost:3000
npm run start:prod         # Production
```

## Conventions

- **DTOs** — Validate all inputs with `class-validator`
- **Error format** — `{ statusCode, message, error }`
- **Sync endpoints** — Accept batch records from mobile app, deduplicate by timestamp+employeeId
