let contacts = [];

const contactsBody = document.getElementById('contacts-body');
const searchInput = document.getElementById('search-contacts');
const statusFilter = document.getElementById('status-filter');
const addContactBtn = document.getElementById('add-contact-btn');
const modal = document.getElementById('contact-modal');
const modalClose = document.querySelector('.modal-close');
const modalCloseBtn = document.querySelector('.modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalIcon = document.getElementById('modal-icon');
const contactForm = document.getElementById('contact-form');
const editIdInput = document.getElementById('edit-id');
const fNom = document.getElementById('f-nom');
const fPrenom = document.getElementById('f-prenom');
const fTel = document.getElementById('f-telephone');
const fEmail = document.getElementById('f-email');
const fAdresse = document.getElementById('f-adresse');
const fDate = document.getElementById('f-dateNaissance');
const fStatut = document.getElementById('f-statut');
const fTags = document.getElementById('f-tags');
const fNotes = document.getElementById('f-notes');
const modalSubmit = document.getElementById('modal-submit');
const resultsCount = document.getElementById('results-count');

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('contacts', user.username, user.role);
  loadContacts();
})();

async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) throw new Error();
    contacts = await res.json();
    updateSummary();
    renderContacts();
  } catch { showToast('Erreur chargement contacts', 'error'); }
}

function updateSummary() {
  document.getElementById('count-total').textContent = contacts.length;
  document.getElementById('count-membres').textContent = contacts.filter(c => c.statut === 'Membre').length;
  document.getElementById('count-benevoles').textContent = contacts.filter(c => c.statut === 'Benevole' || c.statut === 'Bénévole').length;
  document.getElementById('count-bureau').textContent = contacts.filter(c => c.statut === 'Bureau').length;
}

function getInitials(prenom, nom) {
  return ((prenom || '')[0] || '') + ((nom || '')[0] || '');
}

function getAvatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function renderContacts() {
  const search = searchInput.value.toLowerCase().trim();
  const status = statusFilter.value;
  let filtered = contacts;
  if (search) filtered = filtered.filter(c =>
    (c.nom+'').toLowerCase().includes(search) ||
    (c.prenom+'').toLowerCase().includes(search) ||
    (c.email+'').toLowerCase().includes(search) ||
    (c.telephone+'').includes(search)
  );
  if (status) filtered = filtered.filter(c => c.statut === status);

  resultsCount.innerHTML = '';
  const icon = document.createElement('i');
  icon.className = 'fas fa-filter';
  resultsCount.appendChild(icon);
  resultsCount.appendChild(document.createTextNode(` ${filtered.length} resultat${filtered.length > 1 ? 's' : ''}`));

  if (!filtered.length) {
    contactsBody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-users"></i></div><h4>Aucun contact</h4><p>Commencez par ajouter votre premier contact</p></div>';
    tr.appendChild(td);
    contactsBody.appendChild(tr);
    return;
  }

  contactsBody.innerHTML = '';
  filtered.forEach(c => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'td-contact';
    const contactCell = document.createElement('div');
    contactCell.className = 'contact-cell';

    const avatar = document.createElement('div');
    avatar.className = 'contact-avatar';
    avatar.style.background = getAvatarColor(c.prenom + c.nom);
    avatar.textContent = getInitials(c.prenom, c.nom).toUpperCase();

    const info = document.createElement('div');
    info.className = 'contact-name-info';
    const nameEl = document.createElement('span');
    nameEl.className = 'contact-fullname';
    nameEl.textContent = `${c.prenom} ${c.nom}`;
    info.appendChild(nameEl);
    if (c.adresse) {
      const addrEl = document.createElement('span');
      addrEl.className = 'contact-address';
      addrEl.textContent = c.adresse;
      info.appendChild(addrEl);
    }

    contactCell.appendChild(avatar);
    contactCell.appendChild(info);
    tdName.appendChild(contactCell);

    const tdTel = document.createElement('td');
    tdTel.className = 'td-phone';
    const phoneWrap = document.createElement('span');
    phoneWrap.className = 'phone-display';
    const phoneIcon = document.createElement('i');
    phoneIcon.className = 'fas fa-phone';
    phoneWrap.appendChild(phoneIcon);
    phoneWrap.appendChild(document.createTextNode(' ' + (c.telephone || '-')));
    tdTel.appendChild(phoneWrap);

    const tdEmail = document.createElement('td');
    tdEmail.className = 'td-email';
    if (c.email) {
      const emailWrap = document.createElement('span');
      emailWrap.className = 'email-display';
      const emailIcon = document.createElement('i');
      emailIcon.className = 'fas fa-envelope';
      emailWrap.appendChild(emailIcon);
      emailWrap.appendChild(document.createTextNode(' ' + c.email));
      tdEmail.appendChild(emailWrap);
    } else {
      tdEmail.textContent = '-';
      tdEmail.style.color = 'var(--gray-400)';
    }

    const tdStatut = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${c.statut || ''}`;
    badge.textContent = c.statut || 'Non defini';
    tdStatut.appendChild(badge);

    const tdTags = document.createElement('td');
    tdTags.className = 'td-tags';
    if (c.tags) {
      c.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
        const tagBadge = document.createElement('span');
        tagBadge.className = 'tag-badge';
        tagBadge.textContent = t;
        tdTags.appendChild(tagBadge);
      });
    }

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';

    const btnView = document.createElement('button');
    btnView.className = 'btn-action btn-action-view';
    btnView.title = 'Voir';
    const viewIcon = document.createElement('i');
    viewIcon.className = 'fas fa-eye';
    btnView.appendChild(viewIcon);
    btnView.addEventListener('click', () => viewContact(c.id));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action btn-action-edit';
    btnEdit.title = 'Modifier';
    const editIcon = document.createElement('i');
    editIcon.className = 'fas fa-pen';
    btnEdit.appendChild(editIcon);
    btnEdit.addEventListener('click', () => editContact(c.id));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-action btn-action-delete';
    btnDelete.title = 'Supprimer';
    const delIcon = document.createElement('i');
    delIcon.className = 'fas fa-trash';
    btnDelete.appendChild(delIcon);
    btnDelete.addEventListener('click', () => deleteContact(c.id));

    tdActions.appendChild(btnView);
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdTel);
    tr.appendChild(tdEmail);
    tr.appendChild(tdStatut);
    tr.appendChild(tdTags);
    tr.appendChild(tdActions);
    contactsBody.appendChild(tr);
  });
}

function openModal(mode, data) {
  modal.classList.add('open');
  if (mode === 'new') {
    modalTitle.textContent = 'Nouveau contact';
    modalSubtitle.textContent = 'Remplissez les informations du contact';
    modalIcon.className = 'fas fa-user-plus';
    contactForm.reset();
    editIdInput.value = '';
    modalSubmit.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    fStatut.value = 'Membre';
  } else if (mode === 'edit' && data) {
    modalTitle.textContent = 'Modifier le contact';
    modalSubtitle.textContent = `${data.prenom} ${data.nom}`;
    modalIcon.className = 'fas fa-pen';
    fillForm(data);
    modalSubmit.innerHTML = '<i class="fas fa-check"></i> Mettre a jour';
  } else if (mode === 'view' && data) {
    modalTitle.textContent = 'Detail du contact';
    modalSubtitle.textContent = `${data.prenom} ${data.nom}`;
    modalIcon.className = 'fas fa-user-circle';
    fillForm(data);
    modalSubmit.innerHTML = '<i class="fas fa-check"></i> Mettre a jour';
  }
}

function fillForm(data) {
  editIdInput.value = data.id || '';
  fNom.value = data.nom || '';
  fPrenom.value = data.prenom || '';
  fTel.value = data.telephone || '';
  fEmail.value = data.email || '';
  fAdresse.value = data.adresse || '';
  fDate.value = data.dateNaissance || '';
  fStatut.value = data.statut || 'Membre';
  fTags.value = data.tags || '';
  fNotes.value = data.notes || '';
}

function closeModal() { modal.classList.remove('open'); }

modalClose.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
addContactBtn.addEventListener('click', () => openModal('new', null));

function viewContact(id) {
  const c = contacts.find(x => x.id === id);
  if (c) openModal('view', c);
}

function editContact(id) {
  const c = contacts.find(x => x.id === id);
  if (c) openModal('edit', c);
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nom: fNom.value.trim(),
    prenom: fPrenom.value.trim(),
    telephone: fTel.value.trim(),
    email: fEmail.value.trim(),
    adresse: fAdresse.value.trim(),
    dateNaissance: fDate.value,
    statut: fStatut.value,
    tags: fTags.value.trim(),
    notes: fNotes.value.trim()
  };
  if (!data.nom || !data.prenom || !data.telephone) {
    showToast('Nom, prenom et telephone sont obligatoires.', 'error');
    return;
  }
  const id = editIdInput.value;
  try {
    let res;
    if (id) {
      res = await fetch(`/api/contacts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    if (!res.ok) throw new Error();
    closeModal();
    loadContacts();
    showToast(id ? 'Contact modifie' : 'Contact ajoute', 'success');
  } catch { showToast('Erreur lors de l\'enregistrement', 'error'); }
});

async function deleteContact(id) {
  if (!confirm('Supprimer ce contact definitivement ?')) return;
  try {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    loadContacts();
    showToast('Contact supprime', 'success');
  } catch { showToast('Erreur suppression', 'error'); }
}

searchInput.addEventListener('input', renderContacts);
statusFilter.addEventListener('change', renderContacts);

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape') closeModal();
});
