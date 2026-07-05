(async () => {
  const user = await requireAuth();
  if (!user) return;
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
    renderUsersTable(users);
  } catch (err) {
    showToast('Erreur lors du chargement des utilisateurs', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  users.forEach(u => {
    const row = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'td-contact';
    const contactCell = document.createElement('div');
    contactCell.className = 'contact-cell';

    const avatar = document.createElement('div');
    avatar.className = 'contact-avatar';
    avatar.style.background = 'var(--primary-color)'; // simplified for now
    avatar.textContent = (u.username || '?').charAt(0).toUpperCase();

    const info = document.createElement('div');
    info.className = 'contact-name-info';
    const nameEl = document.createElement('span');
    nameEl.className = 'contact-fullname';
    nameEl.textContent = u.username;
    info.appendChild(nameEl);

    contactCell.appendChild(avatar);
    contactCell.appendChild(info);
    tdName.appendChild(contactCell);

    const tdRole = document.createElement('td');
    const roleBadge = document.createElement('span');
    roleBadge.className = `badge badge-${u.role === 'admin' ? 'admin' : 'user'}`;
    roleBadge.textContent = u.role;
    tdRole.appendChild(roleBadge);

    const tdStatus = document.createElement('td');
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot ${u.status === 'active' ? 'active' : 'pending'}`;
    tdStatus.appendChild(statusDot);
    tdStatus.appendChild(document.createTextNode(` ${u.status === 'active' ? 'Actif' : 'En attente'}`));

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-icon btn-danger';
    btnDelete.title = 'Supprimer';
    const delIcon = document.createElement('i');
    delIcon.className = 'fas fa-trash';
    btnDelete.appendChild(delIcon);
    btnDelete.onclick = () => deleteUser(u.id);

    tdActions.appendChild(btnDelete);

    row.appendChild(tdName);
    row.appendChild(tdRole);
    row.appendChild(tdStatus);
    row.appendChild(tdActions);
    tbody.appendChild(row);
  });
}

// Modal Logic
const modal = document.getElementById('invite-modal');
const openBtn = document.getElementById('open-invite-modal');
const closeBtns = document.querySelectorAll('.close-modal');

openBtn.addEventListener('click', () => modal.style.display = 'flex');
closeBtns.forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));

document.getElementById('invite-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    username: document.getElementById('invite-username').value.trim(),
    email: document.getElementById('invite-email').value.trim()
  };

  try {
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    showToast(result.message, 'success');
    modal.style.display = 'none';
    e.target.reset();
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ? Il ne pourra plus se connecter.')) return;
  try {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur lors de la suppression');
    showToast('Utilisateur supprimé', 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
