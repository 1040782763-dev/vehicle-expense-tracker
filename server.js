const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { user, record, payment, invoice, deposit, report, reload: reloadDB } = require('./database');
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

// ─── Autocomplete ──────────────────────────────────────────────
app.get('/api/autocomplete', authRequired, (req, res) => {
  // Predefined Tanzania car makes / models
  const presetCarTypes = [
    'ALPHARD', 'ALPHARD NEW', 'AURIS', 'AVENSIS', 'AVANZA', 'BELTA',
    'COROLLA', 'COROLLA AXIO', 'COROLLA FIELDER',
    'CROWN', 'DUALIS', 'ESQUIRE', 'ESTIMA', 'FIT', 'FIT SHUTTLE',
    'FORESTER', 'FORTUNER', 'FREELANDER',
    'HARRIER', 'HIACE', 'HIACE WAGON', 'HILUX', 'HILUX SURF',
    'INSIGHT', 'ISIS', 'IST', 'JIMNY', 'JUKE',
    'LAND CRUISER', 'LAND CRUISER PRADO', 'LAND CRUISER V8',
    'MARK II', 'MARK X', 'MARK X ZIO', 'MURANO',
    'NAVARA', 'NOAH', 'NOTE', 'OUTLANDER', 'PAJERO', 'PAJERO MINI',
    'PASSO', 'PATROL', 'PLATZ', 'PORTE', 'PRADO', 'PREMIO',
    'PROBOX', 'RACTIS', 'RAF4', 'RANGER', 'RANGE ROVER',
    'RAV4', 'RUNX', 'RUSH', 'SAI', 'SIENTA', 'SPACIO',
    'SUCCEED', 'SURF', 'SWIFT', 'TERIOS', 'TIIDA',
    'TUNDRA', 'VANGUARD', 'VEZEL', 'VITZ', 'VOLVO XC60',
    'VOXY', 'WINGROAD', 'WISH', 'X-TRAIL', 'YARIS'
  ];

  // Predefined common car spare parts (EN/CN bilingual)
  const presetParts = [
    'AC GAS', 'AIR FILTER', 'ALTERNATOR', 'BALL JOINT', 'BATTERY',
    'BRAKE CALIPER', 'BRAKE DISC', 'BRAKE DRUM', 'BRAKE MASTER CYLINDER', 'BRAKE PAD',
    'BRAKE PIPE', 'BRAKE SHOE', 'BULB', 'BUMPER', 'CAMSHAFT',
    'CAR WASH', 'CLUTCH', 'CLUTCH CYLINDER', 'CLUTCH DISC', 'COIL SPRING',
    'COMPRESSOR', 'COMPRESSOR OIL', 'CONDENSER', 'CONNECTING ROD', 'CONTROL ARM',
    'COOLANT', 'CRANKSHAFT', 'CV JOINT', 'CYLINDER HEAD',
    'DIFFERENTIAL', 'DRIVE SHAFT', 'ENGINE', 'ENGINE GASKET', 'ENGINE MOUNTING',
    'ENGINE OIL', 'EVAPORATOR', 'EXHAUST MUFFLER', 'EXPANSION', 'EXPANSION VALVE',
    'FLYWHEEL', 'FOG LIGHT', 'FUEL FILTER', 'FUEL INJECTOR', 'FUEL PUMP',
    'FUSE', 'GASKET', 'GASKET MAKER', 'GEAR OIL', 'GEARBOX',
    'HEAD GASKET', 'HEADLIGHT', 'HORN', 'HOSE', 'IGNITION COIL',
    'INJECTION NOZZLE', 'LED BULB', 'LOWER ARM', 'MASTER CYLINDER',
    'OIL COOLER', 'OIL FILTER', 'OIL PAN', 'OIL PUMP', 'OIL SEAL',
    'OXYGEN SENSOR', 'PETROL', 'PISTON', 'PISTON RING', 'RADIATOR',
    'RADIATOR CAP', 'RADIATOR FAN', 'RADIATOR HOSE', 'RELAY', 'SHOCK ABSORBER',
    'SPARK PLUG', 'STARTER', 'STARTER MOTOR', 'STEERING RACK',
    'SUSPENSION BUSHING', 'TAILLIGHT', 'TENSIONER', 'THERMOSTAT',
    'TIE ROD END', 'TIMING BELT', 'TIMING CHAIN', 'TIRE', 'TURBOCHARGER',
    'TYRE', 'VALVE', 'VALVE SEAL', 'VALVE SPRING', 'WATER PUMP',
    'WHEEL BEARING', 'WHEEL CYLINDER', 'WIPER', 'WIPER BLADE', 'WIRING HARNESS'
  ];

  const allRecords = record.list({});
  const carTypes = [...new Set([
    ...presetCarTypes,
    ...allRecords.map(r => r.car_type).filter(Boolean)
  ])].sort();
  const plateNumbers = [...new Set(allRecords.map(r => r.plate_number).filter(Boolean))].sort();
  const descriptions = [...new Set([
    ...presetParts,
    ...allRecords.map(r => r.description).filter(Boolean)
  ])].sort();
  const usedBy = [...new Set(allRecords.map(r => r.used_by).filter(Boolean))].sort();
  const spareParts = descriptions; // same source, used for invoicing autocomplete

  res.json({ car_types: carTypes, plate_numbers: plateNumbers, descriptions, spare_parts: spareParts, used_by: usedBy });
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

// Sync: auto-create payment entries grouped by plate + date from recent 30 days
app.post('/api/payments/sync', authRequired, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const thirtyDaysAgo = d30.toISOString().slice(0, 10);

  const recentRecords = record.list({ date_from: thirtyDaysAgo, date_to: today });

  // Group by (plate_number, date) — each unique pair = one potential payment
  const groups = new Map();
  for (const r of recentRecords) {
    if (!r.plate_number) continue;
    const key = r.plate_number + '|' + r.date;
    if (!groups.has(key)) {
      groups.set(key, { plate_number: r.plate_number, date: r.date, total: 0 });
    }
    groups.get(key).total += r.amount || 0;
  }

  // Get existing payments to avoid duplicates
  const existingPayments = payment.list({});
  const existingKeys = new Set(
    existingPayments.map(p => p.plate_number + '|' + p.in_date)
  );

  // Create payment for each group not already in payments
  const created = [];
  for (const [key, grp] of groups) {
    if (!existingKeys.has(key)) {
      const p = payment.create({
        plate_number: grp.plate_number,
        status: 'unpaid',
        amount: grp.total,
        in_date: grp.date,
        out_date: '',
        payment_date: '',
        notes: '',
        created_by: req.user.username
      });
      created.push(p);
    }
  }

  broadcastSSE('payment_updated', {});
  res.json({ created, total: groups.size });
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

// ─── Invoices CRUD ──────────────────────────────────────────
app.get('/api/invoices', authRequired, (req, res) => {
  res.json(invoice.list(req.query));
});

app.get('/api/invoices/next-order-no', authRequired, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json({ orderNo: invoice.nextOrderNo(date) });
});

app.post('/api/invoices', authRequired, (req, res) => {
  const data = { ...req.body, created_by: req.user.username };
  const newInvoice = invoice.create(data);
  broadcastSSE('invoice_updated', {});
  res.status(201).json(newInvoice);
});

app.get('/api/invoices/:id', authRequired, (req, res) => {
  const inv = invoice.getById(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(inv);
});

app.put('/api/invoices/:id', authRequired, (req, res) => {
  invoice.update(req.params.id, req.body);
  const updated = invoice.getById(req.params.id);
  broadcastSSE('invoice_updated', {});
  res.json(updated);
});

app.delete('/api/invoices/:id', authRequired, (req, res) => {
  invoice.delete(req.params.id);
  broadcastSSE('invoice_updated', {});
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

app.get('/api/reports/by-plate', authRequired, (req, res) => {
  res.json(report.byPlate());
});

app.get('/api/reports/profit', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const groupBy = req.query.group || 'monthly';
  res.json(report.profit(groupBy));
});

// ─── Backup ──────────────────────────────────────────────────
app.get('/api/backup', authRequired, (req, res) => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  res.setHeader('Content-Disposition', `attachment; filename=backup-${d}.json`);
  res.sendFile(path.join(__dirname, 'data.json'));
});

// Restore: admin uploads a backup JSON file to replace data.json
app.post('/api/restore', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const backupData = req.body;
  if (!backupData || !backupData.users || !backupData.records) {
    return res.status(400).json({ error: 'Invalid backup file format' });
  }
  const fs = require('fs');
  const dbPath = path.join(__dirname, 'data.json');
  const backupPath = path.join(__dirname, 'data_backup_' + Date.now() + '.json');
  fs.copyFileSync(dbPath, backupPath);
  fs.writeFileSync(dbPath, JSON.stringify(backupData, null, 2), 'utf-8');
  reloadDB();
  broadcastSSE('record_created', {});
  broadcastSSE('payment_updated', {});
  broadcastSSE('deposit_updated', {});
  res.json({ ok: true });
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
