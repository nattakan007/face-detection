// Create Tables in CAF Database
// Run with: node create-tables.js

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    server: '13.214.55.161',
    database: 'CAF',
    user: 'sa',
    password: 'BU2022@dmin',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function createTables() {
    try {
        console.log('🏗️  Creating tables in CAF Database...');

        await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'schema-mssql.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by GO keyword (SQL Server batch separator)
        const batches = schema.split(/\s*GO\s*\n/);

        console.log(`📋 Found ${batches.length} SQL batches to execute`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                try {
                    await sql.query(batch);
                    console.log(`✅ Batch ${i + 1}/${batches.length} executed successfully`);
                } catch (err) {
                    // Check if it's just a message (PRINT statements)
                    if (!err.message.includes('database CAF already exists') &&
                        !err.message.includes('Database CAF created successfully')) {
                        console.error(`❌ Batch ${i + 1} error:`, err.message);
                    }
                }
            }
        }

        // Verify tables were created
        const tablesResult = await sql.query`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = 'CAF'
            ORDER BY TABLE_NAME
        `;

        console.log('\n📊 Tables created successfully:');
        tablesResult.recordset.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
        });

        // Create default company if not exists
        await sql.query`
            IF NOT EXISTS (SELECT 1 FROM companies WHERE code = 'DEMO001')
            INSERT INTO companies (name, code)
            VALUES ('Demo Company', 'DEMO001')
        `;

        console.log('\n🎯 Default company created: Demo Company (DEMO001)');

        console.log('\n✨ Database setup complete!');
        console.log('Ready to start building the API endpoints.');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure SQL Server allows remote connections');
        console.error('2. Check if user has CREATE TABLE permissions');
        console.error('3. Verify firewall settings on port 1433');
    } finally {
        await sql.close();
    }
}

console.log('🚀 Starting CAF database table creation...\n');
createTables();