const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { user, record, payment, deposit, report } = require('./database');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vts-jwt-secret-change-in-production';

app.use(express.json({ limit: '50mb' }));
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

// ─── Import XLSX ──────────────────────────────────────────────
app.post('/api/import', authRequired, (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'No file data' });

    const buf = Buffer.from(base64, 'base64');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'Empty sheet' });

    // Column name mapping (auto-detect)
    const cols = Object.keys(rows[0]);
    const findCol = (patterns) => {
      for (const p of patterns) {
        const found = cols.find(c => c.toLowerCase().includes(p.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    const dateCol = findCol(['date', '日期', '时间']);
    const descCol = findCol(['desc', '描述', '物料', '货品', 'item', 'name']);
    const qtyCol = findCol(['qty', '数量', 'quantity']);
    const carCol = findCol(['car', '车型', 'vehicle', 'type']);
    const plateCol = findCol(['plate', '车牌', 'plate no', 'license']);
    const amountCol = findCol(['amount', '金额', '费用', 'price', 'cost', 'total']);
    const guyCol = findCol(['used', '使用人', '经手人', 'guy', 'by', 'user']);

    let imported = 0;
    for (const row of rows) {
      const obj = {
        date: dateCol ? String(row[dateCol] || '').trim() : '',
        description: descCol ? String(row[descCol] || '').trim() : '',
        qty: qtyCol ? String(row[qtyCol] || '').trim() : '',
        car_type: carCol ? String(row[carCol] || '').trim() : '',
        plate_number: plateCol ? String(row[plateCol] || '').trim() : '',
        amount: amountCol ? parseInt(row[amountCol]) || 0 : 0,
        used_by: guyCol ? String(row[guyCol] || '').trim() : '',
        created_by: req.user.username
      };

      // Try to normalize date formats
      if (obj.date && obj.date.match(/^\d{4,5}$/)) {
        // Excel serial date number
        const d = new Date((parseInt(obj.date) - 25569) * 86400 * 1000);
        obj.date = d.toISOString().slice(0, 10);
      } else if (obj.date && obj.date.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/)) {
        // DD/MM/YYYY or similar
        const parts = obj.date.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          obj.date = `${year}-${month}-${day}`;
        }
      }

      if (obj.date) {
        record.create(obj);
        imported++;
      }
    }

    // Broadcast to all clients
    broadcastSSE('record_created', { imported });
    res.json({ ok: true, imported, total: rows.length });
  } catch (e) {
    res.status(400).json({ error: 'Parse error: ' + e.message });
  }
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
  const date = req.query.date || new Date().toISOString().slice(0,10);
  res.json({
    date,
    amount: deposit.getFor(date),
    expense: deposit.expenseFor(date),
    balance: deposit.balanceFor(date)
  });
});

app.put('/api/deposit', authRequired, (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0,10);
  deposit.setFor(date, req.body.amount);
  broadcastSSE('deposit_updated', { amount: req.body.amount, date });
  res.json({ amount: req.body.amount, date });
});

// Today's quick stats
app.get('/api/today', authRequired, (req, res) => {
  const d = new Date().toISOString().slice(0,10);
  res.json({
    date: d,
    deposit: deposit.getFor(d),
    expense: deposit.expenseFor(d),
    balance: deposit.balanceFor(d)
  });
});

// Daily summary (all dates with deposit/expense/balance)
app.get('/api/daily-summary', authRequired, (req, res) => {
  res.json(deposit.summary());
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
