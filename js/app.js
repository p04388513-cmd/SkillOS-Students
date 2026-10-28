import { DEFAULT_COURSES, getCourseById } from './course-bank.js';
// ============================================================
//  SkillOS — Global Application Core (app.js) - PostgreSQL / REST API
// ============================================================

// Global user state variables
export let currentUser = null;
export let currentUserProfile = null;

// Auth Token management
export function getAuthToken() {
  return localStorage.getItem('skillos_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('skillos_token', token);
  } else {
    localStorage.removeItem('skillos_token');
  }
}

export function clearAuth() {
  localStorage.removeItem('skillos_token');
  localStorage.removeItem('skillos_user');
  currentUser = null;
  currentUserProfile = null;
}

// API Base URL helper (resolves backend port 5000 when accessed via Live Server, file:, or other ports)

// Environment detector for static hosting (GitHub Pages, Netlify, Cloudflare Pages)
export function isStaticEnvironment() {
  if (typeof window === 'undefined') return false;
  if (window.SKILLOS_API_BASE) return false;
  try {
    if (localStorage.getItem('skillos_api_base')) return false;
  } catch (e) {}

  const host = window.location.hostname;
  return host.includes('github.io') || host.includes('netlify.app') || host.includes('pages.dev');
}

// In-memory static API router for static hosting environments
// Resolves data instantly from localStorage and course-bank without triggering 404/405 network errors
function handleStaticApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const clean = endpoint.split('?')[0].replace(/^\/+/, '');
  const path = clean.startsWith('api/') ? clean.slice(4) : clean;
  let body = options.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  } else if (!body) {
    body = {};
  }

  // 1. /api/auth/config
  if (path === 'auth/config') {
    return {
      googleClientId: '800154027928-b28cqoivmcket10kem13d78bcersfrjp.apps.googleusercontent.com'
    };
  }

  // /api/config/gemini-key
  if (path === 'config/gemini-key') {
    const key = localStorage.getItem('skillos_gemini_key') || '';
    return { key };
  }

  // 2. /api/auth/me
  if (path === 'auth/me') {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('skillos_user') || 'null');
    } catch (e) {}
    if (user) {
      return { user };
    }
    throw new Error('Request failed with status 401');
  }

  // 3. /api/auth/login
  if (path === 'auth/login') {
    const email = body.email || 'scholar@skillos.ai';
    const user = {
      id: 'student-' + Math.floor(1000 + Math.random() * 9000),
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      role: 'student',
      account_type: 'independent',
      track: 'Full-Stack & AI Engineering',
      college_name: 'SkillOS Open Academy',
      streak: 4,
      points: 480,
      total_minutes: 210,
      enrolledCourses: ['course-ai', 'course-web', 'course-python']
    };
    const token = 'demo-session-token-' + Date.now();
    setAuthToken(token);
    localStorage.setItem('skillos_user', JSON.stringify(user));
    return { token, user };
  }

  // 4. /api/auth/register
  if (path === 'auth/register') {
    const user = {
      id: 'student-' + Math.floor(1000 + Math.random() * 9000),
      name: body.name || 'Student Scholar',
      email: body.email || 'scholar@skillos.ai',
      role: 'student',
      account_type: body.account_type || 'independent',
      track: body.track || 'Full-Stack & AI Engineering',
      college_name: body.college_name || 'SkillOS Open Academy',
      streak: 1,
      points: 100,
      total_minutes: 0,
      enrolledCourses: ['course-ai', 'course-web', 'course-python']
    };
    const token = 'demo-session-token-' + Date.now();
    setAuthToken(token);
    localStorage.setItem('skillos_user', JSON.stringify(user));
    return { token, user };
  }

  // 5. /api/auth/google
  if (path === 'auth/google') {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    if (!user) {
      user = {
        id: 'google-' + Date.now(),
        name: 'Student Scholar',
        email: 'scholar@skillos.ai',
        role: 'student',
        account_type: 'independent',
        track: 'Full-Stack & AI Engineering',
        college_name: 'SkillOS Open Academy',
        streak: 1,
        points: 150,
        total_minutes: 45,
        enrolledCourses: ['course-ai', 'course-web', 'course-python']
      };
      localStorage.setItem('skillos_user', JSON.stringify(user));
    }
    const token = 'google-session-' + Date.now();
    setAuthToken(token);
    return { token, user };
  }

  // 6. /api/auth/profile
  if (path === 'auth/profile') {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    if (!user) user = { name: 'Student Scholar', email: 'scholar@skillos.ai' };
    if (body.name) user.name = body.name;
    if (body.avatar_url) user.avatar_url = body.avatar_url;
    if (body.bio) user.bio = body.bio;
    if (body.settingsDND !== undefined) user.settingsDND = body.settingsDND;
    localStorage.setItem('skillos_user', JSON.stringify(user));
    return { user, message: 'Profile updated successfully' };
  }

  // 7. /api/auth/reset-password
  if (path === 'auth/reset-password') {
    return { success: true, message: 'Password reset successfully.' };
  }

  // 8. /api/dashboard
  if (path === 'dashboard') {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    if (!user) {
      user = {
        id: 'student-1001',
        name: 'Student Scholar',
        email: 'scholar@skillos.ai',
        role: 'student',
        streak: 4,
        points: 480,
        total_minutes: 210,
        enrolledCourses: ['course-ai', 'course-web', 'course-python']
      };
    }
    const enrolledIds = user.enrolledCourses || ['course-ai', 'course-web', 'course-python'];
    const enrolledCourses = enrolledIds.map(id => {
      const c = DEFAULT_COURSES.find(dc => dc.id === id) || { id, title: id, lessons_count: 4, emoji: '📘' };
      return {
        course_id: c.id,
        title: c.title,
        progress_percent: 35,
        lessons_completed: 1,
        lessons_count: c.lessons_count || 4,
        emoji: c.emoji
      };
    });
    return {
      user,
      enrolledCourses,
      stats: {
        streak: user.streak || 4,
        points: user.points || 480,
        total_minutes: user.total_minutes || 210
      }
    };
  }

  // 9. /api/courses
  if (path === 'courses') {
    return { courses: DEFAULT_COURSES };
  }

  // 10. /api/courses/:id/enroll
  if (path.startsWith('courses/') && path.endsWith('/enroll')) {
    const courseId = path.split('/')[1];
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    if (user) {
      if (!user.enrolledCourses) user.enrolledCourses = [];
      if (!user.enrolledCourses.includes(courseId)) {
        user.enrolledCourses.push(courseId);
        localStorage.setItem('skillos_user', JSON.stringify(user));
      }
    }
    return { success: true };
  }

  // 11. /api/courses/:id/unenroll
  if (path.startsWith('courses/') && path.endsWith('/unenroll')) {
    const courseId = path.split('/')[1];
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    if (user && user.enrolledCourses) {
      user.enrolledCourses = user.enrolledCourses.filter(id => id !== courseId);
      localStorage.setItem('skillos_user', JSON.stringify(user));
    }
    return { success: true };
  }

  // 12. /api/courses/:id/lessons/:lessonId/complete
  if (path.startsWith('courses/') && path.includes('/complete')) {
    return { success: true, points: 50, streak: 5 };
  }

  // 13. /api/courses/:id
  if (path.startsWith('courses/')) {
    const courseId = path.split('/')[1];
    const course = getCourseById(courseId);
    return { course };
  }

  // 14. /api/assessments/attempts
  if (path === 'assessments/attempts') {
    let attempts = {};
    try { attempts = JSON.parse(localStorage.getItem('skillos_assessment_attempts') || '{}'); } catch (e) {}
    return { attempts: Object.values(attempts) };
  }

  // 15. /api/certificates
  if (path === 'certificates') {
    let certificates = [];
    try { certificates = JSON.parse(localStorage.getItem('skillos_certificates') || '[]'); } catch (e) {}
    return { certificates, credentialTracks: [] };
  }

  // 16. /api/certificates/verify/:code
  if (path.startsWith('certificates/verify/')) {
    const code = decodeURIComponent(path.split('/')[2] || '');
    let certificates = [];
    try { certificates = JSON.parse(localStorage.getItem('skillos_certificates') || '[]'); } catch (e) {}
    const cert = certificates.find(c => c.certificate_code === code);
    if (cert) {
      return { valid: true, certificate: cert };
    }
    return { valid: false, error: 'Certificate not found' };
  }

  // 17. /api/progress
  if (path === 'progress') {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('skillos_user') || 'null'); } catch (e) {}
    return {
      user: user || { streak: 4, points: 480, total_minutes: 210 },
      enrolledCourses: user?.enrolledCourses || ['course-ai', 'course-web'],
      completedCoursesCount: 1,
      studyStats: {
        totalHours: 3.5,
        dailyAverage: '45 mins',
        weeklyGoalProgress: '75%'
      }
    };
  }

  // 18. /api/recent-joins
  if (path === 'recent-joins') {
    return { joins: [] };
  }

  // 19. /api/ai/generate-visual
  if (path.startsWith('ai/')) {
    return { success: false, message: 'AI visuals handled client-side' };
  }

  return { success: true };
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    if (window.SKILLOS_API_BASE) return window.SKILLOS_API_BASE;
    try {
      const saved = localStorage.getItem('skillos_api_base');
      if (saved) return saved;
    } catch (e) {}

    const { protocol, hostname, port } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

    // If accessed via file: or running locally on any port other than 5000 (e.g. 5500 Live Server, 5173, 8080)
    if (protocol === 'file:' || (isLocalhost && port !== '5000')) {
      return 'http://localhost:5000';
    }
  }
  return '';
}

// Global API Fetch helper that attaches JWT Token
export async function apiFetch(endpoint, options = {}) {
  // If running on static hosting without external backend base, handle instantly in memory
  if (isStaticEnvironment() && !endpoint.startsWith('http')) {
    return Promise.resolve(handleStaticApi(endpoint, options));
  }
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  const base = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    ...(body !== undefined ? { body } : {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// Page loader helpers
export function showLoader() {
  document.getElementById('page-loader')?.classList.remove('out');
}

export function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('out');
  }
}

// ============================================================
// Web Audio API Notification Sound Synthesizer
// Zero external assets, 100% offline, modern studio-grade chimes
// ============================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// User-gesture unlocker to comply with modern browser autoplay policies
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
}

function playTone(ctx, freq, startTime, duration, volume = 0.12, wave = 'sine') {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);

    // Smooth envelope attack and decay to prevent audio clicks
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (e) {}
}

export function playNotificationSound(type = 'success') {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('skillos_sound_muted') === 'true') {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp, warm double chime (G5: 784Hz -> C6: 1046.5Hz)
      playTone(ctx, 783.99, now, 0.12, 0.12, 'sine');
      playTone(ctx, 1046.50, now + 0.08, 0.24, 0.14, 'triangle');
    } else if (type === 'achievement' || type === 'celebrate') {
      // Celebratory 4-note ascending chord (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(ctx, freq, now + (idx * 0.07), 0.28, 0.13, 'sine');
      });
    } else if (type === 'warning') {
      // Gentle dual-tone alert (F#5: 740Hz -> Eb5: 622Hz)
      playTone(ctx, 739.99, now, 0.12, 0.11, 'triangle');
      playTone(ctx, 622.25, now + 0.09, 0.18, 0.11, 'triangle');
    } else if (type === 'error') {
      // Soft, subtle low boop (300Hz dropping smoothly to 180Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.20);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } else {
      // 'info' or soft notification pop (659Hz sweeping to 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch (err) {
    // Non-blocking fallback
  }
}

// Global Toast notification system
export function showToast(title, message, type = 'success') {
  // Play pleasant notification audio
  const isAchievement = type === 'achievement' || type === 'celebrate' || /(🏆|🎉|unlocked|congrat|100%)/i.test(title || '');
  playNotificationSound(isAchievement ? 'achievement' : type);

  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '💡';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <span class="toast-close">&times;</span>
  `;

  container.appendChild(toast);

  // Close button click listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  });

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
}

// Helper to initialize auth listeners and protect routes
export async function initAuthListener(onAuthenticated, onUnauthenticated) {
  const token = getAuthToken();

  if (!token) {
    handleUnauthenticated(onUnauthenticated);
    return;
  }

  // Helper to sync user information to DOM
  const syncUserToDOM = (user) => {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user.name || 'Student';
    });
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      if (user.avatar_url) {
        el.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
      } else {
        el.textContent = (user.name || 'Student')
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      }
    });
  };

  // If session is demo/offline, recover directly from localStorage
  if (token.startsWith('demo-') || token.startsWith('google-session-') || isStaticEnvironment()) {
    try {
      const stored = localStorage.getItem('skillos_user');
      if (stored) {
        const user = JSON.parse(stored);
        currentUser = user;
        currentUserProfile = user;
        currentUserProfile.displayName = user.name;
        syncUserToDOM(user);
        if (onAuthenticated) onAuthenticated(user, currentUserProfile);
        hideLoader();
        return;
      }
    } catch (e) {}
  }

  try {
    const data = await apiFetch('/api/auth/me');
    if (data && data.user) {
      currentUser = data.user;
      currentUserProfile = data.user;
      currentUserProfile.displayName = data.user.name;
      syncUserToDOM(data.user);
      if (onAuthenticated) onAuthenticated(data.user, currentUserProfile);
    } else {
      handleUnauthenticated(onUnauthenticated);
    }
  } catch (err) {
    // If backend is unreachable or 404, check for local user profile fallback
    const stored = localStorage.getItem('skillos_user');
    if (stored && (err.message?.includes('404') || err.message?.includes('Failed to fetch') || err.message?.includes('status 404'))) {
      try {
        const user = JSON.parse(stored);
        currentUser = user;
        currentUserProfile = user;
        currentUserProfile.displayName = user.name;
        syncUserToDOM(user);
        if (onAuthenticated) onAuthenticated(user, currentUserProfile);
        return;
      } catch (e) {}
    }

    console.warn('Session verification failed:', err.message);
    clearAuth();
    handleUnauthenticated(onUnauthenticated);
  } finally {
    hideLoader();
  }
}

function handleUnauthenticated(onUnauthenticated) {
  currentUser = null;
  currentUserProfile = null;

  if (onUnauthenticated) {
    onUnauthenticated();
  } else {
    // Default route protection: Redirect to landing page (index.html)
    const isSubdir = window.location.pathname.includes('/html/');
    window.location.href = isSubdir ? '../index.html' : 'index.html';
  }
  hideLoader();
}

// Sidebar toggle and logout wiring for responsive layouts
export function initSidebar() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('hidden');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      sidebar?.classList.remove('open');
      overlay.classList.add('hidden');
    });
  }

  // Wire up all sidebar logout buttons
  document.querySelectorAll('[data-logout-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      logout();
    });
  });

  window.logout = logout;
}

// Universal logout function
export function logout() {
  clearAuth();
  const isSubdir = window.location.pathname.includes('/html/');
  window.location.href = isSubdir ? '../index.html' : 'index.html';
}

if (typeof window !== 'undefined') {
  window.logout = logout;
}

// Utility formatting helpers
export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const date = new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "just now";
}

export function animateCounter(element, targetValue) {
  if (!element) return;
  let start = 0;
  const end = parseInt(targetValue, 10) || 0;
  if (start === end) {
    element.textContent = end;
    return;
  }
  const duration = 1200;
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / range));
  const timer = setInterval(() => {
    current += increment;
    element.textContent = current;
    if (current === end) {
      clearInterval(timer);
    }
  }, Math.max(stepTime, 10));
}

// Universal Beautiful Centered Modal Dialog
export function showConfirmDialog({ 
  title = 'Confirmation', 
  message = 'Are you sure?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  confirmDanger = false,
  onConfirm 
}) {
  playNotificationSound(confirmDanger ? 'warning' : 'info');
  let modal = document.getElementById('skillos-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skillos-confirm-modal';
    modal.className = 'modal-overlay hidden';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box" style="max-width: 420px; text-align: center; padding: 32px 24px; border-radius: var(--r-xl); box-shadow: var(--shadow-xl); animation: scaleIn 0.25s ease;">
      <div style="width: 58px; height: 58px; border-radius: 50%; background: ${confirmDanger ? '#fee2e2' : 'var(--primary-100)'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 26px;">
        ${confirmDanger ? '⚠️' : '❓'}
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-900);">${title}</h3>
      <p style="font-size: 0.875rem; color: var(--text-500); margin-bottom: 24px; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="modal-cancel-btn" class="btn btn-outline btn-sm" style="flex: 1; padding: 10px 18px;">${cancelText}</button>
        <button id="modal-confirm-btn" class="btn btn-sm" style="flex: 1; padding: 10px 18px; ${confirmDanger ? 'background: #dc2626; color: #fff;' : 'background: var(--primary); color: #fff;'}">${confirmText}</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const close = () => {
    modal.classList.add('hidden');
  };

  modal.querySelector('#modal-cancel-btn').onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
  modal.querySelector('#modal-confirm-btn').onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
}

// Universal Beautiful Centered Modal Dialog (Alert / Notice)
export function showAlertDialog({ 
  title = 'SkillOS Notice', 
  message = '', 
  buttonText = 'Got It', 
  icon = '💡',
  onOk,
  onConfirm 
}) {
  playNotificationSound(icon === '⚠️' ? 'warning' : 'info');
  let modal = document.getElementById('skillos-alert-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skillos-alert-modal';
    modal.className = 'modal-overlay hidden';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box" style="max-width: 420px; text-align: center; padding: 32px 24px; border-radius: var(--r-xl); box-shadow: var(--shadow-xl); animation: scaleIn 0.25s ease;">
      <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--primary-100); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 26px;">
        ${icon}
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-900);">${title}</h3>
      <p style="font-size: 0.875rem; color: var(--text-500); margin-bottom: 24px; line-height: 1.6; white-space: pre-line;">${message}</p>
      <div style="display: flex; justify-content: center;">
        <button id="alert-ok-btn" class="btn btn-primary btn-sm" style="min-width: 140px; padding: 10px 24px;">${buttonText}</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const closeDialog = (triggerCallback = false) => {
    modal.classList.add('hidden');
    const cb = onOk || onConfirm;
    if (triggerCallback && cb) {
      cb();
    }
  };

  modal.querySelector('#alert-ok-btn').onclick = () => closeDialog(true);
  modal.onclick = (e) => {
    if (e.target === modal) closeDialog(false);
  };
}

// Global expose and browser alert override to keep everything centered and beautiful
window.playNotificationSound = playNotificationSound;
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;
window.showAlertDialog = showAlertDialog;
window.alert = (msg) => {
  showAlertDialog({
    title: 'SkillOS Notice',
    message: String(msg || ''),
    icon: '✨'
  });
};
