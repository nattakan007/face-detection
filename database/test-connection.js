// Test Connection to CAF Database
// Run with: node test-connection.js

const sql = require('mssql');

const config = {
    server: '13.214.55.161',
    database: 'CAF',
    user: 'sa',
    password: 'BU2022@dmin',
    options: {
        encrypt: false, // For development/testing
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

async function testConnection() {
    try {
        console.log('🔌 Testing connection to CAF Database...');
        console.log(`Server: ${config.server}`);
        console.log(`Database: ${config.database}`);
        console.log('---');

        await sql.connect(config);
        console.log('✅ Successfully connected to SQL Server!');

        // Test query
        const result = await sql.query`SELECT @@VERSION as version, DB_NAME() as database_name`;
        console.log(`📊 Database Version: ${result.recordset[0].version}`);
        console.log(`🏷️  Database Name: ${result.recordset[0].database_name}`);

        // Check if tables exist
        const tablesResult = await sql.query`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `;

        if (tablesResult.recordset.length > 0) {
            console.log('📋 Tables found:');
            tablesResult.recordset.forEach(table => {
                console.log(`  - ${table.TABLE_NAME}`);
            });
        } else {
            console.log('⚠️  No tables found. Run schema-mssql.sql to create tables.');
        }

        console.log('\n✨ Connection test successful!');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check if SQL Server is running');
        console.error('2. Verify server address and port (1433)');
        console.error('3. Check if TCP/IP is enabled in SQL Server');
        console.error('4. Verify firewall settings');
        console.error('5. Check SQL Server authentication mode');
    } finally {
        await sql.close();
    }
}

// Check if mssql package is installed
try {
    require.resolve('mssql');
} catch (e) {
    console.log('❌ mssql package not installed');
    console.log('Run: npm install mssql');
    process.exit(1);
}

testConnection();