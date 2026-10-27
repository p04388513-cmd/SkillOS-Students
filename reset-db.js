import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'skillos_db'
});

const mode = process.argv[2] || '--progress';

async function main() {
  console.log(`\n🧹 Running database cleanup (Mode: ${mode})...\n`);

  if (mode === '--email') {
    const targetEmail = (process.argv[3] || '').toLowerCase().trim();
    if (!targetEmail) {
      console.error('❌ Please specify an email: node reset-db.js --email user@example.com');
      process.exit(1);
    }
    const res = await pool.query('DELETE FROM users WHERE email = $1 RETURNING id, name, email', [targetEmail]);
    if (res.rowCount === 0) {
      console.log(`ℹ️ No user found with email: ${targetEmail}`);
    } else {
      console.log(`✅ Deleted user account "${res.rows[0].name}" (${res.rows[0].email}) and all associated records.`);
    }
  } else if (mode === '--users') {
    // Delete all users (cascades to enrollments, certificates, lessons, attempts)
    const users = await pool.query('DELETE FROM users RETURNING id, email');
    console.log(`✅ Deleted ${users.rowCount} user account(s) and all linked data.`);
  } else if (mode === '--certs') {
    // Delete only certificates and assessment attempts
    const certs = await pool.query('DELETE FROM certificates RETURNING certificate_code');
    const attempts = await pool.query('DELETE FROM assessment_attempts RETURNING assessment_id');
    console.log(`✅ Deleted ${certs.rowCount} certificate(s).`);
    console.log(`✅ Deleted ${attempts.rowCount} assessment attempt(s).`);
  } else if (mode === '--all') {
    // Delete all student activity, enrollments, and reset points
    const certs = await pool.query('DELETE FROM certificates');
    const attempts = await pool.query('DELETE FROM assessment_attempts');
    const lessons = await pool.query('DELETE FROM user_lessons');
    const enrollments = await pool.query('DELETE FROM enrollments');
    const users = await pool.query('UPDATE users SET points = 0, streak = 0, total_minutes = 0');
    console.log(`✅ Deleted ${certs.rowCount} certificate(s).`);
    console.log(`✅ Deleted ${attempts.rowCount} assessment attempt(s).`);
    console.log(`✅ Deleted ${lessons.rowCount} completed lesson(s).`);
    console.log(`✅ Deleted ${enrollments.rowCount} enrollment(s).`);
    console.log(`✅ Reset points and streaks for ${users.rowCount} user(s).`);
  } else {
    // Default --progress: Keeps course enrollments, but resets progress to 0%, wipes certificates and attempts
    const certs = await pool.query('DELETE FROM certificates');
    const attempts = await pool.query('DELETE FROM assessment_attempts');
    const lessons = await pool.query('DELETE FROM user_lessons');
    const enrollments = await pool.query("UPDATE enrollments SET progress_percent = 0, status = 'in_progress'");
    const users = await pool.query('UPDATE users SET points = 50');
    console.log(`✅ Deleted ${certs.rowCount} certificate(s).`);
    console.log(`✅ Deleted ${attempts.rowCount} assessment attempt(s).`);
    console.log(`✅ Deleted ${lessons.rowCount} completed lesson(s).`);
    console.log(`✅ Reset ${enrollments.rowCount} enrollment(s) to 0% progress.`);
    console.log(`✅ Reset user points.`);
  }

  console.log('\n🎉 Cleanup complete! Database is fresh.\n');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Error during cleanup:', err);
  process.exit(1);
});
