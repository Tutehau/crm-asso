// Vérifie l'authentification, redirige vers login si non connecté
async function requireAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) { window.location.href = '/index.html'; return null; }
    return await res.json();
  } catch {
    window.location.href = '/index.html';
    return null;
  }
}

// Injecte la sidebar et la topbar
function renderLayout(activePage, username) {
  const pages = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Tableau de bord', href: '/dashboard.html' },
    { id: 'contacts', icon: 'fa-users', label: 'Contacts', href: '/contacts.html' },
    { id: 'emails', icon: 'fa-envelope', label: 'Emails', href: '/emails.html' },
    { id: 'import-export', icon: 'fa-file-import', label: 'Import / Export', href: '/import-export.html' },
    { id: 'separator' },
    { id: 'settings', icon: 'fa-cog', label: 'Paramètres', href: '/settings.html' },
    { id: 'profile', icon: 'fa-user-circle', label: 'Profil', href: '/profile.html' },
  ];

  const titles = {
    dashboard: 'Tableau de bord',
    contacts: 'Gestion des contacts',
    emails: 'Envoi d\'emails',
    'import-export': 'Import / Export',
    settings: 'Paramètres',
    profile: 'Mon profil'
  };

  const navHtml = pages.map(p => {
    if (p.id === 'separator') return '<div class="nav-separator"></div>';
    const active = p.id === activePage ? ' active' : '';
    return `<a href="${p.href}" class="nav-link${active}"><i class="fas ${p.icon}"></i> <span>${p.label}</span></a>`;
  }).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="brand"><i class="fas fa-address-card"></i> <span>CRM Asso</span></div>
    <nav>${navHtml}</nav>
    <div class="sidebar-footer">
      <button id="logout-btn" class="btn-secondary"><i class="fas fa-sign-out-alt"></i> <span>Déconnexion</span></button>
    </div>
  `;

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <h2>${titles[activePage] || 'CRM'}</h2>
    <a href="/profile.html" class="user-info" title="Voir mon profil">
      <i class="fas fa-user-circle"></i>
      <span>${escHtml(username)}</span>
    </a>
  `;

  const main = document.querySelector('.main-content');
  document.body.insertBefore(sidebar, main);
  main.insertBefore(topbar, main.firstChild);

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Toast notifications
function showToast(msg, type = 'success') {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = msg;
  div.style.position = 'fixed';
  div.style.bottom = '20px';
  div.style.right = '20px';
  div.style.zIndex = '9999';
  div.style.maxWidth = '400px';
  div.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}
