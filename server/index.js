import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { z } from 'zod';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || 'storage/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.resolve(root, 'storage/uti.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, surname TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'team_member', status TEXT NOT NULL DEFAULT 'active',
    failed_attempts INTEGER NOT NULL DEFAULT 0, last_attempt_day TEXT, last_login TEXT,
    business_card TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY, phone TEXT NOT NULL, code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS login_events (
    id TEXT PRIMARY KEY, user_id TEXT, phone TEXT NOT NULL, success INTEGER NOT NULL,
    ip TEXT, user_agent TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, vendor TEXT NOT NULL, amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, user_id TEXT NOT NULL,
    decision TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(transaction_id, user_id),
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT,
    body TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, file_name TEXT NOT NULL,
    stored_name TEXT NOT NULL, mime_type TEXT NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, entity TEXT NOT NULL,
    entity_id TEXT, metadata TEXT, created_at TEXT NOT NULL
  );
`);

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true }));
app.use(express.static(root));

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const publicUser = (u) => ({ id: u.id, fullName: u.full_name, surname: u.surname, phone: u.phone, email: u.email, role: u.role, status: u.status, lastLogin: u.last_login, businessCard: u.business_card });

function passwordHash(password) { return hash(`${password}:${jwtSecret}`); }
function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' }); }
function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Unauthorised' });
    req.user = user; next();
  } catch { res.status(401).json({ error: 'Unauthorised' }); }
}
function audit(actor, action, entity, entityId, metadata = {}) {
  db.prepare('INSERT INTO audit_log VALUES (?, ?, ?, ?, ?, ?, ?)').run(id(), actor?.id || null, action, entity, entityId || null, JSON.stringify(metadata), now());
}
function requireRole(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }); }

const registerSchema = z.object({ fullName: z.string().min(2), surname: z.string().min(2), phone: z.string().min(7).max(20), email: z.string().email(), password: z.string().min(10), otp: z.string().length(6), businessCard: z.string().max(500).optional() });
const loginSchema = z.object({ phone: z.string().min(7), password: z.string().min(1) });

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Under The Influenza API', time: now() }));

app.post('/api/auth/request-otp', rateLimit({ windowMs: 10 * 60 * 1000, limit: 5 }), (req, res) => {
  const parsed = z.object({ phone: z.string().min(7) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid phone number is required' });
  const code = String(crypto.randomInt(100000, 1000000));
  const created = now();
  db.prepare('INSERT INTO otps VALUES (?, ?, ?, ?, 0, ?)').run(id(), parsed.data.phone, hash(code), new Date(Date.now() + Number(process.env.OTP_TTL_MINUTES || 10) * 60000).toISOString(), created);
  // Replace this development response with an SMS provider such as Twilio in production.
  res.json({ message: 'OTP issued', ...(process.env.NODE_ENV !== 'production' ? { developmentOtp: code } : {}) });
});

app.post('/api/auth/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const data = parsed.data;
  const otp = db.prepare('SELECT * FROM otps WHERE phone = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1').get(data.phone);
  if (!otp || new Date(otp.expires_at) < new Date() || otp.code_hash !== hash(data.otp)) return res.status(400).json({ error: 'Invalid or expired OTP' });
  try {
    const user = { id: id(), fullName: data.fullName, surname: data.surname, phone: data.phone, email: data.email.toLowerCase(), passwordHash: passwordHash(data.password), businessCard: data.businessCard || null };
    db.prepare('INSERT INTO users (id, full_name, surname, phone, email, password_hash, business_card, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(user.id, user.fullName, user.surname, user.phone, user.email, user.passwordHash, user.businessCard, now());
    db.prepare('UPDATE otps SET consumed = 1 WHERE id = ?').run(otp.id);
    const saved = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id); audit(saved, 'user.created', 'user', user.id);
    res.status(201).json({ token: tokenFor(saved), user: publicUser(saved) });
  } catch (error) { res.status(409).json({ error: 'Phone number or email is already registered' }); }
});

app.post('/api/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Phone and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(parsed.data.phone);
  const day = new Date().toISOString().slice(0, 10);
  if (!user) { db.prepare('INSERT INTO login_events VALUES (?, NULL, ?, 0, ?, ?, ?)').run(id(), parsed.data.phone, req.ip, req.headers['user-agent'] || '', now()); return res.status(401).json({ error: 'Invalid credentials' }); }
  if (user.status === 'locked') return res.status(423).json({ error: 'Account blocked after three failed attempts. Contact an administrator.' });
  let failed = user.last_attempt_day === day ? user.failed_attempts : 0;
  if (user.password_hash !== passwordHash(parsed.data.password)) {
    failed += 1;
    const status = failed >= 3 ? 'locked' : 'active';
    db.prepare('UPDATE users SET failed_attempts = ?, last_attempt_day = ?, status = ? WHERE id = ?').run(failed, day, status, user.id);
    db.prepare('INSERT INTO login_events VALUES (?, ?, ?, 0, ?, ?, ?)').run(id(), user.id, user.phone, req.ip, req.headers['user-agent'] || '', now());
    if (failed >= 3) audit(user, 'security.account_locked', 'user', user.id, { reason: 'three failed attempts' });
    return res.status(failed >= 3 ? 423 : 401).json({ error: failed >= 3 ? 'Account blocked after three failed attempts' : 'Invalid credentials', attemptsRemaining: Math.max(0, 3 - failed) });
  }
  db.prepare('UPDATE users SET failed_attempts = 0, last_attempt_day = ?, last_login = ? WHERE id = ?').run(day, now(), user.id);
  db.prepare('INSERT INTO login_events VALUES (?, ?, ?, 1, ?, ?, ?)').run(id(), user.id, user.phone, req.ip, req.headers['user-agent'] || '', now());
  audit(user, 'auth.login', 'user', user.id);
  const saved = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ token: tokenFor(saved), user: publicUser(saved), message: 'WELCOME TO UNDER THE INFLUENZA' });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/users', auth, (_req, res) => res.json({ users: db.prepare('SELECT * FROM users ORDER BY full_name').all().map(publicUser) }));
app.get('/api/audit', auth, requireRole('admin', 'finance_manager'), (_req, res) => res.json({ events: db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all() }));

app.get('/api/transactions', auth, (_req, res) => {
  const rows = db.prepare(`SELECT t.*, GROUP_CONCAT(a.decision || ':' || a.user_id) approvals FROM transactions t LEFT JOIN approvals a ON a.transaction_id=t.id GROUP BY t.id ORDER BY t.created_at DESC`).all();
  res.json({ transactions: rows });
});
app.post('/api/transactions', auth, (req, res) => {
  const parsed = z.object({ title: z.string().min(2), vendor: z.string().min(2), amount: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Title, vendor and positive amount are required' });
  const tx = { id: id(), ...parsed.data };
  db.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?, \'pending\', ?, ?)').run(tx.id, tx.title, tx.vendor, tx.amount, req.user.id, now());
  audit(req.user, 'transaction.created', 'transaction', tx.id, parsed.data);
  res.status(201).json({ transaction: db.prepare('SELECT * FROM transactions WHERE id=?').get(tx.id) });
});
app.post('/api/transactions/:id/approval', auth, (req, res) => {
  const parsed = z.object({ decision: z.enum(['approved', 'rejected']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Decision must be approved or rejected' });
  const tx = db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (tx.created_by === req.user.id) return res.status(400).json({ error: 'A different authorised user must approve this transaction' });
  try {
    db.prepare('INSERT INTO approvals VALUES (?, ?, ?, ?, ?)').run(id(), tx.id, req.user.id, parsed.data.decision, now());
    const decision = parsed.data.decision;
    db.prepare('UPDATE transactions SET status=? WHERE id=?').run(decision, tx.id);
    audit(req.user, `transaction.${decision}`, 'transaction', tx.id);
    res.json({ message: `Transaction ${decision}`, transaction: db.prepare('SELECT * FROM transactions WHERE id=?').get(tx.id) });
  } catch { res.status(409).json({ error: 'This user has already submitted an approval' }); }
});

app.get('/api/messages', auth, (req, res) => res.json({ messages: db.prepare('SELECT * FROM messages WHERE recipient_id IS NULL OR recipient_id = ? OR sender_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id, req.user.id) }));
app.post('/api/messages', auth, (req, res) => {
  const parsed = z.object({ body: z.string().min(1).max(2000), recipientId: z.string().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Message body is required' });
  const message = { id: id(), ...parsed.data };
  db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?)').run(message.id, req.user.id, message.recipientId || null, message.body, now());
  res.status(201).json({ message });
});

const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype)) });
app.post('/api/documents', auth, upload.single('file'), (req, res) => {
  if (!req.file || !req.body.title) return res.status(400).json({ error: 'Title and PDF/JPEG/PNG file are required' });
  const document = { id: id(), title: req.body.title, fileName: req.file.originalname, storedName: req.file.filename, mimeType: req.file.mimetype };
  db.prepare('INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?)').run(document.id, document.title, document.fileName, document.storedName, document.mimeType, req.user.id, now());
  audit(req.user, 'document.uploaded', 'document', document.id);
  res.status(201).json({ document });
});
app.get('/api/documents', auth, (_req, res) => res.json({ documents: db.prepare('SELECT id,title,file_name fileName,mime_type mimeType,uploaded_by uploadedBy,created_at createdAt FROM documents ORDER BY created_at DESC').all() }));

app.get('/api/biometrics/options', auth, (_req, res) => res.status(501).json({ error: 'WebAuthn requires a production RP configuration. Store passkeys, never raw biometric data.' }));
app.post('/api/bank/link', auth, requireRole('admin', 'finance_manager'), (req, res) => { audit(req.user, 'bank.account_link_requested', 'company', 'under-the-influenza', { provider: req.body.provider || 'sandbox' }); res.status(202).json({ message: 'Bank linking request created. Connect a regulated banking provider before enabling live payments.' }); });

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Internal server error' }); });
app.listen(port, () => console.log(`Under The Influenza API running at http://localhost:${port}`));
