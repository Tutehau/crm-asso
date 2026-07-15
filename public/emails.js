let contacts = [];
let emailHistory = [];
let currentRecipientMode = 'single';
let groupRecipients = [];

const emailContactSelect = document.getElementById('email-contact-select');
const emailCustomAddress = document.getElementById('email-custom-address');
const emailSubject = document.getElementById('email-subject');
const emailBody = document.getElementById('email-body');
const emailPreview = document.getElementById('email-preview');
const togglePreviewBtn = document.getElementById('toggle-preview-btn');
const previewIcon = document.getElementById('preview-icon');
const previewLabel = document.getElementById('preview-label');
const sendEmailBtn = document.getElementById('send-email-btn');
const emailStatus = document.getElementById('email-status');
const draftIndicator = document.getElementById('draft-indicator');

const DRAFT_KEY = 'crm-email-draft';

const templates = {
  welcome: {
    subject: 'Bienvenue au sein de notre association !',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Bienvenue parmi nous !</h2>
  <p>Nous sommes ravis de vous accueillir au sein de notre association.</p>
  <p>Votre engagement est précieux et nous avons hâte de collaborer avec vous pour mener à bien nos projets communs.</p>
  <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
  <p>À très bientôt,<br><strong>L'équipe administrative</strong></p>
</div>`
  },
  meeting: {
    subject: 'Convocation : Prochaine réunion de l\'association',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Réunion à venir</h2>
  <p>Bonjour,</p>
  <p>Nous vous informons de la tenue de notre prochaine réunion :</p>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #2c3e50; margin: 20px 0;">
    <p><strong>📅 Date :</strong> [DATE]</p>
    <p><strong>📍 Lieu :</strong> [LIEU]</p>
    <p><strong>📝 Ordre du jour :</strong> [SUJET]</p>
  </div>
  <p>Merci de confirmer votre présence par retour d'email.</p>
  <p>Cordialement,<br><strong>Le Bureau</strong></p>
</div>`
  },
  reminder: {
    subject: 'Rappel : [Sujet du rappel]',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Rappel important</h2>
  <p>Bonjour,</p>
  <p>Ce message est un rappel concernant :</p>
  <p style="font-size: 1.1em; font-weight: 500; color: #e67e22; margin: 20px 0;"><strong>[Sujet du rappel]</strong></p>
  <p>Merci de faire le nécessaire dans les meilleurs délais.</p>
  <p>Cordialement,<br><strong>L'équipe</strong></p>
</div>`
  },
  event: {
    subject: '🎉 Invitation : [Nom de l\'événement]',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #0e7490;">🎉 Vous êtes invité(e) !</h2>
  <p>Bonjour,</p>
  <p>Nous avons le plaisir de vous inviter à notre prochain événement :</p>
  <div style="background: linear-gradient(135deg, #f0f0ff, #fff); padding: 20px; border-radius: 12px; border: 1px solid #e0e0ff; margin: 20px 0; text-align: center;">
    <h3 style="color: #0e7490; margin-bottom: 12px;">[NOM DE L'ÉVÉNEMENT]</h3>
    <p>📅 <strong>[DATE]</strong></p>
    <p>📍 <strong>[LIEU]</strong></p>
    <p>🕐 <strong>[HEURE]</strong></p>
  </div>
  <p style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 32px; background: #0e7490; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Confirmer ma présence</a>
  </p>
  <p>Au plaisir de vous y retrouver !</p>
  <p>Cordialement,<br><strong>L'équipe organisatrice</strong></p>
</div>`
  },
  newsletter: {
    subject: '📬 Newsletter de [Mois] — Les nouvelles de l\'association',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <div style="background: #2c3e50; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 1.5em;">📬 Newsletter</h1>
    <p style="opacity: 0.8; margin: 8px 0 0;">[Mois Année]</p>
  </div>
  <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #2c3e50; border-bottom: 2px solid #0e7490; padding-bottom: 8px;">📌 À la une</h2>
    <p>[Votre actualité principale ici]</p>

    <h2 style="color: #2c3e50; border-bottom: 2px solid #10b981; padding-bottom: 8px;">📅 Agenda</h2>
    <ul>
      <li><strong>[Date]</strong> — [Événement 1]</li>
      <li><strong>[Date]</strong> — [Événement 2]</li>
    </ul>

    <h2 style="color: #2c3e50; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">💡 Le saviez-vous ?</h2>
    <p>[Fait intéressant ou annonce]</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="text-align: center; font-size: 0.85em; color: #999;">
      Vous recevez cet email car vous êtes membre de notre association.
    </p>
  </div>
</div>`
  },
  thankyou: {
    subject: '🙏 Merci pour votre engagement !',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #10b981;">🙏 Un grand merci !</h2>
  <p>Bonjour,</p>
  <p>Nous tenons à vous adresser nos plus sincères remerciements pour <strong>[votre participation / votre don / votre engagement]</strong>.</p>
  <p>Grâce à des personnes comme vous, notre association peut continuer à [mission de l'association].</p>
  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
    <p style="margin: 0;"><strong>Votre impact :</strong> [Détails concrets de la contribution]</p>
  </div>
  <p>Nous restons à votre disposition pour tout échange.</p>
  <p>Chaleureusement,<br><strong>L'équipe de l'association</strong></p>
</div>`
  }
};

// ----- INIT -----
(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('emails', user.username, user.role);
  await Promise.all([loadEmailContacts(), loadEmailStats(), loadEmailHistory()]);
  setupTabs();
  setupRecipientModes();
  setupTemplates();
  setupFormatToolbar();
  setupPreviewToggle();
  setupSending();
  setupDraftAutoSave();
  restoreDraft();
  setupHistorySearch();
})();

// ----- LOAD DATA -----
async function loadEmailContacts() {
  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) return;
    contacts = await res.json();
    if (Array.isArray(contacts)) {
      emailContactSelect.innerHTML = '<option value="">-- Choisir un contact --</option>';
      contacts.forEach(c => {
        if (c.email) {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.prenom} ${c.nom} (${c.email})`;
          emailContactSelect.appendChild(opt);
        }
      });
      buildGroupSelect();
    }
  } catch {}
}

async function loadEmailStats() {
  try {
    const res = await fetch('/api/emails/stats');
    if (!res.ok) return;
    const stats = await res.json();
    document.getElementById('es-total').textContent = stats.total;
    document.getElementById('es-sent').textContent = stats.sent;
    document.getElementById('es-failed').textContent = stats.failed;
    document.getElementById('es-month').textContent = stats.thisMonth;
  } catch {}
}

async function loadEmailHistory() {
  try {
    const res = await fetch('/api/emails');
    if (!res.ok) return;
    emailHistory = await res.json();
    document.getElementById('history-count').textContent = emailHistory.length;
    renderHistory(emailHistory);
  } catch {}
}

// ----- TABS -----
function setupTabs() {
  document.querySelectorAll('.email-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.email-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('compose-view').classList.toggle('active', target === 'compose');
      document.getElementById('history-view').classList.toggle('active', target === 'history');
      if (target === 'history') loadEmailHistory();
    });
  });
}

// ----- RECIPIENT MODES -----
function setupRecipientModes() {
  document.querySelectorAll('.recipient-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.recipient-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRecipientMode = btn.dataset.mode;

      document.getElementById('recipient-single').style.display = currentRecipientMode === 'single' ? 'block' : 'none';
      document.getElementById('recipient-group').style.display = currentRecipientMode === 'group' ? 'block' : 'none';
      document.getElementById('recipient-manual').style.display = currentRecipientMode === 'manual' ? 'block' : 'none';
    });
  });
}

function buildGroupSelect() {
  const container = document.getElementById('group-select');
  if (!container) return;

  const groups = {};
  contacts.forEach(c => {
    if (c.email) {
      const s = c.statut || 'Autre';
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    }
  });

  const icons = {
    'Membre': 'fa-id-card',
    'Benevole': 'fa-hand-holding-heart',
    'Bénévole': 'fa-hand-holding-heart',
    'Bureau': 'fa-crown',
    'Supporter': 'fa-heart',
    'Autre': 'fa-user'
  };

  container.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'group-badge';
  allBtn.innerHTML = `<i class="fas fa-users"></i> Tous <span class="group-badge-count">${contacts.filter(c => c.email).length}</span>`;
  allBtn.addEventListener('click', () => selectGroup('all', contacts.filter(c => c.email)));
  container.appendChild(allBtn);

  Object.entries(groups).forEach(([name, members]) => {
    const btn = document.createElement('button');
    btn.className = 'group-badge';
    btn.innerHTML = `<i class="fas ${icons[name] || 'fa-user'}"></i> ${escHtml(name)} <span class="group-badge-count">${members.length}</span>`;
    btn.addEventListener('click', () => selectGroup(name, members));
    container.appendChild(btn);
  });
}

function selectGroup(name, members) {
  groupRecipients = members.map(c => ({
    contactId: c.id,
    email: c.email,
    name: `${c.prenom} ${c.nom}`
  }));
  renderGroupChips();
}

function renderGroupChips() {
  const container = document.getElementById('group-chips');
  container.innerHTML = '';

  if (!groupRecipients.length) {
    container.innerHTML = '<span style="font-size:0.8rem;color:var(--gray-400);">Sélectionnez un groupe ci-dessus</span>';
    return;
  }

  groupRecipients.forEach((r, idx) => {
    const chip = document.createElement('span');
    chip.className = 'recipient-chip';
    chip.innerHTML = `
      ${escHtml(r.name)}
      <span class="recipient-chip-remove" data-idx="${idx}"><i class="fas fa-times"></i></span>
    `;
    container.appendChild(chip);
  });

  container.querySelectorAll('.recipient-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      groupRecipients.splice(idx, 1);
      renderGroupChips();
    });
  });
}

// ----- TEMPLATES -----
function setupTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.template;
      const tpl = templates[key];
      if (tpl) {
        emailSubject.value = tpl.subject;
        emailBody.value = tpl.body;
        updateStatus('draft');
        saveDraft();
      }
    });
  });
}

// ----- FORMAT TOOLBAR -----
function setupFormatToolbar() {
  const insertions = {
    bold: { before: '<strong>', after: '</strong>', placeholder: 'texte en gras' },
    italic: { before: '<em>', after: '</em>', placeholder: 'texte en italique' },
    underline: { before: '<u>', after: '</u>', placeholder: 'texte souligné' },
    h1: { before: '<h2 style="color: #2c3e50;">', after: '</h2>', placeholder: 'Titre' },
    p: { before: '<p>', after: '</p>', placeholder: 'Votre texte ici' },
    ul: { before: '<ul>\n  <li>', after: '</li>\n  <li>Élément 2</li>\n</ul>', placeholder: 'Élément 1' },
    link: { before: '<a href="URL" style="color: #0e7490;">', after: '</a>', placeholder: 'Texte du lien' },
    image: { before: '<img src="', after: '" alt="description" style="max-width: 100%; border-radius: 8px;" />', placeholder: 'URL de l\'image' },
    hr: { before: '', after: '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />', placeholder: '' },
    color: { before: '<span style="color: #0e7490;">', after: '</span>', placeholder: 'texte coloré' },
    button: { before: '<a href="URL" style="display: inline-block; padding: 12px 28px; background: #0e7490; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">', after: '</a>', placeholder: 'Texte du bouton' },
  };

  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.insert;
      const ins = insertions[type];
      if (!ins) return;

      const start = emailBody.selectionStart;
      const end = emailBody.selectionEnd;
      const text = emailBody.value;
      const selected = text.substring(start, end) || ins.placeholder;

      const replacement = ins.before + selected + ins.after;
      emailBody.value = text.substring(0, start) + replacement + text.substring(end);

      const cursorPos = start + ins.before.length + selected.length;
      emailBody.setSelectionRange(cursorPos, cursorPos);
      emailBody.focus();
      updateStatus('draft');
      saveDraft();
    });
  });
}

// ----- PREVIEW -----
function setupPreviewToggle() {
  togglePreviewBtn.addEventListener('click', () => {
    const isPreview = emailPreview.style.display === 'block';
    if (isPreview) {
      emailPreview.style.display = 'none';
      emailBody.style.display = 'block';
      previewIcon.className = 'fas fa-eye';
      previewLabel.textContent = 'Aperçu';
      togglePreviewBtn.classList.remove('active');
    } else {
      emailPreview.innerHTML = DOMPurify.sanitize(emailBody.value);
      emailPreview.style.display = 'block';
      emailBody.style.display = 'none';
      previewIcon.className = 'fas fa-code';
      previewLabel.textContent = 'Code';
      togglePreviewBtn.classList.add('active');
    }
  });
}

// ----- STATUS -----
function updateStatus(state) {
  const icon = emailStatus.querySelector('i');
  const span = emailStatus.querySelector('span');
  emailStatus.className = 'email-status';
  if (state === 'draft') {
    icon.className = 'fas fa-circle';
    span.textContent = 'Brouillon';
    emailStatus.classList.add('status-draft');
  } else if (state === 'sending') {
    icon.className = 'fas fa-spinner fa-spin';
    span.textContent = 'Envoi...';
    emailStatus.classList.add('status-sending');
  } else if (state === 'sent') {
    icon.className = 'fas fa-check-circle';
    span.textContent = 'Envoyé';
    emailStatus.classList.add('status-sent');
  } else if (state === 'error') {
    icon.className = 'fas fa-exclamation-circle';
    span.textContent = 'Erreur';
    emailStatus.classList.add('status-error');
  }
}

// ----- DRAFT AUTO-SAVE -----
function setupDraftAutoSave() {
  const save = debounce(() => saveDraft(), 1000);
  emailBody.addEventListener('input', () => { updateStatus('draft'); save(); });
  emailSubject.addEventListener('input', () => { updateStatus('draft'); save(); });
}

function saveDraft() {
  const draft = {
    subject: emailSubject.value,
    body: emailBody.value,
    contactId: emailContactSelect.value,
    customEmail: emailCustomAddress.value,
    mode: currentRecipientMode,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  draftIndicator.style.display = 'flex';
  setTimeout(() => { draftIndicator.style.display = 'none'; }, 2000);
}

function restoreDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    const draft = JSON.parse(saved);
    if (draft.subject) emailSubject.value = draft.subject;
    if (draft.body) emailBody.value = draft.body;
    if (draft.contactId) emailContactSelect.value = draft.contactId;
    if (draft.customEmail) emailCustomAddress.value = draft.customEmail;
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  emailSubject.value = '';
  emailBody.value = '';
  emailContactSelect.value = '';
  emailCustomAddress.value = '';
  groupRecipients = [];
  renderGroupChips();
  updateStatus('draft');
  showToast('Brouillon effacé', 'info');
}

// ----- SENDING -----
function setupSending() {
  document.getElementById('clear-draft-btn').addEventListener('click', clearDraft);

  sendEmailBtn.addEventListener('click', async () => {
    const subject = emailSubject.value.trim();
    const html = emailBody.value;

    if (!subject || !html) {
      showToast('Le sujet et le corps du message sont obligatoires', 'error');
      return;
    }

    if (currentRecipientMode === 'group') {
      await sendBulkEmail(subject, html);
    } else {
      await sendSingleEmail(subject, html);
    }
  });
}

async function sendSingleEmail(subject, html) {
  const contactId = currentRecipientMode === 'single' ? emailContactSelect.value : '';
  const email = currentRecipientMode === 'manual' ? emailCustomAddress.value.trim() : '';

  if (!contactId && !email) {
    showToast('Sélectionnez un contact ou saisissez un email', 'error');
    return;
  }

  sendEmailBtn.disabled = true;
  updateStatus('sending');
  showSendingOverlay('Envoi en cours...', 0);

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId, email, subject, html })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur d\'envoi');

    updateSendingProgress(100);
    setTimeout(() => {
      hideSendingOverlay();
      showToast(data.message, 'success');
      updateStatus('sent');
      clearDraft();
      loadEmailStats();
      loadEmailHistory();
    }, 500);
  } catch (err) {
    hideSendingOverlay();
    showToast(err.message, 'error');
    updateStatus('error');
  } finally {
    sendEmailBtn.disabled = false;
  }
}

async function sendBulkEmail(subject, html) {
  if (!groupRecipients.length) {
    showToast('Sélectionnez un groupe de destinataires', 'error');
    return;
  }

  const confirmed = await showConfirm({
    title: `Envoi groupé — ${groupRecipients.length} destinataire(s)`,
    message: `Le message "${subject}" sera envoyé individuellement à ${groupRecipients.length} personne(s). Chaque envoi est séparé.`,
    confirmText: `Envoyer à ${groupRecipients.length} personne(s)`,
    type: 'warning'
  });
  if (!confirmed) return;

  sendEmailBtn.disabled = true;
  updateStatus('sending');
  showSendingOverlay(`Envoi à ${groupRecipients.length} destinataire(s)...`, 0);

  try {
    const res = await fetch('/api/send-bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients: groupRecipients, subject, html })
    });
    const data = await res.json();

    updateSendingProgress(100);
    setTimeout(() => {
      hideSendingOverlay();
      if (data.failCount > 0) {
        showToast(`${data.sentCount} envoyé(s), ${data.failCount} échec(s)`, data.sentCount > 0 ? 'info' : 'error');
      } else {
        showToast(data.message, 'success');
      }
      updateStatus(data.failCount > 0 && data.sentCount === 0 ? 'error' : 'sent');
      clearDraft();
      loadEmailStats();
      loadEmailHistory();
    }, 500);
  } catch (err) {
    hideSendingOverlay();
    showToast(err.message || 'Erreur lors de l\'envoi groupé', 'error');
    updateStatus('error');
  } finally {
    sendEmailBtn.disabled = false;
  }
}

// ----- SENDING OVERLAY -----
function showSendingOverlay(text, progress) {
  const overlay = document.getElementById('sending-overlay');
  document.getElementById('sending-text').textContent = text;
  document.getElementById('sending-progress').style.width = progress + '%';
  overlay.style.display = 'flex';
}

function updateSendingProgress(progress) {
  document.getElementById('sending-progress').style.width = progress + '%';
}

function hideSendingOverlay() {
  document.getElementById('sending-overlay').style.display = 'none';
}

// ----- EMAIL HISTORY -----
function renderHistory(emails) {
  const list = document.getElementById('email-history-list');

  if (!emails.length) {
    list.innerHTML = `
      <div class="email-history-empty">
        <i class="fas fa-inbox"></i>
        <h4>Aucun email envoyé</h4>
        <p>Vos emails envoyés apparaîtront ici</p>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  emails.forEach(email => {
    const item = document.createElement('div');
    item.className = 'email-history-item';

    const dateStr = new Date(email.sentAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    item.innerHTML = `
      <div class="email-history-status ${email.status}"></div>
      <div class="email-history-info">
        <div class="email-history-subject">${escHtml(email.subject)}</div>
        <div class="email-history-meta">
          <span><i class="fas fa-user"></i>${escHtml(email.recipientName || email.to)}</span>
          <span><i class="fas fa-at"></i>${escHtml(email.to)}</span>
          ${email.sentBy ? `<span><i class="fas fa-paper-plane"></i>${escHtml(email.sentBy)}</span>` : ''}
        </div>
      </div>
      <div class="email-history-date">${dateStr}</div>
      <div class="email-history-actions">
        <button class="btn-action btn-action-view" title="Voir"><i class="fas fa-eye"></i></button>
        <button class="btn-action btn-action-edit" title="Réutiliser"><i class="fas fa-copy"></i></button>
        <button class="btn-action btn-action-delete" title="Supprimer"><i class="fas fa-trash"></i></button>
      </div>
    `;

    const [viewBtn, reuseBtn, deleteBtn] = item.querySelectorAll('.btn-action');
    viewBtn.addEventListener('click', (e) => { e.stopPropagation(); viewEmail(email); });
    reuseBtn.addEventListener('click', (e) => { e.stopPropagation(); reuseEmail(email); });
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteEmail(email.id); });
    item.addEventListener('click', () => viewEmail(email));

    list.appendChild(item);
  });
}

function viewEmail(email) {
  let modal = document.getElementById('email-detail-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'email-detail-modal';
  modal.className = 'modal open';

  const dateStr = new Date(email.sentAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const statusLabel = email.status === 'sent' ? 'Envoyé' : 'Échoué';
  const statusClass = email.status === 'sent' ? 'status-sent' : 'status-error';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:700px;">
      <span class="modal-close" id="email-detail-close"><i class="fas fa-times"></i></span>
      <div class="modal-header" style="border-bottom:none;margin-bottom:16px;padding-bottom:16px;">
        <div class="modal-header-icon"><i class="fas fa-envelope-open-text"></i></div>
        <div style="flex:1;">
          <h2 style="font-size:1.1rem;">${escHtml(email.subject)}</h2>
          <p class="modal-subtitle">${escHtml(email.recipientName || email.to)}</p>
        </div>
        <div class="email-status ${statusClass}" style="flex-shrink:0;">
          <i class="fas ${email.status === 'sent' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
          <span>${statusLabel}</span>
        </div>
      </div>

      <div class="detail-grid" style="grid-template-columns:1fr 1fr;">
        <div class="detail-field">
          <div class="detail-label"><i class="fas fa-user"></i> Destinataire</div>
          <div class="detail-value">${escHtml(email.to)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-label"><i class="fas fa-clock"></i> Date</div>
          <div class="detail-value">${dateStr}</div>
        </div>
        ${email.sentBy ? `<div class="detail-field">
          <div class="detail-label"><i class="fas fa-paper-plane"></i> Envoyé par</div>
          <div class="detail-value">${escHtml(email.sentBy)}</div>
        </div>` : ''}
        ${email.error ? `<div class="detail-field" style="border-color:var(--danger);">
          <div class="detail-label" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Erreur</div>
          <div class="detail-value" style="color:var(--danger);">${escHtml(email.error)}</div>
        </div>` : ''}
      </div>

      <div class="email-detail-body">${DOMPurify.sanitize(email.html)}</div>

      <div class="detail-actions" style="margin-top:20px;">
        <button class="btn-primary" id="email-detail-reuse"><i class="fas fa-copy"></i> Réutiliser</button>
        <button class="btn-danger" id="email-detail-delete" style="padding:10px 22px;border-radius:10px;font-weight:600;font-size:0.875rem;font-family:inherit;display:inline-flex;align-items:center;gap:8px;cursor:pointer;"><i class="fas fa-trash"></i> Supprimer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#email-detail-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#email-detail-reuse').addEventListener('click', () => {
    modal.remove();
    reuseEmail(email);
  });
  modal.querySelector('#email-detail-delete').addEventListener('click', async () => {
    modal.remove();
    await deleteEmail(email.id);
  });
}

function reuseEmail(email) {
  emailSubject.value = email.subject;
  emailBody.value = email.html;
  updateStatus('draft');

  document.querySelectorAll('.email-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="compose"]').classList.add('active');
  document.getElementById('compose-view').classList.add('active');
  document.getElementById('history-view').classList.remove('active');

  showToast('Contenu copié dans le composeur', 'info');
}

async function deleteEmail(id) {
  const confirmed = await showConfirm({
    title: 'Supprimer de l\'historique',
    message: 'Cet email sera supprimé de l\'historique. Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Email supprimé de l\'historique', 'success');
    loadEmailHistory();
    loadEmailStats();
  } catch {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// ----- HISTORY SEARCH -----
function setupHistorySearch() {
  const searchInput = document.getElementById('email-history-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', debounce(() => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) {
      renderHistory(emailHistory);
      return;
    }
    const filtered = emailHistory.filter(e =>
      (e.subject || '').toLowerCase().includes(q) ||
      (e.to || '').toLowerCase().includes(q) ||
      (e.recipientName || '').toLowerCase().includes(q)
    );
    renderHistory(filtered);
  }, 300));
}
