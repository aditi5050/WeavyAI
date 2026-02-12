require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 30000,
});

async function runMigrations() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const migrationPath = path.join(__dirname, 'prisma/migrations/20260211082332_init/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Running migrations...');
    await client.query(sql);
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('✅ Tables already exist, no action needed');
    }
  } finally {
    await client.end();
  }
}

runMigrations();
