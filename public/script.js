// ==================== ÉTAT ====================
let contacts = [];
let chartInstance = null;
let currentView = 'dashboard';
let editingId = null;

// ==================== DOM REFS ====================
const app = document.getElementById('app');
const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const pageTitle = document.getElementById('page-title');

// Setup admin
const setupForm = document.getElementById('setup-form');
const setupError = document.getElementById('setup-error');


// Navigation
const navLinks = document.querySelectorAll('.nav-link');
const views = {
  dashboard: document.getElementById('view-dashboard'),
  contacts: document.getElementById('view-contacts'),
  emails: document.getElementById('view-emails'),
  'import-export': document.getElementById('view-import-export')
};

// Dashboard elements
const statTotal = document.getElementById('stat-total');
const statMembers = document.getElementById('stat-members');
const statVolunteers = document.getElementById('stat-volunteers');
const statBoard = document.getElementById('stat-board');
const recentList = document.getElementById('recent-list');

// Contacts
const contactsBody = document.getElementById('contacts-body');
const searchInput = document.getElementById('search-contacts');
const statusFilter = document.getElementById('status-filter');
const addContactBtn = document.getElementById('add-contact-btn');

// Modal
const modal = document.getElementById('contact-modal');
const modalClose = document.querySelector('.modal-close');
const modalCloseBtn = document.querySelector('.modal-close-btn');
const modalTitle = document.getElementById('modal-title');
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

// Import/Export
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const importBtn = document.getElementById('import-btn');
const importStatus = document.getElementById('import-status');

// ==================== AUTH ====================
async function checkAdminExists() {
  try {
    const res = await fetch('/api/admin-exists');
    const data = await res.json();
    if (!data.exists) {
      loginScreen.style.display = 'none';
      app.style.display = 'none';
      setupScreen.style.display = 'flex';
      return false;
    }
    setupScreen.style.display = 'none';
    return true;
  } catch {
    showToast('Erreur de connexion au serveur', 'error');
    return true; // On tente le login par défaut si erreur
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      currentUserSpan.textContent = data.username;
      loginScreen.style.display = 'none';
      setupScreen.style.display = 'none';
      app.style.display = 'block';
      initApp();
    } else {
      const adminExists = await checkAdminExists();
      if (adminExists) {
        loginScreen.style.display = 'flex';
      }
      app.style.display = 'none';
    }
  } catch {
    const adminExists = await checkAdminExists();
    if (adminExists) {
      loginScreen.style.display = 'flex';
    } else {
      setupScreen.style.display = 'flex';
    }
    app.style.display = 'none';
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
      setupError.style.display = 'none';
      showToast('Administrateur créé ! Veuillez vous connecter.', 'success');
      setupScreen.style.display = 'none';
      loginScreen.style.display = 'flex';
    } else {
      const err = await res.json();
      setupError.textContent = err.message || 'Erreur de configuration';
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
      loginError.style.display = 'none';
      checkAuth();
    } else {
      const err = await res.json();
      loginError.textContent = err.message || 'Erreur';
      loginError.style.display = 'block';
    }
  } catch {
    loginError.textContent = 'Erreur réseau';
    loginError.style.display = 'block';
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  checkAuth();
});

// ==================== NAVIGATION ====================
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  currentView = view;
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === view));
  Object.keys(views).forEach(key => views[key].classList.toggle('active', key === view));
  const titles = { dashboard: 'Tableau de bord', contacts: 'Gestion des contacts', emails: 'Envoi d\'emails', 'import-export': 'Import / Export' };
  pageTitle.textContent = titles[view] || 'CRM';
  if (view === 'dashboard') loadDashboard();
  if (view === 'contacts') renderContacts();
  if (view === 'emails') loadEmailContacts();
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error();
    const stats = await res.json();
    statTotal.textContent = stats.total;
    statMembers.textContent = stats.statusCount['Membre'] || 0;
    statVolunteers.textContent = stats.statusCount['Bénévole'] || 0;
    statBoard.textContent = stats.statusCount['Bureau'] || 0;

    // Graphique
    const ctx = document.getElementById('statusChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.statusCount),
        datasets: [{
          data: Object.values(stats.statusCount),
          backgroundColor: ['#4f7df3', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // Derniers contacts
    recentList.innerHTML = stats.recent.map(c =>
      `<li><span>${c.prenom} ${c.nom}</span> <small>${new Date(c.createdAt).toLocaleDateString()}</small></li>`
    ).join('');
  } catch (err) {
    console.error('Dashboard error', err);
  }
}

// ==================== CONTACTS (CRUD + RENDER) ====================
async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) throw new Error();
    contacts = await res.json();
    renderContacts();
  } catch { showToast('Erreur chargement contacts', 'error'); }
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

  if (!filtered.length) {
    contactsBody.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fas fa-inbox"></i> Aucun contact</td></tr>`;
    return;
  }
  let html = '';
  filtered.forEach(c => {
    const tags = c.tags ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    html += `
      <tr>
        <td><strong>${esc(c.prenom)} ${esc(c.nom)}</strong></td>
        <td>${esc(c.telephone)}</td>
        <td>${esc(c.email)}</td>
        <td><span class="status-badge ${esc(c.statut)}">${esc(c.statut) || 'Non défini'}</span></td>
        <td>${tags.map(t => `<span class="status-badge" style="background:#e2e8f0;">${esc(t)}</span>`).join(' ')}</td>
        <td class="actions-cell">
          <button class="btn-secondary" onclick="viewContact('${c.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn-warning" onclick="editContact('${c.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-danger" onclick="deleteContact('${c.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
  contactsBody.innerHTML = html;
}

// Helper échappement
function esc(str) { if (!str) return ''; return String(str).replace(/[&<>"]/g, function(m) { if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; if(m==='"') return '&quot;'; return m; }); }

// ==================== MODAL (Ajout / Édition / Détail) ====================
function openModal(title, data = null) {
  modal.classList.add('open');
  modalTitle.innerHTML = title;
  if (data) {
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
    modalSubmit.innerHTML = '<i class="fas fa-save"></i> Modifier';
  } else {
    contactForm.reset();
    editIdInput.value = '';
    modalSubmit.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    fStatut.value = 'Membre';
  }
}

function closeModal() {
  modal.classList.remove('open');
}

modalClose.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

addContactBtn.addEventListener('click', () => openModal('<i class="fas fa-user-plus"></i> Nouveau contact'));

// Voir détail (lecture seule) -> on ouvre en mode édition mais on peut désactiver les champs ? On laisse éditable pour simplifier, mais on pourrait ajouter un mode lecture. Ici on ouvre en édition.
window.viewContact = (id) => {
  const c = contacts.find(c => c.id === id);
  if (c) openModal('<i class="fas fa-user-circle"></i> Détail du contact', c);
};

window.editContact = (id) => {
  const c = contacts.find(c => c.id === id);
  if (c) openModal('<i class="fas fa-pen"></i> Modifier le contact', c);
};

// Soumission du formulaire modal
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

// Supprimer
window.deleteContact = async (id) => {
  if (!confirm('Supprimer ce contact définitivement ?')) return;
  try {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    loadContacts();
    showToast('Contact supprimé', 'success');
  } catch { showToast('Erreur suppression', 'error'); }
};

// ==================== IMPORT / EXPORT ====================
exportBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/export');
    const data = await res.json();
    if (!data.length) { showToast('Aucun contact à exporter', 'error'); return; }
    // Conversion en CSV
    const headers = ['nom','prenom','telephone','email','adresse','dateNaissance','statut','tags','notes'];
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = data.map(c => headers.map(h => escapeCSV(c[h])));
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(row => csv += row.join(',') + '\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('Export réussi', 'success');
  } catch { showToast('Erreur export', 'error'); }
});

importBtn.addEventListener('click', async () => {
  const file = importFile.files[0];
  if (!file) { showToast('Sélectionnez un fichier CSV', 'error'); return; }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      if (results.errors.length) { showToast('Erreur de parsing', 'error'); return; }
      const contactsData = results.data.filter(row => row.nom && row.prenom && row.telephone);
      if (!contactsData.length) { showToast('Aucune donnée valide (nom, prenom, tel requis)', 'error'); return; }
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: contactsData })
        });
        if (!res.ok) throw new Error();
        const result = await res.json();
        showToast(result.message, 'success');
        loadContacts();
        importFile.value = '';
      } catch { showToast('Erreur import', 'error'); }
    }
  });
});

// ==================== TOAST / MESSAGES ====================
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

// ==================== FILTRES & RECHERCHE ====================
searchInput.addEventListener('input', renderContacts);
statusFilter.addEventListener('change', renderContacts);

// ==================== EMAILS ====================
const emailContactSelect = document.getElementById('email-contact-select');
const emailCustomAddress = document.getElementById('email-custom-address');
const emailSubject = document.getElementById('email-subject');
const emailBody = document.getElementById('email-body');
const emailPreview = document.getElementById('email-preview');
const togglePreviewBtn = document.getElementById('toggle-preview-btn');
const sendEmailBtn = document.getElementById('send-email-btn');

function loadEmailContacts() {
  emailContactSelect.innerHTML = '<option value="">-- Sélectionnez un contact --</option>';
  contacts.forEach(c => {
    if (c.email) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom} (${c.email})`;
      emailContactSelect.appendChild(opt);
    }
  });
}

togglePreviewBtn.addEventListener('click', () => {
  const isPreview = emailPreview.style.display === 'block';
  if (isPreview) {
    emailPreview.style.display = 'none';
    emailBody.style.display = 'block';
    togglePreviewBtn.textContent = 'Aperçu HTML';
  } else {
    emailPreview.innerHTML = DOMPurify.sanitize(emailBody.value);
    emailPreview.style.display = 'block';
    emailBody.style.display = 'none';
    togglePreviewBtn.textContent = 'Retour au code';
  }
});

sendEmailBtn.addEventListener('click', async () => {
  const contactId = emailContactSelect.value;
  const email = emailCustomAddress.value.trim();
  const subject = emailSubject.value.trim();
  const html = emailBody.value;

  if (!subject || !html) {
    showToast('Le sujet et le corps du message sont obligatoires', 'error');
    return;
  }
  if (!contactId && !email) {
    showToast('Veuillez sélectionner un contact ou saisir un email', 'error');
    return;
  }

  sendEmailBtn.disabled = true;
  sendEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId, email, subject, html })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur d\'envoi');
    showToast(data.message, 'success');
    // Optionnel: on pourrait vider le formulaire ici
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    sendEmailBtn.disabled = false;
    sendEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer l\'email';
  }
});

// ==================== INIT ====================
async function initApp() {
  await loadContacts();
  switchView('dashboard');
}

checkAuth();
