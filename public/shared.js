// ----- DARK MODE -----
function initTheme() {
  const saved = localStorage.getItem('crm-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
initTheme();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('crm-theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    if (next === 'dark') {
      icon.className = 'fas fa-sun';
      span.textContent = 'Mode clair';
    } else {
      icon.className = 'fas fa-moon';
      span.textContent = 'Mode sombre';
    }
  }
}

// ----- AUTH -----
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

// ----- LAYOUT -----
function renderLayout(activePage, username, role = 'user') {
  const pages = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Tableau de bord', href: '/dashboard.html' },
    { id: 'contacts', icon: 'fa-users', label: 'Contacts', href: '/contacts.html' },
    { id: 'emails', icon: 'fa-envelope', label: 'Emails', href: '/emails.html' },
    { id: 'import-export', icon: 'fa-file-import', label: 'Import / Export', href: '/import-export.html' },
    ...(role === 'admin' ? [{ id: 'users', icon: 'fa-user-shield', label: 'Utilisateurs', href: '/users.html' }] : []),
    { id: 'separator' },
    { id: 'settings', icon: 'fa-cog', label: 'Paramètres', href: '/settings.html' },
    { id: 'profile', icon: 'fa-user-circle', label: 'Profil', href: '/profile.html' },
  ];

  const titles = {
    dashboard: 'Tableau de bord',
    contacts: 'Gestion des contacts',
    emails: 'Envoi d\'emails',
    'import-export': 'Import / Export',
    users: 'Gestion des utilisateurs',
    settings: 'Paramètres',
    profile: 'Mon profil'
  };

  const navHtml = pages.map(p => {
    if (p.id === 'separator') return '<div class="nav-separator"></div>';
    const active = p.id === activePage ? ' active' : '';
    return `<a href="${p.href}" class="nav-link${active}"><i class="fas ${p.icon}"></i> <span>${p.label}</span></a>`;
  }).join('');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML = `
    <div class="brand"><i class="fas fa-address-card"></i> <span>CRM Asso</span></div>
    <nav>${navHtml}</nav>
    <button id="theme-toggle-btn" class="theme-toggle" onclick="toggleTheme()">
      <i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i>
      <span>${isDark ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
    <div class="sidebar-footer">
      <button id="logout-btn" class="btn-secondary"><i class="fas fa-sign-out-alt"></i> <span>Déconnexion</span></button>
    </div>
  `;

  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger-btn';
  hamburger.id = 'hamburger-btn';
  hamburger.innerHTML = '<i class="fas fa-bars"></i>';

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';

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
  document.body.insertBefore(hamburger, main);
  document.body.insertBefore(overlay, main);
  document.body.insertBefore(sidebar, main);
  main.insertBefore(topbar, main.firstChild);

  // Toast container
  if (!document.querySelector('.toast-container')) {
    const tc = document.createElement('div');
    tc.className = 'toast-container';
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
  sidebar.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ----- TOAST NOTIFICATIONS -----
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-check',
    error: 'fa-xmark',
    info: 'fa-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
    <span class="toast-text">${escHtml(msg)}</span>
    <span class="toast-close"><i class="fas fa-times"></i></span>
    <div class="toast-progress"></div>
  `;

  const dismiss = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  toast.addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, 4000);
}

// ----- CONFIRM DIALOG -----
function showConfirm({ title, message, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'danger' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const iconClass = type === 'danger' ? 'fa-trash-alt' : 'fa-exclamation-triangle';

    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon ${type}">
          <i class="fas ${iconClass}"></i>
        </div>
        <h3>${escHtml(title)}</h3>
        <p>${escHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn-secondary confirm-cancel">${escHtml(cancelText)}</button>
          <button class="btn-${type === 'danger' ? 'danger' : 'primary'} confirm-ok" style="padding:10px 24px;border-radius:10px;font-weight:600;font-size:0.875rem;cursor:pointer;font-family:inherit;">${escHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('.confirm-ok').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', handler);
      }
    });

    document.body.appendChild(overlay);
    overlay.querySelector('.confirm-ok').focus();
  });
}

// ----- DEBOUNCE -----
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
