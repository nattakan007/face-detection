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