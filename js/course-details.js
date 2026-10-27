// ============================================================
//  SkillOS — Course Details & Interactive AI Tutor Controller
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, showToast } from './app.js';

let geminiApiKey = window.SKILLOS_GEMINI_KEY || '';
async function getGeminiEndpoint() {
  if (!geminiApiKey) {
    try {
      const res = await fetch('/api/config/gemini-key');
      const data = await res.json();
      geminiApiKey = data.key || '';
    } catch {
      geminiApiKey = '';
    }
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;
}

let course = null;
let userProfile = null;
let currentProgress = { completedLessons: [] };
let aiChatHistory = [];
let isAITyping = false;
let recognition = null;
let isRecording = false;

// Course specific suggested chips
const COURSE_CHIPS = {
  'course-ai': [
    'Explain Neural Networks simply',
    'What is Gradient Descent?',
    'Supervised vs Unsupervised Learning?',
    'Quiz me on Lesson 1'
  ],
  'course-py': [
    'Explain Python List Comprehensions',
    'How do functions and *args work?',
    'Explain Python Slicing',
    'Quiz me on Python'
  ],
  'course-js': [
    'Explain Promises & Async/Await',
    'What are Closures & Lexical Scopes?',
    'Explain the JS Event Loop',
    'Quiz me on JavaScript'
  ],
  'course-cloud': [
    'Explain Docker vs Kubernetes',
    'How do CI/CD pipelines work?',
    'What is Infrastructure as Code?',
    'Quiz me on DevOps'
  ],
  'course-sec': [
    'Explain the CIA Triad',
    'How does Public Key Cryptography work?',
    'OWASP Top 10 vulnerabilities?',
    'Quiz me on Security'
  ],
  'course-web': [
    'Explain CSS Flexbox vs Grid',
    'What is Mobile-First Design?',
    'Semantic HTML5 best practices',
    'Quiz me on Web Design'
  ]
};

// Initialise auth controls
initAuthListener(async (user, profile) => {
  initSidebar();
  userProfile = profile;
  
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id') || 'course-ai';
  
  await loadCourseData(courseId);
  setupAITutor();
  hideLoader();
}, () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id') || 'course-ai';
  loadCourseData(courseId).then(() => {
    setupAITutor();
    hideLoader();
  });
});

async function loadCourseData(courseId) {
  try {
    const data = await apiFetch(`/api/courses/${courseId}`);
    if (!data.course) {
      showToast('Error', 'Course not found.', 'error');
      window.location.href = 'courses.html';
      return;
    }
    course = data.course;
    
    // Check if enrolled and get progress from user profile
    const enrollment = userProfile?.enrollments?.find(e => e.course_id === courseId);
    if (enrollment) {
      currentProgress.percent = enrollment.progress_percent || 0;
    }
    
    renderDetails();
  } catch (err) {
    showToast('Error Loading', err.message, 'error');
  }
}

function renderDetails() {
  if (!course) return;

  // Breadcrumbs
  const crumbTitle = document.getElementById('breadcrumb-title');
  if (crumbTitle) crumbTitle.textContent = course.title;
  
  // Hero metadata
  document.getElementById('course-category').textContent = course.category;
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-desc').textContent = course.description;
  document.getElementById('course-instructor').textContent = course.instructor;
  document.getElementById('course-duration').textContent = course.duration;
  document.getElementById('course-lessons-count').textContent = `${course.lessons?.length || 0} lessons`;
  document.getElementById('course-level').textContent = course.level;
  document.getElementById('course-rating').textContent = course.rating || '4.8';
  
  const courseImageMap = {
    'course-ai': 'images/course_ai.jpg',
    'course-cloud': 'images/course_cloud.jpg',
    'course-js': 'images/course_js.jpg',
    'course-py': 'images/course_python.png',
    'course-web': 'images/course_web.png',
    'course-sec': 'images/course_ds.png'
  };
  const courseImg = courseImageMap[course.id] || 'images/course_web.png';
  const enrollPreview = document.querySelector('.enroll-preview');
  if (enrollPreview) {
    enrollPreview.innerHTML = `<img src="${courseImg}" alt="${course.title}" class="enroll-img">`;
  }

  const enrollBtn = document.getElementById('enroll-btn');
  const isEnrolled = userProfile?.enrolledCourses?.includes(course.id) || 
                     userProfile?.enrollments?.some(e => e.course_id === course.id);
  const progressWrap = document.getElementById('enroll-progress-wrap');
  
  // Remove existing action wrap if any
  document.getElementById('enrolled-action-buttons')?.remove();

  if (isEnrolled) {
    enrollBtn.textContent = '✓ Enrolled · Active Course';
    enrollBtn.className = 'btn btn-outline btn-full';
    enrollBtn.disabled = true;
    enrollBtn.style.marginBottom = '8px';
    if (progressWrap) progressWrap.style.display = 'block';
    
    const percent = currentProgress.percent || 0;
    const total = course.lessons?.length || 1;
    const comp = Math.round((percent / 100) * total);
    
    const compEl = document.getElementById('completed-lessons-count');
    const pctEl = document.getElementById('progress-pct');
    const barEl = document.getElementById('progress-fill-bar');

    if (compEl) compEl.textContent = `${comp}/${total} lessons`;
    if (pctEl) pctEl.textContent = `${percent}%`;
// Course to Assessment Interrelation
const COURSE_ASSESSMENT_MAP = {
  'course-py': 'python',
  'course-web': 'uiux',
  'course-ai': 'ai-ml',
  'course-js': 'javascript',
  'course-cloud': 'cloud',
  'course-sec': 'security'
};

    if (barEl) barEl.style.width = `${percent}%`;

    // Action buttons inside sticky card
    const actionWrap = document.createElement('div');
    actionWrap.id = 'enrolled-action-buttons';
    actionWrap.style.marginTop = '8px';

    const pairedAssessmentId = COURSE_ASSESSMENT_MAP[course.id] || 'python';
    let primaryActionBtn = '';

    if (percent >= 100) {
      primaryActionBtn = `
        <a href="assessments.html?id=${pairedAssessmentId}" class="btn btn-primary btn-full" style="margin-bottom:8px; background:#d97706; border-color:#d97706; text-align:center; display:block;">
          📝 Take Assessment (Final Step) →
        </a>
        <a href="certificates.html" class="btn btn-outline btn-full" style="margin-bottom:8px; text-align:center; display:block;">
          🏆 View Credential Status
        </a>
      `;
    } else {
      primaryActionBtn = `
        <button class="btn btn-primary btn-full" id="start-learning-first-btn" style="margin-bottom:8px;">
          ▶ Continue Learning
        </button>
      `;
    }

    actionWrap.innerHTML = `
      ${primaryActionBtn}
      <button class="btn btn-outline btn-full" id="card-open-ai-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
        🤖 Ask Course AI Tutor
      </button>
    `;
    enrollBtn.parentNode.insertBefore(actionWrap, enrollBtn.nextSibling);

    document.getElementById('start-learning-first-btn')?.addEventListener('click', () => {
      const firstUncompleted = course.lessons?.find(l => !currentProgress.completedLessons?.includes(l.id)) || course.lessons?.[0];
      if (firstUncompleted) {
        handlePlayLesson(firstUncompleted.id, firstUncompleted.title, false);
      }
    });

    document.getElementById('card-open-ai-btn')?.addEventListener('click', openAITutorDrawer);
  } else {
    enrollBtn.textContent = 'Enroll for Free';
    enrollBtn.className = 'btn btn-primary btn-full';
    enrollBtn.disabled = false;
    enrollBtn.onclick = () => handleEnrollNow(course.id);
    if (progressWrap) progressWrap.style.display = 'none';
  }

  // Render curriculum lesson items
  renderLessons(isEnrolled);

  // Update AI Tutor Drawer title & Welcome message
  const drawerTitle = document.getElementById('ai-drawer-title');
  if (drawerTitle) drawerTitle.textContent = `AI Tutor · ${course.title}`;

  const welcomeMsg = document.getElementById('ai-welcome-msg');
  if (welcomeMsg) {
    welcomeMsg.innerHTML = `Hello! I am your 24/7 AI Tutor for <strong>${course.title}</strong>. Ask me to explain any lesson, debug code, or test your understanding!`;
  }

  renderSuggestedChips();
}

function renderLessons(isEnrolled) {
  const container = document.getElementById('lesson-list');
  if (!container) return;

  if (!course.lessons || course.lessons.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-desc">No lessons available for this course.</div></div>`;
    return;
  }

  container.innerHTML = course.lessons.map((lesson, idx) => {
    const isLocked = !isEnrolled && idx > 1;
    const isCompleted = currentProgress.completedLessons?.includes(lesson.id);
    
    let clickAttr = '';
    if (isLocked) {
      clickAttr = `onclick="showToast('Access Locked', 'Enroll in the course to unlock all lessons.', 'warning')"`;
    } else {
      clickAttr = `onclick="handlePlayLesson('${lesson.id}', '${lesson.title.replace(/'/g, "\\'")}', ${isCompleted})"`;
    }

    return `
      <div class="lesson-item ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}" ${clickAttr}>
        <div class="lesson-num">${idx + 1}</div>
        <div class="lesson-type-icon">${isLocked ? '🔒' : '▶'}</div>
        <div class="lesson-info">
          <div class="lesson-name">${lesson.title}</div>
          <div class="lesson-duration">${lesson.duration || '20m'} · Video Lesson</div>
        </div>
      </div>
    `;
  }).join('');
}

// Enroll handler inside course detail
async function handleEnrollNow(courseId) {
  if (!userProfile) {
    window.location.href = 'login.html';
    return;
  }

  try {
    await apiFetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
    if (!userProfile.enrolledCourses) userProfile.enrolledCourses = [];
    if (!userProfile.enrolledCourses.includes(courseId)) {
      userProfile.enrolledCourses.push(courseId);
    }
    showToast('Enrolled!', `You now have full access to ${course?.title || 'this course'}!`, 'success');
    await loadCourseData(courseId);
    openAITutorDrawer();
  } catch (err) {
    showToast('Enrollment Failed', err.message, 'error');
  }
}

// Lesson Video Stream Map (Curated HD Educational Video Lectures)
const LESSON_VIDEOS = {
  // Python Programming Essentials
  'py-1': 'kqtD5dpn9C8',
  'py-2': '_uQrJ0TkZlc',
  'py-3': '9Os0o3wzS_I',
  'py-4': 'U5Yl2HdQf58',

  // Responsive Web Design
  'web-1': 'pQN-pnXPaVg',
  'web-2': 'fYq5PXgSsbE',
  'web-3': 'jV8B24rSN5o',
  'web-4': 'srvUrASNj0s',

  // Modern JavaScript Deep Dive
  'js-1': 'W6NZfCO5SIk',
  'js-2': 'PoRJizFvM7s',
  'js-3': 'y17RuWkWdn8',
  'js-4': 'cRHQNNcYf6s',

  // Machine Learning Foundations
  'ai-1': 'ukzFI9rgwfU',
  'ai-2': 'f_uwKZIAeM0',
  'ai-3': 'IHZwWFHWa-w',
  'ai-4': 'zjkBMFhNj_g',
  'ai-5': 'aircAruvnKk',

  // Cloud Architecture & DevOps
  'cloud-1': '2LaAJq1lB1Q',
  'cloud-2': 'fqMOX6JJhGo',
  'cloud-3': 'X48VuDVv0do',
  'cloud-4': 'scEDHsr3APg',

  // Cybersecurity Fundamentals
  'sec-1': 'inWWhr5tnEA',
  'sec-2': '3Kq1MIfTWCE',
  'sec-3': 'NuyzuNB5_Ss',
  'sec-4': 'wIXMMvUe6kU'
};

let currentPlayingLessonIndex = -1;

// Play lesson modal with live video execution
window.handlePlayLesson = (lessonId, lessonTitle, isCompleted) => {
  const modal = document.getElementById('lesson-modal');
  if (!modal) return;

  const currentLessons = course?.lessons || [];
  currentPlayingLessonIndex = currentLessons.findIndex(l => l.id === lessonId);
  const currentLesson = currentLessons[currentPlayingLessonIndex] || { duration: '20m' };

  // Set titles and metadata
  document.getElementById('modal-lesson-title').textContent = lessonTitle;
  document.getElementById('modal-lesson-course').textContent = course?.title || 'SkillOS Course';
  document.getElementById('modal-lesson-instructor').textContent = course?.instructor || 'Instructor';
  document.getElementById('modal-lesson-duration').textContent = currentLesson.duration || '20m';
  document.getElementById('modal-lesson-subtitle').textContent = `Lesson ${currentPlayingLessonIndex >= 0 ? currentPlayingLessonIndex + 1 : 1} of ${currentLessons.length}: Active HD Video Stream`;

  // Resolve YouTube Video ID or fallback
  const videoId = LESSON_VIDEOS[lessonId] || 'kqtD5dpn9C8';
  const videoFrame = document.getElementById('modal-video-frame');
  if (videoFrame) {
    videoFrame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
  }

  // Setup Complete Button
  const completeBtn = document.getElementById('modal-complete-btn');
  if (isCompleted) {
    completeBtn.textContent = '✓ Completed (+25 XP)';
    completeBtn.disabled = true;
    completeBtn.className = 'btn btn-outline';
  } else {
    completeBtn.textContent = '✓ Mark as Complete (+25 XP)';
    completeBtn.disabled = false;
    completeBtn.className = 'btn btn-primary';
    completeBtn.onclick = () => markLessonComplete(lessonId);
  }

  // Setup Next Lesson Button
  const nextBtn = document.getElementById('modal-next-btn');
  if (nextBtn) {
    if (currentPlayingLessonIndex >= 0 && currentPlayingLessonIndex < currentLessons.length - 1) {
      const nextLesson = currentLessons[currentPlayingLessonIndex + 1];
      const isNextCompleted = currentProgress.completedLessons?.includes(nextLesson.id);
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = `Next Lesson: ${nextLesson.title.substring(0, 20)}... ❯`;
      nextBtn.onclick = () => {
        handlePlayLesson(nextLesson.id, nextLesson.title, isNextCompleted);
      };
    } else {
      nextBtn.style.display = 'none';
    }
  }

  modal.classList.remove('hidden');
};

// Close modal & stop video playback to kill audio immediately
window.closeLessonModal = () => {
  const modal = document.getElementById('lesson-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  const videoFrame = document.getElementById('modal-video-frame');
  if (videoFrame) {
    videoFrame.src = ''; // Instantly stops video and audio
  }
};

// Keyboard escape to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLessonModal();
  }
});

async function markLessonComplete(lessonId) {
  if (!userProfile) return;

  try {
    const res = await apiFetch(`/api/courses/${course.id}/lessons/${lessonId}/complete`, {
      method: 'POST'
    });

    if (!currentProgress.completedLessons) currentProgress.completedLessons = [];
    if (!currentProgress.completedLessons.includes(lessonId)) {
      currentProgress.completedLessons.push(lessonId);
    }
    currentProgress.percent = res.progress_percent;

    if (res.course_completed || res.progress_percent >= 100) {
      if (res.certificate_issued) {
        showToast('🏆 Official Certificate Unlocked!', 'Both course lessons & assessment completed!', 'success');
        showAlertDialog({
          title: '🏆 Certificate of Mastery Unlocked!',
          message: `Congratulations ${userProfile.name || 'Student'}! You have successfully completed all lessons for "${course.title}" and passed the required diagnostic exam. Your verified Certificate (${res.certificate?.certificate_code || 'SkillOS'}) has been issued!`,
          icon: '🎓',
          buttonText: 'View Certificate',
          onConfirm: () => {
            window.location.href = 'certificates.html';
          }
        });
      } else {
        const pairedAssessment = res.assessment_id || COURSE_ASSESSMENT_MAP[course.id] || 'python';
        showToast('🎉 Course Lessons 100% Completed!', 'Final Step: Pass the paired assessment to unlock your Certificate.', 'success');
        showAlertDialog({
          title: '🎉 Course Curriculum Completed (100%)!',
          message: `Outstanding work! You've completed all lessons for "${course.title}". To officially issue your verified Certificate of Mastery, complete and pass the paired Diagnostic Assessment (Score ≥ 70%).`,
          icon: '📝',
          buttonText: 'Take Assessment Now',
          onConfirm: () => {
            window.location.href = `assessments.html?id=${pairedAssessment}`;
          }
        });
      }
    } else {
      showToast('Lesson Completed!', '+25 XP Points earned! 🚀', 'success');
    }

    closeLessonModal();
    renderDetails();
  } catch (err) {
    showToast('Failed to Complete', err.message, 'error');
  }
}

// ============================================================
//  COURSE AI TUTOR INTERACTIVE CONTROLLER
// ============================================================

let currentChatMode = 'mentor';
const chatModeLabels = {
  'mentor': 'Academic Mentor',
  'visual': 'Visual & Diagrams',
  'eli5': 'ELI5 (Simple Analogies)',
  'code': 'Code Lab',
  'quiz': 'Interactive Quizzer'
};

function setupAITutor() {
  const floatBtn = document.getElementById('floating-ai-tutor-btn');
  const closeBtn = document.getElementById('close-ai-drawer-btn');
  const clearBtn = document.getElementById('clear-ai-chat-btn');
  const drawer = document.getElementById('course-ai-drawer');
  const sendBtn = document.getElementById('ai-drawer-send-btn');
  const visualBtn = document.getElementById('ai-drawer-visual-btn');
  const input = document.getElementById('ai-drawer-input');
  const voiceBtn = document.getElementById('ai-drawer-voice-btn');

  floatBtn?.addEventListener('click', openAITutorDrawer);
  closeBtn?.addEventListener('click', closeAITutorDrawer);
  
  // Clear chat button
  clearBtn?.addEventListener('click', () => {
    aiChatHistory = [];
    const container = document.getElementById('ai-drawer-messages');
    if (container) {
      container.innerHTML = `
        <div class="message ai anim-fade-in-up">
          <div class="msg-avatar">🤖</div>
          <div class="msg-content">
            <div class="msg-bubble">
              Chat reset! I am in <strong>${chatModeLabels[currentChatMode]}</strong> mode for <strong>${course?.title || 'this course'}</strong>. Ask any question or tap a quick option below!
            </div>
          </div>
        </div>
      `;
    }
    showToast('Chat Cleared', 'Conversation history reset.', 'info');
  });

  // Chatbot Learning Mode Options switcher
  document.querySelectorAll('.ai-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChatMode = btn.dataset.mode || 'mentor';
      showToast('Mode Switched', `AI Tutor is now in ${chatModeLabels[currentChatMode]} mode!`, 'info');
      
      if (currentChatMode === 'visual') {
        requestVisualDiagram(course?.title || 'Architecture Overview');
      } else if (currentChatMode === 'quiz') {
        handleSendAIMessage('Please give me an interactive quiz question on this course.');
      }
    });
  });
  
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeAITutorDrawer();
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAIMessage();
    }
  });

  sendBtn?.addEventListener('click', () => handleSendAIMessage());

  // Dedicated Visual Diagram Generator Button
  visualBtn?.addEventListener('click', () => {
    const topic = input?.value.trim() || course?.title || 'Technical Concept Diagram';
    if (input) input.value = '';
    requestVisualDiagram(topic);
  });

  // Setup Voice Input
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec && voiceBtn) {
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecording = true;
      voiceBtn.textContent = '🔴';
      showToast('Listening...', 'Speak your question clearly', 'info');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
    };

    recognition.onend = () => {
      isRecording = false;
      voiceBtn.textContent = '🎙️';
      if (input && input.value.trim()) {
        handleSendAIMessage();
      }
    };

    recognition.onerror = () => {
      isRecording = false;
      voiceBtn.textContent = '🎙️';
    };

    voiceBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else if (voiceBtn) {
    voiceBtn.style.display = 'none';
  }
}

function openAITutorDrawer() {
  const drawer = document.getElementById('course-ai-drawer');
  drawer?.classList.remove('hidden');
  document.getElementById('ai-drawer-input')?.focus();
}

function closeAITutorDrawer() {
  document.getElementById('course-ai-drawer')?.classList.add('hidden');
}

function renderSuggestedChips() {
  const wrap = document.getElementById('ai-suggested-chips');
  if (!wrap || !course) return;

  const chips = [
    `🎨 Visualize ${course.title} Diagram`,
    ...(COURSE_CHIPS[course.id] || [
      `Explain ${course.title} overview`,
      `What are the prerequisites?`,
      `Quiz me on Lesson 1`,
      `Explain core concepts`
    ])
  ];

  wrap.innerHTML = chips.map(c => `
    <button class="ai-chip">${c}</button>
  `).join('');

  wrap.querySelectorAll('.ai-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.textContent.trim();
      if (text.startsWith('🎨')) {
        requestVisualDiagram(course.title);
      } else {
        handleSendAIMessage(text);
      }
    });
  });
}

// Request visual concept diagram (powered by Gemini API)
async function requestVisualDiagram(topic) {
  if (isAITyping) return;
  const cleanTopic = topic || course?.title || 'System Architecture';
  
  appendAIMessage('user', `Generate a Gemini visual concept diagram for: ${cleanTopic}`);
  
  isAITyping = true;
  showAITypingIndicator('🎨 Gemini AI is designing your vector concept diagram...');

  try {
    const res = await apiFetch('/api/ai/generate-visual', {
      method: 'POST',
      body: JSON.stringify({ topic: cleanTopic, courseTitle: course?.title })
    });

    hideAITypingIndicator();

    if (res.imageUrl) {
      appendAIMessage('ai', `Here is the Gemini AI concept diagram for **${cleanTopic}**. It is rendered in sharp vector graphics to help you easily visualize the topic. Click below to inspect it full screen!`, {
        imageUrl: res.imageUrl,
        topic: cleanTopic
      });
    } else {
      appendAIMessage('ai', `Unable to synthesize diagram for **${cleanTopic}**. Please retry with another topic.`);
    }
  } catch (err) {
    hideAITypingIndicator();
    appendAIMessage('ai', `Visual diagram error: ${err.message}.`);
  } finally {
    isAITyping = false;
  }
}

async function handleSendAIMessage(overrideText = null) {
  const input = document.getElementById('ai-drawer-input');
  if (isAITyping) return;

  const query = (overrideText || input?.value || '').trim();
  if (!query) return;

  if (input && !overrideText) input.value = '';
  appendAIMessage('user', query);

  // Detect if student explicitly requested an image/diagram
  const isVisualQuery = /(?:need|show|generate|create|make|give|draw|want|display|see)\s+(?:an?\s+)?(?:image|picture|diagram|photo|illustration|visual|chart|architecture|infographic)/i.test(query) || /^(?:visualize|illustrate|draw)\b/i.test(query) || currentChatMode === 'visual';

  let visualTopic = null;
  if (isVisualQuery) {
    const stripped = query.replace(/(?:need|show|generate|create|make|give|draw|want|display|see|an?|image|picture|diagram|photo|illustration|visual|chart|architecture|infographic|of|for|about|me|please)/gi, ' ').replace(/\s+/g, ' ').trim();
    visualTopic = stripped.length > 2 ? stripped : (course?.title || 'Curriculum Concept');
  }

  isAITyping = true;
  showAITypingIndicator(isVisualQuery ? '🎨 Gemini is illustrating concept...' : undefined);

  try {
    let visualPromise = null;
    if (isVisualQuery && visualTopic) {
      visualPromise = apiFetch('/api/ai/generate-visual', {
        method: 'POST',
        body: JSON.stringify({ topic: visualTopic, courseTitle: course?.title })
      }).catch(err => {
        console.warn('Visual gen error:', err);
        return null;
      });
    }

    let aiResponse = await callGeminiCourseTutor(query);
    
    // Check if Gemini embedded a [VISUAL: ...] tag
    const visualTagMatch = aiResponse.match(/\[VISUAL:\s*([^\]]+)\]/i);
    if (visualTagMatch && !visualPromise) {
      const extractedTopic = visualTagMatch[1].trim();
      visualPromise = apiFetch('/api/ai/generate-visual', {
        method: 'POST',
        body: JSON.stringify({ topic: extractedTopic, courseTitle: course?.title })
      }).catch(() => null);
    }

    aiResponse = aiResponse.replace(/\[VISUAL:\s*[^\]]+\]/gi, '').trim();

    let visualData = null;
    if (visualPromise) {
      const visualRes = await visualPromise;
      if (visualRes?.imageUrl) {
        visualData = {
          imageUrl: visualRes.imageUrl,
          topic: visualTopic || visualRes.topic || course?.title
        };
      }
    }

    hideAITypingIndicator();
    appendAIMessage('ai', aiResponse, visualData);
  } catch (err) {
    hideAITypingIndicator();
    appendAIMessage('ai', 'I encountered an error connecting to the AI Coach engine. Please verify network access.');
  } finally {
    isAITyping = false;
  }
}

async function callGeminiCourseTutor(promptText) {
  const syllabus = course?.lessons?.map((l, i) => `${i + 1}. ${l.title}`).join(', ') || 'General fundamentals';
  
  // Custom mode behavior directives
  let modeDirective = '';
  if (currentChatMode === 'eli5') {
    modeDirective = `Explain this concept like I am a 5-year-old child. Use vivid, simple everyday metaphors, clear storytelling, and avoid technical jargon.`;
  } else if (currentChatMode === 'code') {
    modeDirective = `Provide clean, readable, production-grade code snippets with step-by-step commentary, best practices, and runtime complexities.`;
  } else if (currentChatMode === 'quiz') {
    modeDirective = `Generate an interactive multiple-choice question (options A, B, C, D) to test understanding. If the user answered a previous question, grade their answer first!`;
  } else if (currentChatMode === 'visual') {
    modeDirective = `Explain the visual structure and ALWAYS output [VISUAL: <topic to illustrate>] so the vector diagram is rendered.`;
  }

  const systemPrompt = `
You are the SkillOS AI Course Tutor specifically assigned to: "${course?.title || 'Course'}" (${course?.category || 'Subject'}).
Course Instructor: ${course?.instructor || 'Faculty'}.
Curriculum lessons: ${syllabus}.
Current Mode: ${chatModeLabels[currentChatMode]}.
Mode Instructions: ${modeDirective}

Goals:
1. Explain lessons, math formulas, code snippets, and system architecture in this course with clarity.
2. If asked for a diagram or image: explain the concept and append [VISUAL: <specific diagram topic>] on its own line so the diagram is rendered automatically.
3. Keep formatting clean: use bullet points (•) and bold titles.
4. NEVER output raw markdown divider lines like '---' or raw hashtag headers like '###'.
Tone: Warm, mentor-like, encouraging, and clear.
`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: `Understood. I am your specialized AI Tutor for ${course?.title} in ${chatModeLabels[currentChatMode]} mode.` }] },
    ...aiChatHistory.slice(-4).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: promptText }] }
  ];

  const endpoint = await getGeminiEndpoint();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!res.ok) throw new Error('Gemini API call failed');
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

  aiChatHistory.push({ role: 'user', content: promptText });
  aiChatHistory.push({ role: 'model', content: reply });

  return reply;
}

function appendAIMessage(role, content, visualData = null) {
  const container = document.getElementById('ai-drawer-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `message ${role === 'user' ? 'user' : 'ai'} anim-fade-in-up`;
  const avatar = role === 'user' ? '👤' : '🤖';
  const parsedContent = formatMarkdown(content);

  // Extract a clean topic keyword for quick option buttons
  const cleanSnippet = content.replace(/<[^>]+>/g, '').replace(/[#*`_•]/g, '').trim().split(/[.\n]/)[0].substring(0, 50) || (course?.title || 'Concept');

  // Generate visual card markup if visualData is attached
  let visualHtml = '';
  if (visualData && visualData.imageUrl) {
    visualHtml = `
      <div class="ai-visual-card">
        <div class="ai-visual-header">
          <span class="ai-visual-header-badge">🎨 Gemini Vector Diagram: ${visualData.topic || 'Concept'}</span>
          <span style="font-size:0.68rem; opacity:0.8;">Gemini Engine</span>
        </div>
        <div class="ai-visual-img-wrap">
          <img src="${visualData.imageUrl}" alt="${visualData.topic || 'Concept Diagram'}" onclick="window.open('${visualData.imageUrl}', '_blank')" title="Click to view full size" loading="lazy" />
        </div>
        <div class="ai-visual-caption">
          <span>💡 Scalable Gemini Vector Diagram · Click to zoom</span>
          <a href="${visualData.imageUrl}" target="_blank" download="diagram.svg">🔍 Open HD</a>
        </div>
      </div>
    `;
  }

  bubble.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-content">
      <div class="msg-bubble">
        ${parsedContent}
        ${visualHtml}

        ${role === 'ai' ? `
          <!-- Interactive Chatbot Options Strip -->
          <div class="chat-bubble-options">
            <button class="bubble-option-chip opt-diagram" title="Generate Gemini visual diagram">
              🎨 Generate Diagram
            </button>
            <button class="bubble-option-chip opt-eli5" title="Explain simply like I'm 5">
              💡 ELI5 Simple
            </button>
            <button class="bubble-option-chip opt-quiz" title="Quiz me on this concept">
              📝 Quiz Me
            </button>
            <button class="bubble-option-chip opt-code" title="Show code implementation">
              💻 Show Code
            </button>
          </div>
        ` : ''}
      </div>

      <div class="flex items-center justify-between" style="margin-top:4px;">
        ${role === 'ai' ? `
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="msg-action-btn speak-ai-btn" style="border:none; background:none; font-size:11px; color:var(--text-400); cursor:pointer;">
              🔊 Speak
            </button>
          </div>
        ` : ''}
        <div class="msg-time" style="font-size:10px; color:var(--text-400); margin-left:auto;">
          ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  `;

  // Attach speech handler
  const speakBtn = bubble.querySelector('.speak-ai-btn');
  if (speakBtn && window.speechSynthesis) {
    speakBtn.addEventListener('click', () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content.replace(/<[^>]+>/g, '').replace(/[#*`_]/g, ''));
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    });
  }

  // Wire up the interactive option buttons on this bubble
  bubble.querySelector('.opt-diagram')?.addEventListener('click', () => {
    requestVisualDiagram(cleanSnippet);
  });

  bubble.querySelector('.opt-eli5')?.addEventListener('click', () => {
    handleSendAIMessage(`Please explain this concept like I am 5 years old using a simple everyday analogy: "${cleanSnippet}"`);
  });

  bubble.querySelector('.opt-quiz')?.addEventListener('click', () => {
    handleSendAIMessage(`Give me an interactive quiz question to test my understanding of: "${cleanSnippet}"`);
  });

  bubble.querySelector('.opt-code')?.addEventListener('click', () => {
    handleSendAIMessage(`Show me a practical code example and implementation for: "${cleanSnippet}"`);
  });

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function showAITypingIndicator(customLabel) {
  const container = document.getElementById('ai-drawer-messages');
  if (!container) return;

  const typingBubble = document.createElement('div');
  typingBubble.id = 'ai-typing-bubble';
  typingBubble.className = 'message ai';
  typingBubble.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="typing-indicator" style="display:flex;align-items:center;gap:8px;padding:12px">
      <div style="display:flex;gap:4px;">
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite"></div>
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite 0.2s"></div>
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite 0.4s"></div>
      </div>
      ${customLabel ? `<span style="font-size:0.75rem; color:var(--text-400); margin-left:4px;">${customLabel}</span>` : ''}
    </div>
  `;
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;
}

function hideAITypingIndicator() {
  document.getElementById('ai-typing-bubble')?.remove();
}

// Clean markdown formatter removing raw --- and ###
function formatMarkdown(text) {
  if (!text) return '';

  let formatted = text.replace(/^[ \t]*[-*_]{2,}[ \t]*$/gm, '');
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]*$/gm, '');
  formatted = formatted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  formatted = formatted.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (match, code) => {
    return `<pre style="background:#0f172a;color:#f8fafc;padding:10px 14px;border-radius:8px;overflow-x:auto;font-size:0.8rem;margin:8px 0;"><code>${code.trim()}</code></pre>`;
  });

  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.85em;">$1</code>');
  formatted = formatted.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]+(\S.*)$/gm, '<strong style="display:inline-block; font-size:0.95rem; font-weight:700; margin-top:8px; margin-bottom:2px;">$1</strong>');
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');
  formatted = formatted.replace(/^[ \t]*[*-][ \t]+(.*)$/gm, '• $1');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.replace(/\n/g, '<br>');
  formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>');

  return formatted.trim();
}
