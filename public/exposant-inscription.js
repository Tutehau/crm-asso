// Page publique autonome : pas de shared.js (pas de session, pas de sidebar),
// donc son propre petit utilitaire d'échappement HTML.
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let openEvents = [];
let selectedEvent = null;

const eventPicker = document.getElementById('event-picker');
const eventPickerList = document.getElementById('event-picker-list');
const noEvents = document.getElementById('no-events');
const formWrap = document.getElementById('registration-form-wrap');
const eventSummary = document.getElementById('event-summary');
const form = document.getElementById('registration-form');
const errorBox = document.getElementById('registration-error');
const submitBtn = document.getElementById('registration-submit');
const successBox = document.getElementById('registration-success');
const heroSub = document.getElementById('hero-sub');
const footerYear = document.getElementById('footer-year');

const fEntreprise = document.getElementById('f-entreprise');
const fContact = document.getElementById('f-contact');
const fTelephone = document.getElementById('f-telephone');
const fEmail = document.getElementById('f-email');
const fType = document.getElementById('f-type');
const fActivite = document.getElementById('f-activite');
const fMessage = document.getElementById('f-message');

footerYear.textContent = new Date().getFullYear();

(async () => {
  try {
    const brandingRes = await fetch('/api/public/branding');
    if (brandingRes.ok) {
      const branding = await brandingRes.json();
      if (branding.assoName) {
        heroSub.textContent = `Présentez vos créations, produits et savoir-faire lors des événements de ${branding.assoName}. Rejoignez une expérience festive et authentique.`;
        footerYear.textContent = `${new Date().getFullYear()} ${branding.assoName}`;
      }
    }
  } catch {}

  try {
    const res = await fetch('/api/public/events');
    if (!res.ok) throw new Error();
    openEvents = await res.json();
  } catch {
    openEvents = [];
  }

  if (!openEvents.length) {
    noEvents.style.display = '';
    return;
  }

  const params = new URLSearchParams(location.search);
  const requestedId = params.get('event');
  const preselected = requestedId ? openEvents.find(e => e.id === requestedId) : null;

  if (preselected) {
    selectEvent(preselected);
  } else if (openEvents.length === 1) {
    selectEvent(openEvents[0]);
  } else {
    showEventPicker();
  }
})();

function showEventPicker() {
  eventPicker.style.display = '';
  eventPickerList.innerHTML = '';
  openEvents.forEach(ev => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'event-picker-item';
    btn.innerHTML = `
      <strong>${escHtml(ev.nom)}</strong>
      <span>${escHtml(formatEventDates(ev))}${ev.lieu ? ' · ' + escHtml(ev.lieu) : ''}</span>
    `;
    btn.addEventListener('click', () => selectEvent(ev));
    eventPickerList.appendChild(btn);
  });
}

function formatEventDates(ev) {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = ev.dateDebut ? new Date(ev.dateDebut).toLocaleDateString('fr-FR', opts) : '';
  const end = ev.dateFin ? new Date(ev.dateFin).toLocaleDateString('fr-FR', opts) : '';
  return end && end !== start ? `${start} → ${end}` : start;
}

function selectEvent(ev) {
  selectedEvent = ev;
  eventPicker.style.display = 'none';
  noEvents.style.display = 'none';
  formWrap.style.display = '';

  eventSummary.innerHTML = `
    <strong>${escHtml(ev.nom)}</strong>
    <span><i class="fas fa-calendar"></i> ${escHtml(formatEventDates(ev))}</span>
    ${ev.lieu ? `<span><i class="fas fa-map-marker-alt"></i> ${escHtml(ev.lieu)}</span>` : ''}
    ${ev.description ? `<span>${escHtml(ev.description)}</span>` : ''}
  `;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  const data = {
    eventId: selectedEvent.id,
    entreprise: fEntreprise.value.trim(),
    contactNom: fContact.value.trim(),
    telephone: fTelephone.value.trim(),
    email: fEmail.value.trim(),
    typeActivite: fType.value,
    activite: fActivite.value.trim(),
    message: fMessage.value.trim()
  };

  if (!data.entreprise || !data.contactNom || !data.telephone || !data.activite) {
    errorBox.textContent = 'L\'entreprise, le contact, le téléphone et la description sont obligatoires.';
    errorBox.style.display = '';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

  try {
    const res = await fetch('/api/public/exposants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Erreur lors de l\'envoi');

    formWrap.style.display = 'none';
    successBox.style.display = '';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    errorBox.textContent = err.message || 'Une erreur est survenue, veuillez réessayer.';
    errorBox.style.display = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Envoyer ma candidature →';
  }
});
