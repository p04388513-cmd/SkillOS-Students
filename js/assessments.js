// ============================================================
//  SkillOS — Skill Assessment & Diagnostic Exam Engine
// ============================================================
import { initAuthListener, initSidebar, hideLoader, showToast, showConfirmDialog, apiFetch } from './app.js';
import { ASSESSMENT_DATA, PASS_THRESHOLD, XP_PASS, ASSESSMENT_COURSE_MAP, gradeAssessment } from './assessment-bank.js';

const LETTERS = ['A', 'B', 'C', 'D'];

let attempts = {};            // assessment_id -> stored attempt (completed tests are locked)
let enrollmentsMap = {};      // course_id -> { progress_percent, status, title }
let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval = null;
let deadline = 0;
let secondsRemaining = 0;
let submitting = false;

// Initialize Page
initAuthListener(async () => {
  initSidebar();
  await loadAttempts();
  renderDashboard();

  // Check URL parameters for direct test execution (?id=... or ?test=...)
  const urlParams = new URLSearchParams(window.location.search);
  const targetKey = urlParams.get('id') || urlParams.get('test');
  const isRetestReq = urlParams.get('retest') === '1' || urlParams.get('retake') === '1';

  if (targetKey) {
    const resolved = resolveKey(targetKey);
    if (resolved && ASSESSMENT_DATA[resolved]) {
      setTimeout(() => {
        if (isRetestReq) {
          startAssessment(resolved, true);
        } else if (attempts[resolved]) {
          showStoredResult(resolved);
        } else {
          startAssessment(resolved);
        }
      }, 100);
    }
  }

  hideLoader();
}, () => {});

async function loadAttempts() {
  try {
    const [data, dash] = await Promise.all([
      apiFetch('/api/assessments/attempts').catch(() => ({ attempts: [] })),
      apiFetch('/api/dashboard').catch(() => ({ enrolledCourses: [] }))
    ]);
    const serverAttempts = Object.fromEntries((data?.attempts || []).map(a => [a.assessment_id, a]));
    const serverEnrollments = Object.fromEntries((dash?.enrolledCourses || []).map(c => [c.course_id, c]));

    // Load local stored attempts from localStorage for offline/GitHub Pages
    let localAttempts = {};
    try {
      localAttempts = JSON.parse(localStorage.getItem('skillos_assessment_attempts') || '{}');
    } catch (e) {}

    // Load local user enrollments from userProfile / localStorage
    let localEnrollments = {};
    try {
      const storedUser = JSON.parse(localStorage.getItem('skillos_user') || '{}');
      if (storedUser && storedUser.enrollments) {
        localEnrollments = Object.fromEntries(storedUser.enrollments.map(e => [e.course_id, e]));
      } else if (storedUser && storedUser.enrolledCourses) {
        localEnrollments = Object.fromEntries(storedUser.enrolledCourses.map(id => [id, { course_id: id, progress_percent: 100 }]));
      }
    } catch (e) {}

    attempts = { ...localAttempts, ...serverAttempts };
    enrollmentsMap = { ...localEnrollments, ...serverEnrollments };
  } catch (err) {
    console.warn('Could not load assessment history from server, using local storage:', err.message);
  }
}

// ── Helpers ─────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatTime(totalSec) {
  const s = Math.max(0, totalSec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveKey(testKey) {
  const key = String(testKey).toLowerCase();
  if (ASSESSMENT_DATA[key]) return key;
  if (key.includes('python')) return 'python';
  if (key.includes('ui') || key.includes('layout') || key.includes('web')) return 'uiux';
  if (key.includes('ai') || key.includes('ml')) return 'ai-ml';
  if (key.includes('js') || key.includes('script')) return 'javascript';
  if (key.includes('cloud') || key.includes('devops')) return 'cloud';
  if (key.includes('sec')) return 'security';
  if (key.includes('panda') || key.includes('data')) return 'pandas';
  return null;
}

let currentSearchQuery = '';

function filterTests(tests, query) {
  if (!query) return tests;
  const q = query.toLowerCase().trim();
  return tests.filter(test => {
    const titleMatch = (test.title || '').toLowerCase().includes(q);
    const descMatch = (test.description || '').toLowerCase().includes(q);
    const courseMatch = (test.courseTitle || '').toLowerCase().includes(q);
    const levelMatch = (test.level || '').toLowerCase().includes(q);
    const topicsMatch = Array.isArray(test.topics) && test.topics.some(t => t.toLowerCase().includes(q));
    const attempt = attempts[test.id];
    const statusMatch = attempt 
      ? (attempt.passed ? 'passed' : 'failed needs practice').includes(q)
      : 'not attempted pending new'.includes(q);

    return titleMatch || descMatch || courseMatch || levelMatch || topicsMatch || statusMatch;
  });
}

// ── Dashboard (cards + stats + search) ─────────────────────────
function renderDashboard() {
  const grid = document.getElementById('assess-grid-view');
  if (!grid) return;

  const tests = Object.values(ASSESSMENT_DATA);
  const done = tests.filter(t => attempts[t.id]);
  const passedCount = done.filter(t => attempts[t.id].passed).length;
  const avgScore = done.length ? Math.round(done.reduce((s, t) => s + attempts[t.id].score, 0) / done.length) : 0;
  const xpTotal = done.reduce((s, t) => s + attempts[t.id].xp_awarded, 0);

  grid.innerHTML = `
    <div class="as-stats anim-fade-in-up">
      <div class="as-stat">
        <div class="as-stat-label">Completed</div>
        <div class="as-stat-value">${done.length}<span>/${tests.length}</span></div>
        <div class="as-stat-bar"><div style="width:${(done.length / tests.length) * 100}%"></div></div>
      </div>
      <div class="as-stat">
        <div class="as-stat-label">Average Score</div>
        <div class="as-stat-value">${done.length ? `${avgScore}<span>%</span>` : '—'}</div>
        <div class="as-stat-hint">Pass mark ${PASS_THRESHOLD}%</div>
      </div>
      <div class="as-stat">
        <div class="as-stat-label">Passed</div>
        <div class="as-stat-value">${passedCount}</div>
        <div class="as-stat-hint">${done.length - passedCount} need practice</div>
      </div>
      <div class="as-stat as-stat-xp">
        <div class="as-stat-label">XP Earned</div>
        <div class="as-stat-value">+${xpTotal}</div>
        <div class="as-stat-hint">from assessments</div>
      </div>
    </div>

    <div class="as-notice" style="background: rgba(37, 99, 235, 0.08); border-color: rgba(37, 99, 235, 0.25);">
      <span style="font-size: 20px;">🔄</span>
      <span><strong>Retests Enabled:</strong> You can retake any assessment at any time to improve your score, master skills, and unlock your Certificate of Mastery (Score ≥ 70% required).</span>
    </div>

    <!-- Search Bar with Search Button -->
    <div class="as-search-box">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); flex-shrink: 0;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="as-search-input" placeholder="Search assessments by topic, course, or skills (e.g. Python, Docker, AI, UI/UX)..." style="flex: 1; border: none; background: transparent; outline: none; font-size: 0.92rem; color: var(--text-900); font-family: var(--font-sans); min-width: 180px;" autocomplete="off" value="${escapeHtml(currentSearchQuery)}">
      <button type="button" id="as-search-clear-btn" class="${currentSearchQuery ? '' : 'hidden'}" style="background: none; border: none; color: var(--text-400); cursor: pointer; font-size: 15px; padding: 4px 8px; border-radius: 4px;" title="Clear search">✕</button>
      <button class="btn btn-primary btn-sm" id="as-search-btn" style="padding: 8px 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; border-radius: var(--r-lg); white-space: nowrap;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Search</span>
      </button>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-size: 13px; font-weight: 700; color: var(--text-700);" id="as-search-count">
        All Assessments (${tests.length})
      </span>
    </div>

    <div class="as-cards" id="as-cards-container"></div>
  `;

  const updateCardsDisplay = (query) => {
    const cardsContainer = document.getElementById('as-cards-container');
    const countLabel = document.getElementById('as-search-count');
    const clearBtn = document.getElementById('as-search-clear-btn');
    if (!cardsContainer) return;

    if (clearBtn) {
      if (query) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const filtered = filterTests(tests, query);

    if (countLabel) {
      countLabel.textContent = query 
        ? `${filtered.length} of ${tests.length} Assessments Found` 
        : `All Assessments (${tests.length})`;
    }

    if (filtered.length === 0) {
      cardsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-xl); text-align: center; width: 100%;">
          <div style="font-size: 38px; margin-bottom: 10px;">🔍</div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-900); margin-bottom: 6px;">No Matching Assessments Found</h3>
          <p class="text-xs text-muted" style="max-width: 440px; margin: 0 auto 16px; line-height: 1.5;">
            No assessment matches "<strong>${escapeHtml(query)}</strong>". Try searching for keywords like <em>Python, React, Cloud, Docker, UI/UX</em>.
          </p>
          <button class="btn btn-outline btn-xs" id="as-empty-clear-btn" style="padding: 6px 14px;">🔄 Clear Search</button>
        </div>
      `;
      document.getElementById('as-empty-clear-btn')?.addEventListener('click', () => {
        resetAssessmentSearch();
      });
      return;
    }

    cardsContainer.innerHTML = filtered.map(renderCard).join('');

    // Rebind action listeners to cards
    cardsContainer.querySelectorAll('[data-view-test]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showStoredResult(el.getAttribute('data-view-test'));
      });
    });

    cardsContainer.querySelectorAll('[data-retest]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        startAssessment(el.getAttribute('data-retest'), true);
      });
    });

    cardsContainer.querySelectorAll('[data-test]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-test');
        if (attempts[id]) showStoredResult(id);
        else startAssessment(id);
      });
    });
  };

  const resetAssessmentSearch = () => {
    currentSearchQuery = '';
    const input = document.getElementById('as-search-input');
    if (input) input.value = '';
    updateCardsDisplay('');
    input?.focus();
  };

  // Wire search bar listeners
  const searchInput = document.getElementById('as-search-input');
  const searchBtn = document.getElementById('as-search-btn');
  const clearBtn = document.getElementById('as-search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim();
      updateCardsDisplay(currentSearchQuery);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        currentSearchQuery = searchInput.value.trim();
        updateCardsDisplay(currentSearchQuery);
        if (currentSearchQuery) {
          const filtered = filterTests(tests, currentSearchQuery);
          showToast('Search Results', `Found ${filtered.length} assessment${filtered.length === 1 ? '' : 's'}`, 'info');
        }
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      currentSearchQuery = searchInput ? searchInput.value.trim() : '';
      updateCardsDisplay(currentSearchQuery);
      if (currentSearchQuery) {
        const filtered = filterTests(tests, currentSearchQuery);
        showToast('Search Results', `Found ${filtered.length} assessment${filtered.length === 1 ? '' : 's'}`, 'info');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      resetAssessmentSearch();
    });
  }

  // Initial cards render
  updateCardsDisplay(currentSearchQuery);
}

function renderCard(test) {
  const attempt = attempts[test.id];
  const mins = Math.round(test.durationSeconds / 60);
  const status = attempt
    ? (attempt.passed
        ? `<span class="as-pill as-pill-pass">✓ Passed · ${attempt.score}%</span>`
        : `<span class="as-pill as-pill-fail">Needs practice · ${attempt.score}%</span>`)
    : `<span class="as-pill as-pill-new">Not attempted</span>`;

  const pairedCourseId = test.courseId || ASSESSMENT_COURSE_MAP[test.id];
  const enrollment = enrollmentsMap[pairedCourseId];
  const courseDone = enrollment && (enrollment.progress_percent >= 100);

  let courseBadgeHtml = '';
  if (enrollment) {
    courseBadgeHtml = `
      <div style="margin: 8px 0; font-size: 11px; display: flex; align-items: center; justify-content: space-between; background: var(--bg); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);">
        <span style="color: var(--text-600); font-weight: 600;">📘 Paired Course:</span>
        <span style="font-weight: 700; color: ${courseDone ? '#16a34a' : 'var(--primary)'};">
          ${courseDone ? '✓ 100% Completed' : `${enrollment.progress_percent || 0}% Done`}
        </span>
      </div>
    `;
  } else {
    courseBadgeHtml = `
      <div style="margin: 8px 0; font-size: 11px; display: flex; align-items: center; justify-content: space-between; background: var(--bg); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);">
        <span style="color: var(--text-500);">Paired Course:</span>
        <a href="course-details.html?id=${pairedCourseId}" style="color: var(--primary); font-weight: 600; text-decoration: underline;" onclick="event.stopPropagation();">
          ${test.courseTitle || 'View Course'}
        </a>
      </div>
    `;
  }

  // Dual completion pill
  let certIndicator = '';
  if (attempt && attempt.passed && courseDone) {
    certIndicator = `<div style="font-size: 10px; font-weight: 800; color: #16a34a; margin-top: 4px;">🏆 Official Certificate Issued</div>`;
  } else if (courseDone && (!attempt || !attempt.passed)) {
    certIndicator = `<div style="font-size: 10px; font-weight: 800; color: #d97706; margin-top: 4px;">⚡ Final Prerequisite: Pass to earn Certificate!</div>`;
  }

  return `
    <article class="as-card ${attempt ? 'is-done' : ''}" data-test="${test.id}" style="--accent:${test.accent}; --accent-bg:${test.accentBg};" tabindex="0">
      <div class="as-card-top">
        <div class="as-card-icon">${test.icon}</div>
        ${status}
      </div>
      <h3 class="as-card-title">${escapeHtml(test.title)}</h3>
      <p class="as-card-desc">${escapeHtml(test.description)}</p>
      ${courseBadgeHtml}
      ${certIndicator}
      <div class="as-card-meta" style="margin-top: 8px;">
        <span>📝 ${test.questions.length} questions</span>
        <span>⏱️ ${mins} min</span>
        <span>📶 ${test.level}</span>
      </div>
      <div class="as-chips">${test.topics.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      <div class="as-card-foot">
        ${attempt
          ? `<span class="as-card-date">Scored <strong>${attempt.score}%</strong> (${attempt.passed ? '✓ Passed' : 'Needs ≥70%'})</span>
             <div class="flex items-center gap-2">
               <button class="btn btn-outline btn-xs" data-view-test="${test.id}">View Results</button>
               <button class="btn btn-primary btn-xs" data-retest="${test.id}" style="background:#16a34a; border-color:#16a34a;">🔄 Retest</button>
             </div>`
          : `<span class="as-card-date">Up to <strong>+${XP_PASS} XP</strong></span>
             <button class="btn btn-primary btn-sm" data-test="${test.id}">Start Test →</button>`}
      </div>
    </article>
  `;
}

// ── Pre-test rules modal ────────────────────────────────────
export function startAssessment(testKey, isRetest = false) {
  const key = resolveKey(testKey);
  const test = key && ASSESSMENT_DATA[key];
  if (!test) {
    showToast('Assessment Error', 'Selected test could not be found.', 'error');
    return;
  }
  if (attempts[test.id] && !isRetest) {
    showStoredResult(test.id);
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'as-modal-backdrop';
  modal.innerHTML = `
    <div class="as-modal" role="dialog" aria-modal="true" style="--accent:${test.accent}; --accent-bg:${test.accentBg};">
      <div class="as-modal-icon">${test.icon}</div>
      <h2>${escapeHtml(test.title)} ${isRetest ? '<span style="font-size:14px; color:var(--primary); font-weight:normal;">(Retest)</span>' : ''}</h2>
      <p class="as-modal-sub">${test.category} · ${test.level}</p>
      <div class="as-modal-grid">
        <div><strong>${test.questions.length}</strong><span>Questions</span></div>
        <div><strong>${Math.round(test.durationSeconds / 60)}m</strong><span>Time limit</span></div>
        <div><strong>${PASS_THRESHOLD}%</strong><span>Pass mark</span></div>
        <div><strong>+${XP_PASS}</strong><span>XP on pass</span></div>
      </div>
      <ul class="as-modal-rules">
        <li>⏱️ The timer starts immediately and auto-submits at 00:00.</li>
        <li>⌨️ Use <kbd>A</kbd>–<kbd>D</kbd> to answer and <kbd>←</kbd> <kbd>→</kbd> to move between questions.</li>
        <li>🔄 <strong>Retest Enabled:</strong> You can take this exam again. Your updated score will apply to your certification eligibility.</li>
      </ul>
      <label class="as-modal-check">
        <input type="checkbox" id="as-ack"> I am ready to begin ${isRetest ? 'this retest' : 'this assessment'}.
      </label>
      <div class="as-modal-actions">
        <button class="btn btn-outline btn-sm" id="as-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm" id="as-begin" disabled>${isRetest ? 'Begin Retest 🔄' : 'Begin Test'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  const ack = modal.querySelector('#as-ack');
  const begin = modal.querySelector('#as-begin');
  ack.addEventListener('change', () => { begin.disabled = !ack.checked; });
  modal.querySelector('#as-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  begin.addEventListener('click', () => { close(); launchExamSession(test); });
}

// ── Exam session ────────────────────────────────────────────
function launchExamSession(test) {
  currentTest = test;
  currentQuestionIndex = 0;
  userAnswers = new Array(test.questions.length).fill(null);
  secondsRemaining = test.durationSeconds;
  deadline = Date.now() + test.durationSeconds * 1000;
  submitting = false;

  document.getElementById('assess-grid-view')?.classList.add('hidden');
  const playerView = document.getElementById('exam-player-view');
  playerView?.classList.remove('hidden');
  renderQuestion();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsRemaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    updateTimerDisplay();
    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      showToast('Time Expired', 'Assessment timer elapsed. Submitting answers automatically...', 'warning');
      submitExam(true);
    }
  }, 1000);

  document.addEventListener('keydown', handleExamKeys);
  window.addEventListener('beforeunload', warnBeforeUnload);
  showToast('Test Started', `Good luck with ${test.title}!`, 'success');
}

function endExamSession() {
  clearInterval(timerInterval);
  document.removeEventListener('keydown', handleExamKeys);
  window.removeEventListener('beforeunload', warnBeforeUnload);
}

function warnBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = '';
}

function handleExamKeys(e) {
  if (!currentTest || submitting || document.querySelector('.modal-overlay:not(.hidden), .as-modal-backdrop')) return;
  if (e.target.closest('input, textarea')) return;
  const k = e.key.toUpperCase();
  const idx = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
  if (idx >= 0 && idx < currentTest.questions[currentQuestionIndex].options.length) {
    selectAnswer(idx);
  } else if (e.key === 'ArrowRight' && currentQuestionIndex < currentTest.questions.length - 1) {
    goTo(currentQuestionIndex + 1);
  } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
    goTo(currentQuestionIndex - 1);
  }
}

function selectAnswer(idx) {
  userAnswers[currentQuestionIndex] = idx;
  renderQuestion();
}

function goTo(index) {
  currentQuestionIndex = index;
  renderQuestion();
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('exam-timer-display');
  if (!timerEl || !currentTest) return;
  timerEl.querySelector('.as-timer-text').textContent = formatTime(secondsRemaining);
  timerEl.style.setProperty('--pct', `${(secondsRemaining / currentTest.durationSeconds) * 100}%`);
  timerEl.classList.toggle('urgent', secondsRemaining <= 120);
}

function renderQuestion() {
  const playerView = document.getElementById('exam-player-view');
  if (!playerView || !currentTest) return;

  const total = currentTest.questions.length;
  const q = currentTest.questions[currentQuestionIndex];
  const answered = userAnswers.filter(a => a !== null).length;
  const selected = userAnswers[currentQuestionIndex];
  const isLast = currentQuestionIndex === total - 1;

  playerView.innerHTML = `
    <div class="exam-wrapper as-exam" style="--accent:${currentTest.accent}; --accent-bg:${currentTest.accentBg};">
      <div class="exam-header">
        <div class="exam-badge">
          <span class="as-exam-icon">${currentTest.icon}</span>
          <div>
            <div>${escapeHtml(currentTest.title)}</div>
            <div class="as-exam-sub">${currentTest.category} · Single attempt</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="as-timer ${secondsRemaining <= 120 ? 'urgent' : ''}" id="exam-timer-display"
               style="--pct:${(secondsRemaining / currentTest.durationSeconds) * 100}%">
            <span class="as-timer-dot"></span>
            <span class="as-timer-text">${formatTime(secondsRemaining)}</span>
          </div>
          <button class="btn btn-outline btn-xs" id="exit-exam-btn" style="color:var(--text-500); padding:6px 12px;">✕ Exit</button>
        </div>
      </div>

      <div class="as-navigator" aria-label="Question navigator">
        ${currentTest.questions.map((_, i) => `
          <button class="as-nav-dot ${i === currentQuestionIndex ? 'current' : ''} ${userAnswers[i] !== null ? 'answered' : ''}"
                  data-goto="${i}" aria-label="Question ${i + 1}">${i + 1}</button>
        `).join('')}
        <span class="as-nav-count">${answered}/${total} answered</span>
      </div>
      <div class="exam-progress-bar">
        <div class="exam-progress-fill" style="width:${(answered / total) * 100}%;"></div>
      </div>

      <div class="as-q anim-fade-in-up">
        <div class="as-q-label">Question ${currentQuestionIndex + 1} of ${total}</div>
        <div class="exam-question-text">${escapeHtml(q.question)}</div>
        ${q.code ? `<pre class="exam-code-snippet"><code>${escapeHtml(q.code)}</code></pre>` : ''}

        <div class="exam-options-list" role="radiogroup">
          ${q.options.map((opt, i) => `
            <div class="exam-option-item ${selected === i ? 'selected' : ''}" data-opt-index="${i}" role="radio" aria-checked="${selected === i}" tabindex="0">
              <div class="exam-option-letter">${LETTERS[i]}</div>
              <div class="exam-option-text">${escapeHtml(opt)}</div>
              <kbd class="as-opt-key">${LETTERS[i]}</kbd>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="exam-footer">
        <button class="btn btn-outline btn-sm" id="prev-q-btn" ${currentQuestionIndex === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>← Previous</button>
        <div class="flex items-center gap-2">
          ${!isLast ? `<button class="btn btn-primary btn-sm" id="next-q-btn">Next Question →</button>` : ''}
          ${isLast || answered === total
            ? `<button class="btn btn-primary btn-sm as-submit-btn" id="submit-exam-btn">Submit Assessment 🎯</button>`
            : ''}
        </div>
      </div>
    </div>
  `;

  playerView.querySelectorAll('.exam-option-item').forEach(item => {
    item.addEventListener('click', () => selectAnswer(parseInt(item.getAttribute('data-opt-index'), 10)));
  });
  playerView.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goTo(parseInt(btn.getAttribute('data-goto'), 10)));
  });

  document.getElementById('exit-exam-btn')?.addEventListener('click', () => {
    showConfirmDialog({
      title: 'Exit Assessment',
      message: 'Are you sure you want to leave this test session? Your answers so far will be discarded.',
      confirmText: 'Yes, Exit',
      cancelText: 'Stay in Test',
      confirmDanger: true,
      onConfirm: () => {
        endExamSession();
        returnToAssessmentList();
      }
    });
  });

  document.getElementById('prev-q-btn')?.addEventListener('click', () => {
    if (currentQuestionIndex > 0) goTo(currentQuestionIndex - 1);
  });
  document.getElementById('next-q-btn')?.addEventListener('click', () => {
    if (currentQuestionIndex < total - 1) goTo(currentQuestionIndex + 1);
  });
  document.getElementById('submit-exam-btn')?.addEventListener('click', () => submitExam(false));
}

// ── Submission ──────────────────────────────────────────────
function submitExam(force = false) {
  if (submitting) return;
  if (force) {
    sendSubmission();
    return;
  }
  const unanswered = userAnswers.filter(a => a === null).length;

  showConfirmDialog({
    title: unanswered > 0 ? 'Unanswered Questions' : 'Submit Assessment',
    message: unanswered > 0
      ? `You have ${unanswered} unanswered question(s). This is your only attempt — submit anyway?`
      : 'This is your only attempt. Once submitted, your result is final and the test cannot be retaken.',
    confirmText: 'Submit Final Answers',
    cancelText: 'Keep Reviewing',
    confirmDanger: false,
    onConfirm: sendSubmission
  });
}

async function sendSubmission() {
  if (submitting || !currentTest) return;
  submitting = true;
  endExamSession();
  document.getElementById('skillos-confirm-modal')?.classList.add('hidden');

  const test = currentTest;
  const timeSpentSeconds = test.durationSeconds - secondsRemaining;

  let attemptData = null;
  let serverMeta = null;

  try {
    const data = await apiFetch(`/api/assessments/${test.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: userAnswers, timeSpentSeconds })
    });
    if (data && data.attempt) {
      attemptData = data.attempt;
      serverMeta = data;
    }
  } catch (err) {
    console.warn('Backend submit unavailable (e.g. GitHub Pages static host), grading locally:', err.message);
  }

  // If backend unavailable (static host / GitHub Pages 405), grade locally using assessment-bank
  if (!attemptData) {
    const grade = gradeAssessment(test, userAnswers);
    attemptData = {
      assessment_id: test.id,
      answers: userAnswers,
      correct_count: grade.correct,
      total_questions: grade.total,
      score: grade.score,
      passed: grade.passed,
      xp_awarded: grade.xp,
      time_spent_seconds: timeSpentSeconds,
      completed_at: new Date().toISOString()
    };
  }

  // Store attempt in memory and localStorage
  attempts[test.id] = attemptData;
  try {
    const storedAttempts = JSON.parse(localStorage.getItem('skillos_assessment_attempts') || '{}');
    storedAttempts[test.id] = attemptData;
    localStorage.setItem('skillos_assessment_attempts', JSON.stringify(storedAttempts));

    // Update user points in session
    const storedUser = JSON.parse(localStorage.getItem('skillos_user') || '{}');
    if (storedUser) {
      storedUser.points = (storedUser.points || 0) + attemptData.xp_awarded;
      localStorage.setItem('skillos_user', JSON.stringify(storedUser));
    }
  } catch (e) {}

  // If passed and paired course is 100% complete, issue local certificate
  const pairedCourseId = test.courseId || ASSESSMENT_COURSE_MAP[test.id];
  const enrollment = enrollmentsMap[pairedCourseId];
  const isCourseDone = enrollment ? (enrollment.progress_percent >= 100) : false;

  if (attemptData.passed && isCourseDone) {
    serverMeta = serverMeta || {};
    serverMeta.certificate_issued = true;
    const certCode = 'SKILLOS-' + (test.id || 'PY').toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    serverMeta.certificate = {
      certificate_code: certCode,
      course_id: pairedCourseId,
      course_title: test.courseTitle,
      student_name: (enrollment?.student_name || 'Student'),
      issued_at: new Date().toISOString()
    };
    try {
      const storedCerts = JSON.parse(localStorage.getItem('skillos_certificates') || '[]');
      if (!storedCerts.some(c => c.course_id === pairedCourseId)) {
        storedCerts.push(serverMeta.certificate);
        localStorage.setItem('skillos_certificates', JSON.stringify(storedCerts));
      }
    } catch (e) {}
  }

  showToast(attemptData.passed ? '?? Assessment Passed!' : 'Assessment Completed', `Score: ${attemptData.score}% ? +${attemptData.xp_awarded} XP earned!`, attemptData.passed ? 'success' : 'info');
  renderResults(test, attemptData, true, serverMeta);
}

// Network error: keep the answers and let the student retry submitting
function launchResumeAfterError(test, timeSpentSeconds) {
  secondsRemaining = Math.max(0, test.durationSeconds - timeSpentSeconds);
  deadline = Date.now() + secondsRemaining * 1000;
  document.addEventListener('keydown', handleExamKeys);
  window.addEventListener('beforeunload', warnBeforeUnload);
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsRemaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    updateTimerDisplay();
    if (secondsRemaining <= 0) { clearInterval(timerInterval); submitExam(true); }
  }, 1000);
  renderQuestion();
}

// ── Results ─────────────────────────────────────────────────
function showStoredResult(testId) {
  const test = ASSESSMENT_DATA[testId];
  const attempt = attempts[testId];
  if (!test || !attempt) return;
  currentTest = test;
  document.getElementById('assess-grid-view')?.classList.add('hidden');
  document.getElementById('exam-player-view')?.classList.remove('hidden');
  renderResults(test, attempt, false);
}

function renderResults(test, attempt, justSubmitted, serverMeta = null) {
  const playerView = document.getElementById('exam-player-view');
  if (!playerView) return;

  const answers = attempt.answers || [];
  const { score, passed, correct_count: correct, total_questions: total, xp_awarded: xp } = attempt;
  const accuracy = answers.filter(a => a !== null).length
    ? Math.round((correct / answers.filter(a => a !== null).length) * 100) : 0;

  const pairedCourseId = test.courseId || ASSESSMENT_COURSE_MAP[test.id];
  const enrollment = enrollmentsMap[pairedCourseId];
  const isCourseDone = enrollment ? (enrollment.progress_percent >= 100) : false;
  const certIssued = serverMeta?.certificate_issued || (passed && isCourseDone);

  let certCalloutHtml = '';
  if (passed) {
    if (certIssued) {
      certCalloutHtml = `
        <div style="margin-top: 18px; padding: 18px; background: linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%); border: 1.5px solid #f59e0b; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div class="flex items-center gap-3">
            <span style="font-size: 32px;">🏆</span>
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: #92400e;">Official Certificate of Mastery Unlocked!</div>
              <div style="font-size: 12px; color: #b45309; margin-top: 2px;">
                Both prerequisites met: 100% course curriculum completed &amp; diagnostic assessment passed with ${score}%.
              </div>
            </div>
          </div>
          <a href="certificates.html" class="btn btn-primary btn-sm" style="background: #d97706; border-color: #d97706;">
            🎓 View &amp; Print Certificate →
          </a>
        </div>
      `;
    } else {
      certCalloutHtml = `
        <div style="margin-top: 18px; padding: 18px; background: rgba(37, 99, 235, 0.08); border: 1.5px solid rgba(37, 99, 235, 0.25); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div class="flex items-center gap-3">
            <span style="font-size: 32px;">📚</span>
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--primary);">Assessment Passed! Final Step Remaining:</div>
              <div style="font-size: 12px; color: var(--text-600); margin-top: 2px;">
                Complete 100% of the lessons in <strong>${test.courseTitle || 'the paired course'}</strong> (${enrollment ? enrollment.progress_percent : 0}% done) to issue your Certificate.
              </div>
            </div>
          </div>
          <a href="course-details.html?id=${pairedCourseId}" class="btn btn-primary btn-sm">
            ▶ Complete Course Lessons →
          </a>
        </div>
      `;
    }
  }

  playerView.innerHTML = `
    <div class="exam-wrapper as-exam anim-fade-in-up" style="--accent:${test.accent}; --accent-bg:${test.accentBg};">
      <div class="as-result ${passed ? 'pass' : 'fail'}">
        <div class="as-ring" style="--score:0">
          <div class="as-ring-inner">
            <div class="as-ring-value" id="as-ring-value">0%</div>
            <div class="as-ring-label">${correct}/${total} correct</div>
          </div>
        </div>
        <div class="as-result-body">
          <div class="as-result-tag">${test.icon} ${escapeHtml(test.title)}</div>
          <h2>${passed ? '🎉 Assessment Passed!' : '📚 Practice Recommended'}</h2>
          <p>${passed
            ? `Outstanding performance! You have demonstrated verified proficiency in ${escapeHtml(test.title)}.`
            : `You scored ${score}% (pass mark ${PASS_THRESHOLD}%). Review the explanations below to strengthen your weak spots.`}</p>
          <div class="as-result-stats">
            <div><span>Time Spent</span><strong>${formatTime(attempt.time_spent_seconds)}</strong></div>
            <div><span>Accuracy</span><strong>${accuracy}%</strong></div>
            <div><span>Completed</span><strong>${formatDate(attempt.completed_at)}</strong></div>
            <div class="xp"><span>XP Awarded</span><strong>+${xp} XP</strong></div>
          </div>
          ${certCalloutHtml}
        </div>
      </div>

      <div class="as-final-note" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; background: rgba(37, 99, 235, 0.06); border: 1.5px solid rgba(37, 99, 235, 0.25); border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
        <div>
          <strong style="color: var(--text-900); font-size: 14px;">🔄 Retest Option Available</strong>
          <div style="font-size: 12px; color: var(--text-500); margin-top: 2px;">
            ${passed ? 'Want to practice again or aim for 100%?' : 'Score below 70%? Retest anytime to pass and unlock your Certificate of Mastery.'}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="retest-now-btn" style="background: #16a34a; border-color: #16a34a;">
          🔄 Retest Assessment Now
        </button>
      </div>

      <div class="flex items-center justify-between" style="margin:28px 0 14px; gap:12px; flex-wrap:wrap;">
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-900);">Detailed Answer Review</h3>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" id="retest-top-btn" style="background: #16a34a; border-color: #16a34a;">🔄 Retest Exam</button>
          <a href="certificates.html" class="btn btn-outline btn-sm">🏆 View Certificates</a>
          <button class="btn btn-outline btn-sm" id="return-assess-btn">← Back to Assessments</button>
        </div>
      </div>

      <div class="exam-review-list">
        ${test.questions.map((q, idx) => {
          const choice = answers[idx] ?? null;
          const isCorrect = choice === q.answer;
          return `
            <div class="exam-review-card ${isCorrect ? 'correct' : 'wrong'}">
              <div class="flex items-center justify-between" style="margin-bottom:8px;">
                <span class="as-review-num">Question ${idx + 1}</span>
                <span class="as-review-tag ${isCorrect ? 'ok' : 'bad'}">
                  ${isCorrect ? '✅ Correct' : choice === null ? '⚪ Unanswered' : '❌ Incorrect'}
                </span>
              </div>
              <p class="as-review-q">${escapeHtml(q.question)}</p>
              ${q.code ? `<pre class="exam-code-snippet" style="margin-bottom:10px; font-size:0.8rem; padding:8px 12px;"><code>${escapeHtml(q.code)}</code></pre>` : ''}
              <div class="as-review-opts">
                ${q.options.map((opt, i) => `
                  <div class="as-review-opt ${i === q.answer ? 'is-answer' : ''} ${i === choice && !isCorrect ? 'is-wrong' : ''}">
                    <span class="exam-option-letter">${LETTERS[i]}</span>
                    <span>${escapeHtml(opt)}</span>
                    ${i === choice ? '<em>Your answer</em>' : ''}
                  </div>
                `).join('')}
              </div>
              <div class="as-explain">💡 <strong>Explanation:</strong> ${escapeHtml(q.explanation)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  animateRing(score);
  document.getElementById('return-assess-btn')?.addEventListener('click', returnToAssessmentList);
  document.getElementById('retest-now-btn')?.addEventListener('click', () => startAssessment(test.id, true));
  document.getElementById('retest-top-btn')?.addEventListener('click', () => startAssessment(test.id, true));

  if (justSubmitted) {
    showToast(
      passed ? 'Achievement Unlocked' : 'Assessment Recorded',
      `Scored ${score}% on ${test.title}! (+${xp} XP)`,
      passed ? 'success' : 'warning'
    );
  }
}

function animateRing(target) {
  const ring = document.querySelector('.as-ring');
  const label = document.getElementById('as-ring-value');
  if (!ring || !label) return;
  const start = performance.now();
  const duration = 1100;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const v = Math.round(target * (1 - Math.pow(1 - t, 3)));
    ring.style.setProperty('--score', v);
    label.textContent = `${v}%`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Return to the card list
function returnToAssessmentList() {
  const playerView = document.getElementById('exam-player-view');
  if (playerView) {
    playerView.classList.add('hidden');
    playerView.innerHTML = '';
  }
  document.getElementById('assess-grid-view')?.classList.remove('hidden');
  currentTest = null;
  userAnswers = [];
  submitting = false;
  renderDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach globally for inline HTML buttons
window.startAssessment = startAssessment;
