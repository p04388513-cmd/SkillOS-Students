// ============================================================
//  SkillOS — User Certificates Engine (certificates.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, showToast, showAlertDialog } from './app.js';

let currentUser = null;
let currentProfile = null;
let activeCertificates = [];
let activeCredentialTracks = [];
let currentSearchQuery = '';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

initAuthListener(async (user, profile) => {
  initSidebar();
  currentUser = user;
  currentProfile = profile;
  await loadCertificates();
  hideLoader();
}, () => {});

async function loadCertificates() {
  try {
    const certsData = await apiFetch('/api/certificates').catch(() => ({ certificates: [], credentialTracks: [] }));
    activeCertificates = certsData.certificates || [];
    activeCredentialTracks = certsData.credentialTracks || [];

    setupCertSearch();
    renderEarnedCertificates('');
    renderCredentialTracks('');

    // Check URL parameters for direct verification link (?verify=SKO-...)
    const urlParams = new URLSearchParams(window.location.search);
    const verifyCode = urlParams.get('verify');
    if (verifyCode) {
      checkAndShowVerification(verifyCode);
    }
  } catch (err) {
    console.error('Certificates load error:', err);
    showToast('Failed to load certificates', err.message, 'error');
  }
}

function renderEarnedCertificates(query = '') {
  const container = document.getElementById('certificates-grid');
  const countBadge = document.getElementById('earned-cert-count');
  if (!container) return;

  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? activeCertificates.filter(c => {
        const title = (c.course_title || '').toLowerCase();
        const code = (c.certificate_id || c.certificate_code || '').toLowerCase();
        const student = (c.student_name || '').toLowerCase();
        const grade = (c.grade || '').toLowerCase();
        return title.includes(q) || code.includes(q) || student.includes(q) || grade.includes(q);
      })
    : activeCertificates;

  if (countBadge) {
    if (q) {
      countBadge.textContent = `${filtered.length} of ${activeCertificates.length} Found`;
    } else {
      countBadge.textContent = `${activeCertificates.length} Earned`;
    }
  }

  if (activeCertificates.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 36px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-xl); text-align: center;">
        <div style="font-size: 42px; margin-bottom: 12px;">🎖️</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-900); margin-bottom: 6px;">No Certificates Issued Yet</h3>
        <p class="text-xs text-muted" style="max-width: 440px; margin: 0 auto 16px; line-height: 1.5;">
          To earn an official Certificate of Mastery, complete 100% of your course lessons and pass the paired skill assessment. Check your progress in the tracks below!
        </p>
        <a href="courses.html" class="btn btn-primary btn-xs">Explore Course Catalog</a>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 36px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-xl); text-align: center;">
        <div style="font-size: 38px; margin-bottom: 10px;">🔍</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-900); margin-bottom: 6px;">No Matching Certificates Found</h3>
        <p class="text-xs text-muted" style="max-width: 460px; margin: 0 auto 16px; line-height: 1.5;">
          No certificate matches "<strong>${escapeHtml(query)}</strong>". Try searching by course title or certificate Primary ID (e.g. <code>SK0-AI-91455</code>).
        </p>
        <button class="btn btn-outline btn-xs" onclick="resetCertSearch()" style="padding: 6px 14px;">🔄 Clear Search</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(cert => {
    const issueDate = cert.issued_at 
      ? new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recently Issued';
    
    const safeTitle = (cert.course_title || 'Course').replace(/'/g, "\\'");
    const safeName = (cert.student_name || currentProfile?.name || 'Student').replace(/'/g, "\\'");
    const code = cert.certificate_id || cert.certificate_code || 'SKO-VERIFIED';

    const isCodeMatch = q && code.toLowerCase().includes(q);

    return `
      <div class="cert-card anim-fade-in-up" style="${isCodeMatch ? 'border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37,99,235,0.2), var(--shadow-lg);' : ''}">
        <div class="cert-icon">🏆</div>
        <h3 class="cert-title">Certificate of Completion</h3>
        <p class="cert-course font-bold">${cert.course_title}</p>
        <p class="cert-date text-xs text-muted">Awarded to: <strong style="color:var(--text-800);">${cert.student_name}</strong> · ${issueDate}</p>
        <div class="badge-status-tag" style="margin-bottom: 12px; font-size: 11px; font-weight: 700; color: #16a34a; background: rgba(22, 163, 74, 0.1); padding: 4px 10px; border-radius: 12px; display: inline-block;">
          Grade: ${cert.grade || 'A+ (Distinction)'}
        </div>
        <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
          <!-- Full-width View Certificate button -->
          <button class="btn btn-primary btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 8px 12px;" onclick="openCertModal('${code}', '${safeTitle}', '${safeName}', '${issueDate}', '${cert.grade || 'A+'}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>View Certificate</span>
          </button>

          <!-- Quick download & print action row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 40px; gap: 6px;">
            <button class="btn btn-outline btn-xs" style="display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 4px; font-weight: 600;" onclick="downloadPdfDirectly('${code}', '${safeTitle}', '${safeName}', '${issueDate}', '${cert.grade || 'A+'}')" title="Download official PDF">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>PDF</span>
            </button>
            <button class="btn btn-outline btn-xs" style="display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 4px; font-weight: 600;" onclick="downloadImageDirectly('${code}', '${safeTitle}', '${safeName}', '${issueDate}', '${cert.grade || 'A+'}', 'png')" title="Download high-res PNG image">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>PNG</span>
            </button>
            <button class="btn btn-outline btn-xs" style="display: flex; align-items: center; justify-content: center; padding: 6px 0;" onclick="printCertificateDirectly('${code}', '${safeTitle}', '${safeName}', '${issueDate}')" title="Print Certificate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
          </div>
        </div>

        <div class="cert-id" style="margin-top: 12px; font-size: 11px; color: var(--text-500); background: var(--bg); padding: 8px 10px; border-radius: 8px; border: 1px dashed ${isCodeMatch ? 'var(--primary)' : 'var(--border)'}; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">ID: <strong style="color: var(--primary); font-family: var(--font-mono); font-size: 11px;">${code}</strong></span>
          <button class="btn btn-outline btn-xs" style="padding: 3px 8px; font-size: 10px; flex-shrink: 0;" onclick="navigator.clipboard.writeText('${code}').then(() => showToast('Copied', 'Certificate ID copied to clipboard', 'success'))">📋 Copy</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderCredentialTracks(query = '') {
  const tracksContainer = document.getElementById('credential-tracks-grid');
  if (!tracksContainer) return;

  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? activeCredentialTracks.filter(t => {
        const course = (t.courseTitle || '').toLowerCase();
        const assess = (t.assessmentTitle || '').toLowerCase();
        return course.includes(q) || assess.includes(q);
      })
    : activeCredentialTracks;

  if (activeCredentialTracks.length === 0) {
    tracksContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 32px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-xl); text-align: center;">
        <p class="text-sm text-muted">You are not enrolled in any credential tracks yet. Start learning a course to begin earning certificates.</p>
        <a href="courses.html" class="btn btn-primary btn-sm" style="margin-top: 12px;">Browse Courses</a>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    tracksContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 24px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-xl); text-align: center;">
        <p class="text-xs text-muted">No credential tracks match "<strong>${escapeHtml(query)}</strong>".</p>
      </div>
    `;
    return;
  }

  tracksContainer.innerHTML = filtered.map(t => {
    const cardClass = t.isEarned ? 'certified' : (t.isCourseDone && !t.isAssessmentDone ? 'ready-for-exam' : '');
    
    let statusBadge = `<span class="badge" style="background:rgba(100,116,139,0.1); color:#64748b; font-weight:700;">⏳ In Progress</span>`;
    if (t.isEarned) {
      statusBadge = `<span class="badge" style="background:rgba(22,163,74,0.15); color:#16a34a; font-weight:700;">🏆 Certified</span>`;
    } else if (t.isCourseDone && !t.isAssessmentDone) {
      statusBadge = `<span class="badge" style="background:rgba(217,119,6,0.15); color:#d97706; font-weight:700;">⚡ Ready for Assessment</span>`;
    }

    const step1Badge = t.isCourseDone 
      ? `<span class="step-badge done">✓ 100% Completed</span>`
      : `<span class="step-badge pending">${t.courseProgress}% Done</span>`;

    let step2Badge = `<span class="step-badge wait">Pending Exam</span>`;
    if (t.isAssessmentDone) {
      step2Badge = `<span class="step-badge done">✓ Passed (${t.assessmentScore || 70}%)</span>`;
    } else if (t.assessmentScore !== null) {
      step2Badge = `<span class="step-badge pending">Scored ${t.assessmentScore}% (Retake)</span>`;
    }

    let bottomAction = '';
    const matchingCert = activeCertificates.find(c => c.course_id === t.courseId);
    if (t.isEarned && matchingCert) {
      const issueDate = matchingCert.issued_at ? new Date(matchingCert.issued_at).toLocaleDateString() : '';
      const safeTitle = (matchingCert.course_title || t.courseTitle).replace(/'/g, "\\'");
      const safeName = (matchingCert.student_name || currentProfile?.name || 'Student').replace(/'/g, "\\'");
      bottomAction = `
        <button class="btn btn-primary btn-sm btn-full" onclick="openCertModal('${matchingCert.certificate_code}', '${safeTitle}', '${safeName}', '${issueDate}', '${matchingCert.grade || 'A+'}')">
          🏆 View Official Certificate
        </button>
      `;
    } else if (t.isCourseDone && !t.isAssessmentDone) {
      bottomAction = `
        <a href="assessments.html?id=${t.assessmentId}&retest=1" class="btn btn-primary btn-sm btn-full" style="background:#d97706; border-color:#d97706;">
          ${t.assessmentScore !== null ? '🔄 Retest Assessment to Unlock Certificate →' : '📝 Pass Assessment to Unlock Certificate →'}
        </a>
      `;
    } else {
      bottomAction = `
        <a href="course-details.html?id=${t.courseId}" class="btn btn-outline btn-sm btn-full">
          📚 Continue Course Lessons (${t.courseProgress}%) →
        </a>
      `;
    }

    return `
      <div class="track-card ${cardClass} anim-fade-in-up">
        <div>
          <div class="flex items-center justify-between" style="margin-bottom: 12px;">
            <div class="flex items-center gap-2">
              <span style="font-size: 24px;">${t.courseEmoji}</span>
              <strong style="font-size: 1rem; color: var(--text-900);">${t.courseTitle}</strong>
            </div>
            ${statusBadge}
          </div>

          <div style="font-size: 12px; color: var(--text-500); margin-bottom: 14px;">
            Prerequisites Checklist (2 Steps required for Certificate):
          </div>

          <!-- Step 1: Course -->
          <div class="track-step-row">
            <div style="min-width: 0; flex: 1;">
              <div class="text-xs font-bold" style="color: var(--text-800);">1. Course Curriculum</div>
              <div class="progress-bar thin" style="margin-top: 4px; height: 6px;">
                <div class="progress-fill" style="width: ${t.courseProgress}%;"></div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${step1Badge}
              <a href="course-details.html?id=${t.courseId}" class="btn btn-outline btn-xs" style="padding: 2px 8px; font-size: 11px;">
                ${t.isCourseDone ? 'Review' : 'Open'}
              </a>
            </div>
          </div>

          <!-- Step 2: Assessment -->
          <div class="track-step-row">
            <div style="min-width: 0; flex: 1;">
              <div class="text-xs font-bold" style="color: var(--text-800);">2. ${t.assessmentIcon || '📝'} ${t.assessmentTitle}</div>
              <div class="text-xs text-muted" style="margin-top: 2px;">Requirement: Score ≥ 70%</div>
            </div>
            <div class="flex items-center gap-2">
              ${step2Badge}
              <a href="assessments.html?id=${t.assessmentId}&retest=1" class="btn ${t.isCourseDone && !t.isAssessmentDone ? 'btn-primary' : 'btn-outline'} btn-xs" style="padding: 2px 8px; font-size: 11px;">
                ${t.isAssessmentDone ? 'Results' : (t.assessmentScore !== null ? '🔄 Retest Exam' : 'Take Exam')}
              </a>
            </div>
          </div>
        </div>

        <div style="margin-top: 16px;">
          ${bottomAction}
        </div>
      </div>
    `;
  }).join('');
}

function setupCertSearch() {
  const searchInput = document.getElementById('cert-search-input');
  const searchBtn = document.getElementById('cert-search-btn');
  const clearBtn = document.getElementById('cert-search-clear-btn');
  if (!searchInput) return;

  const performSearch = async (val, triggeredByBtn = false) => {
    currentSearchQuery = (val || '').trim();
    if (clearBtn) {
      if (currentSearchQuery) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    renderEarnedCertificates(currentSearchQuery);
    renderCredentialTracks(currentSearchQuery);

    if (triggeredByBtn && currentSearchQuery) {
      const qLower = currentSearchQuery.toLowerCase();
      // Check for exact matching certificate in local user certificates
      const exactCert = activeCertificates.find(c => {
        const code = (c.certificate_id || c.certificate_code || '').toLowerCase();
        return code === qLower;
      });

      if (exactCert) {
        const issueDate = exactCert.issued_at ? new Date(exactCert.issued_at).toLocaleDateString() : '';
        const safeTitle = (exactCert.course_title || 'Course').replace(/'/g, "\\'");
        const safeName = (exactCert.student_name || currentProfile?.name || 'Student').replace(/'/g, "\\'");
        window.openCertModal(exactCert.certificate_code || exactCert.certificate_id, safeTitle, safeName, issueDate, exactCert.grade);
        showToast('Certificate Found', `Loaded: ${exactCert.certificate_code || exactCert.certificate_id}`, 'success');
        return;
      }

      // If it looks like a certificate ID (e.g., starts with SKO or SK0, or contains hyphen)
      if (currentSearchQuery.length >= 5 && (qLower.startsWith('sko') || qLower.startsWith('sk0') || currentSearchQuery.includes('-'))) {
        showToast('Searching Database', `Verifying Primary Key "${currentSearchQuery}"...`, 'info');
        await checkAndShowVerification(currentSearchQuery);
      }
    }
  };

  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value, false);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchInput.value, true);
    }
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      performSearch(searchInput.value, true);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.resetCertSearch();
    });
  }

  window.resetCertSearch = () => {
    if (searchInput) searchInput.value = '';
    performSearch('', false);
    searchInput?.focus();
  };
}

async function checkAndShowVerification(code) {
  try {
    const res = await apiFetch(`/api/certificates/verify/${encodeURIComponent(code)}`);
    if (res.valid && res.certificate) {
      const c = res.certificate;
      const issueDate = c.issued_at ? new Date(c.issued_at).toLocaleDateString() : 'Official';
      window.openCertModal(c.certificate_code, c.course_title, c.student_name, issueDate, c.grade);
      showToast('Verified Credential', `Certificate ${code} is authentic and valid!`, 'success');
    }
  } catch (err) {
    showToast('Verification Notice', 'Could not verify certificate code: ' + code, 'warning');
  }
}

let activeModalCert = {
  code: '',
  title: '',
  studentName: '',
  issueDate: '',
  grade: ''
};

window.downloadCertificate = async (format = 'pdf', callerBtn = null) => {
  const certFrame = document.getElementById('printable-certificate');
  if (!certFrame) return;

  const btn = callerBtn || (format === 'pdf' 
    ? document.getElementById('modal-download-pdf-btn')
    : (format === 'jpeg' || format === 'jpg' 
        ? document.getElementById('modal-download-jpg-btn') 
        : document.getElementById('modal-download-png-btn')));

  const originalContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> Exporting...`;
  }

  showToast('Preparing Export', `Rendering high-resolution ${format.toUpperCase()} certificate...`, 'info');

  const cleanCourse = (activeModalCert.title || 'Course').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);
  const cleanCode = (activeModalCert.code || 'SKO').replace(/[^a-zA-Z0-9-]/g, '');
  const safeFilename = `SkillOS_Certificate_${cleanCode}_${cleanCourse}`;

  try {
    if (format === 'pdf') {
      if (typeof window.html2pdf === 'function') {
        const opt = {
          margin:       [8, 8, 8, 8],
          filename:     `${safeFilename}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', scrollY: 0 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        await window.html2pdf().set(opt).from(certFrame).save();
        showToast('Download Ready!', `${safeFilename}.pdf has been saved.`, 'success');
      } else {
        showToast('Print / PDF Fallback', 'Opening print dialog. Select "Save as PDF" to save file.', 'info');
        window.print();
      }
    } else {
      // PNG or JPEG
      if (typeof window.html2canvas === 'function') {
        const canvas = await window.html2canvas(certFrame, {
          scale: 3, // Crisp 300 DPI export
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0
        });

        const isJpeg = format === 'jpeg' || format === 'jpg';
        const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
        const fileExt = isJpeg ? 'jpg' : 'png';
        const quality = isJpeg ? 0.95 : 1.0;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const link = document.createElement('a');
        link.download = `${safeFilename}.${fileExt}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Download Ready!', `${safeFilename}.${fileExt} image saved to your device.`, 'success');
      } else {
        throw new Error('Image export engine is not ready');
      }
    }
  } catch (err) {
    console.error('Certificate export error:', err);
    showToast('Export Notice', 'Direct export failed. Opening system print preview.', 'warning');
    window.print();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }
};

window.openCertModal = (code, title, studentName, issueDate, grade) => {
  const modal = document.getElementById('preview-modal');
  if (!modal) return;

  const courseEl = document.getElementById('modal-cert-course');
  const nameEl = document.getElementById('modal-cert-name');
  const dateEl = document.getElementById('modal-cert-date');
  const codeEl = document.getElementById('modal-cert-code');
  const gradeEl = document.getElementById('modal-cert-grade');

  const resolvedName = studentName || currentProfile?.name || 'Student';
  const resolvedDate = issueDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const resolvedGrade = grade || 'A+ (Distinction)';

  if (courseEl) courseEl.textContent = title;
  if (nameEl) nameEl.textContent = resolvedName;
  if (dateEl) dateEl.textContent = resolvedDate;
  if (codeEl) codeEl.textContent = code;
  if (gradeEl) gradeEl.textContent = `Grade: ${resolvedGrade}`;

  activeModalCert = {
    code,
    title,
    studentName: resolvedName,
    issueDate: resolvedDate,
    grade: resolvedGrade
  };

  const pkDisplayEl = document.getElementById('modal-cert-pk-display');
  if (pkDisplayEl) pkDisplayEl.textContent = code;

  const copyIdBtn = document.getElementById('modal-copy-id-btn');
  if (copyIdBtn) {
    copyIdBtn.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        showToast('Certificate ID Copied!', `Primary Key: ${code} copied to clipboard`, 'success');
      }).catch(() => {
        showToast('Certificate ID', code, 'info');
      });
    };
  }

  // Download PDF
  const downloadPdfBtn = document.getElementById('modal-download-pdf-btn');
  if (downloadPdfBtn) {
    downloadPdfBtn.onclick = () => window.downloadCertificate('pdf', downloadPdfBtn);
  }

  // Download PNG
  const downloadPngBtn = document.getElementById('modal-download-png-btn');
  if (downloadPngBtn) {
    downloadPngBtn.onclick = () => window.downloadCertificate('png', downloadPngBtn);
  }

  // Download JPG
  const downloadJpgBtn = document.getElementById('modal-download-jpg-btn');
  if (downloadJpgBtn) {
    downloadJpgBtn.onclick = () => window.downloadCertificate('jpeg', downloadJpgBtn);
  }

  // Print Button
  const printBtn = document.getElementById('modal-print-btn');
  if (printBtn) {
    printBtn.onclick = () => window.print();
  }

  // Legacy fallback button
  const downloadBtn = document.getElementById('modal-download-btn');
  if (downloadBtn) {
    downloadBtn.onclick = () => window.downloadCertificate('pdf', downloadBtn);
  }

  // Share Button
  const shareBtn = document.getElementById('modal-share-btn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      const url = `${window.location.origin}/certificates.html?verify=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link Copied!', 'Credential verification link copied to clipboard.', 'success');
      }).catch(() => {
        showToast('Verification Code', code, 'info');
      });
    };
  }

  modal.classList.remove('hidden');
};

window.closePreviewModal = () => {
  document.getElementById('preview-modal')?.classList.add('hidden');
};

window.downloadPdfDirectly = async (code, title, studentName, issueDate, grade) => {
  window.openCertModal(code, title, studentName, issueDate, grade);
  setTimeout(() => {
    window.downloadCertificate('pdf');
  }, 120);
};

window.downloadImageDirectly = async (code, title, studentName, issueDate, grade, format = 'png') => {
  window.openCertModal(code, title, studentName, issueDate, grade);
  setTimeout(() => {
    window.downloadCertificate(format);
  }, 120);
};

window.printCertificateDirectly = (code, title, studentName, issueDate) => {
  window.openCertModal(code, title, studentName, issueDate);
  setTimeout(() => {
    window.print();
  }, 250);
};
