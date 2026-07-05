const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const setupForm = document.getElementById('setup-form');
const setupError = document.getElementById('setup-error');

async function checkAdminExists() {
  try {
    const res = await fetch('/api/admin-exists');
    const data = await res.json();
    if (!data.exists) {
      loginScreen.style.display = 'none';
      setupScreen.style.display = 'flex';
      return false;
    }
    setupScreen.style.display = 'none';
    return true;
  } catch {
    return true;
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      window.location.href = '/dashboard.html';
    } else {
      const adminExists = await checkAdminExists();
      if (adminExists) loginScreen.style.display = 'flex';
    }
  } catch {
    const adminExists = await checkAdminExists();
    if (adminExists) loginScreen.style.display = 'flex';
    else setupScreen.style.display = 'flex';
  }
}

setupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('setup-username').value;
  const password = document.getElementById('setup-password').value;
  try {
    const res = await fetch('/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      setupScreen.style.display = 'none';
      loginScreen.style.display = 'flex';
    } else {
      const err = await res.json();
      setupError.textContent = err.message || 'Erreur';
      setupError.style.display = 'block';
    }
  } catch {
    setupError.textContent = 'Erreur réseau';
    setupError.style.display = 'block';
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      window.location.href = '/dashboard.html';
    } else {
      const err = await res.json();
      loginError.textContent = err.message || 'Identifiants invalides';
      loginError.style.display = 'block';
    }
  } catch {
    loginError.textContent = 'Erreur réseau';
    loginError.style.display = 'block';
  }
});

checkAuth();
