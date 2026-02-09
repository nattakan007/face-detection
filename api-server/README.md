# Face Attendance API Server

NestJS backend API with Supabase PostgreSQL database for Face Attendance System.

## Features

- 🔐 Authentication & Authorization
- 👥 Employee Management
- ⏰ Attendance Tracking (Check-in/Check-out)
- 📊 Settings Management
- 🔄 HR System Integration (Batch Sync)
- 📱 Mobile App API
- 🌐 Web Dashboard API

## Tech Stack

- **Framework**: NestJS 10
- **Database**: Supabase PostgreSQL + pgvector
- **Language**: TypeScript
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

### 3. Database Setup

Run the SQL migrations in Supabase SQL Editor:

```bash
# See database/migrations/ folder
```

### 4. Run Development Server

```bash
npm run start:dev
```

API will be available at: `http://localhost:3000`

Swagger documentation: `http://localhost:3000/api`

## Project Structure

```
api-server/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── common/                 # Shared utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── guards/
│   ├── config/                 # Configuration
│   │   └── supabase.config.ts
│   ├── modules/
│   │   ├── auth/               # Authentication
│   │   ├── employees/          # Employee CRUD + Face registration
│   │   ├── attendance/         # Check-in/out + History
│   │   ├── settings/           # Company settings
│   │   └── batch/              # HR sync batch operations
│   └── database/
│       └── supabase.service.ts # Supabase client
├── database/
│   └── migrations/             # SQL migration files
├── test/                       # E2E tests
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `PUT /api/employees/:id/face` - Register face descriptor

### Attendance
- `POST /api/attendance/check-in` - Check-in
- `PUT /api/attendance/:id/check-out` - Check-out
- `GET /api/attendance` - List attendance records
- `GET /api/attendance/today` - Today's attendance

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Batch/Sync
- `POST /api/batch/employees/import` - Import from HR
- `POST /api/batch/attendance/export` - Export to HR

## Database Schema

See [database/schema.sql](database/schema.sql) for complete schema.

Key tables:
- `companies` - Multi-company support
- `employees` - Employee data with face vectors
- `attendance` - Check-in/out records
- `settings` - Company settings
- `admins` - Admin users
- `sync_logs` - HR sync logs

## Development

```bash
# Watch mode
npm run start:dev

# Build
npm run build

# Run tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint
```

## Production

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## License

MIT
