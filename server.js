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

// Initialisation des fichiers
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpFrom: '', assoName: '', itemsPerPage: 25 }));
}

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

// ----- Middleware de vérification d'authentification -----
function isAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  console.log('⛔ Accès non authentifié, session:', req.session);
  res.status(401).json({ message: 'Non authentifié' });
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
    password: hashedPassword
  };

  await writeJSON(USERS_FILE, [admin]);
  res.json({ message: 'Administrateur créé avec succès' });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ username: req.session.username, loggedIn: true });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('🔑 Tentative login:', username);
  const users = await readJSON(USERS_FILE);
  console.log('👥 Utilisateurs trouvés:', users.length);
  const user = users.find(u => u.username === username);
  if (!user) {
    console.log('❌ Utilisateur introuvable');
    return res.status(401).json({ message: 'Identifiants invalides' });
  }
  const match = await bcrypt.compare(password, user.password);
  console.log('✅ Mot de passe match:', match);
  if (!match) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }
  // Créer la session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.save((err) => {
    if (err) {
      console.error('❌ Erreur sauvegarde session:', err);
      return res.status(500).json({ message: 'Erreur interne' });
    }
    console.log('✅ Session sauvegardée pour', user.username);
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
app.get('/api/contacts', isAuth, async (req, res) => {
  const contacts = await readJSON(CONTACTS_FILE);
  res.json(contacts);
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

app.delete('/api/contacts/all', isAuth, async (req, res) => {
  await writeJSON(CONTACTS_FILE, []);
  res.json({ message: 'Tous les contacts ont été supprimés' });
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

app.post('/api/send-email', isAuth, async (req, res) => {
  const { contactId, email, subject, html } = req.body;
  let targetEmail = email;

  if (contactId) {
    const contacts = await readJSON(CONTACTS_FILE);
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || !contact.email) {
      return res.status(400).json({ message: 'Contact invalide ou sans email' });
    }
    targetEmail = contact.email;
  }

  if (!targetEmail || !subject || !html) {
    return res.status(400).json({ message: 'L\'email, le sujet et le corps sont obligatoires' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || 'contact@tahiti-farani.fr',
        pass: process.env.SMTP_PASS || 'Tutehau21@'
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER || '"CRM Association" <contact@tahiti-farani.fr>',
      to: targetEmail,
      subject: subject,
      html: html
    });

    res.json({ message: 'Email envoyé avec succès !' });
  } catch (error) {
    console.error('❌ Erreur d\'envoi email:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email', error: error.message });
  }
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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 CRM démarré sur http://localhost:${PORT}`);
  console.log(`🔑 Identifiants par défaut : admin / admin123`);
});