-- CAF (Company Attendance Face) Database Schema for SQL Server
-- Compatible with SQL Server 2016+

-- Create Database (run this once)
-- CREATE DATABASE CAF
-- GO
-- USE CAF
-- GO

-- Companies Table
CREATE TABLE companies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    code NVARCHAR(50) UNIQUE NOT NULL,
    logo_path NVARCHAR(255),
    address NVARCHAR(MAX),
    phone NVARCHAR(50),
    email NVARCHAR(100),
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '18:00:00',
    timezone NVARCHAR(50) DEFAULT 'Asia/Bangkok',
    settings NVARCHAR(MAX), -- Store JSON string for settings
    status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Departments Table
CREATE TABLE departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(50),
    manager_id INT,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Users Table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT,
    employee_id NVARCHAR(50) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE,
    phone NVARCHAR(50),
    position NVARCHAR(100),
    role NVARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    face_vector VARBINARY(MAX), -- Face encoding for recognition
    face_photo_path NVARCHAR(255),
    password_hash NVARCHAR(255),
    is_active BIT DEFAULT 1,
    last_login DATETIME2,
    hire_date DATE,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,

    CONSTRAINT unique_employee_company UNIQUE (company_id, employee_id)
);

-- Attendance Records Table
CREATE TABLE attendance_records (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    type NVARCHAR(20) NOT NULL CHECK (type IN ('check-in', 'check-out')),
    timestamp DATETIME2 NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name NVARCHAR(255),
    photo_path NVARCHAR(255),
    face_confidence DECIMAL(3, 2),
    device_info NVARCHAR(MAX), -- Store JSON string
    sync_status BIT DEFAULT 0,
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leave Requests Table
CREATE TABLE leave_requests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    leave_type NVARCHAR(20) NOT NULL CHECK (leave_type IN ('sick', 'personal', 'vacation', 'maternity', 'paternity', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4, 1) NOT NULL,
    reason NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INT,
    approved_at DATETIME2,
    approver_notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Holidays Table
CREATE TABLE holidays (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    is_recurring BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT unique_company_date UNIQUE (company_id, date)
);

-- Sync Queue Table
CREATE TABLE sync_queue (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    data_type NVARCHAR(50) NOT NULL,
    data NVARCHAR(MAX) NOT NULL, -- Store JSON string
    retry_count INT DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'processing')),
    error_message NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    processed_at DATETIME2,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Device Tokens Table
CREATE TABLE device_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    device_token NVARCHAR(255) NOT NULL,
    platform NVARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
    device_model NVARCHAR(100),
    app_version NVARCHAR(50),
    is_active BIT DEFAULT 1,
    last_used DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_token UNIQUE (device_token)
);

-- Working Schedules Table
CREATE TABLE working_schedules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT,
    name NVARCHAR(100) NOT NULL,
    is_default BIT DEFAULT 0,
    monday NVARCHAR(MAX), -- JSON string
    tuesday NVARCHAR(MAX),
    wednesday NVARCHAR(MAX),
    thursday NVARCHAR(MAX),
    friday NVARCHAR(MAX),
    saturday NVARCHAR(MAX),
    sunday NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance Policies Table
CREATE TABLE attendance_policies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    late_threshold_minutes INT DEFAULT 15,
    absent_threshold_hours INT DEFAULT 4,
    overtime_rate DECIMAL(5, 2) DEFAULT 1.5,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX idx_users_company_role ON users(company_id, role);
CREATE INDEX idx_attendance_company_timestamp ON attendance_records(company_id, timestamp);
CREATE INDEX idx_leave_requests_company_status ON leave_requests(company_id, status);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);

-- Create Update Trigger for updated_at
CREATE TRIGGER trg_companies_updated
ON companies
AFTER UPDATE
AS
BEGIN
    UPDATE companies
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER trg_users_updated
ON users
AFTER UPDATE
AS
BEGIN
    UPDATE users
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER trg_leave_requests_updated
ON leave_requests
AFTER UPDATE
AS
BEGIN
    UPDATE leave_requests
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Insert Default Company (Optional)
INSERT INTO companies (name, code)
VALUES ('Demo Company', 'DEMO001');
GO