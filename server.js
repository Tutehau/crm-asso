const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ----- SESSION (configuration robuste) -----
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_for_dev_only_change_in_prod',
  resave: false,                // Ne sauvegarde que si la session est modifiée
  saveUninitialized: false,     // Ne crée une session que si des données sont ajoutées
  cookie: {
    secure: false,             // HTTP uniquement en développement
    sameSite: 'lax',           // Permet les requêtes cross-origin (pour le développement)
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

// ----- Fichiers de données -----
const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');

// Initialisation des fichiers
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpFrom: '', assoName: '', itemsPerPage: 25 }));
}
if (!fs.existsSync(EMAILS_FILE)) fs.writeFileSync(EMAILS_FILE, JSON.stringify([]));

// Helpers JSON
async function readJSON(file) {
  try {
    const data = await fsPromises.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Erreur lecture ${file}:`, e.message);
    return [];
  }
}
async function writeJSON(file, data) {
  await fsPromises.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

async function getSmtpTransporter() {
  const settings = await readJSON(SETTINGS_FILE);
  return nodemailer.createTransport({
    host: settings.smtpHost || 'smtp.example.com',
    port: parseInt(settings.smtpPort) || 587,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser || '',
      pass: settings.smtpPass || ''
    }
  });
}

// ----- Middleware de vérification d'authentification -----
function isAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  console.log('⛔ Accès non authentifié, session:', req.session);
  res.status(401).json({ message: 'Non authentifié' });
}

function isAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Accès refusé : Administrateur requis' });
}

// ----- Anti bruteforce login (protection basique en mémoire) -----
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;
const loginAttempts = new Map(); // username -> { count, lockedUntil }

function isLoginLocked(username) {
  const entry = loginAttempts.get(username);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(username);
  }
  return false;
}

function registerFailedLogin(username) {
  const entry = loginAttempts.get(username) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  loginAttempts.set(username, entry);
}

function clearLoginAttempts(username) {
  loginAttempts.delete(username);
}

// ==================== ROUTES AUTH ====================
app.get('/api/admin-exists', async (req, res) => {
  const users = await readJSON(USERS_FILE);
  res.json({ exists: users.length > 0 });
});

app.post('/api/setup-admin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Identifiant et mot de passe requis' });

  const users = await readJSON(USERS_FILE);
  if (users.length > 0) {
    return res.status(403).json({ message: 'Un administrateur existe déjà' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    email: ''
  };

  await writeJSON(USERS_FILE, [admin]);
  res.json({ message: 'Administrateur créé avec succès' });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ username: req.session.username, role: req.session.role, loggedIn: true });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
  }

  if (isLoginLocked(username)) {
    const entry = loginAttempts.get(username);
    const waitMin = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ message: `Trop de tentatives échouées. Réessayez dans ${waitMin} min.` });
  }

  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (!user || user.status !== 'active') {
    registerFailedLogin(username);
    return res.status(401).json({ message: 'Identifiants invalides' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    registerFailedLogin(username);
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  clearLoginAttempts(username);

  // Créer la session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role || 'user';
  req.session.save((err) => {
    if (err) {
      console.error('❌ Erreur sauvegarde session:', err);
      return res.status(500).json({ message: 'Erreur interne' });
    }
    res.json({ username: user.username, message: 'Authentifié' });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Erreur destruction session:', err);
    res.json({ message: 'Déconnecté' });
  });
});

// ==================== ROUTES CONTACTS (protégées) ====================
function parseTags(tagsStr) {
  return (tagsStr || '').split(',').map(t => t.trim()).filter(Boolean);
}

app.get('/api/contacts', isAuth, async (req, res) => {
  let contacts = await readJSON(CONTACTS_FILE);
  const { page, limit, search, status, tag, sort, order } = req.query;

  if (search) {
    const s = search.toLowerCase();
    contacts = contacts.filter(c =>
      (c.nom || '').toLowerCase().includes(s) ||
      (c.prenom || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.telephone || '').includes(s)
    );
  }

  if (status) {
    contacts = contacts.filter(c => c.statut === status);
  }

  if (tag) {
    contacts = contacts.filter(c => parseTags(c.tags).some(t => t.toLowerCase() === tag.toLowerCase()));
  }

  if (sort) {
    const dir = order === 'desc' ? -1 : 1;
    contacts.sort((a, b) => {
      const va = (a[sort] || '').toString().toLowerCase();
      const vb = (b[sort] || '').toString().toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }

  const total = contacts.length;

  if (page && limit) {
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (p - 1) * l;
    contacts = contacts.slice(start, start + l);
    return res.json({
      contacts,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l)
    });
  }

  res.json(contacts);
});

app.get('/api/contacts/tags', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  const tagSet = new Set();
  contacts.forEach(c => parseTags(c.tags).forEach(t => tagSet.add(t)));
  res.json([...tagSet].sort((a, b) => a.localeCompare(b)));
});

app.get('/api/contacts/:id', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
  res.json(contact);
});

app.post('/api/contacts', isAuth, async (req, res) => {
  const { nom, prenom, telephone } = req.body;
  if (!nom || !prenom || !telephone) {
    return res.status(400).json({ message: 'Le nom, le prénom et le téléphone sont obligatoires' });
  }
  const contacts = await readJSON(CONTACTS_FILE);
  const newContact = {
    id: crypto.randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  contacts.push(newContact);
  await writeJSON(CONTACTS_FILE, contacts);
  res.status(201).json(newContact);
});

app.put('/api/contacts/:id', isAuth, async (req, res) => {
  const { nom, prenom, telephone } = req.body;
  // Note: on valide seulement si les champs sont fournis dans la requête,
  // mais on s'assure que s'ils sont fournis, ils ne sont pas vides.
  if ((nom !== undefined && !nom) || (prenom !== undefined && !prenom) || (telephone !== undefined && !telephone)) {
    return res.status(400).json({ message: 'Les champs nom, prénom et téléphone ne peuvent pas être vides' });
  }

  const contacts = await readJSON(CONTACTS_FILE);
  const index = contacts.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Contact non trouvé' });
  contacts[index] = { ...contacts[index], ...req.body, updatedAt: new Date().toISOString() };
  await writeJSON(CONTACTS_FILE, contacts);
  res.json(contacts[index]);
});

// ----- Historique d'interactions par contact -----
app.post('/api/contacts/:id/historique', isAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Le texte de l\'entrée est obligatoire' });

  const contacts = await readJSON(CONTACTS_FILE);
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });

  const entry = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    createdBy: req.session.username
  };
  contact.historique = contact.historique || [];
  contact.historique.unshift(entry);
  contact.updatedAt = new Date().toISOString();

  await writeJSON(CONTACTS_FILE, contacts);
  res.status(201).json(entry);
});

app.delete('/api/contacts/:id/historique/:entryId', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });

  const before = (contact.historique || []).length;
  contact.historique = (contact.historique || []).filter(h => h.id !== req.params.entryId);
  if (contact.historique.length === before) return res.status(404).json({ message: 'Entrée non trouvée' });

  await writeJSON(CONTACTS_FILE, contacts);
  res.json({ message: 'Entrée supprimée' });
});

app.delete('/api/contacts/all', isAuth, async (req, res) => {
  await writeJSON(CONTACTS_FILE, []);
  res.json({ message: 'Tous les contacts ont été supprimés' });
});

app.post('/api/contacts/bulk-delete', isAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'Liste d\'IDs requise' });
  }
  const contacts = await readJSON(CONTACTS_FILE);
  const idSet = new Set(ids);
  const filtered = contacts.filter(c => !idSet.has(c.id));
  const deletedCount = contacts.length - filtered.length;
  await writeJSON(CONTACTS_FILE, filtered);
  res.json({ message: `${deletedCount} contact(s) supprimé(s)`, deletedCount });
});

app.delete('/api/contacts/:id', isAuth, async (req, res) => {
  let contacts = await readJSON(CONTACTS_FILE);
  const filtered = contacts.filter(c => c.id !== req.params.id);
  if (filtered.length === contacts.length) return res.status(404).json({ message: 'Contact non trouvé' });
  await writeJSON(CONTACTS_FILE, filtered);
  res.status(204).send();
});

// ==================== STATISTIQUES ====================
app.get('/api/stats', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  const total = contacts.length;
  const statusCount = {};
  contacts.forEach(c => {
    const s = c.statut || 'Non défini';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  const recent = contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  res.json({ total, statusCount, recent });
});

// ==================== IMPORT / EXPORT ====================
app.get('/api/export', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  res.json(contacts);
});

app.post('/api/import', isAuth, async (req, res) => {
  const imported = req.body.contacts;
  if (!Array.isArray(imported)) return res.status(400).json({ message: 'Format invalide' });
  const existing = await readJSON(CONTACTS_FILE);
  imported.forEach(c => {
    const newContact = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    existing.push(newContact);
  });
  await writeJSON(CONTACTS_FILE, existing);
  res.json({ message: `${imported.length} contacts importés` });
});

// ==================== EMAILS ====================
app.get('/api/emails', isAuth, async (req, res) => {
  const emails = await readJSON(EMAILS_FILE);
  emails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(emails);
});

app.get('/api/emails/stats', isAuth, async (req, res) => {
  const emails = await readJSON(EMAILS_FILE);
  const total = emails.length;
  const sent = emails.filter(e => e.status === 'sent').length;
  const failed = emails.filter(e => e.status === 'failed').length;
  const thisMonth = emails.filter(e => {
    const d = new Date(e.sentAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const uniqueRecipients = new Set(emails.filter(e => e.status === 'sent').map(e => e.to)).size;
  res.json({ total, sent, failed, thisMonth, uniqueRecipients });
});

app.delete('/api/emails/:id', isAuth, async (req, res) => {
  let emails = await readJSON(EMAILS_FILE);
  const filtered = emails.filter(e => e.id !== req.params.id);
  if (filtered.length === emails.length) return res.status(404).json({ message: 'Email non trouvé' });
  await writeJSON(EMAILS_FILE, filtered);
  res.json({ message: 'Email supprimé de l\'historique' });
});

app.post('/api/send-email', isAuth, async (req, res) => {
  const { contactId, email, subject, html } = req.body;
  let targetEmail = email;
  let recipientName = email;

  if (contactId) {
    const contacts = await readJSON(CONTACTS_FILE);
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || !contact.email) {
      return res.status(400).json({ message: 'Contact invalide ou sans email' });
    }
    targetEmail = contact.email;
    recipientName = `${contact.prenom} ${contact.nom}`;
  }

  if (!targetEmail || !subject || !html) {
    return res.status(400).json({ message: 'L\'email, le sujet et le corps sont obligatoires' });
  }

  const emailRecord = {
    id: crypto.randomUUID(),
    to: targetEmail,
    recipientName,
    subject,
    html,
    sentAt: new Date().toISOString(),
    sentBy: req.session.username,
    status: 'pending'
  };

  try {
    const transporter = await getSmtpTransporter();
    const settings = await readJSON(SETTINGS_FILE);

    await transporter.sendMail({
      from: settings.smtpFrom || '"CRM Association" <contact@tahiti-farani.fr>',
      to: targetEmail,
      subject: subject,
      html: html
    });

    emailRecord.status = 'sent';
    const emails = await readJSON(EMAILS_FILE);
    emails.push(emailRecord);
    await writeJSON(EMAILS_FILE, emails);

    res.json({ message: 'Email envoyé avec succès !' });
  } catch (error) {
    console.error('❌ Erreur d\'envoi email:', error);

    emailRecord.status = 'failed';
    emailRecord.error = error.message;
    const emails = await readJSON(EMAILS_FILE);
    emails.push(emailRecord);
    await writeJSON(EMAILS_FILE, emails);

    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email', error: error.message });
  }
});

app.post('/api/send-bulk-email', isAuth, async (req, res) => {
  const { recipients, subject, html } = req.body;

  if (!Array.isArray(recipients) || !recipients.length || !subject || !html) {
    return res.status(400).json({ message: 'Destinataires, sujet et corps requis' });
  }

  const contacts = await readJSON(CONTACTS_FILE);
  const settings = await readJSON(SETTINGS_FILE);
  let transporter;
  try {
    transporter = await getSmtpTransporter();
  } catch (error) {
    return res.status(500).json({ message: 'Erreur de configuration SMTP', error: error.message });
  }

  const emails = await readJSON(EMAILS_FILE);
  let sentCount = 0;
  let failCount = 0;
  const results = [];

  for (const r of recipients) {
    let targetEmail = r.email;
    let recipientName = r.email;

    if (r.contactId) {
      const contact = contacts.find(c => c.id === r.contactId);
      if (!contact || !contact.email) {
        results.push({ email: r.email || r.contactId, status: 'skipped', reason: 'Pas d\'email' });
        continue;
      }
      targetEmail = contact.email;
      recipientName = `${contact.prenom} ${contact.nom}`;
    }

    const record = {
      id: crypto.randomUUID(),
      to: targetEmail,
      recipientName,
      subject,
      html,
      sentAt: new Date().toISOString(),
      sentBy: req.session.username,
      status: 'pending'
    };

    try {
      await transporter.sendMail({
        from: settings.smtpFrom || '"CRM Association" <contact@tahiti-farani.fr>',
        to: targetEmail,
        subject,
        html
      });
      record.status = 'sent';
      sentCount++;
      results.push({ email: targetEmail, name: recipientName, status: 'sent' });
    } catch (error) {
      record.status = 'failed';
      record.error = error.message;
      failCount++;
      results.push({ email: targetEmail, name: recipientName, status: 'failed', error: error.message });
    }

    emails.push(record);
  }

  await writeJSON(EMAILS_FILE, emails);

  res.json({
    message: `${sentCount} email(s) envoyé(s), ${failCount} échec(s)`,
    sentCount,
    failCount,
    results
  });
});

// ==================== GESTION DES UTILISATEURS (Admin) ====================

app.get('/api/admin/users', isAuth, isAdmin, async (req, res) => {
  const users = await readJSON(USERS_FILE);
  // On ne renvoie pas les mots de passe ni les tokens
  const safeUsers = users.map(({ password, invitationToken, ...u }) => u);
  res.json(safeUsers);
});

function buildInviteLink(req, token) {
  if (process.env.APP_BASE_URL) {
    const base = process.env.APP_BASE_URL.replace(/\/+$/, '');
    return `${base}/join.html?token=${token}`;
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}/join.html?token=${token}`;
}

async function sendInviteEmail(transporter, settings, email, username, joinLink) {
  const assoName = settings.assoName || 'notre association';
  await transporter.sendMail({
    from: settings.smtpFrom || '"CRM Association" <contact@tahiti-farani.fr>',
    to: email,
    subject: `Invitation à rejoindre le CRM — ${assoName}`,
    html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #04141a, #0e7490); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 1.4em;">🤝 Invitation</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">CRM ${escapeHtml(assoName)}</p>
      </div>
      <div style="padding: 32px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; background: white;">
        <h2 style="color: #1e293b; margin-top: 0;">Bienvenue ${escapeHtml(username)} !</h2>
        <p>Vous avez été invité(e) à rejoindre la plateforme de gestion de <strong>${escapeHtml(assoName)}</strong>.</p>
        <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${escapeHtml(joinLink)}" style="display: inline-block; padding: 14px 32px; background: #0e7490; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1em;">Activer mon compte</a>
        </p>
        <p style="font-size: 0.85em; color: #64748b;">Ou copiez-collez ce lien :<br>
          <a href="${escapeHtml(joinLink)}" style="color: #0e7490; word-break: break-all;">${escapeHtml(joinLink)}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">Si vous n'avez pas demandé cette invitation, ignorez cet email.</p>
      </div>
    </div>`
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

app.post('/api/admin/invite', isAuth, isAdmin, async (req, res) => {
  const { email, username, role } = req.body;
  if (!email || !username) return res.status(400).json({ message: 'Email et nom d\'utilisateur requis' });

  const validRoles = ['user', 'admin'];
  const userRole = validRoles.includes(role) ? role : 'user';

  const users = await readJSON(USERS_FILE);
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: 'Cet email est déjà associé à un compte' });
  }

  const token = crypto.randomUUID();
  const newUser = {
    id: crypto.randomUUID(),
    username,
    email,
    password: '',
    role: userRole,
    status: 'pending',
    invitationToken: token,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeJSON(USERS_FILE, users);

  const joinLink = buildInviteLink(req, token);

  try {
    const transporter = await getSmtpTransporter();
    const settings = await readJSON(SETTINGS_FILE);
    await sendInviteEmail(transporter, settings, email, username, joinLink);
    res.json({ message: 'Invitation envoyée avec succès', inviteLink: joinLink });
  } catch (error) {
    console.error('❌ Erreur invitation email:', error);
    res.json({
      message: 'Utilisateur créé, mais l\'email n\'a pas pu être envoyé. Partagez le lien manuellement.',
      inviteLink: joinLink,
      emailError: error.message
    });
  }
});

app.post('/api/admin/resend-invite', isAuth, isAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'ID utilisateur requis' });

  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  if (user.status === 'active') return res.status(400).json({ message: 'Cet utilisateur a déjà activé son compte' });

  const token = crypto.randomUUID();
  user.invitationToken = token;
  await writeJSON(USERS_FILE, users);

  const joinLink = buildInviteLink(req, token);

  try {
    const transporter = await getSmtpTransporter();
    const settings = await readJSON(SETTINGS_FILE);
    await sendInviteEmail(transporter, settings, user.email, user.username, joinLink);
    res.json({ message: 'Invitation renvoyée avec succès', inviteLink: joinLink });
  } catch (error) {
    res.json({
      message: 'L\'email n\'a pas pu être envoyé. Partagez le lien manuellement.',
      inviteLink: joinLink,
      emailError: error.message
    });
  }
});

app.put('/api/admin/users/:id/role', isAuth, isAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Rôle invalide' });

  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  if (user.id === req.session.userId) return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' });

  user.role = role;
  await writeJSON(USERS_FILE, users);
  res.json({ message: `Rôle mis à jour : ${role}` });
});

app.delete('/api/admin/users/:id', isAuth, isAdmin, async (req, res) => {
  if (req.params.id === req.session.userId) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const users = await readJSON(USERS_FILE);
  const filtered = users.filter(u => u.id !== req.params.id);
  if (filtered.length === users.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  await writeJSON(USERS_FILE, filtered);
  res.json({ message: 'Utilisateur supprimé' });
});

app.get('/api/auth/join-info', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Token requis' });

  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.invitationToken === token);
  if (!user) return res.status(404).json({ message: 'Invitation invalide ou expirée' });

  const settings = await readJSON(SETTINGS_FILE);
  res.json({
    username: user.username,
    email: user.email,
    assoName: settings.assoName || ''
  });
});

app.post('/api/auth/join', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères' });

  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.invitationToken === token);
  if (!user) return res.status(404).json({ message: 'L\'invitation est invalide ou a expiré' });

  user.password = await bcrypt.hash(password, 10);
  user.status = 'active';
  delete user.invitationToken;

  await writeJSON(USERS_FILE, users);
  res.json({ message: 'Compte activé avec succès !' });
});

// ==================== PARAMÈTRES ====================
app.get('/api/settings', isAuth, async (req, res) => {
  const settings = await readJSON(SETTINGS_FILE);
  const safe = { ...settings };
  delete safe.smtpPass;
  res.json(safe);
});

app.put('/api/settings/smtp', isAuth, async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = req.body;
  const settings = await readJSON(SETTINGS_FILE);
  settings.smtpHost = smtpHost || '';
  settings.smtpPort = parseInt(smtpPort) || 587;
  settings.smtpUser = smtpUser || '';
  if (smtpPass) settings.smtpPass = smtpPass;
  settings.smtpFrom = smtpFrom || '';
  await writeJSON(SETTINGS_FILE, settings);
  res.json({ message: 'Configuration SMTP enregistrée' });
});

app.post('/api/settings/smtp/test', isAuth, async (req, res) => {
  const settings = await readJSON(SETTINGS_FILE);
  if (!settings.smtpHost || !settings.smtpUser) {
    return res.status(400).json({ message: 'Configurez d\'abord le SMTP (hôte et utilisateur requis)' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass || '' }
    });
    await transporter.verify();
    res.json({ message: 'Connexion SMTP réussie' });
  } catch (error) {
    res.status(500).json({ message: `Échec : ${error.message}` });
  }
});

app.put('/api/settings/preferences', isAuth, async (req, res) => {
  const { assoName, itemsPerPage } = req.body;
  const settings = await readJSON(SETTINGS_FILE);
  settings.assoName = assoName || '';
  settings.itemsPerPage = parseInt(itemsPerPage) || 25;
  await writeJSON(SETTINGS_FILE, settings);
  res.json({ message: 'Préférences enregistrées' });
});

// ==================== PROFIL ====================
app.put('/api/profile/password', isAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
  }
  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

  user.password = await bcrypt.hash(newPassword, 10);
  await writeJSON(USERS_FILE, users);
  res.json({ message: 'Mot de passe mis à jour' });
});

app.put('/api/profile/username', isAuth, async (req, res) => {
  const { newUsername, password } = req.body;
  if (!newUsername || !password) {
    return res.status(400).json({ message: 'Nouveau nom et mot de passe requis' });
  }
  const users = await readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

  const existing = users.find(u => u.username === newUsername && u.id !== user.id);
  if (existing) return res.status(409).json({ message: 'Ce nom d\'utilisateur existe déjà' });

  user.username = newUsername;
  req.session.username = newUsername;
  await writeJSON(USERS_FILE, users);
  res.json({ message: 'Nom d\'utilisateur mis à jour' });
});

// Gestion centralisée des erreurs non capturées dans les routes
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Erreur interne du serveur' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 CRM démarré sur http://localhost:${PORT}`);
});