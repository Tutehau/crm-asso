const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const elLoading = document.getElementById('join-loading');
const elError = document.getElementById('join-error');
const elMain = document.getElementById('join-main');
const elSuccess = document.getElementById('join-success');

function showState(state) {
  elLoading.style.display = state === 'loading' ? '' : 'none';
  elError.style.display = state === 'error' ? '' : 'none';
  elMain.style.display = state === 'form' ? '' : 'none';
  elSuccess.style.display = state === 'success' ? '' : 'none';
}

(async () => {
  if (!token) {
    document.getElementById('join-error-msg').textContent = 'Aucun token d\'invitation fourni.';
    showState('error');
    return;
  }

  try {
    const res = await fetch(`/api/auth/join-info?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const data = await res.json();
      document.getElementById('join-error-msg').textContent = data.message || 'Invitation invalide.';
      showState('error');
      return;
    }

    const info = await res.json();
    document.getElementById('join-username').value = info.username;
    document.getElementById('join-email').value = info.email || '';

    if (info.assoName) {
      document.getElementById('join-asso-name').textContent = info.assoName;
      document.getElementById('join-asso').style.display = '';
    }

    showState('form');
  } catch {
    document.getElementById('join-error-msg').textContent = 'Impossible de contacter le serveur.';
    showState('error');
  }
})();

// Password strength
const pwInput = document.getElementById('join-password');
const pwStrength = document.getElementById('pw-strength');

pwInput.addEventListener('input', () => {
  const val = pwInput.value;
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/\d/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const pct = Math.min(score / 5, 1) * 100;
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
  pwStrength.style.width = pct + '%';
  pwStrength.style.background = colors[Math.min(score, 4)];
});

// Password match
const confirmInput = document.getElementById('join-confirm');
const matchMsg = document.getElementById('pw-match-msg');

confirmInput.addEventListener('input', () => {
  if (confirmInput.value && confirmInput.value !== pwInput.value) {
    matchMsg.textContent = 'Les mots de passe ne correspondent pas';
    matchMsg.style.display = 'block';
  } else {
    matchMsg.style.display = 'none';
  }
});

// Submit
document.getElementById('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = pwInput.value;
  const confirm = confirmInput.value;

  if (password !== confirm) {
    matchMsg.textContent = 'Les mots de passe ne correspondent pas';
    matchMsg.style.display = 'block';
    return;
  }

  const btn = document.getElementById('join-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activation…';

  try {
    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    showState('success');
    setTimeout(() => { window.location.href = 'index.html'; }, 3000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Activer mon compte';
  }
});
