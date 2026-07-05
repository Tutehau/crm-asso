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

const templates = {
  welcome: {
    subject: 'Bienvenue dans notre association',
    body: '<h2>Bienvenue !</h2>\n<p>Nous sommes ravis de vous accueillir parmi nous.</p>\n<p>N\'hesitez pas a nous contacter pour toute question.</p>\n<p>Cordialement,<br><strong>L\'equipe</strong></p>'
  },
  meeting: {
    subject: 'Prochaine reunion',
    body: '<h2>Reunion a venir</h2>\n<p>Nous vous informons de la prochaine reunion :</p>\n<ul>\n<li><strong>Date :</strong> [DATE]</li>\n<li><strong>Lieu :</strong> [LIEU]</li>\n<li><strong>Ordre du jour :</strong> [SUJET]</li>\n</ul>\n<p>Merci de confirmer votre presence.</p>'
  },
  reminder: {
    subject: 'Rappel',
    body: '<h2>Rappel</h2>\n<p>Ce message est un rappel concernant :</p>\n<p><strong>[SUJET DU RAPPEL]</strong></p>\n<p>Merci de votre attention.</p>\n<p>Cordialement</p>'
  }
};

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('emails', user.username);
  loadEmailContacts();
  setupTemplates();
})();

async function loadEmailContacts() {
  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) return;
    const contacts = await res.json();
    contacts.forEach(c => {
      if (c.email) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.prenom} ${c.nom} (${c.email})`;
        emailContactSelect.appendChild(opt);
      }
    });
  } catch {}
}

function setupTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.template;
      const tpl = templates[key];
      if (tpl) {
        emailSubject.value = tpl.subject;
        emailBody.value = tpl.body;
        updateStatus('draft');
      }
    });
  });
}

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
    span.textContent = 'Envoye';
    emailStatus.classList.add('status-sent');
  } else if (state === 'error') {
    icon.className = 'fas fa-exclamation-circle';
    span.textContent = 'Erreur';
    emailStatus.classList.add('status-error');
  }
}

togglePreviewBtn.addEventListener('click', () => {
  const isPreview = emailPreview.style.display === 'block';
  if (isPreview) {
    emailPreview.style.display = 'none';
    emailBody.style.display = 'block';
    previewIcon.className = 'fas fa-eye';
    previewLabel.textContent = 'Apercu';
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

emailBody.addEventListener('input', () => updateStatus('draft'));
emailSubject.addEventListener('input', () => updateStatus('draft'));

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
    showToast('Veuillez selectionner un contact ou saisir un email', 'error');
    return;
  }

  sendEmailBtn.disabled = true;
  updateStatus('sending');

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId, email, subject, html })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur d\'envoi');
    showToast(data.message, 'success');
    updateStatus('sent');
  } catch (err) {
    showToast(err.message, 'error');
    updateStatus('error');
  } finally {
    sendEmailBtn.disabled = false;
  }
});
