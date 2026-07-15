let allEvents = [];
let allExposants = [];

const eventsGrid = document.getElementById('events-grid');
const addEventBtn = document.getElementById('add-event-btn');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const evId = document.getElementById('ev-id');
const evNom = document.getElementById('ev-nom');
const evDateDebut = document.getElementById('ev-dateDebut');
const evDateFin = document.getElementById('ev-dateFin');
const evLieu = document.getElementById('ev-lieu');
const evMaxExposants = document.getElementById('ev-maxExposants');
const evDescription = document.getElementById('ev-description');
const eventModalTitle = document.getElementById('event-modal-title');

const eventFilter = document.getElementById('event-filter');
const statutFilter = document.getElementById('statut-filter');
const exposantsBody = document.getElementById('exposants-body');
const exposantsGrid = document.getElementById('exposants-grid');

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('exposants', user.username, user.role);

  await loadEvents();
  await loadExposants();
})();

// ----- ÉVÉNEMENTS -----
async function loadEvents() {
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error();
    allEvents = await res.json();
    renderEvents();
    renderEventFilter();
  } catch {
    showToast('Erreur chargement des événements', 'error');
  }
}

function renderEvents() {
  eventsGrid.innerHTML = '';

  if (!allEvents.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-icon"><i class="fas fa-calendar-days"></i></div>
      <h4>Aucun événement</h4>
      <p>Créez un événement pour ouvrir les inscriptions exposants</p>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.innerHTML = '<i class="fas fa-plus"></i> Nouvel événement';
    btn.addEventListener('click', () => openEventModal('new', null));
    empty.appendChild(btn);
    eventsGrid.appendChild(empty);
    return;
  }

  allEvents.forEach(ev => {
    const card = document.createElement('div');
    card.className = `event-card ${ev.inscriptionsOuvertes ? '' : 'closed'}`;

    const top = document.createElement('div');
    top.className = 'event-card-top';
    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'event-card-title';
    title.textContent = ev.nom;
    const dates = document.createElement('div');
    dates.className = 'event-card-dates';
    dates.innerHTML = `<i class="fas fa-calendar"></i> ${formatDateRange(ev.dateDebut, ev.dateFin)}`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(dates);

    const pill = document.createElement('span');
    pill.className = `event-status-pill ${ev.inscriptionsOuvertes ? 'open' : 'closed'}`;
    pill.textContent = ev.inscriptionsOuvertes ? 'Ouvert' : 'Fermé';

    top.appendChild(titleWrap);
    top.appendChild(pill);

    const meta = document.createElement('div');
    meta.className = 'event-card-meta';
    if (ev.lieu) {
      const lieu = document.createElement('span');
      lieu.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${escHtml(ev.lieu)}`;
      meta.appendChild(lieu);
    }
    if (ev.maxExposants) {
      const max = document.createElement('span');
      max.innerHTML = `<i class="fas fa-users"></i> Max ${ev.maxExposants} exposants`;
      meta.appendChild(max);
    }

    const counts = document.createElement('div');
    counts.className = 'event-card-counts';
    counts.innerHTML = `
      <div class="event-count-chip"><strong>${ev.exposantsCount}</strong><span>Inscrits</span></div>
      <div class="event-count-chip pending"><strong>${ev.exposantsEnAttente}</strong><span>En attente</span></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'event-card-actions';

    const linkBtn = document.createElement('button');
    linkBtn.className = 'btn-secondary event-link-btn';
    linkBtn.innerHTML = '<i class="fas fa-link"></i> Copier le lien';
    linkBtn.addEventListener('click', () => copyRegistrationLink(ev.id));

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-action btn-action-view';
    toggleBtn.title = ev.inscriptionsOuvertes ? 'Fermer les inscriptions' : 'Ouvrir les inscriptions';
    toggleBtn.innerHTML = `<i class="fas ${ev.inscriptionsOuvertes ? 'fa-lock' : 'fa-lock-open'}"></i>`;
    toggleBtn.addEventListener('click', () => toggleEventOpen(ev));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-action-edit';
    editBtn.title = 'Modifier';
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
    editBtn.addEventListener('click', () => openEventModal('edit', ev));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action btn-action-delete';
    deleteBtn.title = 'Supprimer';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', () => deleteEvent(ev));

    actions.appendChild(linkBtn);
    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(top);
    if (ev.description) {
      const desc = document.createElement('p');
      desc.style.cssText = 'font-size:0.82rem;color:var(--gray-500);margin:0;';
      desc.textContent = ev.description;
      card.appendChild(desc);
    }
    card.appendChild(meta);
    card.appendChild(counts);
    card.appendChild(actions);
    eventsGrid.appendChild(card);
  });
}

function formatDateRange(start, end) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const s = start ? new Date(start).toLocaleDateString('fr-FR', opts) : '';
  const e = end ? new Date(end).toLocaleDateString('fr-FR', opts) : '';
  return e && e !== s ? `${s} → ${e}` : s;
}

function copyRegistrationLink(eventId) {
  const url = `${location.origin}/exposant-inscription.html?event=${eventId}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Lien copié dans le presse-papiers', 'success'))
    .catch(() => showToast(url, 'info'));
}

async function toggleEventOpen(ev) {
  try {
    const res = await fetch(`/api/events/${ev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inscriptionsOuvertes: !ev.inscriptionsOuvertes })
    });
    if (!res.ok) throw new Error();
    showToast(ev.inscriptionsOuvertes ? 'Inscriptions fermées' : 'Inscriptions ouvertes', 'success');
    loadEvents();
  } catch {
    showToast('Erreur lors de la mise à jour', 'error');
  }
}

async function deleteEvent(ev) {
  const confirmed = await showConfirm({
    title: 'Supprimer cet événement',
    message: `"${ev.nom}" et toutes ses inscriptions exposants (${ev.exposantsCount}) seront supprimés définitivement.`,
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/events/${ev.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Événement supprimé', 'success');
    loadEvents();
    loadExposants();
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  }
}

function openEventModal(mode, data) {
  eventModal.classList.add('open');
  eventForm.reset();
  if (mode === 'new') {
    eventModalTitle.textContent = 'Nouvel événement';
    evId.value = '';
  } else {
    eventModalTitle.textContent = 'Modifier l\'événement';
    evId.value = data.id;
    evNom.value = data.nom || '';
    evDateDebut.value = data.dateDebut || '';
    evDateFin.value = data.dateFin || '';
    evLieu.value = data.lieu || '';
    evMaxExposants.value = data.maxExposants || '';
    evDescription.value = data.description || '';
  }
}

function closeEventModal() { eventModal.classList.remove('open'); }

addEventBtn.addEventListener('click', () => openEventModal('new', null));
eventModal.querySelector('.modal-close').addEventListener('click', closeEventModal);
eventModal.querySelector('.modal-close-btn').addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (e) => { if (e.target === eventModal) closeEventModal(); });

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nom: evNom.value.trim(),
    dateDebut: evDateDebut.value,
    dateFin: evDateFin.value,
    lieu: evLieu.value.trim(),
    maxExposants: evMaxExposants.value,
    description: evDescription.value.trim()
  };
  const id = evId.value;
  try {
    const res = id
      ? await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      : await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error();
    closeEventModal();
    showToast(id ? 'Événement modifié' : 'Événement créé', 'success');
    loadEvents();
  } catch {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
});

// ----- INSCRIPTIONS EXPOSANTS -----
function renderEventFilter() {
  const current = eventFilter.value;
  eventFilter.innerHTML = '<option value="">Tous les événements</option>' +
    allEvents.map(ev => `<option value="${ev.id}">${escHtml(ev.nom)}</option>`).join('');
  eventFilter.value = current;
}

async function loadExposants() {
  try {
    const params = new URLSearchParams();
    if (eventFilter.value) params.set('eventId', eventFilter.value);
    if (statutFilter.value) params.set('statut', statutFilter.value);
    const res = await fetch(`/api/exposants?${params}`);
    if (!res.ok) throw new Error();
    allExposants = await res.json();
    renderExposantsTable();
    renderExposantsGrid();
  } catch {
    showToast('Erreur chargement des inscriptions', 'error');
  }
}

function eventName(eventId) {
  const ev = allEvents.find(e => e.id === eventId);
  return ev ? ev.nom : 'Événement supprimé';
}

function statutLabel(statut) {
  return { en_attente: 'En attente', valide: 'Validé', refuse: 'Refusé' }[statut] || statut;
}

function buildExposantsEmptyState() {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  wrap.innerHTML = `
    <div class="empty-state-icon"><i class="fas fa-store"></i></div>
    <h4>Aucune inscription</h4>
    <p>Les demandes des exposants apparaîtront ici</p>
  `;
  return wrap;
}

function renderExposantsTable() {
  exposantsBody.innerHTML = '';

  if (!allExposants.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.appendChild(buildExposantsEmptyState());
    tr.appendChild(td);
    exposantsBody.appendChild(tr);
    return;
  }

  allExposants.forEach(x => {
    const tr = document.createElement('tr');

    const tdEntreprise = document.createElement('td');
    tdEntreprise.innerHTML = `<span class="contact-fullname">${escHtml(x.entreprise)}</span>`;
    if (x.typeActivite) tdEntreprise.innerHTML += ` <span class="tag-badge tag-badge-5">${escHtml(x.typeActivite)}</span>`;
    if (x.activite) tdEntreprise.innerHTML += `<br><span class="contact-address">${escHtml(x.activite)}</span>`;

    const tdContact = document.createElement('td');
    tdContact.innerHTML = escHtml(x.contactNom);
    if (x.email) tdContact.innerHTML += `<br><span class="email-display"><i class="fas fa-envelope"></i> ${escHtml(x.email)}</span>`;

    const tdTel = document.createElement('td');
    tdTel.innerHTML = `<span class="phone-display"><i class="fas fa-phone"></i> ${escHtml(x.telephone)}</span>`;

    const tdEvent = document.createElement('td');
    tdEvent.textContent = eventName(x.eventId);

    const tdStatut = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${x.statut}`;
    badge.textContent = statutLabel(x.statut);
    tdStatut.appendChild(badge);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';
    tdActions.appendChild(buildExposantActions(x));

    tr.appendChild(tdEntreprise);
    tr.appendChild(tdContact);
    tr.appendChild(tdTel);
    tr.appendChild(tdEvent);
    tr.appendChild(tdStatut);
    tr.appendChild(tdActions);
    exposantsBody.appendChild(tr);
  });
}

function buildExposantActions(x) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

  if (x.statut !== 'valide') {
    const btn = document.createElement('button');
    btn.className = 'btn-action btn-action-view';
    btn.title = 'Valider';
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.addEventListener('click', () => updateExposantStatut(x.id, 'valide'));
    wrap.appendChild(btn);
  }
  if (x.statut !== 'refuse') {
    const btn = document.createElement('button');
    btn.className = 'btn-action btn-action-edit';
    btn.title = 'Refuser';
    btn.innerHTML = '<i class="fas fa-ban"></i>';
    btn.addEventListener('click', () => updateExposantStatut(x.id, 'refuse'));
    wrap.appendChild(btn);
  }
  const del = document.createElement('button');
  del.className = 'btn-action btn-action-delete';
  del.title = 'Supprimer';
  del.innerHTML = '<i class="fas fa-trash"></i>';
  del.addEventListener('click', () => deleteExposant(x.id));
  wrap.appendChild(del);

  return wrap;
}

function renderExposantsGrid() {
  exposantsGrid.innerHTML = '';

  if (!allExposants.length) {
    exposantsGrid.appendChild(buildExposantsEmptyState());
    return;
  }

  allExposants.forEach(x => {
    const card = document.createElement('div');
    card.className = 'contact-card';

    const top = document.createElement('div');
    top.className = 'contact-card-top';
    const avatar = document.createElement('div');
    avatar.className = 'contact-avatar';
    avatar.style.background = getAvatarColorFallback(x.entreprise);
    avatar.textContent = (x.entreprise || '?').slice(0, 2).toUpperCase();
    const identity = document.createElement('div');
    identity.className = 'contact-card-identity';
    const nameEl = document.createElement('span');
    nameEl.className = 'contact-fullname';
    nameEl.textContent = x.entreprise;
    const badge = document.createElement('span');
    badge.className = `status-badge ${x.statut}`;
    badge.textContent = statutLabel(x.statut);
    identity.appendChild(nameEl);
    identity.appendChild(badge);
    top.appendChild(avatar);
    top.appendChild(identity);

    const body = document.createElement('div');
    body.className = 'contact-card-body';
    body.innerHTML = `
      <span class="phone-display"><i class="fas fa-phone"></i> ${escHtml(x.telephone)}</span>
      ${x.email ? `<span class="email-display"><i class="fas fa-envelope"></i> ${escHtml(x.email)}</span>` : ''}
      <span class="phone-display"><i class="fas fa-calendar"></i> ${escHtml(eventName(x.eventId))}</span>
      ${x.typeActivite ? `<span class="tag-badge tag-badge-5">${escHtml(x.typeActivite)}</span>` : ''}
    `;

    const actions = document.createElement('div');
    actions.className = 'contact-card-actions';
    actions.appendChild(buildExposantActions(x));

    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);
    exposantsGrid.appendChild(card);
  });
}

function getAvatarColorFallback(name) {
  const colors = ['#0e7490', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2', '#ec4899', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

async function updateExposantStatut(id, statut) {
  try {
    const res = await fetch(`/api/exposants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    });
    if (!res.ok) throw new Error();
    showToast('Statut mis à jour', 'success');
    loadExposants();
    loadEvents();
  } catch {
    showToast('Erreur lors de la mise à jour', 'error');
  }
}

async function deleteExposant(id) {
  const confirmed = await showConfirm({
    title: 'Supprimer cette inscription',
    message: 'Cette inscription sera supprimée définitivement.',
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/exposants/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Inscription supprimée', 'success');
    loadExposants();
    loadEvents();
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  }
}

eventFilter.addEventListener('change', loadExposants);
statutFilter.addEventListener('change', loadExposants);
