# Face Attendance Workspace Creation Script
# Creates a complete workspace for Face Attendance System

param(
    [Parameter(Mandatory=$false)]
    [string]$WorkspaceName = "face-attendance-system",
    
    [Parameter(Mandatory=$false)]
    [string]$BasePath = "C:\Users\Nutth\OneDrive\Documents"
)

$WorkspacePath = Join-Path $BasePath $WorkspaceName

Write-Host "Creating Face Attendance System workspace at: $WorkspacePath" -ForegroundColor Green

# Create main workspace directory
if (Test-Path $WorkspacePath) {
    Write-Host "Workspace directory already exists. Please choose a different name or remove the existing directory." -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Path $WorkspacePath -Force | Out-Null
Set-Location $WorkspacePath

# Create workspace structure
$directories = @(
    "mobile-app",
    "api-server", 
    "web-dashboard",
    "database",
    "docs",
    "scripts",
    "docker"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "Created directory: $dir" -ForegroundColor Cyan
}

# Create root package.json
$rootPackageJson = @{
    name = $WorkspaceName
    version = "1.0.0"
    description = "Face Attendance System with Mobile App, API, and Web Dashboard"
    scripts = @{
        "install:all" = "npm run install:mobile && npm run install:api && npm run install:web"
        "install:mobile" = "cd mobile-app && npm install"
        "install:api" = "cd api-server && npm install"
        "install:web" = "cd web-dashboard && npm install"
        "dev:mobile" = "cd mobile-app && ionic serve"
        "dev:api" = "cd api-server && npm run start:dev"
        "dev:web" = "cd web-dashboard && ng serve"
        "build:all" = "npm run build:mobile && npm run build:api && npm run build:web"
        "build:mobile" = "cd mobile-app && ionic build"
        "build:api" = "cd api-server && npm run build"
        "build:web" = "cd web-dashboard && ng build"
        "test:all" = "npm run test:mobile && npm run test:api && npm run test:web"
    }
    devDependencies = @{
        concurrently = "^8.2.0"
    }
}

$rootPackageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.json" -Encoding UTF8
Write-Host "Created root package.json" -ForegroundColor Cyan

# Create README.md
$readmeContent = @"
# Face Attendance System

ระบบเข้า-ออกงานด้วยการสแกนใบหน้า ประกอบด้วย:

## โครงสร้างระบบ

### 📱 Mobile App (Ionic)
- สแกนใบหน้าแบบ Offline
- เก็บข้อมูลใน Local Database
- ซิงค์ข้อมูลเมื่อมีเน็ต

### 🖥️ Web Dashboard (Angular)
- ดูข้อมูลการเข้า-ออกงาน
- คำนวณเงินเดือน
- Export รายงาน

### 🚀 API Server (NestJS)
- รับข้อมูลจาก Mobile App
- ตรวจสอบข้อมูลซ้ำ
- จัดการฐานข้อมูลกลาง

## การติดตั้ง

\`\`\`bash
# ติดตั้ง dependencies ทั้งหมด
npm run install:all

# หรือติดตั้งแยกส่วน
npm run install:mobile
npm run install:api
npm run install:web
\`\`\`

## การรัน Development

\`\`\`bash
# รันทั้งหมดพร้อมกัน
npm run dev:all

# หรือรันแยกส่วน
npm run dev:mobile    # http://localhost:8100
npm run dev:api       # http://localhost:3000
npm run dev:web       # http://localhost:4200
\`\`\`

## การ Build

\`\`\`bash
# Build ทั้งหมด
npm run build:all

# หรือ build แยกส่วน
npm run build:mobile
npm run build:api
npm run build:web
\`\`\`

## Database Configuration

ฐานข้อมูลสามารถตั้งค่าได้ในไฟล์ \`database/config/database.js\`

สำหรับการเชื่อมต่อฐานข้อมูลระยะไกล สามารถแก้ไข IP และ connection settings ใน:

- \`api-server/.env\`
- \`database/config/database.js\`

## Docker Deployment

\`\`\`bash
# Build และรันด้วย Docker
docker-compose up --build
\`\`\`

## เอกสารประกอบ

ดูรายละเอียดเพิ่มเติมในโฟลเดอร์ \`docs/\`

---

**Developed with ❤️ for modern attendance management**
"@

$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8
Write-Host "Created README.md" -ForegroundColor Cyan

# Create database configuration
$databaseConfig = @"
// Database Configuration for Face Attendance System
// Supports both local and remote database connections

module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'face_attendance_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'face_attendance_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  production: {
    // สำหรับการเชื่อมต่อฐานข้อมูลระยะไกล
    // แก้ไข IP และ connection settings ตามต้องการ
    host: process.env.DB_HOST || 'YOUR_DATABASE_IP_HERE',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'face_attendance_prod',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};
"@

New-Item -ItemType Directory -Path "database/config" -Force | Out-Null
$databaseConfig | Out-File -FilePath "database/config/database.js" -Encoding UTF8
Write-Host "Created database configuration" -ForegroundColor Cyan

# Create environment template
$envTemplate = @"
# Environment Variables Template
# Copy to .env and update with your values

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=face_attendance_dev
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# API Configuration
API_PORT=3000
API_PREFIX=api/v1

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png

# Face Recognition Configuration
FACE_CONFIDENCE_THRESHOLD=0.6
FACE_MODEL_PATH=./models/face-recognition

# Mobile App Configuration
MOBILE_APP_PORT=8100
SYNC_INTERVAL=30000

# Web Dashboard Configuration
WEB_PORT=4200
"@

$envTemplate | Out-File -FilePath ".env.example" -Encoding UTF8
Write-Host "Created environment template" -ForegroundColor Cyan

# Create Docker configuration
$dockerCompose = @"
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: face-attendance-db
    environment:
      POSTGRES_DB: face_attendance_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - face-attendance-network

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: face-attendance-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - face-attendance-network

  # API Server
  api-server:
    build:
      context: ./api-server
      dockerfile: Dockerfile
    container_name: face-attendance-api
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: face_attendance_dev
      DB_USER: postgres
      DB_PASSWORD: password
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./api-server:/app
      - /app/node_modules
    networks:
      - face-attendance-network

  # Web Dashboard
  web-dashboard:
    build:
      context: ./web-dashboard
      dockerfile: Dockerfile
    container_name: face-attendance-web
    ports:
      - "4200:4200"
    depends_on:
      - api-server
    volumes:
      - ./web-dashboard:/app
      - /app/node_modules
    networks:
      - face-attendance-network

volumes:
  postgres_data:
  redis_data:

networks:
  face-attendance-network:
    driver: bridge
"@

$dockerCompose | Out-File -FilePath "docker-compose.yml" -Encoding UTF8
Write-Host "Created Docker configuration" -ForegroundColor Cyan

# Create project initialization script
$initScript = @"
# Face Attendance System Initialization Script

Write-Host "Initializing Face Attendance System..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install

# Create environment file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please update .env file with your configuration" -ForegroundColor Cyan
}

Write-Host "`nFace Attendance System workspace is ready!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your database configuration" -ForegroundColor Cyan
Write-Host "2. Run 'npm run install:all' to install all project dependencies" -ForegroundColor Cyan
Write-Host "3. Run 'npm run dev:all' to start all services in development mode" -ForegroundColor Cyan
Write-Host "4. Or use 'docker-compose up' to run with Docker" -ForegroundColor Cyan
"@

$initScript | Out-File -FilePath "scripts\init.ps1" -Encoding UTF8
Write-Host "Created initialization script" -ForegroundColor Cyan

# Create database initialization scripts
New-Item -ItemType Directory -Path "database/init" -Force | Out-Null

$initSql = @"
-- Face Attendance System Database Initialization
-- Run this script to create the initial database structure

-- Create database if it doesn't exist
CREATE DATABASE face_attendance_dev;

-- Connect to the database
\c face_attendance_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema
CREATE SCHEMA IF NOT EXISTS attendance;

-- Set search path
SET search_path TO attendance, public;

-- Create tables will be added here by migrations
-- Use TypeORM migrations for database schema management
"@

$initSql | Out-File -FilePath "database/init/01-init.sql" -Encoding UTF8
Write-Host "Created database initialization script" -ForegroundColor Cyan

Write-Host "`n✅ Face Attendance System workspace created successfully!" -ForegroundColor Green
Write-Host "Workspace location: $WorkspacePath" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. cd $WorkspacePath" -ForegroundColor White
Write-Host "2. .\scripts\init.ps1" -ForegroundColor White
Write-Host "3. Update .env file with your database configuration" -ForegroundColor White
Write-Host "4. npm run install:all" -ForegroundColor White
Write-Host "5. npm run dev:all" -ForegroundColor White