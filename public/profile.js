(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('profile', user.username, user.role);
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-session-user').textContent = user.username;
  document.getElementById('profile-session-since').textContent = new Date().toLocaleString('fr-FR');
})();

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }
  if (newPassword.length < 4) {
    showToast('Le mot de passe doit faire au moins 4 caractères', 'error');
    return;
  }

  try {
    const res = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast('Mot de passe mis à jour', 'success');
    document.getElementById('change-password-form').reset();
  } catch (err) { showToast(err.message || 'Erreur', 'error'); }
});

document.getElementById('change-username-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUsername = document.getElementById('new-username').value.trim();
  const password = document.getElementById('username-password-confirm').value;

  if (!newUsername) {
    showToast('Le nom d\'utilisateur ne peut pas être vide', 'error');
    return;
  }

  try {
    const res = await fetch('/api/profile/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast('Nom d\'utilisateur mis à jour', 'success');
    document.getElementById('change-username-form').reset();
    document.getElementById('profile-username').textContent = newUsername;
    document.getElementById('profile-session-user').textContent = newUsername;
  } catch (err) { showToast(err.message || 'Erreur', 'error'); }
});
