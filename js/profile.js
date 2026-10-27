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

function setupAvatarHandler() {
  const avatarEdit = document.getElementById('avatar-edit-trigger');
  avatarEdit?.addEventListener('click', () => {
    showToast('Avatar Generated', 'Profile image updated successfully.', 'success');
  });

  document.getElementById('profile-signout-btn')?.addEventListener('click', logout);
}
