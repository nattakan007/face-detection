-- CAF Database Creation Script for SQL Server
-- Run this script in SQL Server Management Studio

-- Step 1: Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CAF')
BEGIN
    CREATE DATABASE CAF;
    PRINT 'Database CAF created successfully';
END
ELSE
BEGIN
    PRINT 'Database CAF already exists';
END
GO

-- Step 2: Use the database
USE CAF;
GO

-- Step 3: Run the schema script
-- Note: Execute schema-mssql.sql separately after creating the database
PRINT 'Now run schema-mssql.sql to create all tables';
PRINT '';
PRINT 'Connection String Example:';
PRINT 'Server=13.214.55.161;Database=CAF;User Id=sa;Password=BU2022@dmin;';
PRINT '';
PRINT 'In Node.js (with mssql package):';
PRINT 'const config = {';
PRINT '  server: "13.214.55.161",';
PRINT '  database: "CAF",';
PRINT '  user: "sa",';
PRINT '  password: "BU2022@dmin",';
print '  options: { encrypt: false }';
PRINT '};';