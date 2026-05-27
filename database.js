// ═══════════════════════════════════════════════════════════════
// JSON file database — zero native dependencies
// Data stored in DATA_DIR (default /app/data) for PVC persistence
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'data.json');

// In-memory data
let data = { users: [], records: [], payments: [], invoices: [], deposit: 0, daily_deposits: {}, nextId: 1 };

// ─── Load / Save ─────────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDir();
  // Migrate from old root data.json to new DATA_DIR/data.json
  const oldPath = path.join(__dirname, 'data.json');
  if (fs.existsSync(oldPath) && !fs.existsSync(DB_PATH)) {
    fs.copyFileSync(oldPath, DB_PATH);
    console.log('Migrated data.json to ' + DB_PATH);
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      data = JSON.parse(raw);
      if (!data.nextId) data.nextId = 1;
      if (!data.payments) data.payments = [];
      if (!data.invoices) data.invoices = [];
      if (data.deposit === undefined) data.deposit = 0;
    }
  } catch (e) { /* keep defaults */ }
}

function save() {
  ensureDir();
  // Write to temp file first, then rename (atomic write to prevent corruption)
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_PATH);
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

// Ensure default accounts exist
function ensureUser(username, password, role) {
  if (!data.users.find(u => u.username === username)) {
    data.users.push({
      id: nextId(),
      username,
      password_hash: bcrypt.hashSync(password, 10),
      role,
      created_at: new Date().toISOString()
    });
    save();
    console.log(`User created: ${username} (${role})`);
  }
}
ensureUser('MARRY', 'MARRY123', 'user');
ensureUser('HOPE', '240408', 'admin');

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
    const maxSeq = data.records.reduce((max, r) => Math.max(max, r.seq || 0), 0);
    const r = { id: nextId(), seq: maxSeq + 1, date: d.date, description: d.description || '', qty: d.qty || '',
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
                in_date: d.in_date || '', out_date: d.out_date || '',
                notes: d.notes || '', created_by: d.created_by || '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    data.payments.push(p);
    save();
    return p;
  },

  update(id, d) {
    const p = data.payments.find(x => x.id === Number(id));
    if (!p) return null;
    const fields = ['plate_number','status','amount','payment_date','in_date','out_date','notes'];
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

// ─── Invoices ────────────────────────────────────────────────
const invoice = {
  list(filters = {}) {
    let result = [...data.invoices];
    if (filters.plate)  result = result.filter(p => (p.plate || '').toLowerCase().includes(filters.plate.toLowerCase()));
    if (filters.search) {
      const kw = filters.search.toLowerCase();
      result = result.filter(p =>
        (p.orderNo || '').toLowerCase().includes(kw) ||
        (p.plate || '').toLowerCase().includes(kw) ||
        (p.customer || '').toLowerCase().includes(kw) ||
        (p.remark || '').toLowerCase().includes(kw)
      );
    }
    if (filters.date_from) result = result.filter(p => p.date >= filters.date_from);
    if (filters.date_to)   result = result.filter(p => p.date <= filters.date_to);
    result.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return result.slice(0, 200);
  },

  // Generate next order number: YYMMDDXX
  nextOrderNo(date) {
    const d = date || new Date().toISOString().slice(0, 10);
    const prefix = d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
    let maxSeq = 0;
    for (const inv of data.invoices) {
      if (inv.orderNo && inv.orderNo.startsWith(prefix)) {
        const seq = parseInt(inv.orderNo.slice(6));
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    return prefix + String(maxSeq + 1).padStart(2, '0');
  },

  create(d) {
    const orderNo = d.orderNo || this.nextOrderNo(d.date);
    const inv = {
      id: nextId(),
      orderNo,
      plate: d.plate || '',
      customer: d.customer || '',
      date: d.date || '',
      remark: d.remark || '',
      items: (d.items || []).map((item, i) => ({
        seq: i + 1,
        name: item.name || '',
        unit: item.unit || '',
        qty: item.qty || '',
        cost: item.cost || '',
        amount: item.amount || (item.qty && item.cost ? (parseFloat(String(item.qty||'').replace(/,/g,'')) * parseFloat(String(item.cost||'').replace(/,/g,''))).toString() : ''),
        cost_price: item.cost_price || '',
        remark: item.remark || ''
      })),
      created_by: d.created_by || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.invoices.push(inv);
    save();
    return inv;
  },

  update(id, d) {
    const inv = data.invoices.find(x => x.id === Number(id));
    if (!inv) return null;
    const fields = ['plate', 'customer', 'date', 'remark'];
    for (const f of fields) if (d[f] !== undefined) inv[f] = d[f];
    if (d.items) {
      inv.items = d.items.map((item, i) => ({
        seq: i + 1,
        name: item.name || '',
        unit: item.unit || '',
        qty: item.qty || '',
        cost: item.cost || '',
        amount: item.amount || (item.qty && item.cost ? (parseFloat(String(item.qty||'').replace(/,/g,'')) * parseFloat(String(item.cost||'').replace(/,/g,''))).toString() : ''),
        cost_price: item.cost_price || '',
        remark: item.remark || ''
      }));
    }
    inv.updated_at = new Date().toISOString();
    save();
    return inv;
  },

  delete(id) {
    const idx = data.invoices.findIndex(x => x.id === Number(id));
    if (idx >= 0) { data.invoices.splice(idx, 1); save(); return true; }
    return false;
  },

  getById(id) {
    return data.invoices.find(x => x.id === Number(id)) || null;
  }
};

// ─── Deposit ─────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0,10); }

function dayBefore(d) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().slice(0,10);
}

function dayExpense(d) {
  return data.records
    .filter(r => r.date === d)
    .reduce((s, r) => s + (r.amount || 0), 0);
}

// sorted list of dates that have any data (records or deposits)
function activeDates() {
  const set = new Set();
  for (const r of data.records) set.add(r.date);
  for (const d of Object.keys(data.daily_deposits)) set.add(d);
  return [...set].sort();
}

const deposit = {
  // Get today's opening deposit (auto-carry from yesterday)
  get() {
    return this.getFor(today());
  },

  // Get opening deposit for a specific date (manual entry only, no auto-carry)
  getFor(date) {
    if (data.daily_deposits[date] !== undefined && data.daily_deposits[date] !== null) {
      return data.daily_deposits[date];
    }
    return 0;
  },

  // Set today's opening deposit
  set(amount) {
    this.setFor(today(), amount);
  },

  // Set opening deposit for a specific date
  setFor(date, amount) {
    data.daily_deposits[date] = amount;
    data.deposit = amount;
    save();
  },

  // Get expense for a specific date
  expenseFor(date) {
    return dayExpense(date);
  },

  // Get today's expense
  getTodayExpense() {
    return dayExpense(today());
  },

  // Get balance for a specific date
  balanceFor(date) {
    return this.getFor(date) - dayExpense(date);
  },

  // Get today's balance
  getTodayBalance() {
    return this.getFor(today()) - dayExpense(today());
  },

  // Full daily summary: every date with deposit/expense/balance
  summary() {
    const dates = activeDates();
    if (!dates.length) return [];

    const result = [];
    for (const d of dates) {
      const opening = data.daily_deposits[d] !== undefined
        ? data.daily_deposits[d]
        : 0;
      const expense = dayExpense(d);
      const balance = opening - expense;
      result.push({ date: d, deposit: opening, expense, balance });
    }
    return result.reverse(); // newest first
  }
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
  },
  byPlate() {
    const map = {};
    for (const r of data.records) {
      if (!r.plate_number) continue;
      map[r.plate_number] = map[r.plate_number] || { plate_number: r.plate_number, count: 0, total: 0 };
      map[r.plate_number].count++;
      map[r.plate_number].total += r.amount;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  },

  // Profit margin analysis: revenue (paid payments) vs cost (expenses)
  // VAT (18%) is included in payment revenue; net revenue = revenue / 1.18
  profit(groupBy = 'monthly') {
    // Revenue from paid payments (gross, includes 18% VAT)
    const revenueMap = {};
    for (const p of data.payments) {
      if (p.status !== 'paid' || !p.amount) continue;
      const key = groupBy === 'monthly' ? (p.payment_date || p.in_date || '').slice(0, 7)
                : groupBy === 'plate' ? (p.plate_number || 'Unknown')
                : 'all';
      if (!key || key === 'Unknown') continue;
      revenueMap[key] = (revenueMap[key] || 0) + (Number(p.amount) || 0);
    }

    // Cost from expense records
    const costMap = {};
    for (const r of data.records) {
      const key = groupBy === 'monthly' ? r.date.slice(0, 7)
                : groupBy === 'plate' ? (r.plate_number || 'Unknown')
                : 'all';
      if (!key || key === 'Unknown') continue;
      costMap[key] = (costMap[key] || 0) + (r.amount || 0);
    }

    // Merge and calculate profit (with VAT deduction)
    const allKeys = [...new Set([...Object.keys(revenueMap), ...Object.keys(costMap)])].sort();
    const result = allKeys.map(key => {
      const grossRevenue = revenueMap[key] || 0;
      const cost = costMap[key] || 0;
      const vat = Math.round(grossRevenue * 18 / 118); // 18% VAT included in gross
      const netRevenue = grossRevenue - vat;
      const profit = netRevenue - cost;
      const margin = netRevenue > 0 ? ((profit / netRevenue) * 100).toFixed(1) : '0.0';
      return { key, grossRevenue, vat, netRevenue, cost, profit, margin: Number(margin) };
    });

    if (groupBy === 'monthly') return result.reverse();
    return result.sort((a, b) => b.profit - a.profit);
  }
};

module.exports = { user, record, payment, invoice, deposit, report, reload: load };
