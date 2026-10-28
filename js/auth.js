// ============================================================
//  SkillOS — Authentication Flow (auth.js) - PostgreSQL / REST API
// ============================================================
import { showToast, showLoader, hideLoader, setAuthToken, apiFetch, showAlertDialog, showConfirmDialog } from './app.js';

// Setup Tab Switching logic
function setupTabs() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');
  
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      panelLogin?.classList.add('active');
      panelRegister?.classList.remove('active');
      if (authTitle) authTitle.textContent = 'Welcome Back';
      if (authSubtitle) authSubtitle.textContent = 'Log in to continue your learning journey.';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      panelRegister?.classList.add('active');
      panelLogin?.classList.remove('active');
      if (authTitle) authTitle.textContent = 'Create Account';
      if (authSubtitle) authSubtitle.textContent = 'Sign up to start learning with your AI coach.';
    });
  }

  // Switch links
  document.querySelectorAll('[data-switch-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-switch-tab');
      if (target === 'register') {
        tabRegister?.click();
      } else {
        tabLogin?.click();
      }
    });
  });
}

// Password toggle eyes
function setupPasswordToggles() {
  document.querySelectorAll('[data-pw-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const inputId = toggle.getAttribute('data-pw-toggle');
      const input = document.getElementById(inputId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          toggle.textContent = '🙈';
        } else {
          input.type = 'password';
          toggle.textContent = '👁️';
        }
      }
    });
  });
}

// Check password strength
function setupPasswordStrength() {
  const regPassword = document.getElementById('reg-password');
  const bars = document.querySelectorAll('.pw-bar');
  const label = document.querySelector('.pw-label');

  if (!regPassword) return;

  regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    let strength = 0;

    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    bars.forEach((bar, idx) => {
      bar.className = 'pw-bar';
      if (idx < strength) {
        if (strength <= 2) bar.classList.add('weak');
        else if (strength === 3) bar.classList.add('fair');
        else if (strength === 4) bar.classList.add('strong');
      }
    });

    if (!label) return;
    if (val.length === 0) {
      label.textContent = '';
    } else if (strength <= 2) {
      label.textContent = 'Weak Password';
      label.style.color = 'var(--error)';
    } else if (strength === 3) {
      label.textContent = 'Good Password';
      label.style.color = 'var(--warning)';
    } else {
      label.textContent = 'Strong Password';
      label.style.color = 'var(--primary)';
    }
  });
}

// Setup login handler
function setupLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showToast('Validation Error', 'All fields are required.', 'warning');
      return;
    }

    showLoader();
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      setAuthToken(data.token);
      localStorage.setItem('skillos_user', JSON.stringify(data.user));

      showToast('Welcome Back!', 'Redirecting to your dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } catch (err) {
      // Offline / Static Hosting (e.g. GitHub Pages) fallback
      if (err.message && (err.message.includes('404') || err.message.includes('Failed to fetch') || err.message.includes('status 404'))) {
        console.warn('Backend API 404/offline. Activating SkillOS local demo session.');
        const mockUser = {
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
          enrolledCourses: ['course-ai', 'course-web']
        };
        setAuthToken('demo-session-token-' + Date.now());
        localStorage.setItem('skillos_user', JSON.stringify(mockUser));
        showToast('Signed In (Demo Mode)', 'Logged in with local session. Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 700);
        return;
      }

      showToast('Authentication Failed', err.message, 'error');
      hideLoader();
    }
  });

  // Forgot password handler
  const forgotLink = document.getElementById('forgot-password-link');
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const emailVal = document.getElementById('login-email')?.value?.trim() || '';
    const targetEmail = prompt('Enter your registered email to reset your password:', emailVal);
    if (!targetEmail) return;
    const newPass = prompt('Enter your new password (minimum 6 characters):');
    if (!newPass || newPass.length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters.', 'warning');
      return;
    }
    showLoader();
    apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: targetEmail, newPassword: newPass }
    }).then(res => {
      hideLoader();
      showToast('Password Updated', res.message || 'You can now log in with your new password.', 'success');
      const passInput = document.getElementById('login-password');
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.value = targetEmail;
      if (passInput) passInput.value = newPass;
    }).catch(err => {
      hideLoader();
      showToast('Reset Failed', err.message, 'error');
    });
  });
}

// Setup pathway configuration in registration form
function setupPathwayCardsToggle() {
  const collegeContainer = document.getElementById('college-fields-container');
  const accountTypeInput = document.getElementById('selected-account-type');

  // Read URL query parameter: ?type=college_referred or ?type=independent
  const params = new URLSearchParams(window.location.search);
  const typeParam = params.get('type');

  if (typeParam === 'college_referred') {
    if (accountTypeInput) accountTypeInput.value = 'college_referred';
    if (collegeContainer) collegeContainer.style.display = 'block';
  } else {
    if (accountTypeInput) accountTypeInput.value = 'independent';
    if (collegeContainer) collegeContainer.style.display = 'none';
  }
}

// Setup Profile Photo Upload with client-side image compression
function setupAvatarUpload() {
  const fileInput = document.getElementById('reg-avatar');
  const uploadBtn = document.getElementById('avatar-upload-btn');
  const previewTrigger = document.getElementById('avatar-preview-trigger');
  const previewImg = document.getElementById('avatar-preview-img');
  const placeholderIcon = document.getElementById('avatar-placeholder-icon');
  const removeBtn = document.getElementById('avatar-remove-btn');
  const avatarDataInput = document.getElementById('reg-avatar-data');

  if (!fileInput) return;

  const openPicker = () => fileInput.click();
  uploadBtn?.addEventListener('click', openPicker);
  previewTrigger?.addEventListener('click', openPicker);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file (PNG, JPG, or WEBP).', 'warning');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('File Too Large', 'Please select an image smaller than 8MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality off-screen thumbnail compression (max 200x200)
        const canvas = document.createElement('canvas');
        const MAX_DIM = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Update preview
        previewImg.src = compressedDataUrl;
        previewImg.style.display = 'block';
        if (placeholderIcon) placeholderIcon.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
        if (avatarDataInput) avatarDataInput.value = compressedDataUrl;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    if (avatarDataInput) avatarDataInput.value = '';
    previewImg.src = '';
    previewImg.style.display = 'none';
    if (placeholderIcon) placeholderIcon.style.display = 'block';
    removeBtn.style.display = 'none';
  });
}

// Setup registration handler
function setupRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const avatar_url = document.getElementById('reg-avatar-data')?.value || '';
    const college_name = document.getElementById('reg-college-name')?.value.trim() || null;
    const department_id = document.getElementById('reg-dept')?.value || null;
    const semester = document.getElementById('reg-semester')?.value || null;
    const student_college_id = document.getElementById('reg-roll-no')?.value.trim() || null;
    const college_code = document.getElementById('reg-college-code')?.value.trim() || null;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;
    const terms = document.getElementById('reg-terms');
    const account_type = document.getElementById('selected-account-type')?.value || 'independent';

    if (!name || !email || !password || !confirmPassword) {
      showToast('Validation Error', 'Please fill out all required fields.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters.', 'warning');
      return;
    }

    if (terms && !terms.checked) {
      showToast('Validation Error', 'Please agree to the terms.', 'warning');
      return;
    }

    showLoader();
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { 
          name, 
          email, 
          password, 
          avatar_url,
          account_type, 
          college_name,
          college_code, 
          student_college_id, 
          department_id,
          semester
        }
      });

      setAuthToken(data.token);
      localStorage.setItem('skillos_user', JSON.stringify(data.user));

      showToast('Account Created!', `Welcome to your ${account_type === 'college_referred' ? 'College' : 'Independent'} workspace!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } catch (err) {
      hideLoader();
      // Offline / Static Hosting fallback
      if (err.message && (err.message.includes('404') || err.message.includes('Failed to fetch') || err.message.includes('status 404'))) {
        console.warn('Backend API 404/offline during registration. Creating local profile.');
        const mockUser = {
          id: 'student-' + Math.floor(1000 + Math.random() * 9000),
          name,
          email,
          avatar_url: avatar_url || '',
          account_type,
          college_name: college_name || 'SkillOS Academy',
          college_code: college_code || '',
          student_college_id: student_college_id || '',
          department_id: department_id || '',
          semester: semester || '',
          role: 'student',
          track: account_type === 'college_referred' ? 'Academic Degree Pathway' : 'Independent AI Developer',
          streak: 1,
          points: 100,
          total_minutes: 0,
          enrolledCourses: []
        };
        setAuthToken('demo-session-token-' + Date.now());
        localStorage.setItem('skillos_user', JSON.stringify(mockUser));
        showToast('Account Created!', `Welcome to SkillOS, ${name}! Redirecting...`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 700);
        return;
      }

      const isAlreadyExists = err.message && /already exists/i.test(err.message);
      
      if (isAlreadyExists) {
        const regEmail = document.getElementById('reg-email');
        if (regEmail) {
          regEmail.classList.add('is-error');
          regEmail.focus();
        }

        showAlertDialog({
          title: 'Account Already Exists',
          message: `An account registered with "${email}" already exists in SkillOS.\n\nPlease log in or reset your password if you forgot it.`,
          buttonText: 'Switch to Log In',
          icon: '👤',
          onOk: () => {
            const tabLogin = document.getElementById('tab-login');
            const loginEmail = document.getElementById('login-email');
            const loginPassword = document.getElementById('login-password');
            if (loginEmail) loginEmail.value = email;
            if (tabLogin) tabLogin.click();
            setTimeout(() => loginPassword?.focus(), 150);
          }
        });
      } else {
        showToast('Registration Failed', err.message, 'error');
      }
    }
  });
}

// Setup Google Sign In via Google Identity Services (OAuth2 Popup Flow - No FedCM / No One Tap)
async function setupGoogleAuth() {
  const loginBtn = document.getElementById('google-login-btn');
  const regBtn = document.getElementById('google-register-btn');

  // Primary OAuth Client ID with fallback from .env / client_secret json
  const DEFAULT_GOOGLE_CLIENT_ID = '800154027928-b28cqoivmcket10kem13d78bcersfrjp.apps.googleusercontent.com';
  let googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
  let tokenClient = null;

  try {
    const config = await apiFetch('/api/auth/config').catch(() => ({}));
    if (config && config.googleClientId) {
      googleClientId = config.googleClientId;
    }
  } catch (e) {
    console.warn('Could not load Google client config, using default client ID:', e);
  }

  // Fallback demo Google user if Google OAuth origin mismatch or offline
  const loginWithDemoGoogle = () => {
    const mockUser = {
      id: 'google-demo-' + Date.now(),
      name: 'Google Student Demo',
      email: 'alex.student@gmail.com',
      avatar_url: '',
      role: 'student',
      account_type: 'independent',
      track: 'Full-Stack & AI Engineering',
      college_name: 'SkillOS Open Academy',
      streak: 5,
      points: 620,
      total_minutes: 290,
      enrolledCourses: ['course-ai', 'course-web', 'course-python']
    };
    setAuthToken('demo-session-token-' + Date.now());
    localStorage.setItem('skillos_user', JSON.stringify(mockUser));
    showToast('Signed In with Google Demo', 'Welcome to SkillOS, Alex!', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
  };

  const initTokenClient = () => {
    if (tokenClient || !googleClientId || !window.google?.accounts?.oauth2) return tokenClient;

    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            if (tokenResponse.error !== 'popup_closed_by_user') {
              console.warn('Google OAuth response notice:', tokenResponse);
              showToast('Google Sign-In Notice', 'Signing in with Student Demo...', 'info');
              loginWithDemoGoogle();
            }
            return;
          }

          showLoader();
          try {
            // First attempt backend token exchange
            const data = await apiFetch('/api/auth/google', {
              method: 'POST',
              body: { access_token: tokenResponse.access_token }
            });

            setAuthToken(data.token);
            localStorage.setItem('skillos_user', JSON.stringify(data.user));

            showToast('Google Sign-In Success', 'Welcome to SkillOS!', 'success');
            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 700);
          } catch (err) {
            console.warn('Backend exchange unavailable, retrieving Google userinfo directly:', err);
            try {
              // Directly fetch Google User Profile using standard OAuth2 UserInfo
              const gResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const gProfile = await gResp.json();
              const googleUser = {
                id: 'google-' + (gProfile.sub || Date.now()),
                name: gProfile.name || 'Scholar',
                email: gProfile.email || 'scholar@skillos.ai',
                avatar_url: gProfile.picture || '',
                role: 'student',
                account_type: 'independent',
                track: 'Full-Stack & AI Engineering',
                college_name: 'SkillOS Open Academy',
                streak: 1,
                points: 150,
                total_minutes: 45,
                enrolledCourses: ['course-ai', 'course-web', 'course-python']
              };

              setAuthToken('google-session-' + Date.now());
              localStorage.setItem('skillos_user', JSON.stringify(googleUser));

              showToast('Google Sign-In Success', `Welcome to SkillOS, ${googleUser.name}!`, 'success');
              setTimeout(() => {
                window.location.href = 'dashboard.html';
              }, 700);
            } catch (e2) {
              loginWithDemoGoogle();
            } finally {
              hideLoader();
            }
          }
        }
      });
      return tokenClient;
    } catch (e) {
      console.warn('OAuth2 client init error:', e);
      return null;
    }
  };

  const triggerGoogleLogin = () => {
    if (!googleClientId) {
      googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
    }

    const currentOrigin = window.location.origin;
    const isStandardOrigin = currentOrigin === 'http://localhost:5000' || currentOrigin === 'http://127.0.0.1:5000';

    if (!isStandardOrigin && window.location.protocol !== 'file:') {
      showConfirmDialog({
        title: 'Google Sign-In on GitHub Pages',
        message: `Your Google Cloud OAuth client is authorized for:\n?? http://localhost:5000\n\nIf you have not added "${currentOrigin}" to Authorized JavaScript Origins in Google Cloud Console, Google will block it with "Error 400: origin_mismatch".\n\nWould you like to sign in as Student Demo, or try official Google Login?`,
        confirmText: 'Sign In as Student Demo',
        cancelText: 'Launch Google Login',
        confirmDanger: false,
        onConfirm: () => {
          loginWithDemoGoogle();
        }
      });

      const modal = document.getElementById('skillos-confirm-modal');
      const cancelBtn = modal?.querySelector('#modal-cancel-btn');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          modal.classList.add('hidden');
          const client = initTokenClient();
          if (client) {
            try {
              client.requestAccessToken({ prompt: 'select_account' });
            } catch (err) {
              loginWithDemoGoogle();
            }
          } else {
            loginWithDemoGoogle();
          }
        };
      }
      return;
    }

    // Direct Google OAuth popup on localhost:5000
    const client = initTokenClient();
    if (client) {
      try {
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        console.warn('Could not launch Google popup:', err);
        loginWithDemoGoogle();
      }
    } else {
      loginWithDemoGoogle();
    }
  };

    loginBtn?.addEventListener('click', triggerGoogleLogin);
  regBtn?.addEventListener('click', triggerGoogleLogin);

  // Poll for Google OAuth2 script readiness
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
    if (initTokenClient() || checkCount > 20) {
      clearInterval(interval);
    }
  }, 250);
}

// Initialise auth controls
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupPasswordToggles();
  setupPasswordStrength();
  setupPathwayCardsToggle();
  setupAvatarUpload();
  setupLogin();
  setupRegister();
  setupGoogleAuth();
  
  // Hide initial page loader on page mount
  hideLoader();
});
