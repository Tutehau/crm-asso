(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('settings', user.username, user.role);
  loadSettings();
})();

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    document.getElementById('smtp-host').value = settings.smtpHost || '';
    document.getElementById('smtp-port').value = settings.smtpPort || '';
    document.getElementById('smtp-user').value = settings.smtpUser || '';
    document.getElementById('smtp-pass').value = '';
    document.getElementById('smtp-from').value = settings.smtpFrom || '';
    document.getElementById('pref-asso-name').value = settings.assoName || '';
    document.getElementById('pref-items-per-page').value = settings.itemsPerPage || 25;
  } catch {}
}

document.getElementById('smtp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    smtpHost: document.getElementById('smtp-host').value.trim(),
    smtpPort: document.getElementById('smtp-port').value.trim(),
    smtpUser: document.getElementById('smtp-user').value.trim(),
    smtpPass: document.getElementById('smtp-pass').value,
    smtpFrom: document.getElementById('smtp-from').value.trim()
  };
  try {
    const res = await fetch('/api/settings/smtp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error();
    showToast('Configuration SMTP enregistr��e', 'success');
  } catch { showToast('Erreur lors de la sauvegarde', 'error'); }
});

document.getElementById('test-smtp-btn').addEventListener('click', async () => {
  const btn = document.getElementById('test-smtp-btn');
  btn.disabled = true;
  btn.textContent = 'Test...';
  try {
    const res = await fetch('/api/settings/smtp/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast('Connexion SMTP réussie !', 'success');
    } else {
      showToast(data.message || 'Échec de connexion SMTP', 'error');
    }
  } catch { showToast('Erreur de test', 'error'); }
  finally {
    btn.disabled = false;
    btn.textContent = 'Tester la connexion';
  }
});

document.getElementById('preferences-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    assoName: document.getElementById('pref-asso-name').value.trim(),
    itemsPerPage: parseInt(document.getElementById('pref-items-per-page').value) || 25
  };
  try {
    const res = await fetch('/api/settings/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error();
    showToast('Préférences enregistrées', 'success');
  } catch { showToast('Erreur lors de la sauvegarde', 'error'); }
});

document.getElementById('delete-all-contacts-btn').addEventListener('click', async () => {
  if (!confirm('ATTENTION : Tous les contacts seront définitivement supprimés. Continuer ?')) return;
  if (!confirm('Êtes-vous vraiment sûr ? Cette action est IRRÉVERSIBLE.')) return;
  try {
    const res = await fetch('/api/contacts/all', { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Tous les contacts ont été supprimés', 'success');
  } catch { showToast('Erreur lors de la suppression', 'error'); }
});
