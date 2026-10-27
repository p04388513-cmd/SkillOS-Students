// ============================================================
//  SkillOS — Courses Catalog Browser (courses.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, showToast, showConfirmDialog } from './app.js';

let allCourses = [];
let userProfile = null;

// Initialise auth listener
initAuthListener(async (user, profile) => {
  initSidebar();
  userProfile = profile;

  await loadCourses();
  setupFilterHandlers();
  
  hideLoader();
}, () => {
  // If not logged in, still allow viewing the catalog
  loadCourses().then(() => {
    setupFilterHandlers();
    hideLoader();
  });
});

// Load catalog from PostgreSQL backend
async function loadCourses() {
  try {
    const data = await apiFetch('/api/courses');
    allCourses = data.courses || [];
    renderCourses(allCourses);
  } catch (err) {
    console.error('Catalog Error:', err);
    showToast('Catalog Error', 'Could not load courses from database.', 'error');
  }
}

const courseImageMap = {
  'course-ai': 'images/course_ai.jpg',
  'course-cloud': 'images/course_cloud.jpg',
  'course-js': 'images/course_js.jpg',
  'course-py': 'images/course_python.png',
  'course-web': 'images/course_web.png',
  'course-sec': 'images/course_ds.png'
};

// Render dynamic card arrays
function renderCourses(courses) {
  const grid = document.getElementById('courses-grid');
  if (!grid) return;

  const enrolledIds = userProfile?.enrolledCourses || [];

  if (courses.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No Courses Found</div>
        <div class="empty-desc">Try modifying your search or filter values.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = courses.map(course => {
    const isEnrolled = enrolledIds.includes(course.id);
    const badgeClass = {
      Beginner: 'level-beginner',
      Intermediate: 'level-intermediate',
      Advanced: 'level-advanced'
    }[course.level] || 'level-beginner';
    const courseImg = courseImageMap[course.id] || 'images/course_web.png';

    return `
      <div class="course-card ${isEnrolled ? 'enrolled' : ''}" onclick="window.location.href='course-details.html?id=${course.id}'">
        <div class="course-thumb">
          <img src="${courseImg}" alt="${course.title}" class="course-img" loading="lazy">
          <div class="course-overlay"></div>
          <span class="level-badge ${badgeClass}">${course.level}</span>
          ${isEnrolled ? `<span class="enrolled-pill">✓ Enrolled</span>` : ''}
        </div>
        <div class="course-body">
          <span class="course-cat">${course.category}</span>
          <h3 class="course-name">${course.title}</h3>
          <div class="course-instructor">
            <div class="inst-avatar">${(course.instructor || 'I')[0]}</div>
            <span>${course.instructor}</span>
          </div>
          <div class="course-rating">
            <span class="stars">★</span>
            <span style="font-weight:600">${course.rating || '4.8'}</span>
          </div>
          <div class="course-meta">
            <div class="course-meta-item">⏱ ${course.duration}</div>
            <div class="course-meta-item">📖 ${course.lessons?.length || course.lessons_count || 0} lessons</div>
          </div>
        </div>
        <div class="course-footer" onclick="event.stopPropagation()">
          <span class="badge badge-green">Free</span>
          <div class="flex items-center gap-2">
            ${isEnrolled ? `
              <button class="btn btn-primary btn-xs" onclick="window.location.href='course-details.html?id=${course.id}'">Take Course 🚀</button>
              <button class="btn btn-outline btn-xs" style="color:var(--text-400); font-size:11px;" onclick="handleUnenroll('${course.id}')">Unenroll</button>
            ` : `
              <button class="btn btn-primary btn-xs" onclick="handleEnroll('${course.id}')">Enroll</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const countEl = document.getElementById('results-count');
  if (countEl) countEl.innerHTML = `Showing <strong>${courses.length}</strong> courses`;
}

// Enroll button action handler
window.handleEnroll = async (courseId) => {
  if (!userProfile) {
    window.location.href = 'login.html';
    return;
  }
  const course = allCourses.find(c => c.id === courseId);
  try {
    await apiFetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
    if (!userProfile.enrolledCourses) userProfile.enrolledCourses = [];
    if (!userProfile.enrolledCourses.includes(courseId)) {
      userProfile.enrolledCourses.push(courseId);
    }
    showToast('Enrolled Successfully', 'Course unlocked with 24/7 AI Tutor!', 'success');
    renderCourses(filterData());

    // Prompt user to immediately take the course where AI tutor runs
    showConfirmDialog({
      title: '🎉 Enrolled in ' + (course?.title || 'Course'),
      message: `You are now enrolled in "${course?.title || 'this course'}". Would you like to take this course now with your interactive AI Tutor?`,
      confirmText: 'Take Course Now 🚀',
      cancelText: 'Stay on Catalog',
      onConfirm: () => {
        window.location.href = `course-details.html?id=${courseId}`;
      }
    });
  } catch (err) {
    showToast('Enrollment Failed', err.message, 'error');
  }
};

// Unenroll button action handler
window.handleUnenroll = (courseId) => {
  if (!userProfile) return;
  const course = allCourses.find(c => c.id === courseId);
  showConfirmDialog({
    title: 'Unenroll from Course',
    message: `Are you sure you want to unenroll from "${course?.title || 'this course'}"? Your learning progress will be paused.`,
    confirmText: 'Yes, Unenroll',
    cancelText: 'Keep Learning',
    confirmDanger: true,
    onConfirm: async () => {
      try {
        await apiFetch(`/api/courses/${courseId}/unenroll`, { method: 'POST' });
        userProfile.enrolledCourses = userProfile.enrolledCourses.filter(id => id !== courseId);
        showToast('Unenrolled', 'Course removed from your dashboard.', 'info');
        renderCourses(filterData());
      } catch (err) {
        showToast('Unenrollment Failed', err.message, 'error');
      }
    }
  });
};

// Process filters
function filterData() {
  const searchVal = document.getElementById('course-search')?.value.toLowerCase() || '';
  const catVal = document.getElementById('filter-category')?.value || '';
  const levelVal = document.getElementById('filter-level')?.value || '';
  const enrollVal = document.getElementById('filter-enrolled')?.value || '';

  return allCourses.filter(course => {
    const matchSearch = course.title.toLowerCase().includes(searchVal) || (course.description && course.description.toLowerCase().includes(searchVal));
    const matchCat = !catVal || course.category === catVal;
    const matchLevel = !levelVal || course.level === levelVal;
    
    let matchEnroll = true;
    if (enrollVal === 'enrolled') {
      matchEnroll = userProfile?.enrolledCourses?.includes(course.id);
    } else if (enrollVal === 'available') {
      matchEnroll = !userProfile?.enrolledCourses?.includes(course.id);
    }

    return matchSearch && matchCat && matchLevel && matchEnroll;
  });
}

function setupFilterHandlers() {
  const searchInput = document.getElementById('course-search');
  searchInput?.addEventListener('input', () => {
    renderCourses(filterData());
  });

  ['filter-category', 'filter-level', 'filter-enrolled'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderCourses(filterData());
    });
  });

  // Category chip triggers
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const category = chip.getAttribute('data-category');
      const select = document.getElementById('filter-category');
      if (select) {
        select.value = category || '';
        renderCourses(filterData());
      }
    });
  });
}
