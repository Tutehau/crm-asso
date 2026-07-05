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
    subject: 'Bienvenue au sein de notre association !',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Bienvenue parmi nous !</h2>
  <p>Nous sommes ravis de vous accueillir au sein de notre association.</p>
  <p>Votre engagement est précieux et nous avons hâte de collaborer avec vous pour mener à bien nos projets communs.</p>
  <p>N'hésitez pas à nous contacter si vous avez des questions ou besoin d'informations complémentaires.</p>
  <p>À très bientôt,<br><strong>L'équipe administrative</strong></p>
</div>`
  },
  meeting: {
    subject: 'Convocation : Prochaine réunion de l\'association',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Réunion à venir</h2>
  <p>Bonjour,</p>
  <p>Nous vous informons de la tenue de notre prochaine réunion dont voici les détails :</p>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #2c3e50; margin: 20px 0;">
    <p><strong>📅 Date :</strong> [DATE]</p>
    <p><strong>📍 Lieu :</strong> [LIEU]</p>
    <p><strong>📝 Ordre du jour :</strong> [SUJET]</p>
  </div>
  <p>Nous vous remercions de bien vouloir confirmer votre présence par retour d'email.</p>
  <p>Cordialement,<br><strong>Le Bureau</strong></p>
</div>`
  },
  reminder: {
    subject: 'Rappel : [Sujet du rappel]',
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
  <h2 style="color: #2c3e50;">Rappel important</h2>
  <p>Bonjour,</p>
  <p>Ce message est un rappel concernant l'élément suivant :</p>
  <p style="font-size: 1.1em; font-weight: 500; color: #e67e22; margin: 20px 0;"><strong>[Sujet du rappel]</strong></p>
  <p>Nous vous remercions de faire le nécessaire dans les meilleurs délais.</p>
  <p>Restant à votre disposition pour tout complément d'information.</p>
  <p>Cordialement,<br><strong>L'équipe</strong></p>
</div>`
  }
};

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('emails', user.username, user.role);
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
