// ============================================================
//  SkillOS — Live Social Proof "Student Joined" Notification
// ============================================================

(function initRecentJoins() {
  // STRICT GUARD: Only run on the landing page (index.html or root /)
  const pathname = window.location.pathname.toLowerCase();
  const isLandingPage = pathname === '/' || pathname.endsWith('/index.html') || pathname.endsWith('index.html') || pathname === '';
  if (!isLandingPage) return;

  // Pre-seeded authentic student join events
  const defaultStudents = [
    { name: 'Shanaya Waghmare', track: 'SkillOS', time: '56 mins ago' },
    { name: 'Aarav Sharma', track: 'Python Programming Essentials', time: '3 mins ago' },
    { name: 'Priya Patel', track: 'SkillOS', time: '14 mins ago' },
    { name: 'Rohan Verma', track: 'Machine Learning Foundations', time: '22 mins ago' },
    { name: 'Ananya Iyer', track: 'Cloud Architecture & DevOps', time: '35 mins ago' },
    { name: 'Devansh Gupta', track: 'SkillOS', time: 'just now' },
    { name: 'Meera Nair', track: 'Responsive Web Design', time: '41 mins ago' },
    { name: 'Kiran Reddy', track: 'SkillOS', time: '8 mins ago' }
  ];

  let studentQueue = [...defaultStudents];
  let currentIndex = 0;

  let recentAudioCtx = null;
  function playSoftChime() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('skillos_sound_muted') === 'true') return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!recentAudioCtx) recentAudioCtx = new AudioContextClass();
      if (recentAudioCtx.state === 'suspended') {
        recentAudioCtx.resume().catch(() => {});
      }
      const now = recentAudioCtx.currentTime;
      const osc = recentAudioCtx.createOscillator();
      const gain = recentAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(recentAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // Extract up to 2 uppercase initials from a name
  function getInitials(name) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Fetch real students from the PostgreSQL database
  async function fetchRealJoins() {
    try {
      const apiBase = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000')) ? 'http://localhost:5000' : '';
      const res = await fetch(`${apiBase}/api/recent-joins`);
      const data = await res.json();
      if (data && data.joins && data.joins.length > 0) {
        const formatted = data.joins.map((user, idx) => {
          const diffMinutes = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 60000);
          let timeString = 'just now';
          if (diffMinutes >= 60) {
            const hours = Math.floor(diffMinutes / 60);
            timeString = `${hours} hr${hours > 1 ? 's' : ''} ago`;
          } else if (diffMinutes > 0) {
            timeString = `${diffMinutes} mins ago`;
          }
          return {
            name: user.name || 'Scholar',
            track: user.college_name || 'SkillOS',
            time: timeString
          };
        });
        // Prepend real database signups to the front of queue
        studentQueue = [...formatted, ...defaultStudents];
      }
    } catch (e) {
      // Graceful fallback to default queue
    }
  }

  // Create toast DOM element with matching dark pill styling
  function createToastElement() {
    let toast = document.getElementById('skillos-join-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'skillos-join-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    toast.innerHTML = `
      <style>
        #skillos-join-toast {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #1e293b;
          background: linear-gradient(145deg, #1e293b 0%, #151f2e 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          padding: 12px 20px 12px 14px;
          max-width: 320px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
          opacity: 0;
          transform: translateY(20px) scale(0.96);
          transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          user-select: none;
        }

        #skillos-join-toast.toast-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .join-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #10b981;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .join-content {
          display: flex;
          flex-direction: column;
          line-height: 1.35;
          min-width: 0;
        }

        .join-header {
          font-size: 13.5px;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .join-name {
          color: #2dd4bf;
          font-weight: 700;
        }

        .join-track {
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }

        .join-time {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
          font-weight: 500;
        }

        .join-close-btn {
          position: absolute;
          top: 6px;
          right: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease, color 0.2s ease;
          padding: 2px 4px;
          line-height: 1;
        }

        #skillos-join-toast:hover .join-close-btn {
          opacity: 1;
        }
        .join-close-btn:hover {
          color: #cbd5e1;
        }

        @media (max-width: 480px) {
          #skillos-join-toast {
            left: 14px;
            right: 14px;
            bottom: 14px;
            max-width: none;
          }
        }
      </style>

      <div class="join-avatar" id="join-avatar-text">SW</div>
      <div class="join-content">
        <div class="join-header">
          <span class="join-name" id="join-student-name">Shanaya Waghmare</span> joined
        </div>
        <div class="join-track" id="join-track-name">Getskilled</div>
        <div class="join-time" id="join-timestamp">56 mins ago</div>
      </div>
      <button class="join-close-btn" id="join-close-btn" title="Dismiss">&times;</button>
    `;

    document.body.appendChild(toast);

    document.getElementById('join-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.classList.remove('toast-visible');
    });

    return toast;
  }

  // Display notification for a student
  function showJoinNotification(student) {
    const toast = createToastElement();
    const avatarEl = document.getElementById('join-avatar-text');
    const nameEl = document.getElementById('join-student-name');
    const trackEl = document.getElementById('join-track-name');
    const timeEl = document.getElementById('join-timestamp');

    if (!avatarEl || !nameEl || !trackEl || !timeEl) return;

    avatarEl.textContent = getInitials(student.name);
    nameEl.textContent = student.name;
    trackEl.textContent = student.track || 'SkillOS';
    timeEl.textContent = student.time || 'just now';

    // Slide in with pleasant notification chime
    toast.classList.add('toast-visible');
    try {
      if (typeof window.playNotificationSound === 'function') {
        window.playNotificationSound('info');
      } else {
        playSoftChime();
      }
    } catch (e) {}

    // Slide out after 5.5 seconds
    setTimeout(() => {
      toast.classList.remove('toast-visible');
    }, 5500);
  }

  // Scheduler: cycles every 11 seconds
  function startNotificationCycle() {
    setTimeout(() => {
      const current = studentQueue[currentIndex % studentQueue.length];
      showJoinNotification(current);
      currentIndex++;

      setInterval(() => {
        const nextStudent = studentQueue[currentIndex % studentQueue.length];
        showJoinNotification(nextStudent);
        currentIndex++;
      }, 11000);
    }, 2000); // Initial 2s delay after page load
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await fetchRealJoins();
      startNotificationCycle();
    });
  } else {
    fetchRealJoins().then(() => startNotificationCycle());
  }
})();
