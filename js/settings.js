// ============================================================
//  SkillOS — User Settings Controller (settings.js) - PostgreSQL
// ============================================================
import { apiFetch, initAuthListener, initSidebar, hideLoader, showToast, playNotificationSound } from './app.js';

initAuthListener(async (user, profile) => {
  initSidebar();
  setupSettingsForm(profile);
  hideLoader();
}, () => {});

function setupSettingsForm(profile) {
  const saveBtn = document.getElementById('save-settings-btn');
  const soundToggle = document.getElementById('setting-sound');
  const testSoundBtn = document.getElementById('test-sound-btn');
  const dndToggle = document.getElementById('setting-dnd');
  const emailsToggle = document.getElementById('setting-emails');
  const pathVal = document.getElementById('profile-path');

  // Populate form controls
  const isSoundMuted = localStorage.getItem('skillos_sound_muted') === 'true';
  if (soundToggle) soundToggle.checked = !isSoundMuted;
  if (dndToggle) dndToggle.checked = profile.settingsDND || false;
  if (emailsToggle) emailsToggle.checked = profile.settingsEmails !== false;
  if (pathVal) pathVal.value = profile.learningGoal || '';

  // Sound toggle listener
  soundToggle?.addEventListener('change', () => {
    if (soundToggle.checked) {
      localStorage.removeItem('skillos_sound_muted');
      playNotificationSound('success');
      showToast('Sound Enabled', 'Notification audio effects are now active.', 'success');
    } else {
      localStorage.setItem('skillos_sound_muted', 'true');
      showToast('Sound Muted', 'Audio effects turned off.', 'info');
    }
  });

  // Sound test button
  testSoundBtn?.addEventListener('click', () => {
    if (soundToggle && !soundToggle.checked) {
      soundToggle.checked = true;
      localStorage.removeItem('skillos_sound_muted');
    }
    playNotificationSound('achievement');
    showToast('🔔 Notification Sound Test', 'Crisp audio notification playing perfectly!', 'success');
  });

  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          settingsDND: dndToggle?.checked || false,
          settingsEmails: emailsToggle?.checked || false,
          learningGoal: pathVal?.value || ''
        })
      });
      showToast('Settings Saved', 'Preferences updated successfully in PostgreSQL.', 'success');
    } catch (err) {
      showToast('Failed to Save Settings', err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Preferences';
    }
  });
}
