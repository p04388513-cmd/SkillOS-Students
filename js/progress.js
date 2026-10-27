// ============================================================
//  SkillOS — Progress Visualization (progress.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, animateCounter } from './app.js';

let OverviewChartObj = null;
let WeeklyChartObj = null;

// Initialise auth controls & load backend progress
initAuthListener(async (user, profile) => {
  initSidebar();
  await loadProgressData();
  hideLoader();
}, () => {});

async function loadProgressData() {
  try {
    const data = await apiFetch('/api/progress');
    const user = data.user || {};
    const enrolledCourses = data.enrolledCourses || [];
    const completedCount = data.completedCoursesCount || 0;
    const inProgressCount = data.inProgressCoursesCount || 0;

    // Top Stats Counters
    animateCounter(document.getElementById('total-points'), user.points || 0);
    animateCounter(document.getElementById('current-streak'), user.streak || 0);
    
    // Study time: display in hours or minutes appropriately
    const totalMinutes = user.total_minutes || 0;
    const hoursEl = document.getElementById('total-minutes');
    if (hoursEl) {
      if (totalMinutes < 60) {
        hoursEl.textContent = `${totalMinutes}m`;
      } else {
        hoursEl.textContent = `${(totalMinutes / 60).toFixed(1)}h`;
      }
    }
    
    // Completed courses count
    animateCounter(document.getElementById('courses-enrolled'), completedCount);

    // 1. Overall Course Status Doughnut Chart (Real Database Data)
    setupOverviewChart(completedCount, inProgressCount);

    // 2. Weekly Learning Bar Chart (Real Database Data)
    setupWeeklyChart(data.weeklyLearning || { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data: [0,0,0,0,0,0,0] });

    // 3. Course Progress Rings
    renderCourseProgress(enrolledCourses);

    // 4. Badges & Achievements (Real Database Status)
    renderBadges(data.badges || []);

    // 5. Activity Heatmap (Real Timestamped Database Activity)
    renderActivityHeatmap(data.heatmapDays || []);

  } catch (err) {
    console.error('Progress load error:', err);
  }
}

function setupOverviewChart(completed, progress) {
  const canvas = document.getElementById('overview-chart');
  if (!canvas || !window.Chart) return;

  if (OverviewChartObj) OverviewChartObj.destroy();

  const total = completed + progress;
  OverviewChartObj = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress'],
      datasets: [{
        data: total === 0 ? [0, 0] : [completed, progress],
        backgroundColor: ['#16A34A', '#F59E0B'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 12 }, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} course${ctx.raw === 1 ? '' : 's'}`
          }
        }
      }
    }
  });
}

function setupWeeklyChart(weeklyLearning) {
  const canvas = document.getElementById('weekly-hours-chart');
  if (!canvas || !window.Chart) return;

  if (WeeklyChartObj) WeeklyChartObj.destroy();

  WeeklyChartObj = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeklyLearning.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Minutes Studied',
        data: weeklyLearning.data || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: '#22C55E',
        borderRadius: 6,
        hoverBackgroundColor: '#16A34A'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} min${ctx.raw === 1 ? '' : 's'} studied`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { family: 'Inter', size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

function renderCourseProgress(enrolledCourses) {
  const container = document.getElementById('course-progress-grid');
  if (!container) return;

  if (enrolledCourses.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 28px; text-align: center;">
        <div class="empty-icon" style="font-size: 32px; margin-bottom: 8px;">📚</div>
        <div class="empty-title" style="font-weight: 700; margin-bottom: 4px;">No Enrolled Courses</div>
        <div class="empty-desc text-muted text-sm">Your course progress rings will appear here as soon as you enroll.</div>
        <a href="courses.html" class="btn btn-primary btn-sm" style="margin-top: 14px; display: inline-block;">Browse Courses</a>
      </div>
    `;
    return;
  }

  container.innerHTML = enrolledCourses.map(course => {
    const percent = Math.min(100, Math.max(0, course.progress_percent || 0));
    return `
      <div class="progress-course-card" onclick="window.location.href='course-details.html?id=${course.course_id}'" style="cursor: pointer;">
        <div class="ring-wrap">
          <svg class="ring-svg" viewBox="0 0 36 36">
            <path class="ring-bg" stroke="var(--border)" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="ring-fill" stroke="var(--primary)" stroke-width="3" stroke-dasharray="${percent}, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="ring-pct">${percent}%</div>
          <div class="ring-emoji">${course.emoji || '📖'}</div>
        </div>
        <div class="pc-info">
          <div class="pc-title font-bold">${course.title}</div>
          <div class="pc-meta text-muted text-xs">${course.level || 'Beginner'} · ${course.category || 'Core'} · ${course.duration || '8h'}</div>
          <div class="progress-bar thin" style="margin-top: 8px;"><div class="progress-fill" style="width:${percent}%"></div></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBadges(badges) {
  const container = document.getElementById('badges-grid');
  if (!container) return;

  if (badges.length === 0) {
    container.innerHTML = `<div class="text-sm text-muted">No badges yet.</div>`;
    return;
  }

  container.innerHTML = badges.map(badge => `
    <div class="badge-item ${badge.earned ? 'earned' : 'locked'}" title="${badge.earned ? 'Earned!' : 'Locked'}">
      <div class="bi-icon">${badge.icon}</div>
      <div class="bi-name font-bold">${badge.name}</div>
      <div class="bi-desc text-xs">${badge.desc}</div>
      <div class="badge-status-tag" style="margin-top: 6px; font-size: 10px; font-weight: 700; color: ${badge.earned ? 'var(--primary)' : 'var(--text-400)'};">
        ${badge.earned ? '✓ Unlocked' : '🔒 Locked'}
      </div>
    </div>
  `).join('');
}

function renderActivityHeatmap(heatmapDays) {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;

  if (heatmapDays.length === 0) {
    container.innerHTML = `<div class="text-sm text-muted">No activity logged yet.</div>`;
    return;
  }

  container.innerHTML = heatmapDays.map(day => {
    const levelClass = day.level > 0 ? `lv${day.level}` : '';
    const tooltip = `${day.displayDate}: ${day.count} activity item${day.count === 1 ? '' : 's'}`;
    return `<div class="hm-cell ${levelClass}" title="${tooltip}" data-date="${day.date}"></div>`;
  }).join('');
}
