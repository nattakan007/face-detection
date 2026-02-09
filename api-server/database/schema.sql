-- ================================================
-- Face Attendance System - Database Schema
-- Database: Supabase PostgreSQL
-- Version: 1.0.0
-- Date: 2026-01-13
-- ================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For face similarity search

-- ================================================
-- 1. COMPANIES TABLE
-- ================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- 2. EMPLOYEES TABLE
-- ================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  employee_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Face Recognition Data
  face_vector vector(128),        -- pgvector for similarity search
  face_descriptor JSONB,           -- JSON backup (128D array)
  
  -- HR Sync Status
  synced_from_hr BOOLEAN DEFAULT false,
  hr_sync_id VARCHAR(100),         -- External HR system ID
  last_hr_sync TIMESTAMP,
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, employee_code)
);

-- Indexes for Employees
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_hr_sync ON employees(hr_sync_id) WHERE hr_sync_id IS NOT NULL;
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_face_vector ON employees USING ivfflat (face_vector vector_cosine_ops)
  WHERE face_vector IS NOT NULL;

-- ================================================
-- 3. ATTENDANCE TABLE
-- ================================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Time Tracking
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  
  -- Location Data (stored as JSON)
  check_in_location JSONB,        -- {lat, lng, address}
  check_out_location JSONB,
  
  -- Face Match Confidence
  check_in_confidence DECIMAL(3,2),   -- 0.00 - 1.00
  check_out_confidence DECIMAL(3,2),
  
  -- Attendance Type
  type VARCHAR(20) DEFAULT 'face-scan',  -- 'face-scan', 'manual', 'admin'
  manual_name VARCHAR(255),              -- For manual check-in without face match
  
  -- HR Sync Status
  synced_to_hr BOOLEAN DEFAULT false,
  hr_sync_id VARCHAR(100),
  last_hr_sync TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Attendance
CREATE INDEX idx_attendance_company ON attendance(company_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_check_in ON attendance(check_in);
CREATE INDEX idx_attendance_date ON attendance(DATE(check_in));
CREATE INDEX idx_attendance_hr_sync ON attendance(synced_to_hr, updated_at);

-- ================================================
-- 4. SETTINGS TABLE
-- ================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Face Detection Settings
  scan_duration_ms INTEGER DEFAULT 2000,
  face_confidence_threshold DECIMAL(3,2) DEFAULT 0.65,
  auto_capture_cooldown_ms INTEGER DEFAULT 3000,
  
  -- Work Schedule (JSON format)
  work_schedule JSONB DEFAULT '{
    "check_in_start": "08:00",
    "check_in_end": "09:00",
    "check_out_start": "17:00",
    "check_out_end": "18:00"
  }'::jsonb,
  
  -- Shifts (Array of shift objects)
  shifts JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "Morning", "start": "06:00", "end": "14:00"},
  --   {"name": "Afternoon", "start": "14:00", "end": "22:00"}
  -- ]
  
  -- Auto Checkout
  auto_checkout_enabled BOOLEAN DEFAULT false,
  auto_checkout_hours INTEGER DEFAULT 8,
  
  -- Duplicate Prevention
  duplicate_check_window_minutes INTEGER DEFAULT 5,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- 5. ADMINS TABLE
-- ================================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Authentication (linked to Supabase Auth)
  auth_user_id UUID REFERENCES auth.users(id),
  
  -- Profile
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  
  -- Permissions
  role VARCHAR(50) DEFAULT 'admin',  -- 'super_admin', 'admin', 'viewer'
  permissions JSONB DEFAULT '[]'::jsonb,
  -- Example: ["employees:write", "attendance:read", "settings:write"]
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, username),
  UNIQUE(company_id, email)
);

-- Indexes for Admins
CREATE INDEX idx_admins_company ON admins(company_id);
CREATE INDEX idx_admins_auth_user ON admins(auth_user_id);

-- ================================================
-- 6. SYNC LOGS TABLE
-- ================================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Sync Information
  sync_type VARCHAR(50) NOT NULL,     -- 'employees_import', 'attendance_export'
  direction VARCHAR(10) NOT NULL,      -- 'inbound', 'outbound'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'success', 'failed'
  records_total INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Details
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes for Sync Logs
CREATE INDEX idx_sync_logs_company ON sync_logs(company_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status, created_at);
CREATE INDEX idx_sync_logs_type ON sync_logs(sync_type, direction);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Companies (Admin only)
CREATE POLICY "Admins can view their company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policies for Employees (Company-scoped)
CREATE POLICY "Company members can view employees"
  ON employees FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert employees"
  ON employees FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update employees"
  ON employees FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policies for Attendance (Company-scoped)
CREATE POLICY "Company members can view attendance"
  ON attendance FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (true);  -- Mobile app can create records

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policies for Settings
CREATE POLICY "Company members can view settings"
  ON settings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM admins 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ================================================
-- SAMPLE DATA (for testing)
-- ================================================

-- Insert sample company
INSERT INTO companies (name, code) 
VALUES ('Sailor Bar & Restaurant', 'SAILOR001');

-- Get the company ID for subsequent inserts
DO $$
DECLARE
  company_uuid UUID;
BEGIN
  SELECT id INTO company_uuid FROM companies WHERE code = 'SAILOR001';
  
  -- Insert default settings
  INSERT INTO settings (company_id) VALUES (company_uuid);
  
  -- Insert sample employees (without face data initially)
  INSERT INTO employees (company_id, employee_code, name, department, position)
  VALUES 
    (company_uuid, 'EMP001', 'สมชาย ใจดี', 'พนักงานบริการ', 'พนักงานเสิร์ฟ'),
    (company_uuid, 'EMP002', 'สมหญิง สวยงาม', 'ครัว', 'พ่อครัว'),
    (company_uuid, 'EMP003', 'สมศรี รักงาน', 'แคชเชียร์', 'พนักงานแคชเชียร์');
END $$;

-- ================================================
-- END OF SCHEMA
-- ================================================
