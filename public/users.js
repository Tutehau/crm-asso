let currentUser = null;

function getAvatarColor(name) {
  const colors = ['#0e7490', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2', '#ec4899', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

(async () => {
  const user = await requireAuth();
  if (!user) return;
  currentUser = user;
  renderLayout('users', user.username, user.role);
  loadUsers();
})();

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      if (res.status === 403) {
        showToast('Accès refusé : Administrateur requis', 'error');
        window.location.href = 'dashboard.html';
      }
      return;
    }
    const users = await res.json();
    updateStats(users);
    renderUsersTable(users);
  } catch (err) {
    showToast('Erreur lors du chargement des utilisateurs', 'error');
  }
}

function updateStats(users) {
  document.getElementById('us-total').textContent = users.length;
  document.getElementById('us-active').textContent = users.filter(u => u.status === 'active').length;
  document.getElementById('us-pending').textContent = users.filter(u => u.status === 'pending').length;
  document.getElementById('us-admins').textContent = users.filter(u => u.role === 'admin').length;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-400);">
      <i class="fas fa-users" style="font-size:2rem;margin-bottom:8px;display:block;"></i>
      Aucun utilisateur trouvé</td></tr>`;
    return;
  }

  users.forEach(u => {
    const isSelf = currentUser && u.username === currentUser.username;
    const isPending = u.status === 'pending';
    const tr = document.createElement('tr');

    // User cell
    const tdUser = document.createElement('td');
    tdUser.className = 'td-contact';
    tdUser.innerHTML = `
      <div class="contact-cell">
        <div class="contact-avatar" style="background:${getAvatarColor(u.username)}">${(u.username || '?').charAt(0).toUpperCase()}</div>
        <div class="contact-name-info">
          <span class="contact-fullname">${escHtml(u.username)}${isSelf ? ' <span style="color:var(--gray-400);font-size:0.75rem;">(vous)</span>' : ''}</span>
          <span class="user-email">${escHtml(u.email || '')}</span>
        </div>
      </div>`;

    // Role cell
    const tdRole = document.createElement('td');
    tdRole.innerHTML = `<span class="role-badge ${u.role}">${u.role === 'admin' ? '<i class="fas fa-shield-alt"></i> Admin' : '<i class="fas fa-user"></i> Utilisateur'}</span>`;

    // Status cell
    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = `<span class="user-status"><span class="user-status-dot ${u.status === 'active' ? 'active' : 'pending'}"></span>${u.status === 'active' ? 'Actif' : 'En attente'}</span>`;

    // Date cell
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(u.createdAt);
    tdDate.style.color = 'var(--gray-400)';
    tdDate.style.fontSize = '0.85rem';

    // Actions cell
    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';

    if (!isSelf) {
      if (isPending) {
        const btnResend = document.createElement('button');
        btnResend.className = 'btn-icon';
        btnResend.title = 'Renvoyer l\'invitation';
        btnResend.innerHTML = '<i class="fas fa-paper-plane"></i>';
        btnResend.onclick = () => resendInvite(u.id);
        tdActions.appendChild(btnResend);
      }

      const btnRole = document.createElement('button');
      btnRole.className = 'btn-icon';
      btnRole.title = u.role === 'admin' ? 'Rétrograder en utilisateur' : 'Promouvoir admin';
      btnRole.innerHTML = u.role === 'admin' ? '<i class="fas fa-arrow-down"></i>' : '<i class="fas fa-arrow-up"></i>';
      btnRole.onclick = () => changeRole(u.id, u.role === 'admin' ? 'user' : 'admin', u.username);
      tdActions.appendChild(btnRole);

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-icon btn-danger';
      btnDelete.title = 'Supprimer';
      btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
      btnDelete.onclick = () => deleteUser(u.id, u.username);
      tdActions.appendChild(btnDelete);
    }

    tr.appendChild(tdUser);
    tr.appendChild(tdRole);
    tr.appendChild(tdStatus);
    tr.appendChild(tdDate);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

// ── Modal ──

const modal = document.getElementById('invite-modal');
const stepForm = document.getElementById('invite-step-form');
const stepSuccess = document.getElementById('invite-step-success');

function openModal() {
  stepForm.style.display = '';
  stepSuccess.style.display = 'none';
  document.getElementById('invite-form').reset();
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
}

document.getElementById('open-invite-modal').addEventListener('click', openModal);
document.getElementById('close-invite-modal').addEventListener('click', closeModal);
document.getElementById('cancel-invite').addEventListener('click', closeModal);
document.getElementById('invite-done').addEventListener('click', closeModal);
document.getElementById('invite-another').addEventListener('click', () => {
  stepForm.style.display = '';
  stepSuccess.style.display = 'none';
  document.getElementById('invite-form').reset();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// ── Submit invite ──

document.getElementById('invite-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('invite-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi…';

  const data = {
    username: document.getElementById('invite-username').value.trim(),
    email: document.getElementById('invite-email').value.trim(),
    role: document.getElementById('invite-role').value
  };

  try {
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    // Show success step
    stepForm.style.display = 'none';
    stepSuccess.style.display = '';

    const linkContainer = document.getElementById('invite-link-container');
    const titleEl = document.getElementById('invite-success-title');
    const msgEl = document.getElementById('invite-success-message');

    if (result.emailError) {
      titleEl.textContent = 'Utilisateur créé';
      msgEl.textContent = 'L\'email n\'a pas pu être envoyé. Partagez le lien ci-dessous manuellement.';
      linkContainer.style.display = '';
      document.getElementById('invite-link-input').value = result.inviteLink;
    } else {
      titleEl.textContent = 'Invitation envoyée !';
      msgEl.textContent = `Un email a été envoyé à ${escHtml(data.email)} avec un lien d'activation.`;
      linkContainer.style.display = '';
      document.getElementById('invite-link-input').value = result.inviteLink;
    }

    showToast(result.message, result.emailError ? 'warning' : 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer l\'invitation';
  }
});

// ── Copy invite link ──

document.getElementById('copy-invite-link').addEventListener('click', () => {
  const input = document.getElementById('invite-link-input');
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Lien copié dans le presse-papier', 'success');
    const btn = document.getElementById('copy-invite-link');
    btn.innerHTML = '<i class="fas fa-check"></i> Copié';
    setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copier'; }, 2000);
  });
});

// ── Resend invite ──

async function resendInvite(userId) {
  try {
    const res = await fetch('/api/admin/resend-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    if (result.emailError) {
      showToast('Email non envoyé. Lien copié.', 'warning');
      navigator.clipboard.writeText(result.inviteLink).catch(() => {});
    } else {
      showToast(result.message, 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Change role ──

async function changeRole(userId, newRole, username) {
  const action = newRole === 'admin' ? 'promouvoir administrateur' : 'rétrograder en utilisateur';
  const confirmed = await showConfirm({
    title: 'Modifier le rôle',
    message: `Voulez-vous ${action} l'utilisateur « ${username} » ?`,
    confirmText: 'Confirmer',
    type: 'warning'
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    showToast(result.message, 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Delete user ──

async function deleteUser(id, username) {
  const confirmed = await showConfirm({
    title: 'Supprimer cet utilisateur',
    message: `L'utilisateur « ${username} » ne pourra plus se connecter. Cette action est irréversible.`,
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    showToast('Utilisateur supprimé', 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
