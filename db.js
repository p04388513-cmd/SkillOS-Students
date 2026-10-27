import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'skillos_db'
});

// Test connection and auto-initialize tables if needed
export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database:', process.env.DB_NAME || 'skillos_db');
    
    // Check if users table exists
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!res.rows[0].exists) {
      console.log('🔄 Initializing database schema from schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ Database schema and seed data loaded successfully!');
      }
    } else {
      console.log('✅ Database schema verified.');
    }

    // Tables added after the initial schema — create on existing databases too
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessment_attempts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        assessment_id VARCHAR(50) NOT NULL,
        answers JSONB NOT NULL,
        correct_count INT NOT NULL,
        total_questions INT NOT NULL,
        score INT NOT NULL,
        passed BOOLEAN NOT NULL,
        xp_awarded INT NOT NULL,
        time_spent_seconds INT DEFAULT 0,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, assessment_id)
      );
    `);
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err.message);
    console.error('👉 Tip: Check your PostgreSQL password in .env (DB_PASSWORD)');
  }
}
