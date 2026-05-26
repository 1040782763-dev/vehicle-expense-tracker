// ═══════════════════════════════════════════════════════════════
// JSON file database — zero native dependencies
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

// In-memory data
let data = { users: [], records: [], payments: [], deposit: 0, nextId: 1 };

// ─── Load / Save ─────────────────────────────────────────────
function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      data = JSON.parse(raw);
      if (!data.nextId) data.nextId = 1;
      if (!data.payments) data.payments = [];
      if (data.deposit === undefined) data.deposit = 0;
    }
  } catch (e) { /* keep defaults */ }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId() {
  return data.nextId++;
}

// Load on startup
load();

// Create default admin if no users
if (data.users.length === 0) {
  data.users.push({
    id: nextId(),
    username: 'admin',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    created_at: new Date().toISOString()
  });
  save();
  console.log('Default admin created: admin / admin123');
}

// ─── Users ───────────────────────────────────────────────────
const user = {
  create(username, passwordHash, role = 'user') {
    const u = { id: nextId(), username, password_hash: passwordHash, role, created_at: new Date().toISOString() };
    data.users.push(u);
    save();
    return u;
  },
  findByUsername(username) {
    return data.users.find(u => u.username === username) || null;
  },
  list() {
    return data.users.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
  }
};

// ─── Records ─────────────────────────────────────────────────
const record = {
  list(filters = {}) {
    let result = [...data.records];
    if (filters.date)      result = result.filter(r => r.date === filters.date);
    if (filters.desc)      result = result.filter(r => (r.description || '').toLowerCase().includes(filters.desc.toLowerCase()));
    if (filters.car_type)  result = result.filter(r => (r.car_type || '').toLowerCase().includes(filters.car_type.toLowerCase()));
    if (filters.plate)     result = result.filter(r => (r.plate_number || '').toLowerCase().includes(filters.plate.toLowerCase()));
    if (filters.used_by)   result = result.filter(r => (r.used_by || '').toLowerCase().includes(filters.used_by.toLowerCase()));
    if (filters.date_from) result = result.filter(r => r.date >= filters.date_from);
    if (filters.date_to)   result = result.filter(r => r.date <= filters.date_to);
    result.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return result.slice(0, 500);
  },

  create(d) {
    const r = { id: nextId(), date: d.date, description: d.description || '', qty: d.qty || '',
                car_type: d.car_type || '', plate_number: d.plate_number || '',
                amount: Number(d.amount) || 0, used_by: d.used_by || '',
                created_by: d.created_by || '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    data.records.push(r);
    save();
    return r;
  },

  update(id, d) {
    const r = data.records.find(x => x.id === Number(id));
    if (!r) return null;
    const fields = ['date','description','qty','car_type','plate_number','amount','used_by'];
    for (const f of fields) if (d[f] !== undefined) r[f] = d[f];
    r.updated_at = new Date().toISOString();
    save();
    return r;
  },

  delete(id) {
    const idx = data.records.findIndex(x => x.id === Number(id));
    if (idx >= 0) { data.records.splice(idx, 1); save(); return true; }
    return false;
  },

  getById(id) {
    return data.records.find(x => x.id === Number(id)) || null;
  }
};

// ─── Payments ────────────────────────────────────────────────
const payment = {
  list(filters = {}) {
    let result = [...data.payments];
    if (filters.plate)  result = result.filter(p => (p.plate_number || '').toLowerCase().includes(filters.plate.toLowerCase()));
    if (filters.status) result = result.filter(p => p.status === filters.status);
    result.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return result.slice(0, 500);
  },

  create(d) {
    const p = { id: nextId(), plate_number: d.plate_number || '', status: d.status || 'unpaid',
                amount: Number(d.amount) || 0, payment_date: d.payment_date || '',
                notes: d.notes || '', created_by: d.created_by || '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    data.payments.push(p);
    save();
    return p;
  },

  update(id, d) {
    const p = data.payments.find(x => x.id === Number(id));
    if (!p) return null;
    const fields = ['plate_number','status','amount','payment_date','notes'];
    for (const f of fields) if (d[f] !== undefined) p[f] = d[f];
    p.updated_at = new Date().toISOString();
    save();
    return p;
  },

  delete(id) {
    const idx = data.payments.findIndex(x => x.id === Number(id));
    if (idx >= 0) { data.payments.splice(idx, 1); save(); return true; }
    return false;
  },

  getById(id) {
    return data.payments.find(x => x.id === Number(id)) || null;
  }
};

// ─── Deposit ─────────────────────────────────────────────────
const deposit = {
  get() { return data.deposit || 0; },
  set(amount) { data.deposit = amount; save(); }
};

// ─── Reports ─────────────────────────────────────────────────
function fmtDate(d) { return d; }
function weekStart(d) { const dt = new Date(d + 'T00:00:00'); const day = dt.getDay(); const diff = dt.getDate() - day + (day === 0 ? -6 : 1); dt.setDate(diff); return dt.toISOString().slice(0,10); }
function weekEnd(d) { const ws = new Date(weekStart(d) + 'T00:00:00'); ws.setDate(ws.getDate() + 6); return ws.toISOString().slice(0,10); }

const report = {
  daily() {
    const map = {};
    for (const r of data.records) {
      map[r.date] = map[r.date] || { date: r.date, count: 0, total: 0 };
      map[r.date].count++;
      map[r.date].total += r.amount;
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
  },
  weekly() {
    const map = {};
    for (const r of data.records) {
      const ws = weekStart(r.date);
      map[ws] = map[ws] || { week: ws, count: 0, total: 0, start_date: ws, end_date: weekEnd(r.date) };
      map[ws].count++;
      map[ws].total += r.amount;
    }
    return Object.values(map).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 52);
  },
  monthly() {
    const map = {};
    for (const r of data.records) {
      const m = r.date.slice(0, 7);
      map[m] = map[m] || { month: m, count: 0, total: 0 };
      map[m].count++;
      map[m].total += r.amount;
    }
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 24);
  },
  yearly() {
    const map = {};
    for (const r of data.records) {
      const y = r.date.slice(0, 4);
      map[y] = map[y] || { year: y, count: 0, total: 0 };
      map[y].count++;
      map[y].total += r.amount;
    }
    return Object.values(map).sort((a, b) => b.year.localeCompare(a.year));
  }
};

module.exports = { user, record, payment, deposit, report };
