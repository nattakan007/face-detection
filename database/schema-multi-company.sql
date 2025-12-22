-- Company Attendance Database Schema
-- Support for Multiple Companies

-- Companies Table
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_path VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '18:00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    settings JSON,  -- company-specific settings
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments Table (per company)
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    manager_id INT, -- Foreign key to users table
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Users Table with Company Support
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    department_id INT,
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(50),
    position VARCHAR(100),
    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
    face_vector BLOB,  -- Face encoding for recognition
    face_photo_path VARCHAR(255),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    hire_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,

    -- Unique constraint for employee_id within same company
    UNIQUE KEY unique_employee_company (company_id, employee_id)
);

-- Attendance Records with Company Support
CREATE TABLE attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('check-in', 'check-out') NOT NULL,
    timestamp DATETIME NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),
    photo_path VARCHAR(255),
    face_confidence DECIMAL(3, 2),
    device_info JSON,  -- Store device information
    sync_status BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Index for performance
    INDEX idx_company_user_date (company_id, user_id, DATE(timestamp)),
    INDEX idx_timestamp (timestamp),
    INDEX idx_sync_status (sync_status)
);

-- Leave Requests
CREATE TABLE leave_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    leave_type ENUM('sick', 'personal', 'vacation', 'maternity', 'paternity', 'other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4, 1) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by INT, -- Foreign key to users table
    approved_at DATETIME,
    approver_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Holidays (per company)
CREATE TABLE holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_date (company_id, date)
);

-- Offline Sync Queue
CREATE TABLE sync_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'attendance', 'photo', 'user_update', etc.
    data JSON NOT NULL,
    retry_count INT DEFAULT 0,
    status ENUM('pending', 'synced', 'failed', 'processing') DEFAULT 'pending',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_status (status),
    INDEX idx_company_user (company_id, user_id)
);

-- Device Registration (for push notifications)
CREATE TABLE device_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    device_token VARCHAR(255) NOT NULL,
    platform ENUM('android', 'ios') NOT NULL,
    device_model VARCHAR(100),
    app_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY unique_token (device_token)
);

-- Working Schedules (per company/employee)
CREATE TABLE working_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    monday JSON,  -- {"start": "09:00", "end": "18:00", "break_start": "12:00", "break_end": "13:00"}
    tuesday JSON,
    wednesday JSON,
    thursday JSON,
    friday JSON,
    saturday JSON,
    sunday JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance Policies (per company)
CREATE TABLE attendance_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    late_threshold_minutes INT DEFAULT 15,
    absent_threshold_hours INT DEFAULT 4,
    overtime_rate DECIMAL(5, 2) DEFAULT 1.5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Views for Common Queries

-- Attendance Summary View
CREATE VIEW attendance_summary AS
SELECT
    c.id as company_id,
    c.name as company_name,
    u.id as user_id,
    u.employee_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    d.name as department_name,
    DATE(ar.timestamp) as attendance_date,
    MIN(CASE WHEN ar.type = 'check-in' THEN ar.timestamp END) as check_in_time,
    MAX(CASE WHEN ar.type = 'check-out' THEN ar.timestamp END) as check_out_time,
    TIMESTAMPDIFF(MINUTE,
        MIN(CASE WHEN ar.type = 'check-in' THEN ar.timestamp END),
        MAX(CASE WHEN ar.type = 'check-out' THEN ar.timestamp END)
    ) as total_minutes,
    CASE
        WHEN MIN(CASE WHEN ar.type = 'check-in' THEN ar.timestamp END) IS NULL THEN 'Absent'
        WHEN TIME(MIN(CASE WHEN ar.type = 'check-in' THEN ar.timestamp END)) > TIME(c.working_hours_start) THEN 'Late'
        ELSE 'Present'
    END as attendance_status
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN attendance_records ar ON u.id = ar.user_id
WHERE u.is_active = TRUE
GROUP BY c.id, u.id, DATE(ar.timestamp);

-- Indexes for Performance
CREATE INDEX idx_users_company_role ON users(company_id, role);
CREATE INDEX idx_attendance_company_timestamp ON attendance_records(company_id, timestamp);
CREATE INDEX idx_leave_requests_company_status ON leave_requests(company_id, status);