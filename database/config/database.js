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