(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showToast('L\'invitation est invalide ou manquante', 'error');
    document.getElementById('join-form').style.display = 'none';
    return;
  }

  // On tente de récupérer le nom d'utilisateur pour l'affichage (optionnel, on pourrait créer une route GET /api/auth/join-info)
  // Pour simplifier, on laisse le champ vide ou on demande à l'utilisateur
  document.getElementById('username').value = 'Utilisateur invité';
})();

document.getElementById('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    showToast(result.message, 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  } catch (err) {
    showToast(err.message, 'error');
  }
});
