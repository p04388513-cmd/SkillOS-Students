// ============================================================
//  SkillOS — Landing Page Interactions
// ============================================================

// ── Navbar scroll effect ──────────────────────────────────────
const nav = document.getElementById('landing-nav');
window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Animated counters ────────────────────────────────────────
function animateCounter(el, target, suffix = '') {
  const duration = 2000;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = Math.floor(target * eased);
    el.textContent = val.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString() + suffix;
  };
  requestAnimationFrame(update);
}

// Observe stats section
const statsSection = document.getElementById('stats-section');
let statsAnimated = false;
if (statsSection) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !statsAnimated) {
      statsAnimated = true;
      document.querySelectorAll('[data-counter]').forEach(el => {
        const target = parseInt(el.dataset.counter);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, suffix);
      });
    }
  }, { threshold: 0.3 });
  observer.observe(statsSection);
}

// ── Hero progress bars animation ─────────────────────────────
function animateProgressBars() {
  document.querySelectorAll('.progress-viz-fill[data-width]').forEach((bar, i) => {
    setTimeout(() => {
      bar.style.width = bar.dataset.width;
    }, 800 + i * 200);
  });
}
window.addEventListener('load', animateProgressBars);

// ── Smooth scroll for anchor links ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile menu if open
      const menu = document.getElementById('mobile-menu');
      if (menu) menu.classList.remove('open');
    }
  });
});

// ── Mobile menu toggle ───────────────────────────────────────
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu    = document.getElementById('mobile-menu');
mobileMenuBtn?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
  mobileMenuBtn.classList.toggle('open');
});

// ── Entrance animations (Intersection Observer) ───────────────
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.feature-card, .step-card, .testimonial-card, .section-header').forEach(el => {
  el.style.animationPlayState = 'paused';
  animObserver.observe(el);
});

// ── Testimonial auto-scroll (on mobile) ───────────────────────
let testimonialIndex = 0;
const testimonialCards = document.querySelectorAll('.testimonial-card');
function autoScrollTestimonials() {
  if (window.innerWidth > 768 || testimonialCards.length === 0) return;
  // Mobile: Simple highlight rotation
  testimonialCards.forEach((c, i) => c.style.opacity = i === testimonialIndex ? '1' : '0.6');
  testimonialIndex = (testimonialIndex + 1) % testimonialCards.length;
}
setInterval(autoScrollTestimonials, 3000);

// ── Particle / floating dots background ──────────────────────
function createParticles() {
  const hero = document.querySelector('.hero');
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;
      border-radius:50%;background:rgba(22,163,74,${0.1+Math.random()*0.2});
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation:float ${4+Math.random()*6}s ease-in-out ${Math.random()*4}s infinite;
      pointer-events:none;
    `;
    hero.appendChild(dot);
  }
}
createParticles();

// ── CTA button ripple ────────────────────────────────────────
document.querySelectorAll('.btn-primary, .btn-white').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const circle = document.createElement('span');
    const rect = this.getBoundingClientRect();
    circle.style.cssText = `
      position:absolute;
      width:${Math.max(rect.width, rect.height) * 2}px;
      height:${Math.max(rect.width, rect.height) * 2}px;
      left:${e.clientX - rect.left - Math.max(rect.width, rect.height)}px;
      top:${e.clientY - rect.top - Math.max(rect.width, rect.height)}px;
      border-radius:50%;
      background:rgba(255,255,255,0.3);
      transform:scale(0);
      animation:ripple 0.6s ease-out;
      pointer-events:none;
    `;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  });
});

// ── Lazy load course preview cards ───────────────────────────
const PREVIEW_COURSES = [
  { emoji: '🐍', title: 'Python for Beginners', category: 'Programming', duration: '12h', students: '12.4K', level: 'Beginner', rating: '4.9' },
  { emoji: '🎨', title: 'UI/UX Design Mastery', category: 'Design', duration: '18h', students: '8.2K', level: 'Intermediate', rating: '4.8' },
  { emoji: '📊', title: 'Data Science & ML', category: 'Data Science', duration: '24h', students: '6.7K', level: 'Advanced', rating: '4.9' }
];

const previewGrid = document.getElementById('courses-preview-grid');
if (previewGrid) {
  PREVIEW_COURSES.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'course-card hover-lift animate-fade-in-up';
    card.style.animationDelay = `${i * 0.1}s`;
    card.innerHTML = `
      <div class="course-thumb-placeholder">${c.emoji}</div>
      <div class="course-body">
        <div class="course-category">${c.category}</div>
        <div class="course-title">${c.title}</div>
        <div class="course-meta">
          <span class="course-meta-item">⏱ ${c.duration}</span>
          <span class="course-meta-item">👥 ${c.students}</span>
        </div>
      </div>
      <div class="course-footer">
        <div class="star-rating">
          <span class="star">★</span>${c.rating}
        </div>
        <span class="badge badge-green">${c.level}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.href = 'html/login.html';
    });
    previewGrid.appendChild(card);
  });
}
