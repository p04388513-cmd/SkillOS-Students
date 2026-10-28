import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { pool, initDatabase } from './db.js';
import { ASSESSMENT_DATA, gradeAssessment, COURSE_ASSESSMENT_MAP, ASSESSMENT_COURSE_MAP } from './js/assessment-bank.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'skillos_secret_jwt_key_2026';
// Initialized Google OAuth client with client ID from .env
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Favicon & Apple Icon handlers to avoid 404
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));
app.get(['/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'logo.png'));
});

// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn(`[HTTP ${res.statusCode}] ${req.method} ${req.originalUrl}`);
    }
  });
  next();
});
app.use(express.json());
app.use(express.static(__dirname)); // Serves frontend HTML/CSS/JS directly!

// Config Endpoint - Gemini API Key from .env
app.get('/api/config/gemini-key', (req, res) => {
  res.json({ key: process.env.GEMINI_API_KEY || '' });
});

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    avatar_url = '',
    account_type = 'independent', 
    college_name = null,
    college_code = null, 
    student_college_id = null, 
    department_id = null,
    semester = null
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const displayId = 'SKS-STU-' + String(Math.floor(100000 + Math.random() * 900000));

    const result = await pool.query(
      `INSERT INTO users (
        name, 
        email, 
        password_hash, 
        avatar_url,
        display_id, 
        registration_type, 
        college_name,
        college_code, 
        college_roll_number, 
        department_id,
        semester
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, display_id, name, email, avatar_url, role, registration_type, college_name, college_code, college_roll_number, department_id, semester, points, streak, total_minutes, created_at`,
      [
        name, 
        email.toLowerCase(), 
        passwordHash, 
        avatar_url || '',
        displayId, 
        account_type, 
        college_name,
        college_code, 
        student_college_id, 
        department_id,
        semester
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { 
        id: user.id, 
        user_id: user.id,
        display_id: user.display_id,
        email: user.email, 
        role: user.role, 
        account_type: user.registration_type,
        college_name: user.college_name,
        avatar_url: user.avatar_url
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Recent Student Joins (Social Proof Notification)
app.get('/api/recent-joins', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT name, college_name, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    res.json({ joins: result.rows });
  } catch (err) {
    res.json({ joins: [] });
  }
});

// Auth Route Helpers
app.get('/api/auth/login', (req, res) => res.redirect('/login.html'));
app.get('/api/auth/register', (req, res) => res.redirect('/login.html?tab=register'));

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last active
    await pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;
    res.json({
      message: 'Logged in successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [passwordHash, email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account registered with that email address.' });
    }

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Google Sign-In Route
app.post('/api/auth/google', async (req, res) => {
  const { credential, access_token } = req.body;
  if (!credential && !access_token) {
    return res.status(400).json({ error: 'Google credential or access token is required' });
  }

  try {
    let email, name, picture;

    if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else if (access_token) {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!userRes.ok) throw new Error('Failed to fetch Google user profile');
      const profile = await userRes.json();
      email = profile.email;
      name = profile.name;
      picture = profile.picture;
    }

    // Check if user exists in PostgreSQL
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    let user;

    if (result.rows.length === 0) {
      // New user from Google -> insert into PostgreSQL
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const insertRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, avatar_url, points, streak, total_minutes, created_at`,
        [name || 'Student', email.toLowerCase(), randomPassword, picture || '']
      );
      user = insertRes.rows[0];
    } else {
      user = result.rows[0];
      await pool.query(
        'UPDATE users SET last_active_at = CURRENT_TIMESTAMP, avatar_url = COALESCE(NULLIF(avatar_url, \'\'), $1) WHERE id = $2',
        [picture || '', user.id]
      );
      delete user.password_hash;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Google authentication successful',
      token,
      user
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ error: 'Failed to verify Google token' });
  }
});

// Get Public Auth Config (Google Client ID)
app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// Get Current User Profile & Enrollments
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id, name, email, role, avatar_url, points, streak, total_minutes, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Get user enrolled course IDs
    const enrollRes = await pool.query(
      'SELECT course_id, status, progress_percent FROM enrollments WHERE user_id = $1',
      [req.user.id]
    );

    user.enrolledCourses = enrollRes.rows.map(r => r.course_id);
    user.enrollments = enrollRes.rows;

    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, avatar_url } = req.body;
  try {
    const updateRes = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           avatar_url = COALESCE($2, avatar_url),
           last_active_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, role, avatar_url, points, streak, total_minutes`,
      [name, avatar_url, req.user.id]
    );
    res.json({ user: updateRes.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// COURSES & CATALOG ROUTES
// ==========================================

// Get All Courses
app.get('/api/courses', async (req, res) => {
  try {
    const coursesRes = await pool.query(`
      SELECT c.*, 
        COUNT(l.id)::int as lessons_count,
        COALESCE(
          json_agg(
            json_build_object('id', l.id, 'title', l.title, 'duration', l.duration, 'lesson_order', l.lesson_order)
            ORDER BY l.lesson_order ASC
          ) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) as lessons
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `);
    res.json({ courses: coursesRes.rows });
  } catch (err) {
    console.error('Courses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get Single Course Details
app.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const lessonsRes = await pool.query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_order ASC', [id]);
    const course = courseRes.rows[0];
    course.lessons = lessonsRes.rows;
    res.json({ course });
  } catch (err) {
    console.error('Course details error:', err);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// Enroll in Course
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  try {
    await pool.query(
      `INSERT INTO enrollments (user_id, course_id, status, progress_percent)
       VALUES ($1, $2, 'in_progress', 0)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [req.user.id, courseId]
    );
    res.json({ message: 'Successfully enrolled in course', courseId });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// Unenroll from Course
app.post('/api/courses/:id/unenroll', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  try {
    await pool.query(
      'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );
    res.json({ message: 'Successfully unenrolled from course', courseId });
  } catch (err) {
    console.error('Unenroll error:', err);
    res.status(500).json({ error: 'Failed to unenroll from course' });
  }
});

// Complete Lesson & Update Progress
app.post('/api/courses/:id/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  const { id: courseId, lessonId } = req.params;
  try {
    // Record completion
    await pool.query(
      `INSERT INTO user_lessons (user_id, course_id, lesson_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, lesson_id) DO NOTHING`,
      [req.user.id, courseId, lessonId]
    );

    // Calculate percentage
    const totalLessons = await pool.query('SELECT COUNT(*)::int as count FROM lessons WHERE course_id = $1', [courseId]);
    const completedLessons = await pool.query(
      'SELECT COUNT(*)::int as count FROM user_lessons WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    const total = totalLessons.rows[0].count || 1;
    const completed = completedLessons.rows[0].count || 0;
    const percent = Math.min(100, Math.round((completed / total) * 100));

    // Update enrollment
    await pool.query(
      `UPDATE enrollments 
       SET progress_percent = $1, 
           status = CASE WHEN $1 >= 100 THEN 'completed' ELSE 'in_progress' END
       WHERE user_id = $2 AND course_id = $3`,
      [percent, req.user.id, courseId]
    );

    // Reward points and minutes
    await pool.query(
      'UPDATE users SET points = points + 25, total_minutes = total_minutes + 15 WHERE id = $1',
      [req.user.id]
    );

    // Interrelated Course + Assessment Certificate Issuance
    let certificate = null;
    let certificateIssued = false;
    let assessmentPassed = false;
    const pairedAssessmentId = COURSE_ASSESSMENT_MAP[courseId] || 'python';

    if (percent >= 100) {
      // Check if the student has passed the interrelated skill assessment
      const assessRes = await pool.query(
        'SELECT * FROM assessment_attempts WHERE user_id = $1 AND assessment_id = $2 AND passed = true',
        [req.user.id, pairedAssessmentId]
      );

      if (assessRes.rows.length > 0) {
        assessmentPassed = true;
        const attempt = assessRes.rows[0];
        const grade = attempt.score >= 90 ? 'A+ (Distinction)' : (attempt.score >= 80 ? 'A (Merit)' : 'B (Passed)');

        const existingCert = await pool.query(
          'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
          [req.user.id, courseId]
        );

        if (existingCert.rows.length === 0) {
          const uRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
          const cRes = await pool.query('SELECT title FROM courses WHERE id = $1', [courseId]);
          const studentName = uRes.rows[0]?.name || 'Student';
          const courseTitle = cRes.rows[0]?.title || 'SkillOS Course';

          const codeSuffix = Math.floor(10000 + Math.random() * 90000);
          const cleanCourseSlug = courseId.replace('course-', '').toUpperCase();
          const certCode = `SKO-${cleanCourseSlug}-${codeSuffix}`;

          const insertCert = await pool.query(
            `INSERT INTO certificates (certificate_id, certificate_code, user_id, course_id, course_title, student_name, grade, issued_at)
             VALUES ($1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING *`,
            [certCode, req.user.id, courseId, courseTitle, studentName, grade]
          );
          certificate = insertCert.rows[0];
          certificateIssued = true;
        } else {
          certificate = existingCert.rows[0];
        }
      }
    }

    res.json({ 
      progress_percent: percent, 
      completed, 
      total, 
      course_completed: percent >= 100,
      assessment_id: pairedAssessmentId,
      assessment_passed: assessmentPassed,
      certificate_issued: certificateIssued,
      certificate 
    });
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

// ==========================================
// CERTIFICATES ENGINE (Issue & Verify)
// ==========================================

// Get all certificates issued to logged-in student, plus course-assessment track statuses
app.get('/api/certificates', authenticateToken, async (req, res) => {
  try {
    // 1. Check for courses where BOTH course progress is 100% AND assessment is passed!
    const enrolledCourses = await pool.query(`
      SELECT e.course_id, e.progress_percent, c.title as course_title, c.emoji, c.category, c.level, u.name as student_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = $1
    `, [req.user.id]);

    const attemptsRes = await pool.query(
      'SELECT assessment_id, score, passed FROM assessment_attempts WHERE user_id = $1',
      [req.user.id]
    );
    const attemptsMap = Object.fromEntries(attemptsRes.rows.map(a => [a.assessment_id, a]));

    for (const c of enrolledCourses.rows) {
      const pairedAssessmentId = COURSE_ASSESSMENT_MAP[c.course_id];
      const attempt = attemptsMap[pairedAssessmentId];

      if (c.progress_percent >= 100 && attempt && attempt.passed) {
        const existing = await pool.query(
          'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
          [req.user.id, c.course_id]
        );
        if (existing.rows.length === 0) {
          const codeSuffix = Math.floor(10000 + Math.random() * 90000);
          const cleanCourseSlug = c.course_id.replace('course-', '').toUpperCase();
          const certCode = `SKO-${cleanCourseSlug}-${codeSuffix}`;
          const grade = attempt.score >= 90 ? 'A+ (Distinction)' : (attempt.score >= 80 ? 'A (Merit)' : 'B (Passed)');
          await pool.query(
            `INSERT INTO certificates (certificate_id, certificate_code, user_id, course_id, course_title, student_name, grade, issued_at)
             VALUES ($1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [certCode, req.user.id, c.course_id, c.course_title, c.student_name, grade]
          );
        }
      }
    }

    // 2. Fetch all issued certificates
    const certsRes = await pool.query(`
      SELECT cert.certificate_id, cert.certificate_code, cert.course_id, cert.course_title, cert.student_name,
             cert.grade, cert.issued_at,
             c.emoji, c.category, c.level, c.duration, c.instructor, c.rating
      FROM certificates cert
      LEFT JOIN courses c ON cert.course_id = c.id
      WHERE cert.user_id = $1
      ORDER BY cert.issued_at DESC
    `, [req.user.id]);

    // 3. Build credential tracks (Course + Assessment status for each enrolled course)
    const issuedCourseIds = new Set(certsRes.rows.map(r => r.course_id));
    const credentialTracks = enrolledCourses.rows.map(c => {
      const pairedAssessmentId = COURSE_ASSESSMENT_MAP[c.course_id];
      const testMeta = ASSESSMENT_DATA[pairedAssessmentId] || {};
      const attempt = attemptsMap[pairedAssessmentId];
      const isCourseDone = (c.progress_percent || 0) >= 100;
      const isAssessmentDone = attempt ? Boolean(attempt.passed) : false;
      const isEarned = issuedCourseIds.has(c.course_id);

      return {
        courseId: c.course_id,
        courseTitle: c.course_title,
        courseEmoji: c.emoji || '📘',
        courseProgress: c.progress_percent || 0,
        isCourseDone,
        assessmentId: pairedAssessmentId,
        assessmentTitle: testMeta.title || 'Skill Assessment',
        assessmentIcon: testMeta.icon || '📝',
        assessmentScore: attempt ? attempt.score : null,
        isAssessmentDone,
        isEarned
      };
    });

    res.json({ 
      certificates: certsRes.rows,
      credentialTracks 
    });
  } catch (err) {
    console.error('Certificates fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve certificates' });
  }
});

// Explicitly claim/generate a certificate for a completed course & assessment
app.post('/api/courses/:id/claim-certificate', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  try {
    const enrollRes = await pool.query(`
      SELECT e.progress_percent, c.title, u.name as student_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = $1 AND e.course_id = $2
    `, [req.user.id, courseId]);

    if (enrollRes.rows.length === 0) {
      return res.status(404).json({ error: 'You are not enrolled in this course.' });
    }

    const enroll = enrollRes.rows[0];
    if (enroll.progress_percent < 100) {
      return res.status(400).json({ 
        error: `Course curriculum is ${enroll.progress_percent}% completed. Please finish all lessons first.` 
      });
    }

    const pairedAssessmentId = COURSE_ASSESSMENT_MAP[courseId];
    const assessRes = await pool.query(
      'SELECT * FROM assessment_attempts WHERE user_id = $1 AND assessment_id = $2 AND passed = true',
      [req.user.id, pairedAssessmentId]
    );

    if (assessRes.rows.length === 0) {
      return res.status(400).json({ 
        error: `Please pass the required "${ASSESSMENT_DATA[pairedAssessmentId]?.title || 'Skill Assessment'}" to unlock your certificate.`,
        assessment_id: pairedAssessmentId
      });
    }

    const existingCert = await pool.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (existingCert.rows.length > 0) {
      return res.json({ 
        message: 'Certificate already issued', 
        certificate: existingCert.rows[0] 
      });
    }

    const attempt = assessRes.rows[0];
    const grade = attempt.score >= 90 ? 'A+ (Distinction)' : (attempt.score >= 80 ? 'A (Merit)' : 'B (Passed)');
    const codeSuffix = Math.floor(10000 + Math.random() * 90000);
    const cleanCourseSlug = courseId.replace('course-', '').toUpperCase();
    const certCode = `SKO-${cleanCourseSlug}-${codeSuffix}`;

    const insertCert = await pool.query(
      `INSERT INTO certificates (certificate_id, certificate_code, user_id, course_id, course_title, student_name, grade, issued_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [certCode, req.user.id, courseId, enroll.title, enroll.student_name, grade]
    );

    res.json({
      message: 'Certificate generated successfully!',
      certificate: insertCert.rows[0]
    });
  } catch (err) {
    console.error('Claim certificate error:', err);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Public certificate verification endpoint
app.get('/api/certificates/verify/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const certRes = await pool.query(`
      SELECT cert.certificate_id, cert.certificate_code, cert.course_title, cert.student_name, cert.grade, cert.issued_at,
             c.instructor, c.category
      FROM certificates cert
      LEFT JOIN courses c ON cert.course_id = c.id
      WHERE UPPER(cert.certificate_id) = UPPER($1) OR UPPER(cert.certificate_code) = UPPER($1)
    `, [code]);

    if (certRes.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Certificate not found or invalid' });
    }

    res.json({ valid: true, certificate: certRes.rows[0] });
  } catch (err) {
    console.error('Verify certificate error:', err);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

// ==========================================
// DASHBOARD & CERTIFICATES
// ==========================================

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id, name, email, avatar_url, points, streak, total_minutes FROM users WHERE id = $1',
      [req.user.id]
    );
    const enrollmentsRes = await pool.query(`
      SELECT e.course_id, e.status, e.progress_percent, e.enrolled_at,
             c.title, c.category, c.emoji, c.level
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
    `, [req.user.id]);

    const certificatesRes = await pool.query(
      'SELECT * FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC',
      [req.user.id]
    );

    res.json({
      user: userRes.rows[0],
      enrolledCourses: enrollmentsRes.rows,
      certificates: certificatesRes.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ==========================================
// DETAILED PROGRESS & LEARNING METRICS
// ==========================================

app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. User stats
    const userRes = await pool.query(
      'SELECT id, name, email, avatar_url, points, streak, total_minutes, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 2. Enrolled courses & progress
    const enrollmentsRes = await pool.query(`
      SELECT e.course_id, e.status, e.progress_percent, e.enrolled_at,
             c.title, c.category, c.emoji, c.level, c.duration
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [userId]);

    const enrolledCourses = enrollmentsRes.rows;
    const completedCoursesCount = enrolledCourses.filter(c => c.status === 'completed' || c.progress_percent >= 100).length;
    const inProgressCoursesCount = enrolledCourses.filter(c => c.status !== 'completed' && c.progress_percent < 100).length;

    // 3. User completed lessons history
    const lessonsRes = await pool.query(`
      SELECT ul.lesson_id, ul.course_id, ul.completed_at, l.duration, l.title
      FROM user_lessons ul
      JOIN lessons l ON ul.lesson_id = l.id
      WHERE ul.user_id = $1
      ORDER BY ul.completed_at ASC
    `, [userId]);

    // 4. Assessment attempts history
    const attemptsRes = await pool.query(`
      SELECT assessment_id, score, passed, xp_awarded, time_spent_seconds, completed_at
      FROM assessment_attempts
      WHERE user_id = $1
      ORDER BY completed_at ASC
    `, [userId]);

    // 5. Weekly Learning Activity (last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyMinutes = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    lessonsRes.rows.forEach(l => {
      const d = new Date(l.completed_at);
      if (d >= sevenDaysAgo) {
        const dayName = dayNames[d.getDay()];
        const mins = parseInt(l.duration, 10) || 15;
        if (weeklyMinutes[dayName] !== undefined) {
          weeklyMinutes[dayName] += mins;
        }
      }
    });

    attemptsRes.rows.forEach(a => {
      const d = new Date(a.completed_at);
      if (d >= sevenDaysAgo) {
        const dayName = dayNames[d.getDay()];
        const mins = Math.ceil((a.time_spent_seconds || 0) / 60) || 5;
        if (weeklyMinutes[dayName] !== undefined) {
          weeklyMinutes[dayName] += mins;
        }
      }
    });

    const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayName = dayNames[now.getDay()];
    const totalWeeklyCalc = Object.values(weeklyMinutes).reduce((a, b) => a + b, 0);
    if (totalWeeklyCalc === 0 && user.total_minutes > 0) {
      weeklyMinutes[todayName] = user.total_minutes;
    }
    const weeklyData = weeklyLabels.map(day => weeklyMinutes[day]);

    // 6. Activity Heatmap (last 16 weeks = 112 days)
    const activityByDate = {};
    lessonsRes.rows.forEach(l => {
      const dateStr = new Date(l.completed_at).toISOString().split('T')[0];
      activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1;
    });
    attemptsRes.rows.forEach(a => {
      const dateStr = new Date(a.completed_at).toISOString().split('T')[0];
      activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1;
    });

    const todayIso = now.toISOString().split('T')[0];
    if (!activityByDate[todayIso] && (user.points > 0 || user.total_minutes > 0)) {
      activityByDate[todayIso] = 1;
    }

    const heatmapDays = [];
    for (let i = 111; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().split('T')[0];
      const count = activityByDate[iso] || 0;
      let level = 0;
      if (count >= 4) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      heatmapDays.push({
        date: iso,
        count,
        level,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
    }

    // 7. Dynamic Badges computed from database state
    const points = user.points || 0;
    const streak = user.streak || 0;
    const enrolledCount = enrolledCourses.length;
    const completedCount = completedCoursesCount;
    const assessmentsPassed = attemptsRes.rows.filter(a => a.passed).length;

    const badges = [
      { id: 'first-steps', icon: '🌱', name: 'First Steps', desc: 'Join the SkillOS platform', earned: true, earnedDate: user.created_at },
      { id: 'knowledge-seeker', icon: '📚', name: 'Knowledge Seeker', desc: 'Enroll in 3+ courses', earned: enrolledCount >= 3 },
      { id: 'point-accumulator', icon: '⚡', name: 'Point Accumulator', desc: 'Reach 50+ learning points', earned: points >= 50 },
      { id: 'xp-master', icon: '🏆', name: 'XP Master', desc: 'Reach 200+ learning points', earned: points >= 200 },
      { id: 'consistent-learner', icon: '🔥', name: 'Consistent Learner', desc: 'Maintain 3+ day streak', earned: streak >= 3 },
      { id: 'course-graduate', icon: '🎓', name: 'Course Graduate', desc: 'Complete at least 1 course', earned: completedCount >= 1 },
      { id: 'assessment-ace', icon: '🎯', name: 'Assessment Ace', desc: 'Pass a skill assessment', earned: assessmentsPassed >= 1 },
      { id: 'elite-learner', icon: '👑', name: 'Elite Learner', desc: 'Maintain 7+ day streak', earned: streak >= 7 }
    ];

    res.json({
      user,
      enrolledCourses,
      completedCoursesCount,
      inProgressCoursesCount,
      weeklyLearning: {
        labels: weeklyLabels,
        data: weeklyData
      },
      heatmapDays,
      badges
    });
  } catch (err) {
    console.error('Progress API error:', err);
    res.status(500).json({ error: 'Failed to retrieve progress data' });
  }
});

// ==========================================
// SKILL ASSESSMENTS (one attempt per user)
// ==========================================

const ATTEMPT_COLUMNS = `assessment_id, answers, correct_count, total_questions, score, passed,
                         xp_awarded, time_spent_seconds, completed_at`;

// List the current user's completed assessments
app.get('/api/assessments/attempts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${ATTEMPT_COLUMNS} FROM assessment_attempts WHERE user_id = $1 ORDER BY completed_at DESC`,
      [req.user.id]
    );
    res.json({ attempts: result.rows });
  } catch (err) {
    console.error('Get assessment attempts error:', err);
    res.status(500).json({ error: 'Failed to load assessment history' });
  }
});

// Submit an assessment — graded server-side, rejected if already completed
app.post('/api/assessments/:id/submit', authenticateToken, async (req, res) => {
  const test = ASSESSMENT_DATA[req.params.id];
  if (!test) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const { answers, timeSpentSeconds } = req.body;
  if (!Array.isArray(answers) || answers.length !== test.questions.length) {
    return res.status(400).json({ error: 'Invalid answers payload' });
  }
  const cleanAnswers = answers.map((a, i) =>
    Number.isInteger(a) && a >= 0 && a < test.questions[i].options.length ? a : null
  );
  const timeSpent = Math.max(0, Math.min(test.durationSeconds, parseInt(timeSpentSeconds, 10) || 0));
  const { total, correct, score, passed, xp } = gradeAssessment(test, cleanAnswers);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO assessment_attempts
         (user_id, assessment_id, answers, correct_count, total_questions, score, passed, xp_awarded, time_spent_seconds, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, assessment_id) DO UPDATE SET
         answers = EXCLUDED.answers,
         correct_count = EXCLUDED.correct_count,
         total_questions = EXCLUDED.total_questions,
         score = EXCLUDED.score,
         passed = EXCLUDED.passed,
         xp_awarded = EXCLUDED.xp_awarded,
         time_spent_seconds = EXCLUDED.time_spent_seconds,
         completed_at = CURRENT_TIMESTAMP
       RETURNING ${ATTEMPT_COLUMNS}`,
      [req.user.id, test.id, JSON.stringify(cleanAnswers), correct, total, score, passed, xp, timeSpent]
    );

    const userRes = await client.query(
      'UPDATE users SET points = points + $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING points',
      [xp, req.user.id]
    );

    // If passed, check if interrelated course curriculum is also 100% completed!
    let certificateIssued = false;
    let certificate = null;
    let courseCompleted = false;
    const pairedCourseId = test.courseId || ASSESSMENT_COURSE_MAP[test.id];

    if (passed && pairedCourseId) {
      const enrollRes = await client.query(
        'SELECT e.progress_percent, c.title as course_title, u.name as student_name FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN users u ON e.user_id = u.id WHERE e.user_id = $1 AND e.course_id = $2 AND e.progress_percent >= 100',
        [req.user.id, pairedCourseId]
      );

      if (enrollRes.rows.length > 0) {
        courseCompleted = true;
        const enroll = enrollRes.rows[0];
        const grade = score >= 90 ? 'A+ (Distinction)' : (score >= 80 ? 'A (Merit)' : 'B (Passed)');

        const existingCert = await client.query(
          'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
          [req.user.id, pairedCourseId]
        );

        if (existingCert.rows.length === 0) {
          const codeSuffix = Math.floor(10000 + Math.random() * 90000);
          const cleanCourseSlug = pairedCourseId.replace('course-', '').toUpperCase();
          const certCode = `SKO-${cleanCourseSlug}-${codeSuffix}`;

          const insertCert = await client.query(
            `INSERT INTO certificates (certificate_id, certificate_code, user_id, course_id, course_title, student_name, grade, issued_at)
             VALUES ($1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING *`,
            [certCode, req.user.id, pairedCourseId, enroll.course_title, enroll.student_name, grade]
          );
          certificate = insertCert.rows[0];
          certificateIssued = true;
        } else {
          const updateCert = await client.query(
            'UPDATE certificates SET grade = $1 WHERE user_id = $2 AND course_id = $3 RETURNING *',
            [grade, req.user.id, pairedCourseId]
          );
          certificate = updateCert.rows[0];
          certificateIssued = true;
        }
      }
    }

    await client.query('COMMIT');

    res.json({ 
      attempt: insertRes.rows[0], 
      points: userRes.rows[0]?.points,
      course_id: pairedCourseId,
      course_completed: courseCompleted,
      certificate_issued: certificateIssued,
      certificate
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Submit assessment error:', err);
    res.status(500).json({ error: 'Failed to submit assessment' });
  } finally {
    client.release();
  }
});

// ==========================================
// AI VISUAL CONCEPT & DIAGRAM GENERATOR (GEMINI POWERED)
// ==========================================
app.post('/api/ai/generate-visual', async (req, res) => {
  try {
    const { prompt, topic, courseTitle } = req.body;
    const cleanTopic = topic || prompt || 'Computer Science Architecture';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in .env' });
    }

    // 1. Generate high-definition educational vector diagram via Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`;
    const svgPrompt = `
You are an elite educational infographic designer and technical architect.
Generate a comprehensive, beautiful, and educational SVG concept diagram illustrating: "${cleanTopic}" (context: ${courseTitle || 'Computer Science'}).

STRICT RULES:
1. Return ONLY the raw valid <svg> ... </svg> code. Absolutely NO markdown backticks (\`\`\`xml or \`\`\`svg), NO conversational text, NO explanations outside the <svg>.
2. Attributes on <svg>: xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 520" width="100%" height="100%".
3. Aesthetic & Styling:
   - Outer background: <rect width="920" height="520" rx="16" fill="#0b1120" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
   - Modern dark mode palette: Neon Cyan (#38bdf8), Vivid Indigo (#818cf8), Emerald (#34d399), Amber (#fbbf24), Rose (#fb7185).
   - Crisp readable typography: <text font-family="system-ui, -apple-system, sans-serif" fill="#f8fafc">.
   - Use <defs> with linear gradients, subtle glow filters, and arrowhead markers for directional flow paths.
4. Content Requirements:
   - Header title at top: "${cleanTopic}".
   - 3 to 6 clearly labeled visual stages / concept blocks with rounded corners (rx="10"), clear icons/symbols, and subtitle descriptions.
   - Distinct flow arrows connecting the components.
   - Key takeaway / summary banner at the bottom.
5. Must be 100% valid, self-contained SVG without external font dependencies.
`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: svgPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    let rawSvg = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip any markdown code fences if present
    rawSvg = rawSvg.replace(/^```(?:svg|xml|html)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extract exact <svg>...</svg> block
    const svgMatch = rawSvg.match(/<svg[\s\S]*<\/svg>/i);
    if (svgMatch) {
      rawSvg = svgMatch[0];
    }

    if (!rawSvg.startsWith('<svg')) {
      throw new Error('Gemini did not return valid SVG diagram markup');
    }

    // Convert SVG to data URI
    const base64Svg = Buffer.from(rawSvg, 'utf-8').toString('base64');
    const imageUrl = `data:image/svg+xml;base64,${base64Svg}`;

    res.json({
      success: true,
      provider: 'gemini-svg-engine',
      imageUrl,
      rawSvg,
      topic: cleanTopic
    });

  } catch (err) {
    console.error('Gemini Visual generator error:', err);
    res.status(500).json({ error: 'Failed to generate visual diagram with Gemini', details: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 SkillOS Server running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  await initDatabase();
});
