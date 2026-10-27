// ============================================================
//  SkillOS — Profile Controller (profile.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, showToast, logout } from './app.js';

let userProfile = null;

initAuthListener(async (user, profile) => {
  initSidebar();
  userProfile = profile;

  populateProfileDetails();
  setupAvatarHandler();
  
  hideLoader();
}, () => {});

function populateProfileDetails() {
  const nameInput = document.getElementById('profile-name-input');
  const bioInput = document.getElementById('profile-bio-input');
  const emailInput = document.getElementById('profile-email-input');

  if (nameInput) nameInput.value = userProfile.name || userProfile.displayName || '';
  if (bioInput) bioInput.value = userProfile.bio || '';
  if (emailInput) emailInput.value = userProfile.email || '';
  
  // Dashboard points card counts
  const xpEl = document.getElementById('profile-xp-count');
  const streakEl = document.getElementById('profile-streak-count');
  const coursesEl = document.getElementById('profile-courses-count');

  if (xpEl) xpEl.textContent = userProfile.points || 0;
  if (streakEl) streakEl.textContent = userProfile.streak || 0;
  if (coursesEl) coursesEl.textContent = userProfile.enrolledCourses?.length || userProfile.enrollments?.length || 0;

  const saveBtn = document.getElementById('save-profile-btn');
  saveBtn?.addEventListener('click', saveProfileChanges);
}

async function saveProfileChanges() {
  const name = document.getElementById('profile-name-input')?.value.trim();
  const bio = document.getElementById('profile-bio-input')?.value.trim();

  if (!name) {
    showToast('Name Required', 'Please enter a name.', 'warning');
    return;
  }

  const btn = document.getElementById('save-profile-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  try {
    const data = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, bio })
    });
    
    userProfile.name = data.user.name;
    userProfile.displayName = data.user.name;
    
    // Update header name display
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = name;
    });

    showToast('Profile Updated', 'Your profile details were updated in PostgreSQL.', 'success');
  } catch (err) {
    showToast('Update Failed', err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  }
}

function renderAvatar(avatarUrl, name) {
  const avatarEl = document.getElementById('profile-initials');
  if (!avatarEl) return;
  if (avatarUrl) {
    avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
    avatarEl.style.padding = '0';
  } else {
    avatarEl.innerHTML = '';
    avatarEl.textContent = (name || 'Student')[0].toUpperCase();
  }
}

function setupAvatarHandler() {
  const triggerBtn = document.getElementById('avatar-edit-trigger') || document.getElementById('avatar-upload-btn');
  const fileInput = document.getElementById('avatar-file-input');
  const avatarEl = document.getElementById('profile-initials');

  // Render initial avatar if user has one
  renderAvatar(userProfile.avatar_url, userProfile.name);

  // Click camera button -> trigger hidden file picker
  triggerBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput?.click();
  });

  // Clicking the avatar circle also opens file picker
  avatarEl?.addEventListener('click', () => {
    fileInput?.click();
  });
  if (avatarEl) {
    avatarEl.style.cursor = 'pointer';
    avatarEl.title = 'Click to change profile photo';
  }

  // Handle image selection
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select a valid image (JPG, PNG, WebP).', 'warning');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('File Too Large', 'Please select an image smaller than 8MB.', 'warning');
      return;
    }

    showToast('Uploading...', 'Processing profile photo...', 'info');

    try {
      // Resize & compress to optimal 400x400 JPEG
      const base64Data = await resizeAndEncodeImage(file, 400, 400);

      // Instantly update avatar on page
      renderAvatar(base64Data, userProfile.name);

      // Update sidebar avatar in real time
      document.querySelectorAll('[data-user-avatar]').forEach(el => {
        el.innerHTML = `<img src="${base64Data}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
      });

      // Persist to server / PostgreSQL
      try {
        await apiFetch('/api/auth/profile', {
          method: 'PUT',
          body: { avatar_url: base64Data }
        });
      } catch (err) {
        console.warn('Backend avatar update:', err.message);
      }

      // Update cached user profile in memory and localStorage
      userProfile.avatar_url = base64Data;
      const stored = localStorage.getItem('skillos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.avatar_url = base64Data;
          localStorage.setItem('skillos_user', JSON.stringify(parsed));
        } catch (e) {}
      }

      showToast('Profile Photo Updated!', 'Your new avatar has been saved.', 'success');
    } catch (err) {
      console.error('Avatar update failed:', err);
      showToast('Upload Failed', 'Failed to process image. Please try another one.', 'error');
    } finally {
      fileInput.value = '';
    }
  });

  document.getElementById('profile-signout-btn')?.addEventListener('click', logout);
}

// Helper to downscale and convert image to clean base64 data URL
function resizeAndEncodeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
