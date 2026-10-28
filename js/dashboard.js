// ============================================================
//  SkillOS — Dashboard Controller (dashboard.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, animateCounter } from './app.js';
import { DEFAULT_COURSES } from './course-bank.js';

// Initialise auth status
initAuthListener(async (user, profile) => {
  initSidebar();
  
  // Render details
  renderWelcomeBanner(profile);
  renderTopStats(profile);
  renderWeeklyCalendar();
  
  // Load Dashboard data from PostgreSQL
  await loadDashboardData();
  
  hideLoader();
});

function renderWelcomeBanner(profile) {
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon';
  } else if (currentHour >= 17) {
    greeting = 'Good evening';
  }
  
  const greetingEl = document.getElementById('welcome-greeting');
  if (greetingEl) greetingEl.textContent = `${greeting}, ${profile.name || profile.displayName || 'Student'}!`;
  
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = profile.streak || 0;

  const streakWidgetCount = document.getElementById('streak-widget-count');
  if (streakWidgetCount) streakWidgetCount.textContent = profile.streak || 0;
}

function renderTopStats(profile) {
  animateCounter(document.getElementById('stat-courses'), profile.enrolledCourses?.length || profile.enrollments?.length || 0);
  animateCounter(document.getElementById('stat-minutes'), profile.total_minutes || profile.totalMinutes || 0);
  animateCounter(document.getElementById('stat-streak'), profile.streak || 0);
  animateCounter(document.getElementById('stat-points'), profile.points || 0);
}

// Load Dashboard Data from PostgreSQL Backend with offline fallback
async function loadDashboardData() {
  try {
    const data = await apiFetch('/api/dashboard');
    const { user, enrolledCourses } = data;

    if (user) {
      renderTopStats(user);
    }

    renderContinueLearning(enrolledCourses || []);
    renderActivityFeed();
    await loadSuggestedCourses(enrolledCourses || []);
  } catch (err) {
    console.warn('Backend dashboard unavailable, using local session & course bank:', err.message);
    if (userProfile) {
      renderTopStats(userProfile);
      const enrolledIds = userProfile.enrolledCourses || [];
      const enrolledObj = enrolledIds.map(id => {
        const c = DEFAULT_COURSES.find(dc => dc.id === id) || DEFAULT_COURSES[0];
        return {
          course_id: c.id,
          title: c.title,
          progress_percent: 35,
          lessons_completed: 1,
          lessons_count: c.lessons_count || 4,
          emoji: c.emoji
        };
      });
      renderContinueLearning(enrolledObj);
      renderActivityFeed();
      await loadSuggestedCourses(enrolledObj);
    }
  }
}

// Render dynamic learning list
function renderContinueLearning(enrolledCourses) {
  const container = document.getElementById('continue-learning-list');
  if (!container) return;

  if (enrolledCourses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-title">Start Learning</div>
        <div class="empty-desc">You are not enrolled in any courses yet.</div>
        <a href="courses.html" class="btn btn-primary btn-sm">Explore Courses</a>
      </div>
    `;
    return;
  }

  container.innerHTML = enrolledCourses.slice(0, 3).map(course => {
    const percent = course.progress_percent || 0;
    return `
      <a href="course-details.html?id=${course.course_id}" class="continue-card">
        <div class="cc-thumb">${course.emoji || '📖'}</div>
        <div class="cc-info">
          <div class="cc-title">${course.title}</div>
          <div class="cc-meta">${course.level || 'Beginner'} · ${course.category || 'Core'}</div>
          <div class="cc-progress-wrap">
            <div class="cc-bar"><div class="cc-fill" style="width: ${percent}%"></div></div>
            <span class="cc-pct">${percent}%</span>
          </div>
        </div>
        <div class="cc-play">▶</div>
      </a>
    `;
  }).join('');
}

// Generate activities
function renderActivityFeed() {
  const listEl = document.getElementById('activity-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="activity-item">
      <div class="activity-icon">🎓</div>
      <div class="activity-content">
        <div class="activity-text"><strong>Welcome to SkillOS!</strong> Your PostgreSQL database is connected and active.</div>
        <div class="activity-time">Just now</div>
      </div>
    </div>
  `;
}

// Load side panel suggestions
async function loadSuggestedCourses(enrolledCourses) {
  const container = document.getElementById('suggested-list');
  if (!container) return;

  try {
    const enrolledIds = (enrolledCourses || []).map(c => c.course_id);
    let allCourses = DEFAULT_COURSES;
    try {
      const data = await apiFetch('/api/courses');
      if (data && data.courses && data.courses.length > 0) allCourses = data.courses;
    } catch {}
    
    const unEnrolled = allCourses.filter(course => !enrolledIds.includes(course.id));

    if (unEnrolled.length === 0) {
      container.innerHTML = `<div style="padding: 20px; font-size:12px; color:var(--text-400)">You've enrolled in all courses! 🎉</div>`;
      return;
    }

    container.innerHTML = unEnrolled.slice(0, 3).map(course => `
      <a href="course-details.html?id=${course.id}" class="suggested-item">
        <div class="si-emoji">${course.emoji || '📖'}</div>
        <div class="si-info">
          <div class="si-title">${course.title}</div>
          <div class="si-meta">${course.level} · ${course.duration}</div>
        </div>
      </a>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Populate weekly visual calendar
function renderWeeklyCalendar() {
  const container = document.getElementById('calendar-week');
  if (!container) return;

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayIdx = new Date().getDay();

  container.innerHTML = weekdays.map((day, idx) => {
    let classes = 'cal-day';
    if (idx === todayIdx) classes += ' today';
    else if (idx < todayIdx) classes += ' has-activity';

    return `
      <div class="${classes}">
        <span>${day}</span>
        ${classes.includes('activity') || classes.includes('today') ? '<div class="cal-dot"></div>' : ''}
      </div>
    `;
  }).join('');
}
