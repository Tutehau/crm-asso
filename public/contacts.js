let allContacts = [];
let selectedIds = new Set();
let currentPage = 1;
let itemsPerPage = 25;
let currentSort = { field: 'prenom', order: 'asc' };

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

  try {
    const settingsRes = await fetch('/api/settings');
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      itemsPerPage = settings.itemsPerPage || 25;
    }
  } catch {}

  loadContacts();
})();

async function loadContacts() {
  showLoadingSkeleton();
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: itemsPerPage,
      sort: currentSort.field,
      order: currentSort.order
    });

    const search = searchInput.value.trim();
    if (search) params.set('search', search);

    const status = statusFilter.value;
    if (status) params.set('status', status);

    const res = await fetch(`/api/contacts?${params}`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.contacts) {
      allContacts = data.contacts;
      renderContacts(data);
      renderPagination(data);
    } else {
      allContacts = data;
      renderContacts({ contacts: data, total: data.length, page: 1, totalPages: 1 });
    }
    updateSummary();
  } catch {
    showToast('Erreur chargement contacts', 'error');
  }
}

function showLoadingSkeleton() {
  contactsBody.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="checkbox-cell"><div class="skeleton" style="width:18px;height:18px;border-radius:4px;margin:0 auto;"></div></td>
      <td><div class="skeleton-row"><div class="skeleton skeleton-avatar"></div><div style="flex:1"><div class="skeleton skeleton-text" style="margin-bottom:6px"></div><div class="skeleton skeleton-text-sm"></div></div></div></td>
      <td><div class="skeleton skeleton-text" style="max-width:120px"></div></td>
      <td><div class="skeleton skeleton-text" style="max-width:150px"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-text-sm" style="max-width:60px"></div></td>
      <td><div style="display:flex;gap:6px"><div class="skeleton" style="width:32px;height:32px;border-radius:8px"></div><div class="skeleton" style="width:32px;height:32px;border-radius:8px"></div><div class="skeleton" style="width:32px;height:32px;border-radius:8px"></div></div></td>
    `;
    contactsBody.appendChild(tr);
  }
}

async function updateSummary() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const stats = await res.json();
    document.getElementById('count-total').textContent = stats.total;
    document.getElementById('count-membres').textContent = stats.statusCount['Membre'] || 0;
    document.getElementById('count-benevoles').textContent = stats.statusCount['Benevole'] || stats.statusCount['Bénévole'] || 0;
    document.getElementById('count-bureau').textContent = stats.statusCount['Bureau'] || 0;
  } catch {}
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

function renderContacts(data) {
  const contacts = data.contacts || [];
  const total = data.total || contacts.length;

  resultsCount.innerHTML = '';
  const icon = document.createElement('i');
  icon.className = 'fas fa-filter';
  resultsCount.appendChild(icon);
  resultsCount.appendChild(document.createTextNode(` ${total} résultat${total > 1 ? 's' : ''}`));

  if (!contacts.length) {
    contactsBody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 7;
    td.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-users"></i></div><h4>Aucun contact</h4><p>Commencez par ajouter votre premier contact</p></div>';
    tr.appendChild(td);
    contactsBody.appendChild(tr);
    updateBulkBar();
    return;
  }

  contactsBody.innerHTML = '';
  contacts.forEach(c => {
    const tr = document.createElement('tr');
    if (selectedIds.has(c.id)) tr.classList.add('selected');

    // Checkbox
    const tdCheck = document.createElement('td');
    tdCheck.className = 'checkbox-cell';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-checkbox';
    checkbox.checked = selectedIds.has(c.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedIds.add(c.id);
        tr.classList.add('selected');
      } else {
        selectedIds.delete(c.id);
        tr.classList.remove('selected');
      }
      updateBulkBar();
      updateSelectAll();
    });
    tdCheck.appendChild(checkbox);

    const tdName = document.createElement('td');
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
    const phoneWrap = document.createElement('span');
    phoneWrap.className = 'phone-display';
    const phoneIcon = document.createElement('i');
    phoneIcon.className = 'fas fa-phone';
    phoneWrap.appendChild(phoneIcon);
    phoneWrap.appendChild(document.createTextNode(' ' + (c.telephone || '-')));
    tdTel.appendChild(phoneWrap);

    const tdEmail = document.createElement('td');
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
    badge.textContent = c.statut || 'Non défini';
    tdStatut.appendChild(badge);

    const tdTags = document.createElement('td');
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
    btnView.innerHTML = '<i class="fas fa-eye"></i>';
    btnView.addEventListener('click', () => viewContact(c));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action btn-action-edit';
    btnEdit.title = 'Modifier';
    btnEdit.innerHTML = '<i class="fas fa-pen"></i>';
    btnEdit.addEventListener('click', () => editContact(c));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-action btn-action-delete';
    btnDelete.title = 'Supprimer';
    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
    btnDelete.addEventListener('click', () => deleteContact(c.id));

    tdActions.appendChild(btnView);
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdCheck);
    tr.appendChild(tdName);
    tr.appendChild(tdTel);
    tr.appendChild(tdEmail);
    tr.appendChild(tdStatut);
    tr.appendChild(tdTags);
    tr.appendChild(tdActions);
    contactsBody.appendChild(tr);
  });

  updateBulkBar();
}

// ----- PAGINATION -----
function renderPagination(data) {
  let paginationEl = document.getElementById('contacts-pagination');
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'contacts-pagination';
    paginationEl.className = 'pagination';
    document.querySelector('.contacts-footer').appendChild(paginationEl);
  }

  if (!data.totalPages || data.totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const { page, totalPages, total, limit } = data;
  let html = '';

  html += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}"><i class="fas fa-chevron-left"></i></button>`;

  const range = [];
  range.push(1);
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    range.push(i);
  }
  if (totalPages > 1) range.push(totalPages);
  const unique = [...new Set(range)].sort((a, b) => a - b);

  let last = 0;
  unique.forEach(p => {
    if (p - last > 1) html += '<span class="pagination-info">...</span>';
    html += `<button class="pagination-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    last = p;
  });

  html += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}"><i class="fas fa-chevron-right"></i></button>`;
  html += `<span class="pagination-info">${(page - 1) * limit + 1}-${Math.min(page * limit, total)} sur ${total}</span>`;

  paginationEl.innerHTML = html;
  paginationEl.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p !== currentPage) {
        currentPage = p;
        loadContacts();
      }
    });
  });
}

// ----- SORTING -----
function setupSorting() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.order = 'asc';
      }
      currentPage = 1;
      updateSortIndicators();
      loadContacts();
    });
  });
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sorted');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.className = 'fas fa-sort sort-icon';
  });
  const active = document.querySelector(`th[data-sort="${currentSort.field}"]`);
  if (active) {
    active.classList.add('sorted');
    const icon = active.querySelector('.sort-icon');
    if (icon) icon.className = `fas fa-sort-${currentSort.order === 'asc' ? 'up' : 'down'} sort-icon`;
  }
}

// ----- BULK OPERATIONS -----
function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;
  if (selectedIds.size > 0) {
    bar.classList.add('visible');
    document.getElementById('bulk-count').textContent = `${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''} sélectionné${selectedIds.size > 1 ? 's' : ''}`;
  } else {
    bar.classList.remove('visible');
  }
}

function updateSelectAll() {
  const selectAll = document.getElementById('select-all-checkbox');
  if (!selectAll) return;
  const checkboxes = document.querySelectorAll('.row-checkbox');
  const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
  const someChecked = [...checkboxes].some(cb => cb.checked);
  selectAll.checked = allChecked;
  selectAll.indeterminate = someChecked && !allChecked;
}

async function bulkDelete() {
  if (!selectedIds.size) return;
  const confirmed = await showConfirm({
    title: 'Supprimer les contacts sélectionnés',
    message: `${selectedIds.size} contact(s) seront supprimés définitivement. Cette action est irréversible.`,
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    const res = await fetch('/api/contacts/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds] })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    selectedIds.clear();
    showToast(data.message, 'success');
    loadContacts();
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  }
}

function bulkExport() {
  if (!selectedIds.size) return;
  const selected = allContacts.filter(c => selectedIds.has(c.id));
  const headers = ['nom', 'prenom', 'telephone', 'email', 'adresse', 'dateNaissance', 'statut', 'tags', 'notes'];
  const escCSV = (val) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };
  let csv = headers.map(h => `"${h}"`).join(',') + '\n';
  selected.forEach(c => {
    csv += headers.map(h => escCSV(c[h])).join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `contacts_selection_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast(`${selected.length} contact(s) exporté(s)`, 'success');
}

// ----- CONTACT DETAIL VIEW -----
function viewContact(c) {
  let detailModal = document.getElementById('detail-modal');
  if (detailModal) detailModal.remove();

  detailModal = document.createElement('div');
  detailModal.id = 'detail-modal';
  detailModal.className = 'modal open detail-modal';

  const fields = [
    { icon: 'fa-phone', label: 'Téléphone', value: c.telephone },
    { icon: 'fa-envelope', label: 'Email', value: c.email },
    { icon: 'fa-map-marker-alt', label: 'Adresse', value: c.adresse, full: true },
    { icon: 'fa-calendar', label: 'Date de naissance', value: c.dateNaissance ? new Date(c.dateNaissance).toLocaleDateString('fr-FR') : null },
    { icon: 'fa-bookmark', label: 'Statut', value: c.statut },
    { icon: 'fa-tags', label: 'Tags', value: c.tags, full: true },
    { icon: 'fa-sticky-note', label: 'Notes', value: c.notes, full: true },
    { icon: 'fa-clock', label: 'Créé le', value: c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
    { icon: 'fa-sync', label: 'Modifié le', value: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
  ];

  const fieldsHtml = fields.map(f => `
    <div class="detail-field ${f.full ? 'full-width' : ''}">
      <div class="detail-label"><i class="fas ${f.icon}"></i> ${escHtml(f.label)}</div>
      <div class="detail-value ${!f.value ? 'empty' : ''}">${f.value ? (f.label === 'Statut' ? `<span class="status-badge ${escHtml(f.value)}">${escHtml(f.value)}</span>` : escHtml(f.value)) : 'Non renseigné'}</div>
    </div>
  `).join('');

  detailModal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <span class="modal-close" id="detail-close"><i class="fas fa-times"></i></span>
      <div class="detail-header">
        <div class="detail-avatar" style="background:${getAvatarColor(c.prenom + c.nom)}">
          ${getInitials(c.prenom, c.nom).toUpperCase()}
        </div>
        <div class="detail-identity">
          <h2>${escHtml(c.prenom)} ${escHtml(c.nom)}</h2>
          <span class="status-badge ${escHtml(c.statut || '')}">${escHtml(c.statut || 'Non défini')}</span>
        </div>
      </div>
      <div class="detail-grid">
        ${fieldsHtml}
      </div>
      <div class="detail-actions">
        <button class="btn-primary" id="detail-edit-btn"><i class="fas fa-pen"></i> Modifier</button>
        <button class="btn-danger" id="detail-delete-btn" style="padding:10px 22px;border-radius:10px;font-weight:600;font-size:0.875rem;font-family:inherit;display:inline-flex;align-items:center;gap:8px;"><i class="fas fa-trash"></i> Supprimer</button>
      </div>
    </div>
  `;

  document.body.appendChild(detailModal);

  detailModal.querySelector('#detail-close').addEventListener('click', () => detailModal.remove());
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.remove(); });
  detailModal.querySelector('#detail-edit-btn').addEventListener('click', () => {
    detailModal.remove();
    editContact(c);
  });
  detailModal.querySelector('#detail-delete-btn').addEventListener('click', async () => {
    detailModal.remove();
    await deleteContact(c.id);
  });

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape' && document.getElementById('detail-modal')) {
      detailModal.remove();
      document.removeEventListener('keydown', handler);
    }
  });
}

// ----- MODAL EDIT/CREATE -----
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
    modalSubmit.innerHTML = '<i class="fas fa-check"></i> Mettre à jour';
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

function editContact(c) {
  openModal('edit', c);
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
    showToast('Nom, prénom et téléphone sont obligatoires.', 'error');
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
    showToast(id ? 'Contact modifié' : 'Contact ajouté', 'success');
  } catch { showToast('Erreur lors de l\'enregistrement', 'error'); }
});

async function deleteContact(id) {
  const confirmed = await showConfirm({
    title: 'Supprimer ce contact',
    message: 'Ce contact sera supprimé définitivement. Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    loadContacts();
    showToast('Contact supprimé', 'success');
  } catch { showToast('Erreur suppression', 'error'); }
}

// ----- SEARCH & FILTER -----
const debouncedSearch = debounce(() => {
  currentPage = 1;
  loadContacts();
}, 300);

searchInput.addEventListener('input', debouncedSearch);
statusFilter.addEventListener('change', () => {
  currentPage = 1;
  loadContacts();
});

// ----- KEYBOARD SHORTCUTS -----
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape') closeModal();
});

// ----- SETUP SORTING & SELECT ALL -----
document.addEventListener('DOMContentLoaded', () => {
  setupSorting();

  const selectAll = document.getElementById('select-all-checkbox');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const checkboxes = document.querySelectorAll('.row-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const id = cb.closest('tr')?.dataset?.id;
        if (id) {
          if (selectAll.checked) selectedIds.add(id);
          else selectedIds.delete(id);
        }
      });
      if (selectAll.checked) {
        allContacts.forEach(c => selectedIds.add(c.id));
      } else {
        allContacts.forEach(c => selectedIds.delete(c.id));
      }
      updateBulkBar();
    });
  }

  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', bulkDelete);

  const bulkExportBtn = document.getElementById('bulk-export-btn');
  if (bulkExportBtn) bulkExportBtn.addEventListener('click', bulkExport);

  const deselectBtn = document.getElementById('bulk-deselect-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedIds.clear();
      document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
      updateBulkBar();
      updateSelectAll();
    });
  }
});
