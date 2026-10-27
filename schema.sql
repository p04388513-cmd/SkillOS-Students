-- SkillOS PostgreSQL Database Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    avatar_url VARCHAR(255) DEFAULT '',
    points INT DEFAULT 0,
    streak INT DEFAULT 0,
    total_minutes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    emoji VARCHAR(20) DEFAULT '📘',
    category VARCHAR(100) NOT NULL,
    level VARCHAR(50) DEFAULT 'Beginner',
    duration VARCHAR(50) DEFAULT '8 hours',
    instructor VARCHAR(100) DEFAULT 'SkillOS Instructor',
    rating NUMERIC(3, 2) DEFAULT 4.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration VARCHAR(50) DEFAULT '15m',
    lesson_order INT DEFAULT 1,
    content TEXT DEFAULT ''
);

-- 4. User Course Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed'
    progress_percent INT DEFAULT 0,
    UNIQUE(user_id, course_id)
);

-- 5. User Completed Lessons
CREATE TABLE IF NOT EXISTS user_lessons (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50) REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- 6. Certificates Table (certificate_id is the unique PRIMARY KEY)
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id VARCHAR(100) PRIMARY KEY,
    certificate_code VARCHAR(100) UNIQUE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    course_title VARCHAR(255) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    grade VARCHAR(20) DEFAULT 'A+',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Skill Assessment Attempts (one attempt per user per assessment)
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

-- Seed Initial Default Courses
INSERT INTO courses (id, title, description, emoji, category, level, duration, instructor, rating)
VALUES
('course-py', 'Python Programming Essentials', 'Master variables, functional programming, data structures, and foundational algorithms.', '🐍', 'Programming', 'Beginner', '8 hours', 'Dr. Evelyn Fox', 4.8),
('course-web', 'Responsive Web Design', 'Build robust layout structures using modern CSS Flexbox, Grid, and adaptive strategies.', '🎨', 'Design', 'Beginner', '10 hours', 'Liam Turner', 4.9),
('course-js', 'Modern JavaScript Deep Dive', 'Asynchronous programming, closures, promises, ES6+ modules, and DOM APIs.', '⚡', 'Programming', 'Intermediate', '12 hours', 'Maya Lin', 4.7),
('course-ai', 'Machine Learning Foundations', 'Mathematical foundations of gradient descent, neural networks, and model training.', '🤖', 'AI & Data', 'Advanced', '16 hours', 'Dev Bhushan', 4.9),
('course-cloud', 'Cloud Architecture & DevOps', 'Containerization with Docker, CI/CD pipelines, and cloud native scaling patterns.', '☁️', 'Cloud', 'Intermediate', '9 hours', 'Kiran Patel', 4.6),
('course-sec', 'Cybersecurity Fundamentals', 'Network threat analysis, cryptographic signatures, and defensive protocol design.', '🔒', 'Security', 'Beginner', '7 hours', 'Sarah Jenkins', 4.8)
ON CONFLICT (id) DO NOTHING;

-- Seed Lessons
INSERT INTO lessons (id, course_id, title, duration, lesson_order)
VALUES
('py-1', 'course-py', 'Intro to Python', '12m', 1),
('py-2', 'course-py', 'Variables & Logic', '15m', 2),
('py-3', 'course-py', 'Functions & Modules', '20m', 3),
('py-4', 'course-py', 'Handling Files', '18m', 4),

('web-1', 'course-web', 'HTML5 Semantic Layouts', '15m', 1),
('web-2', 'course-web', 'CSS Flexbox in Depth', '25m', 2),
('web-3', 'course-web', 'CSS Grid Mastery', '30m', 3),
('web-4', 'course-web', 'Mobile-First Responsive Design', '20m', 4),

('js-1', 'course-js', 'Execution Context & Scopes', '20m', 1),
('js-2', 'course-js', 'Async/Await & Promises', '30m', 2),
('js-3', 'course-js', 'DOM Manipulation & Events', '25m', 3),
('js-4', 'course-js', 'ES Modules & Tooling', '15m', 4),

('ai-1', 'course-ai', 'Introduction to Artificial Intelligence & ML', '20m', 1),
('ai-2', 'course-ai', 'Supervised vs Unsupervised Learning', '25m', 2),
('ai-3', 'course-ai', 'Neural Networks & Gradient Descent', '35m', 3),
('ai-4', 'course-ai', 'Building & Fine-Tuning LLMs with Gemini', '40m', 4),
('ai-5', 'course-ai', 'Model Evaluation, Bias & Cloud Deployment', '25m', 5),

('cloud-1', 'course-cloud', 'Cloud Computing Fundamentals & Hyperscalers', '20m', 1),
('cloud-2', 'course-cloud', 'Docker Containerization & Microservices', '30m', 2),
('cloud-3', 'course-cloud', 'Kubernetes Cluster Architecture & Ingress', '35m', 3),
('cloud-4', 'course-cloud', 'CI/CD Pipelines & Infrastructure as Code', '25m', 4),

('sec-1', 'course-sec', 'Information Security & The CIA Triad', '18m', 1),
('sec-2', 'course-sec', 'Network Defense, Firewalls & Pentesting', '25m', 2),
('sec-3', 'course-sec', 'Cryptography, Public Key Infra & TLS', '30m', 3),
('sec-4', 'course-sec', 'OWASP Top 10 & Secure Coding Practices', '22m', 4)
ON CONFLICT (id) DO NOTHING;
