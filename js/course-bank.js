// ============================================================
//  SkillOS — Static Course Catalog Bank
//  Shared course definitions with offline / GitHub Pages fallback
// ============================================================

export const DEFAULT_COURSES = [
  {
    id: "course-py",
    title: "Python Programming Essentials",
    description: "Master variables, functional programming, data structures, and foundational algorithms.",
    emoji: "🐍",
    category: "Programming",
    level: "Beginner",
    duration: "8 hours",
    instructor: "Dr. Evelyn Fox",
    rating: "4.8",
    lessons_count: 4,
    lessons: [
      { id: 'py-1', course_id: 'course-py', title: 'Intro to Python', duration: '12m', lesson_order: 1 },
      { id: 'py-2', course_id: 'course-py', title: 'Variables & Logic', duration: '15m', lesson_order: 2 },
      { id: 'py-3', course_id: 'course-py', title: 'Functions & Modules', duration: '20m', lesson_order: 3 },
      { id: 'py-4', course_id: 'course-py', title: 'Handling Files', duration: '18m', lesson_order: 4 }
    ]
  },
  {
    id: "course-web",
    title: "Responsive Web Design",
    description: "Build robust layout structures using modern CSS Flexbox, Grid, and adaptive strategies.",
    emoji: "🎨",
    category: "Design",
    level: "Beginner",
    duration: "10 hours",
    instructor: "Liam Turner",
    rating: "4.9",
    lessons_count: 4,
    lessons: [
      { id: 'web-1', course_id: 'course-web', title: 'HTML5 Semantic Layouts', duration: '15m', lesson_order: 1 },
      { id: 'web-2', course_id: 'course-web', title: 'CSS Flexbox in Depth', duration: '25m', lesson_order: 2 },
      { id: 'web-3', course_id: 'course-web', title: 'CSS Grid Mastery', duration: '30m', lesson_order: 3 },
      { id: 'web-4', course_id: 'course-web', title: 'Mobile-First Responsive Design', duration: '20m', lesson_order: 4 }
    ]
  },
  {
    id: "course-js",
    title: "Modern JavaScript Deep Dive",
    description: "Asynchronous programming, closures, promises, ES6+ modules, and DOM APIs.",
    emoji: "⚡",
    category: "Programming",
    level: "Intermediate",
    duration: "12 hours",
    instructor: "Maya Lin",
    rating: "4.7",
    lessons_count: 4,
    lessons: [
      { id: 'js-1', course_id: 'course-js', title: 'Execution Context & Scopes', duration: '20m', lesson_order: 1 },
      { id: 'js-2', course_id: 'course-js', title: 'Async/Await & Promises', duration: '30m', lesson_order: 2 },
      { id: 'js-3', course_id: 'course-js', title: 'DOM Manipulation & Events', duration: '25m', lesson_order: 3 },
      { id: 'js-4', course_id: 'course-js', title: 'ES Modules & Tooling', duration: '15m', lesson_order: 4 }
    ]
  },
  {
    id: "course-ai",
    title: "Machine Learning Foundations",
    description: "Mathematical foundations of gradient descent, neural networks, and model training.",
    emoji: "🤖",
    category: "AI & Data",
    level: "Advanced",
    duration: "16 hours",
    instructor: "Dev Bhushan",
    rating: "4.9",
    lessons_count: 5,
    lessons: [
      { id: 'ai-1', course_id: 'course-ai', title: 'Introduction to Artificial Intelligence & ML', duration: '20m', lesson_order: 1 },
      { id: 'ai-2', course_id: 'course-ai', title: 'Supervised vs Unsupervised Learning', duration: '25m', lesson_order: 2 },
      { id: 'ai-3', course_id: 'course-ai', title: 'Neural Networks & Gradient Descent', duration: '35m', lesson_order: 3 },
      { id: 'ai-4', course_id: 'course-ai', title: 'Building & Fine-Tuning LLMs with Gemini', duration: '40m', lesson_order: 4 },
      { id: 'ai-5', course_id: 'course-ai', title: 'Model Evaluation, Bias & Cloud Deployment', duration: '25m', lesson_order: 5 }
    ]
  },
  {
    id: "course-cloud",
    title: "Cloud Architecture & DevOps",
    description: "Containerization with Docker, CI/CD pipelines, and cloud native scaling patterns.",
    emoji: "☁️",
    category: "Cloud",
    level: "Intermediate",
    duration: "9 hours",
    instructor: "Kiran Patel",
    rating: "4.6",
    lessons_count: 4,
    lessons: [
      { id: 'cloud-1', course_id: 'course-cloud', title: 'Cloud Computing Fundamentals & Hyperscalers', duration: '20m', lesson_order: 1 },
      { id: 'cloud-2', course_id: 'course-cloud', title: 'Docker Containerization & Microservices', duration: '30m', lesson_order: 2 },
      { id: 'cloud-3', course_id: 'course-cloud', title: 'Kubernetes Cluster Architecture & Ingress', duration: '35m', lesson_order: 3 },
      { id: 'cloud-4', course_id: 'course-cloud', title: 'CI/CD Pipelines & Infrastructure as Code', duration: '25m', lesson_order: 4 }
    ]
  },
  {
    id: "course-sec",
    title: "Cybersecurity Fundamentals",
    description: "Network threat analysis, cryptographic signatures, and defensive protocol design.",
    emoji: "🔒",
    category: "Security",
    level: "Beginner",
    duration: "7 hours",
    instructor: "Sarah Jenkins",
    rating: "4.8",
    lessons_count: 4,
    lessons: [
      { id: 'sec-1', course_id: 'course-sec', title: 'Information Security & The CIA Triad', duration: '18m', lesson_order: 1 },
      { id: 'sec-2', course_id: 'course-sec', title: 'Network Defense, Firewalls & Pentesting', duration: '25m', lesson_order: 2 },
      { id: 'sec-3', course_id: 'course-sec', title: 'Cryptography, Public Key Infra & TLS', duration: '30m', lesson_order: 3 },
      { id: 'sec-4', course_id: 'course-sec', title: 'OWASP Top 10 & Secure Coding Practices', duration: '22m', lesson_order: 4 }
    ]
  }
];

export function getCourseById(id) {
  return DEFAULT_COURSES.find(c => c.id === id) || DEFAULT_COURSES[0];
}
