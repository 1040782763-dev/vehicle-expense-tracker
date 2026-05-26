const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { user, record, payment, deposit, report } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vts-jwt-secret-change-in-production';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── SSE Clients ─────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// ─── Auth Middleware ─────────────────────────────────────────
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Auth Routes ─────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const u = user.findByUsername(username);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username: u.username, role: u.role });
});

app.post('/api/register', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (user.findByUsername(username)) return res.status(409).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  user.create(username, hash, role || 'user');
  res.status(201).json({ ok: true });
});

app.get('/api/users', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json(user.list());
});

// ─── Records CRUD ────────────────────────────────────────────
app.get('/api/records', authRequired, (req, res) => {
  res.json(record.list(req.query));
});

app.post('/api/records', authRequired, (req, res) => {
  const data = { ...req.body, created_by: req.user.username };
  const newRecord = record.create(data);
  broadcastSSE('record_created', newRecord);
  res.status(201).json(newRecord);
});

app.put('/api/records/:id', authRequired, (req, res) => {
  record.update(req.params.id, req.body);
  const updated = record.getById(req.params.id);
  broadcastSSE('record_updated', updated);
  res.json(updated);
});

app.delete('/api/records/:id', authRequired, (req, res) => {
  record.delete(req.params.id);
  broadcastSSE('record_deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

// ─── Payments CRUD ───────────────────────────────────────────
app.get('/api/payments', authRequired, (req, res) => {
  res.json(payment.list(req.query));
});

app.post('/api/payments', authRequired, (req, res) => {
  const data = { ...req.body, created_by: req.user.username };
  const newPayment = payment.create(data);
  broadcastSSE('payment_updated', {});
  res.status(201).json(newPayment);
});

app.put('/api/payments/:id', authRequired, (req, res) => {
  payment.update(req.params.id, req.body);
  const updated = payment.getById(req.params.id);
  broadcastSSE('payment_updated', {});
  res.json(updated);
});

app.delete('/api/payments/:id', authRequired, (req, res) => {
  payment.delete(req.params.id);
  broadcastSSE('payment_updated', {});
  res.json({ ok: true });
});

// ─── Deposit ─────────────────────────────────────────────────
app.get('/api/deposit', authRequired, (req, res) => {
  res.json({ amount: deposit.get() });
});

app.put('/api/deposit', authRequired, (req, res) => {
  deposit.set(req.body.amount);
  broadcastSSE('deposit_updated', { amount: req.body.amount });
  res.json({ amount: req.body.amount });
});

// ─── Reports ─────────────────────────────────────────────────
app.get('/api/reports/daily', authRequired, (req, res) => {
  res.json(report.daily());
});

app.get('/api/reports/weekly', authRequired, (req, res) => {
  res.json(report.weekly());
});

app.get('/api/reports/monthly', authRequired, (req, res) => {
  res.json(report.monthly());
});

app.get('/api/reports/yearly', authRequired, (req, res) => {
  res.json(report.yearly());
});

// ─── SSE Stream (token via query param — EventSource can't set headers) ──
app.get('/api/events', (req, res) => {
  const tok = req.query.token;
  if (!tok) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(tok, JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('event: connected\ndata: {}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ─── Serve SPA ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Default login: admin / admin123`);
});
