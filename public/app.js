// ═══════════════════════════════════════════════════════════════
// Vehicle Expense Tracker — Frontend
// ═══════════════════════════════════════════════════════════════

let token = localStorage.getItem('vet_token') || '';
let currentUser = null;
let lang = localStorage.getItem('vet_lang') || 'en';
let editingRecordId = null;
let editingPaymentId = null;

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ─── Language ─────────────────────────────────────────────────
const T = {
  en: {
    deposit:'Deposit', expense:'Expense', balance:'Balance', manage:'Manage',
    expenses:'Expenses', payments:'Payments', reports:'Reports', users:'Users',
    date:'Date', description:'Description', qty:'QTY', carType:'Car Type',
    plateNo:'Plate No.', amount:'Amount', usedBy:'Used By', action:'Action',
    status:'Status', payDate:'Pay Date', notes:'Notes',
    period:'Period', records:'Records', totalAmount:'Total Amount',
    new:'New', addUser:'Add User', allStatus:'All Status',
    paid:'Paid', unpaid:'Unpaid', cancel:'Cancel', save:'Save',
    update:'Update', confirm:'Confirm', logout:'Logout',
    noRecords:'No records found', noPayments:'No payment records',
    newRecord:'New Record', editRecord:'Edit Record',
    newPayment:'New Payment', editPayment:'Edit Payment',
    manageDeposit:'Manage Deposit', current:'Current', actionOp:'Action',
    addOp:'Add (+)', subOp:'Subtract (-)', setOp:'Set Exact',
    daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly',
    loadSample:'Load Sample', exportCSV:'Export CSV', clearAll:'Clear All',
    login: 'Login / 登录', username: 'Username / 用户名', password: 'Password / 密码',
    addUserTitle: 'Add User',
    deleteConfirm: 'Delete this record?', payDeleteConfirm: 'Delete this payment?',
    clearConfirm: 'Delete ALL records?',
    sampleConfirm: 'This will replace all existing records. Continue?',
    pleaseLogin: 'Please enter username and password',
    loginFailed: 'Login failed',
    selectDate: 'Please select a date',
  },
  zh: {
    deposit:'预存款', expense:'支出', balance:'余额', manage:'管理',
    expenses:'费用记录', payments:'付款记录', reports:'统计报表', users:'用户管理',
    date:'日期', description:'描述', qty:'数量', carType:'车型',
    plateNo:'车牌号', amount:'金额', usedBy:'使用人', action:'操作',
    status:'状态', payDate:'付款日期', notes:'备注',
    period:'周期', records:'记录数', totalAmount:'合计金额',
    new:'新增', addUser:'添加用户', allStatus:'全部状态',
    paid:'已付款', unpaid:'未付款', cancel:'取消', save:'保存',
    update:'更新', confirm:'确认', logout:'退出',
    noRecords:'暂无记录', noPayments:'暂无付款记录',
    newRecord:'新增记录', editRecord:'编辑记录',
    newPayment:'新增付款', editPayment:'编辑付款',
    manageDeposit:'管理预存款', current:'当前', actionOp:'操作',
    addOp:'追加 (+)', subOp:'减少 (-)', setOp:'设置为',
    daily:'日报', weekly:'周报', monthly:'月报', yearly:'年报',
    loadSample:'加载示例', exportCSV:'导出CSV', clearAll:'清空',
    login: '登录 / Login', username: '用户名 / Username', password: '密码 / Password',
    addUserTitle: '添加用户',
    deleteConfirm: '确定删除此记录？', payDeleteConfirm: '确定删除此付款记录？',
    clearConfirm: '确定删除所有记录？',
    sampleConfirm: '将替换所有现有数据，确定继续？',
    pleaseLogin: '请输入用户名和密码',
    loginFailed: '登录失败',
    selectDate: '请选择日期',
  }
};

function t(key) { return T[lang][key] || key; }

function switchLang() {
  lang = lang === 'en' ? 'zh' : 'en';
  localStorage.setItem('vet_lang', lang);
  document.getElementById('btnLang').textContent = lang === 'en' ? '中文' : 'English';
  applyLang();
}

function applyLang() {
  document.querySelectorAll('[data-en][data-zh]').forEach(el => {
    el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-zh');
  });
  document.querySelectorAll('input[placeholder]').forEach(el => {
    // placeholder switching handled via the placeholder attr
  });
  // Update placeholder texts
  const fDesc = document.getElementById('fDesc');
  const fCarType = document.getElementById('fCarType');
  const fPlate = document.getElementById('fPlate');
  const fGuy = document.getElementById('fGuy');
  if (fDesc) fDesc.placeholder = t('description');
  if (fCarType) fCarType.placeholder = t('carType');
  if (fPlate) fPlate.placeholder = t('plateNo');
  if (fGuy) fGuy.placeholder = t('usedBy');

  // Update filter bar payment placeholders
  const fPPlate = document.getElementById('fPPlate');
  if (fPPlate) fPPlate.placeholder = t('plateNo');

  // Update select options
  const fPStatus = document.getElementById('fPStatus');
  if (fPStatus) {
    fPStatus.options[0].textContent = t('allStatus');
    fPStatus.options[1].textContent = t('paid');
    fPStatus.options[2].textContent = t('unpaid');
  }

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    const key = tab.getAttribute('data-tab');
    if (key === 'expenses') tab.textContent = t('expenses');
    else if (key === 'payments') tab.textContent = t('payments');
    else if (key === 'invoice') tab.textContent = lang === 'en' ? 'Invoice' : '开单';
    else if (key === 'reports') tab.textContent = t('reports');
    else if (key === 'users') tab.textContent = t('users');
  });

  // Re-render
  renderRecords();
  renderPayments();
}

// ─── API ──────────────────────────────────────────────────────
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (res.status === 401) { doLogout(); throw new Error('Unauthorized'); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const errEl = document.getElementById('loginError');
  if (!username || !password) { errEl.textContent = t('pleaseLogin'); return; }
  try {
    const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    token = data.token;
    currentUser = { username: data.username, role: data.role };
    localStorage.setItem('vet_token', token);
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    document.getElementById('userBadge').textContent = data.username + (data.role === 'admin' ? ' (admin)' : '');
    if (data.role === 'admin') {
      document.getElementById('tabUsers').style.display = '';
      document.getElementById('profitBtn').style.display = '';
      document.getElementById('profitGroup').style.display = '';
    } else {
      ['tabInvoice','tabReports','tabUsers'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      ['invoice','reports','users'].forEach(t => { const el = document.querySelector('.tab[data-tab="'+t+'"]'); if (el) el.style.display = 'none'; });
    }
    initApp();
  } catch (e) {
    errEl.textContent = t('loginFailed') + ': ' + e.message;
  }
}

function doLogout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('vet_token');
  document.getElementById('loginPage').style.display = '';
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// ─── Init ─────────────────────────────────────────────────────
function initApp() {
  applyLang();
  loadRecords();
  loadDeposit();
  connectSSE();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab[data-tab="expenses"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tabExpenses').classList.add('active');
}

// Tab switching
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    // Verify token
    api('/api/records?limit=1').then(() => {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUser = { username: payload.username, role: payload.role };
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('appPage').style.display = 'block';
      document.getElementById('userBadge').textContent = payload.username + (payload.role === 'admin' ? ' (admin)' : '');
      if (payload.role === 'admin') {
        document.getElementById('tabUsers').style.display = '';
        document.getElementById('profitBtn').style.display = '';
        document.getElementById('profitGroup').style.display = '';
      } else {
        // Non-admin: hide Invoice, Reports, Users tabs
        ['tabInvoice','tabReports','tabUsers'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        ['invoice','reports','users'].forEach(t => { const el = document.querySelector('.tab[data-tab="'+t+'"]'); if (el) el.style.display = 'none'; });
      }
      initApp();
    }).catch(() => { doLogout(); });
  }
  document.getElementById('btnLang').textContent = lang === 'en' ? '中文' : 'English';

  // Tab clicks
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-tab');
      switchTab(id);
    });
  });

  // Enter key to login
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabBtn = document.querySelector('.tab[data-tab="' + id + '"]');
  if (tabBtn) tabBtn.classList.add('active');
  if (id === 'expenses') { document.getElementById('tabExpenses').classList.add('active'); renderRecords(); }
  else if (id === 'payments') { document.getElementById('tabPayments').classList.add('active'); renderPayments(); }
  else if (id === 'invoice') { document.getElementById('tabInvoice').classList.add('active'); initInvoice(); }
  else if (id === 'reports') { document.getElementById('tabReports').classList.add('active'); if (currentUser && currentUser.role === 'admin') { document.getElementById('profitBtn').style.display = ''; document.getElementById('profitGroup').style.display = ''; } loadReport('daily'); }
  else if (id === 'users') { document.getElementById('tabUsers').classList.add('active'); loadUsers(); }
  applyLang();
}

// ─── SSE ──────────────────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/api/events?token=' + encodeURIComponent(token));
  es.addEventListener('record_created', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('record_updated', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('record_deleted', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('payment_updated', () => renderPayments());
  es.addEventListener('deposit_updated', () => loadDeposit());
  es.addEventListener('invoice_updated', () => { if (document.getElementById('tabInvoice').classList.contains('active')) renderInvSavedList(); });
  es.addEventListener('connected', () => {});
  es.onerror = () => { es.close(); setTimeout(connectSSE, 5000); };
}

// ─── Date Formatting ──────────────────────────────────────────
// English: DDMMMYY (e.g., 26MAY26). Chinese: YYYY年MM月DD日
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = parts[2];
  const m = parseInt(parts[1]) - 1;
  if (lang === 'zh') return parts[0] + '年' + parts[1] + '月' + parts[2] + '日';
  return d + MONTHS[m] + parts[0].slice(2);
}

// Parse DDMMMYY back to YYYY-MM-DD for input fields
function parseDisplayDate(str) {
  if (!str) return '';
  const m = str.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (m) {
    const monthIdx = MONTHS.indexOf(m[2]);
    if (monthIdx >= 0) return '20' + m[3] + '-' + String(monthIdx + 1).padStart(2,'0') + '-' + m[1];
  }
  return str;
}

function formatNum(n) { return Number(n || 0).toLocaleString('en-US'); }
function esc(v) { if (!v && v !== 0) return ''; return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── Deposit ──────────────────────────────────────────────────
async function loadDeposit() {
  try {
    const fDateTo = document.getElementById('fDateTo').value;
    const fDateFrom = document.getElementById('fDateFrom').value;
    const date = fDateTo || fDateFrom || new Date().toISOString().slice(0,10);
    const data = await api('/api/deposit?date=' + date);
    document.getElementById('sumDeposit').textContent = formatNum(data.amount);
    document.getElementById('sumExpense').textContent = formatNum(data.expense);
    document.getElementById('sumBalance').textContent = formatNum(data.balance);
    const balEl = document.getElementById('sumBalance');
    balEl.style.color = data.balance >= 0 ? 'var(--blue)' : 'var(--danger)';
  } catch(e) { /* ignore */ }
}

function showDepositModal() {
  document.getElementById('dCurrent').value = formatNum(document.getElementById('sumDeposit').textContent.replace(/,/g,''));
  document.getElementById('dOp').value = 'set';
  document.getElementById('dAmount').value = '';
  const fDateTo = document.getElementById('fDateTo').value;
  const fDateFrom = document.getElementById('fDateFrom').value;
  document.getElementById('dDate').value = fDateTo || fDateFrom || new Date().toISOString().slice(0,10);
  document.getElementById('depositModal').classList.add('active');
  applyLang();
}

async function updateDeposit() {
  const op = document.getElementById('dOp').value;
  const amt = parseInt(document.getElementById('dAmount').value) || 0;
  let current = parseInt(document.getElementById('dCurrent').value.replace(/,/g,'')) || 0;
  if (op === 'add') current += amt;
  else if (op === 'sub') current = Math.max(0, current - amt);
  else current = amt;
  const date = document.getElementById('dDate').value || new Date().toISOString().slice(0,10);
  try {
    await api('/api/deposit', { method: 'PUT', body: JSON.stringify({ amount: current, date: date }) });
    document.getElementById('depositModal').classList.remove('active');
    loadDeposit();
  } catch(e) { alert(e.message); }
}

// ─── Records ──────────────────────────────────────────────────
async function loadRecords() {
  try {
    const fDateFrom = document.getElementById('fDateFrom').value;
    const fDateTo = document.getElementById('fDateTo').value;
    const fDesc = document.getElementById('fDesc').value;
    const fCarType = document.getElementById('fCarType').value;
    const fPlate = document.getElementById('fPlate').value;
    const fGuy = document.getElementById('fGuy').value;
    const params = new URLSearchParams();
    if (fDateFrom) params.set('date_from', fDateFrom);
    if (fDateTo) params.set('date_to', fDateTo);
    if (fDesc) params.set('desc', fDesc);
    if (fCarType) params.set('car_type', fCarType);
    if (fPlate) params.set('plate', fPlate);
    if (fGuy) params.set('used_by', fGuy);

    const data = await api('/api/records?' + params.toString());
    renderRecordsData(data);
    loadDeposit(); // sync deposit card to selected date
  } catch(e) { /* ignore */ }
}

function renderRecords() { loadRecords(); }

function renderRecordsData(data) {
  const tbody = document.getElementById('recordsBody');
  document.getElementById('recordCount').textContent = (lang === 'en' ? 'Records: ' : '记录数: ') + data.length;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="no-data">' + t('noRecords') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td class="w-seq text-center">${r.seq || ''}</td>
      <td class="w-date">${formatDate(r.date)}</td>
      <td class="w-desc">${esc(r.description)}</td>
      <td class="w-qty text-center">${esc(r.qty)}</td>
      <td class="w-type">${esc(r.car_type)}</td>
      <td class="w-plate">${esc(r.plate_number)}</td>
      <td class="w-amt text-right">${formatNum(r.amount)}</td>
      <td class="w-guy">${esc(r.used_by)}</td>
      <td class="w-act text-center">
        <button class="btn-xs btn-edit" onclick="editRecord(${r.id})">${lang==='en'?'Edit':'编辑'}</button>
        <button class="btn-xs btn-del" onclick="deleteRecord(${r.id})">${lang==='en'?'Del':'删除'}</button>
      </td>
    </tr>
  `).join('');
}

function showRecordModal() {
  editingRecordId = null;
  document.getElementById('recordModalTitle').textContent = t('newRecord');
  document.getElementById('btnSaveRecord').textContent = t('save');
  document.getElementById('mDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('mDesc').value = '';
  document.getElementById('mQty').value = '';
  document.getElementById('mCarType').value = '';
  document.getElementById('mPlate').value = '';
  document.getElementById('mAmount').value = '';
  document.getElementById('mGuy').value = '';
  document.getElementById('recordModal').classList.add('active');
  loadAutocomplete();
}

let autocompleteCache = null;

async function loadAutocomplete() {
  // Skip if already loaded within last 30 seconds
  if (autocompleteCache && Date.now() - autocompleteCache.ts < 30000) {
    return;
  }
  try {
    const data = await api('/api/autocomplete');
    autocompleteCache = { ...data, ts: Date.now() };
  } catch(e) { /* use cached or empty */ }
  if (!autocompleteCache) return;

  const fillDatalist = (id, items) => {
    const dl = document.getElementById(id);
    if (!dl || dl.children.length > 0) return; // already populated
    items.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      dl.appendChild(opt);
    });
  };

  fillDatalist('dlDesc', autocompleteCache.descriptions || []);
  fillDatalist('dlCarType', autocompleteCache.car_types || []);
  fillDatalist('dlPlate', autocompleteCache.plate_numbers || []);
  fillDatalist('dlGuy', autocompleteCache.used_by || []);
}

async function editRecord(id) {
  try {
    const data = await api('/api/records?limit=500');
    const r = data.find(x => x.id === id);
    if (!r) return;
    editingRecordId = id;
    document.getElementById('recordModalTitle').textContent = t('editRecord');
    document.getElementById('btnSaveRecord').textContent = t('update');
    document.getElementById('mDate').value = r.date;
    document.getElementById('mDesc').value = r.description;
    document.getElementById('mQty').value = r.qty;
    document.getElementById('mCarType').value = r.car_type;
    document.getElementById('mPlate').value = r.plate_number;
    document.getElementById('mAmount').value = r.amount;
    document.getElementById('mGuy').value = r.used_by;
    document.getElementById('recordModal').classList.add('active');
  } catch(e) { alert(e.message); }
}

async function saveRecord() {
  const date = document.getElementById('mDate').value;
  const desc = document.getElementById('mDesc').value.trim();
  const qty = document.getElementById('mQty').value.trim();
  const carType = document.getElementById('mCarType').value.trim();
  const plate = document.getElementById('mPlate').value.trim();
  const amount = parseInt(document.getElementById('mAmount').value) || 0;
  const guy = document.getElementById('mGuy').value.trim();

  if (!date) { alert(lang === 'en' ? 'Date is required' : '请选择日期'); return; }
  if (!desc) { alert(lang === 'en' ? 'Description is required' : '请填写描述'); return; }
  if (!plate) { alert(lang === 'en' ? 'Plate No. is required' : '请填写车牌号'); return; }
  if (!amount) { alert(lang === 'en' ? 'Amount is required' : '请填写金额'); return; }
  if (!guy) { alert(lang === 'en' ? 'Used By is required' : '请填写使用人'); return; }

  const body = { date, description: desc, qty, car_type: carType, plate_number: plate, amount, used_by: guy };

  try {
    if (editingRecordId) {
      await api('/api/records/' + editingRecordId, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api('/api/records', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal('recordModal');
    loadRecords();
  } catch(e) { alert(e.message); }
}

async function deleteRecord(id) {
  if (!confirm(t('deleteConfirm'))) return;
  try {
    await api('/api/records/' + id, { method: 'DELETE' });
    loadRecords();
  } catch(e) { alert(e.message); }
}

// ─── Payments ─────────────────────────────────────────────────
async function loadPayments() {
  try {
    const plate = document.getElementById('fPPlate') ? document.getElementById('fPPlate').value : '';
    const status = document.getElementById('fPStatus') ? document.getElementById('fPStatus').value : '';
    const params = new URLSearchParams();
    if (plate) params.set('plate', plate);
    if (status) params.set('status', status);
    return await api('/api/payments?' + params.toString());
  } catch(e) { return []; }
}

async function renderPayments() {
  const data = await loadPayments();
  const tbody = document.getElementById('paymentsBody');
  const isAdmin = currentUser && currentUser.role === 'admin';
  const colSpan = isAdmin ? 8 : 7;

  // Show/hide amount header and modal field
  const amtHeader = document.getElementById('payAmtHeader');
  const amtRow = document.getElementById('payAmtRow');
  if (amtHeader) amtHeader.style.display = isAdmin ? '' : 'none';
  if (amtRow) amtRow.style.display = isAdmin ? '' : 'none';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="'+colSpan+'" class="no-data">' + t('noPayments') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="w-plate">${esc(p.plate_number)}</td>
      <td class="w-status">
        <span class="badge ${p.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${t(p.status)}</span>
      </td>
      <td class="w-date">${p.in_date ? formatDate(p.in_date) : '-'}</td>
      <td class="w-date">${p.out_date ? formatDate(p.out_date) : '-'}</td>
      <td class="w-date">${p.payment_date ? formatDate(p.payment_date) : '-'}</td>
      ${isAdmin ? `<td class="w-amt text-right">${p.amount ? formatNum(p.amount) : '-'}</td>` : ''}
      <td class="w-desc">${esc(p.notes)}</td>
      <td class="w-act text-center">
        <button class="btn-xs btn-edit" onclick="editPayment(${p.id})">${lang==='en'?'Edit':'编辑'}</button>
        <button class="btn-xs btn-del" onclick="deletePayment(${p.id})">${lang==='en'?'Del':'删除'}</button>
      </td>
    </tr>
  `).join('');
}

async function syncPayments() {
  try {
    const result = await api('/api/payments/sync', { method: 'POST' });
    if (result.created.length > 0) {
      alert((lang === 'en' ? 'Synced ' : '已同步 ') + result.created.length + (lang === 'en' ? ' plate(s) from recent expenses' : ' 个车牌号'));
    } else {
      alert(lang === 'en' ? 'All plates already synced' : '所有车牌号已同步');
    }
    renderPayments();
  } catch(e) { alert(e.message); }
}

function showPaymentModal() {
  editingPaymentId = null;
  document.getElementById('paymentModalTitle').textContent = t('newPayment');
  document.getElementById('btnSavePayment').textContent = t('save');
  document.getElementById('mPPlate').value = '';
  document.getElementById('mPStatus').value = 'unpaid';
  document.getElementById('mPInDate').value = '';
  document.getElementById('mPOutDate').value = '';
  document.getElementById('mPPayDate').value = '';
  document.getElementById('mPAmount').value = '';
  document.getElementById('mPNotes').value = '';
  document.getElementById('paymentModal').classList.add('active');
}

async function editPayment(id) {
  const data = await loadPayments();
  const p = data.find(x => x.id === id);
  if (!p) return;
  editingPaymentId = id;
  document.getElementById('paymentModalTitle').textContent = t('editPayment');
  document.getElementById('btnSavePayment').textContent = t('update');
  document.getElementById('mPPlate').value = p.plate_number;
  document.getElementById('mPStatus').value = p.status;
  document.getElementById('mPInDate').value = p.in_date || '';
  document.getElementById('mPOutDate').value = p.out_date || '';
  document.getElementById('mPPayDate').value = p.payment_date || '';
  document.getElementById('mPAmount').value = p.amount || '';
  document.getElementById('mPNotes').value = p.notes || '';
  document.getElementById('paymentModal').classList.add('active');
}

async function savePayment() {
  const plate = document.getElementById('mPPlate').value.trim();
  const status = document.getElementById('mPStatus').value;
  const inDate = document.getElementById('mPInDate').value;
  const outDate = document.getElementById('mPOutDate').value;
  const payDate = document.getElementById('mPPayDate').value;
  const amount = parseInt(document.getElementById('mPAmount').value) || 0;
  const notes = document.getElementById('mPNotes').value.trim();

  if (!plate) { alert('Plate number is required'); return; }

  const body = { plate_number: plate, status, in_date: inDate, out_date: outDate, payment_date: payDate, amount, notes };
  try {
    if (editingPaymentId) {
      await api('/api/payments/' + editingPaymentId, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api('/api/payments', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal('paymentModal');
    renderPayments();
  } catch(e) { alert(e.message); }
}

async function deletePayment(id) {
  if (!confirm(t('payDeleteConfirm'))) return;
  try {
    await api('/api/payments/' + id, { method: 'DELETE' });
    renderPayments();
  } catch(e) { alert(e.message); }
}

// ─── Car Parts Bilingual Map (EN → ZH) ─────────────────────
const PARTS_ZH = {
  'AC GAS':'空调冷媒','AIR FILTER':'空气滤清器','ALTERNATOR':'发电机','BALL JOINT':'球头',
  'BATTERY':'电瓶','BRAKE CALIPER':'刹车分泵','BRAKE DISC':'刹车盘','BRAKE DRUM':'刹车鼓',
  'BRAKE MASTER CYLINDER':'刹车总泵','BRAKE PAD':'刹车片','BRAKE PIPE':'刹车管',
  'BRAKE SHOE':'刹车蹄','BULB':'灯泡','BUMPER':'保险杠','CAMSHAFT':'凸轮轴',
  'CAR WASH':'洗车','CLUTCH':'离合器','CLUTCH CYLINDER':'离合器分泵','CLUTCH DISC':'离合器片',
  'COIL SPRING':'弹簧','COMPRESSOR':'压缩机','COMPRESSOR OIL':'压缩机油','CONDENSER':'冷凝器',
  'CONNECTING ROD':'连杆','CONTROL ARM':'控制臂','COOLANT':'冷却液','CRANKSHAFT':'曲轴',
  'CV JOINT':'球笼','CYLINDER HEAD':'缸盖','DIFFERENTIAL':'差速器','DRIVE SHAFT':'传动轴',
  'ENGINE':'发动机','ENGINE GASKET':'发动机垫片','ENGINE MOUNTING':'发动机支架',
  'ENGINE OIL':'机油','EVAPORATOR':'蒸发器','EXHAUST MUFFLER':'排气管消声器',
  'EXPANSION':'膨胀阀','EXPANSION VALVE':'膨胀阀','FLYWHEEL':'飞轮','FOG LIGHT':'雾灯',
  'FUEL FILTER':'燃油滤清器','FUEL INJECTOR':'喷油嘴','FUEL PUMP':'燃油泵','FUSE':'保险丝',
  'GASKET':'垫片','GASKET MAKER':'密封胶','GEAR OIL':'齿轮油','GEARBOX':'变速箱',
  'HEAD GASKET':'缸垫','HEADLIGHT':'大灯','HORN':'喇叭','HOSE':'软管',
  'IGNITION COIL':'点火线圈','INJECTION NOZZLE':'喷油嘴','LED BULB':'LED灯泡',
  'LOWER ARM':'下摆臂','MASTER CYLINDER':'总泵','OIL COOLER':'机油冷却器',
  'OIL FILTER':'机油滤清器','OIL PAN':'油底壳','OIL PUMP':'机油泵','OIL SEAL':'油封',
  'OXYGEN SENSER':'氧传感器','OXYGEN SENSOR':'氧传感器','PETROL':'汽油','PISTON':'活塞',
  'PISTON RING':'活塞环','RADIATOR':'水箱','RADIATOR CAP':'水箱盖','RADIATOR FAN':'散热风扇',
  'RADIATOR HOSE':'水箱管','RELAY':'继电器','SHOCK ABSORBER':'减震器','SPARK PLUG':'火花塞',
  'STARTER':'启动机','STARTER MOTOR':'启动马达','STEERING RACK':'方向机',
  'SUSPENSION BUSHING':'悬挂胶套','TAILLIGHT':'尾灯','TENSIONER':'涨紧轮','THERMOSTAT':'节温器',
  'TIE ROD END':'方向机拉杆球头','TIMING BELT':'正时皮带','TIMING CHAIN':'正时链条',
  'TIRE':'轮胎','TURBOCHARGER':'涡轮增压器','TYRE':'轮胎','VALVE':'气门',
  'VALVE SEAL':'气门油封','VALVE SPRING':'气门弹簧','WATER PUMP':'水泵',
  'WHEEL BEARING':'轮毂轴承','WHEEL CYLINDER':'刹车分泵','WIPER':'雨刮器',
  'WIPER BLADE':'雨刮片','WIRING HARNESS':'线束','FUNDI':'人工费','CAR WASH':'洗车',
  'TRANSPORT':'运输费','OVERHAUL':'大修','DRIVER':'司机费',
};
function translatePart(name) {
  const upper = (name || '').trim().toUpperCase();
  if (PARTS_ZH[upper]) return name + ' - ' + PARTS_ZH[upper];
  // Try partial match
  for (const [en, zh] of Object.entries(PARTS_ZH)) {
    if (upper.includes(en)) return name + ' - ' + zh;
  }
  return name;
}

// ─── Invoice ───────────────────────────────────────────────────
const INV_TOTAL_ROWS = 14;
let invCurrentId = null;
let invInited = false;

// Number to English words
const ONES = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
const TENS = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
const THOUSANDS = ['','THOUSAND','MILLION','BILLION'];

function numToEnglish(num) {
  if (!num || num <= 0) return 'ZERO TZS ONLY';
  let n = Math.round(num);
  if (n === 0) return 'ZERO TZS ONLY';
  function convertHundred(m) {
    let s = '';
    if (m >= 100) { s += ONES[Math.floor(m/100)] + ' HUNDRED'; m %= 100; if (m > 0) s += ' AND '; }
    if (m >= 20) { s += TENS[Math.floor(m/10)]; if (m % 10 > 0) s += ' ' + ONES[m % 10]; }
    else if (m > 0) { s += ONES[m]; }
    return s;
  }
  let parts = [], ui = 0;
  while (n > 0) {
    let c = n % 1000;
    if (c > 0) { let cs = convertHundred(c); if (THOUSANDS[ui]) cs += ' ' + THOUSANDS[ui]; parts.unshift(cs); }
    n = Math.floor(n / 1000); ui++;
  }
  return parts.join(' ') + ' TZS ONLY';
}

function invDatePrefix(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yy + mm + dd;
}

function onInvDateChange() {
  const dateStr = document.getElementById('invDate').value;
  const curNo = document.getElementById('invOrderNo').value;
  const expectedPrefix = invDatePrefix(dateStr);
  if (!curNo || curNo.startsWith(expectedPrefix) || curNo.length === 8) {
    refreshOrderNo();
  }
}

async function refreshOrderNo() {
  const date = document.getElementById('invDate').value || new Date().toISOString().slice(0,10);
  try {
    const data = await api('/api/invoices/next-order-no?date=' + date);
    document.getElementById('invOrderNo').value = data.orderNo;
  } catch(e) { /* ignore */ }
}

async function initInvoice() {
  if (!invInited) {
    document.getElementById('invDate').value = new Date().toISOString().slice(0, 10);
    await refreshOrderNo();
    loadInvAutocomplete();
    buildInvTable();
    invInited = true;
  }
  calcInvTotals();
  renderInvSavedList();
}

async function loadInvAutocomplete() {
  try {
    const [autoData, invoices] = await Promise.all([
      api('/api/autocomplete'),
      api('/api/invoices')
    ]);
    const fillDl = (id, items) => {
      const dl = document.getElementById(id);
      if (!dl || dl.children.length > 0) return;
      items.forEach(v => { const o = document.createElement('option'); o.value = v; dl.appendChild(o); });
    };
    fillDl('dlInvPlate', autoData.plate_numbers || []);
    fillDl('dlInvPart', autoData.spare_parts || []);
    // Client names from invoice history
    const customers = [...new Set(invoices.map(inv => inv.customer).filter(Boolean))].sort();
    fillDl('dlInvCustomer', customers);
  } catch(e) { /* ignore */ }
}

function buildInvTable() {
  const tbody = document.getElementById('invPartsTable');
  let html = '';
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    html += `<tr>
      <td class="inv-row-num">${i}</td>
      <td><input class="inv-inp-name" data-invrow="${i}" data-invfield="name" placeholder="" list="dlInvPart" autocomplete="off" oninput="onInvNameChange(${i})"></td>
      <td><input class="inv-inp-unit" data-invrow="${i}" data-invfield="unit" placeholder=""></td>
      <td><input class="inv-inp-qty" data-invrow="${i}" data-invfield="qty" type="number" step="1" placeholder="1" oninput="calcInvRow(${i});calcInvTotals()"></td>
      <td><input class="inv-inp-cost" data-invrow="${i}" data-invfield="cost" type="number" step="0.01" placeholder="0" oninput="calcInvRow(${i});calcInvTotals()"></td>
      <td><input class="inv-inp-labor" data-invrow="${i}" data-invfield="labor" type="number" step="0.01" placeholder="0" oninput="calcInvRow(${i});calcInvTotals()"></td>
      <td><input class="inv-inp-amount" data-invrow="${i}" data-invfield="amount" type="text" placeholder="0" readonly></td>
      <td><input class="inv-inp-remark" data-invrow="${i}" data-invfield="remark" placeholder=""></td>
    </tr>`;
  }
  tbody.innerHTML = html;
}

function onInvNameChange(row) {
  const nameEl = document.querySelector('[data-invrow="'+row+'"][data-invfield="name"]');
  const name = (nameEl.value || '').toUpperCase().trim();
  // VAT detection: auto-set QTY to 0.18
  if (name === 'VAT' || name.includes('VAT')) {
    document.querySelector('[data-invrow="'+row+'"][data-invfield="qty"]').value = '0.18';
  }
  calcInvTotals();
}

function calcInvRow(row) {
  // Just updates this row's AMOUNT instantly; VAT handled in calcInvTotals
  const nameEl = document.querySelector('[data-invrow="'+row+'"][data-invfield="name"]');
  const name = (nameEl.value || '').toUpperCase().trim();
  if (name === 'VAT' || name.includes('VAT')) {
    document.querySelector('[data-invrow="'+row+'"][data-invfield="qty"]').value = '0.18';
  }
  calcInvTotals(); // let calcInvTotals handle everything
}

function calcInvTotals() {
  // Find VAT row
  let vatRow = -1;
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    const name = (document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value || '').toUpperCase().trim();
    if (name === 'VAT' || name.includes('VAT')) { vatRow = i; break; }
  }

  // Calculate non-VAT rows and update their AMOUNT
  let nonVatTotal = 0;
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    if (i === vatRow) continue;
    const qty = parseFloat(document.querySelector('[data-invrow="'+i+'"][data-invfield="qty"]').value) || 0;
    const cost = parseFloat(document.querySelector('[data-invrow="'+i+'"][data-invfield="cost"]').value) || 0;
    const labor = parseFloat(document.querySelector('[data-invrow="'+i+'"][data-invfield="labor"]').value) || 0;
    const amt = qty * cost + labor;
    document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value = amt > 0 ? amt.toLocaleString('en-US') : '';
    nonVatTotal += amt;
  }

  let total = nonVatTotal;
  if (vatRow > 0) {
    // VAT: COST = sum of other AMOUNTs, QTY = 0.18, VAT AMOUNT = 0.18 * nonVatTotal
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="qty"]').value = '0.18';
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="cost"]').value = nonVatTotal;
    const vatAmt = Math.round(0.18 * nonVatTotal);
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="amount"]').value = vatAmt > 0 ? vatAmt.toLocaleString('en-US') : '';
    total = nonVatTotal + vatAmt;
  }

  document.getElementById('invTotalAll').textContent = total.toLocaleString('en-US');
  document.getElementById('invEngAmount').textContent = numToEnglish(total);
}

function getInvFormData() {
  const items = [];
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    const name = document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value.trim();
    const unit = document.querySelector('[data-invrow="'+i+'"][data-invfield="unit"]').value.trim();
    const qty = document.querySelector('[data-invrow="'+i+'"][data-invfield="qty"]').value.trim();
    const cost = document.querySelector('[data-invrow="'+i+'"][data-invfield="cost"]').value.trim();
    const labor = document.querySelector('[data-invrow="'+i+'"][data-invfield="labor"]').value.trim();
    const amount = document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value.trim();
    const remark = document.querySelector('[data-invrow="'+i+'"][data-invfield="remark"]').value.trim();
    if (name) items.push({ name, unit, qty, cost, labor, amount, remark });
  }
  return {
    orderNo: document.getElementById('invOrderNo').value,
    plate: document.getElementById('invPlate').value.trim(),
    customer: document.getElementById('invCustomer').value.trim(),
    date: document.getElementById('invDate').value,
    remark: document.getElementById('invRemark').value.trim(),
    items
  };
}

function setInvFormData(data) {
  document.getElementById('invOrderNo').value = data.orderNo || '';
  document.getElementById('invPlate').value = data.plate || '';
  document.getElementById('invCustomer').value = data.customer || '';
  document.getElementById('invDate').value = data.date || '';
  document.getElementById('invRemark').value = data.remark || '';
  // Clear all rows
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    ['name','unit','qty','cost','labor','amount','remark'].forEach(f => {
      document.querySelector('[data-invrow="'+i+'"][data-invfield="'+f+'"]').value = '';
    });
  }
  // Fill items
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, idx) => {
      if (idx < INV_TOTAL_ROWS) {
        const i = idx + 1;
        document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value = item.name || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="unit"]').value = item.unit || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="qty"]').value = item.qty || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="cost"]').value = item.cost || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="labor"]').value = item.labor || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value = item.amount || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="remark"]').value = item.remark || '';
      }
    });
  }
  calcInvTotals();
}

async function autoFillInvoice() {
  const plate = document.getElementById('invPlate').value.trim();

  // Clear items when plate is cleared
  if (!plate) {
    for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
      ['name','unit','qty','cost','labor','amount','remark'].forEach(f => {
        document.querySelector('[data-invrow="'+i+'"][data-invfield="'+f+'"]').value = '';
      });
    }
    document.getElementById('invRemark').value = '';
    calcInvTotals();
    return;
  }

  try {
    // Fetch records for this plate AND invoice history for client name
    const [records, invoices] = await Promise.all([
      api('/api/records?plate=' + encodeURIComponent(plate)),
      api('/api/invoices')
    ]);

    // --- Auto-fill client name from invoice history ---
    const prevInvoices = invoices.filter(inv => inv.plate && inv.plate.toUpperCase() === plate.toUpperCase());
    if (prevInvoices.length > 0 && !document.getElementById('invCustomer').value) {
      // Use most recent invoice's customer name
      const latestInv = prevInvoices[0];
      if (latestInv.customer) {
        document.getElementById('invCustomer').value = latestInv.customer;
      }
    }

    if (!records.length) return;

    // Only auto-fill items if table is empty
    const hasItems = document.querySelector('[data-invrow="1"][data-invfield="name"]').value;
    if (hasItems) return;

    const latest = records[0];

    // Auto-fill remark with car type, from records
    if (!document.getElementById('invRemark').value) {
      const types = [...new Set(records.map(r => r.car_type).filter(Boolean))];
      const topType = types.sort((a,b) =>
        records.filter(r => r.car_type === b).length - records.filter(r => r.car_type === a).length
      )[0] || '';
      document.getElementById('invRemark').value = topType;
    }

    // Get unique descriptions with bilingual names and fill rows
    const parts = [...new Set(records.map(r => r.description).filter(Boolean))];
    parts.slice(0, INV_TOTAL_ROWS).forEach((p, idx) => {
      const i = idx + 1;
      document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value = translatePart(p);
    });
    calcInvTotals();
  } catch(e) { /* ignore */ }
}

async function saveInvoice() {
  const data = getInvFormData();
  if (!data.plate && !data.customer) {
    alert(lang === 'en' ? 'Please fill in plate number or customer name' : '请至少填写车牌号或客户名称');
    return;
  }
  if (!data.orderNo) { await refreshOrderNo(); data.orderNo = document.getElementById('invOrderNo').value; }

  try {
    let result;
    if (invCurrentId) {
      result = await api('/api/invoices/' + invCurrentId, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      result = await api('/api/invoices', { method: 'POST', body: JSON.stringify(data) });
    }
    invCurrentId = result.id;
    document.getElementById('invOrderNo').value = result.orderNo;
    renderInvSavedList();
    alert((lang === 'en' ? 'Saved! Order No: ' : '已保存！单号：') + result.orderNo);
  } catch(e) { alert('Save failed / 保存失败: ' + e.message); }
}

async function loadInvoiceById(id) {
  try {
    const data = await api('/api/invoices/' + id);
    invCurrentId = data.id;
    switchTab('invoice');
    setInvFormData(data);
    window.scrollTo(0, 0);
  } catch(e) { alert('Load failed / 加载失败'); }
}

async function deleteInvoiceById(id, event) {
  event.stopPropagation();
  if (!confirm(lang === 'en' ? 'Delete this invoice?' : '确定删除这张单据？')) return;
  try {
    await api('/api/invoices/' + id, { method: 'DELETE' });
    if (invCurrentId === id) { newInvoice(); }
    renderInvSavedList();
  } catch(e) { alert('Delete failed / 删除失败'); }
}

async function renderInvSavedList() {
  try {
    const searchEl = document.getElementById('invSearch');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    let data = await api('/api/invoices');
    // Client-side search filter
    if (search) {
      data = data.filter(inv => {
        const total = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || Number(it.qty||0)*Number(it.cost||0)+Number(it.labor||0) || 0), 0);
        return (inv.orderNo||'').toLowerCase().includes(search) ||
               (inv.plate||'').toLowerCase().includes(search) ||
               (inv.customer||'').toLowerCase().includes(search) ||
               String(total).includes(search);
      });
    }
    const container = document.getElementById('invSavedList');
    const recent = data.slice(0, 20);
    if (!recent.length) {
      container.innerHTML = '<div style="text-align:center;color:#999;padding:20px">' + (lang === 'en' ? 'No records' : '暂无记录') + '</div>';
      return;
    }
    container.innerHTML = recent.map(inv => {
      const total = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || Number(it.qty||0)*Number(it.cost||0)+Number(it.labor||0) || 0), 0);
      return `<div class="inv-saved-item" onclick="loadInvoiceById(${inv.id})">
        <div class="inv-si-info">
          <div class="inv-si-plate">🚗 ${esc(inv.plate||'No Plate')} | ${esc(inv.orderNo||'')}</div>
          <div class="inv-si-meta">${inv.date||''} | ${esc(inv.customer||'')} | ${(inv.items||[]).length} items | TZS ${total.toLocaleString('en-US')}</div>
        </div>
        <button class="inv-si-del" onclick="deleteInvoiceById(${inv.id}, event)">${lang === 'en' ? 'Delete' : '删除'}</button>
      </div>`;
    }).join('');
  } catch(e) { /* ignore */ }
}

function newInvoice() {
  if (document.getElementById('invPlate').value || document.getElementById('invCustomer').value) {
    if (!confirm(lang === 'en' ? 'Start new? Unsaved data will be lost.' : '确定新建？未保存的内容将丢失。')) return;
  }
  invCurrentId = null;
  invInited = true; // keep table, just clear inputs
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    ['name','unit','qty','cost','labor','amount','remark'].forEach(f => {
      document.querySelector('[data-invrow="'+i+'"][data-invfield="'+f+'"]').value = '';
    });
  }
  document.getElementById('invPlate').value = '';
  document.getElementById('invCustomer').value = '';
  document.getElementById('invRemark').value = '';
  document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
  refreshOrderNo();
  calcInvTotals();
  window.scrollTo(0, 0);
}

function buildInvPrintView() {
  const data = getInvFormData();
  document.getElementById('printOrderNo').textContent = data.orderNo || '';
  document.getElementById('printCustomer').textContent = data.customer || '';
  document.getElementById('printPlate').textContent = data.plate || '';
  document.getElementById('printRemark').textContent = data.remark || '';
  document.getElementById('printDate').textContent = data.date || '';

  let total = 0;
  const items = data.items.length > 0 ? data.items : [];
  const rows = Math.max(items.length, 5);
  const tbody = document.getElementById('invPrintTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < rows; i++) {
    const item = items[i] || {};
    const c = item.cost ? Number(item.cost).toLocaleString('en-US') : '';
    const l = item.labor ? Number(item.labor).toLocaleString('en-US') : '';
    const amt = Number(item.amount) || Number(item.qty||0)*Number(item.cost||0)+Number(item.labor||0) || 0;
    total += amt;
    const a = amt > 0 ? amt.toLocaleString('en-US') : '';
    tbody.innerHTML += `<tr>
      <td>${i+1}</td><td style="text-align:left">${esc(item.name||'')}</td><td>${esc(item.unit||'')}</td>
      <td>${esc(item.qty||'')}</td><td style="text-align:right">${c}</td>
      <td style="text-align:right">${l}</td><td style="text-align:right">${a}</td>
      <td style="text-align:left">${esc(item.remark||'')}</td></tr>`;
  }
  document.getElementById('printTotal').textContent = total.toLocaleString('en-US');
  document.getElementById('printEngAmount').textContent = numToEnglish(total);
}

function printInvoice() {
  const data = getInvFormData();
  const items = data.items.length > 0 ? data.items : [];
  const rows = Math.max(items.length, 5);

  // Calculate total
  let total = 0;
  let rowsHtml = '';
  for (let i = 0; i < rows; i++) {
    const item = items[i] || {};
    const c = item.cost ? Number(item.cost).toLocaleString('en-US') : '';
    const l = item.labor ? Number(item.labor).toLocaleString('en-US') : '';
    const amt = Number(item.amount) || Number(item.qty||0)*Number(item.cost||0)+Number(item.labor||0) || 0;
    total += amt;
    const a = amt > 0 ? amt.toLocaleString('en-US') : '';
    rowsHtml += `<tr>
      <td>${i+1}</td><td style="text-align:left">${esc(item.name||'')}</td><td>${esc(item.unit||'')}</td>
      <td>${esc(item.qty||'')}</td><td style="text-align:right">${c}</td>
      <td style="text-align:right">${l}</td><td style="text-align:right">${a}</td>
      <td style="text-align:left">${esc(item.remark||'')}</td></tr>`;
  }

  const html = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>PROFORMA INVOICE</title>
  <style>
    @page{size:A5;margin:5mm}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;padding:0;margin:0;background:#fff}
    .print-wrap{border:1.5px solid #000;padding:8px;max-width:100%}
    .print-title{text-align:center;font-size:16pt;font-weight:700;padding:8px 0 4px 0;letter-spacing:1px}
    .print-subtitle{text-align:center;font-size:10pt;padding-bottom:6px;border-bottom:1.5px solid #000}
    .print-info{padding:4px 0;font-size:9pt}
    .print-line{display:flex;margin-bottom:1px}
    .print-label{width:105px;font-weight:600}
    .print-val{flex:1;border-bottom:1px dotted #999}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th{border:.5px solid #000;padding:3px 2px;font-size:7pt;text-align:center;font-weight:600}
    td{border:.5px solid #000;padding:3px 2px;font-size:8pt;text-align:center}
    .print-footer{margin-top:8px;font-size:9pt}
    .print-eng{padding:3px 0;font-size:8pt}
    .print-total-line{display:flex;justify-content:flex-end;align-items:center;padding:4px 0;border-top:1px solid #000;border-bottom:1px solid #000;gap:10px}
    .print-total-label{font-weight:600;font-size:9pt}
    .print-total-value{font-weight:700;font-size:11pt}
    .print-bank{font-size:7pt;padding:6px 0;line-height:1.5}
    .print-stamp{text-align:right;padding-top:15px;font-size:9pt;font-weight:600}
  </style></head><body>
  <div class="print-wrap">
    <div class="print-title">HOPE CAR SERVICE CO LIMITED</div>
    <div class="print-subtitle">◆ PROFORMA INVOICE / 车辆维修单据 ◆</div>
    <div class="print-info">
      <div class="print-line"><span class="print-label">ORDER NO / 单号：</span><span class="print-val">${esc(data.orderNo||'')}</span></div>
      <div class="print-line"><span class="print-label">CLIENT NAME / 客户：</span><span class="print-val">${esc(data.customer||'')}</span></div>
      <div class="print-line"><span class="print-label">PLATE NUMBER / 车牌号：</span><span class="print-val">${esc(data.plate||'')}</span></div>
      <div class="print-line"><span class="print-label">REMARK / 备注：</span><span class="print-val">${esc(data.remark||'')}</span></div>
      <div class="print-line"><span class="print-label">DATE / 日期：</span><span class="print-val">${esc(data.date||'')}</span></div>
    </div>
    <table>
      <thead>
        <tr><th>S/N</th><th style="text-align:left">ITEAM</th><th>UNIT</th><th>QTY</th><th>COST (TZS)</th><th>LABOR (TZS)</th><th>AMOUNT (TZS)</th><th style="text-align:left">REMARK</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="print-footer">
      <div class="print-eng">AMOUNT IN WORDS：<strong>${numToEnglish(total)}</strong></div>
      <div class="print-total-line">
        <span class="print-total-label">TOTAL AMOUNT (TZS) / 总金额（坦桑先令）：</span>
        <span class="print-total-value">${total.toLocaleString('en-US')}</span>
      </div>
      <div class="print-bank">
        TIN: 172-676-952<br>
        ACCOUNT NAME: HOPE CAR SERVICE CO LIMITED<br>
        ACCOUNT NO: 01500004GKA00<br>
        CRDB PUGU BRANCH
      </div>
      <div class="print-stamp">STAMP / 盖章处</div>
    </div>
  </div>
  <script>window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=850,height=700');
  w.document.write(html);
  w.document.close();
}

function exportInvoice() {
  const data = getInvFormData();
  if (!data.plate && !data.orderNo) {
    alert(lang === 'en' ? 'Please fill in order no or plate number' : '请先填写单号或车牌号');
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'INVOICE_' + (data.orderNo || data.plate) + '_' + (data.date || 'nodate') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Reports ──────────────────────────────────────────────────
async function loadReport(type, btn) {
  // Highlight active button
  document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector('.report-btn.active') || document.querySelector('.report-btn')?.classList.add('active');

  try {
    const data = await api('/api/reports/' + type);
    const tbody = document.getElementById('reportsBody');
    const totalEl = document.getElementById('reportTotal');
    let totalAmount = 0;
    let label = '';

    // Restore normal table headers
    document.getElementById('reportHead').innerHTML = `<tr>
      <th data-en="Period" data-zh="周期">Period</th>
      <th data-en="Records" data-zh="记录数">Records</th>
      <th data-en="Total Amount" data-zh="合计金额">Total Amount</th>
    </tr>`;

    tbody.innerHTML = data.map(r => {
      totalAmount += r.total || 0;
      if (type === 'daily') label = formatDate(r.date);
      else if (type === 'weekly') label = r.week + (r.start_date ? ' (' + r.start_date + ' ~ ' + r.end_date + ')' : '');
      else if (type === 'monthly') label = r.month;
      else label = r.year;
      return `<tr>
        <td>${label}</td>
        <td class="text-center">${r.count}</td>
        <td class="w-amt text-right">${formatNum(r.total)}</td>
      </tr>`;
    }).join('');

    totalEl.textContent = (lang === 'en' ? 'Total: ' : '合计: ') + formatNum(totalAmount);
    applyLang();
  } catch(e) { /* ignore */ }
}

async function loadDailySummary(btn) {
  document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    const data = await api('/api/daily-summary');
    const tbody = document.getElementById('reportsBody');
    const totalEl = document.getElementById('reportTotal');

    // Wider headers for daily summary
    document.getElementById('reportHead').innerHTML = `<tr>
      <th data-en="Date" data-zh="日期">Date</th>
      <th data-en="Opening Deposit" data-zh="期初预存">Opening Deposit</th>
      <th data-en="Expense" data-zh="支出">Expense</th>
      <th data-en="Balance" data-zh="余额">Balance</th>
    </tr>`;

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="no-data">No data</td></tr>';
      totalEl.textContent = '';
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td class="w-amt text-right" style="color:var(--green)">${formatNum(r.deposit)}</td>
        <td class="w-amt text-right" style="color:var(--orange)">${formatNum(r.expense)}</td>
        <td class="w-amt text-right" style="color:${r.balance >= 0 ? 'var(--blue)' : 'var(--danger)'}">${formatNum(r.balance)}</td>
      </tr>
    `).join('');

    totalEl.textContent = '';
    applyLang();
  } catch(e) { /* ignore */ }
}

async function loadByPlateReport(btn) {
  document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    const data = await api('/api/reports/by-plate');
    const tbody = document.getElementById('reportsBody');
    const totalEl = document.getElementById('reportTotal');
    let totalAmount = 0;

    document.getElementById('reportHead').innerHTML = `<tr>
      <th data-en="Plate No." data-zh="车牌号">Plate No.</th>
      <th data-en="Records" data-zh="记录数">Records</th>
      <th data-en="Total Amount" data-zh="合计金额">Total Amount</th>
    </tr>`;

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="no-data">No data</td></tr>';
      totalEl.textContent = '';
      return;
    }

    tbody.innerHTML = data.map(r => {
      totalAmount += r.total || 0;
      return `<tr>
        <td>${esc(r.plate_number)}</td>
        <td class="text-center">${r.count}</td>
        <td class="w-amt text-right">${formatNum(r.total)}</td>
      </tr>`;
    }).join('');

    totalEl.textContent = (lang === 'en' ? 'Total: ' : '合计: ') + formatNum(totalAmount);
    applyLang();
  } catch(e) { /* ignore */ }
}

async function loadProfitReport(group, btn) {
  if (!currentUser || currentUser.role !== 'admin') return;
  document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    const data = await api('/api/reports/profit?group=' + group);
    document.getElementById('reportHead').innerHTML = `<tr>
      <th>${group === 'monthly' ? (lang === 'en' ? 'Month' : '月份') : (lang === 'en' ? 'Plate No.' : '车牌号')}</th>
      <th style="text-align:right">${lang === 'en' ? 'Revenue (TZS)' : '收入（坦桑先令）'}</th>
      <th style="text-align:right">${lang === 'en' ? 'Cost (TZS)' : '成本（坦桑先令）'}</th>
      <th style="text-align:right">${lang === 'en' ? 'Profit (TZS)' : '毛利（坦桑先令）'}</th>
      <th style="text-align:center">${lang === 'en' ? 'Margin %' : '毛利率'}</th>
    </tr>`;

    let totalRevenue = 0, totalCost = 0, totalProfit = 0;
    document.getElementById('reportsBody').innerHTML = data.map(r => {
      totalRevenue += r.revenue;
      totalCost += r.cost;
      totalProfit += r.profit;
      const marginColor = r.margin >= 20 ? 'var(--green)' : r.margin >= 0 ? 'var(--orange)' : 'var(--danger)';
      return `<tr>
        <td>${esc(r.key)}</td>
        <td class="w-amt text-right">${formatNum(r.revenue)}</td>
        <td class="w-amt text-right">${formatNum(r.cost)}</td>
        <td class="w-amt text-right" style="color:${r.profit >= 0 ? 'var(--green)' : 'var(--danger)'}">${formatNum(r.profit)}</td>
        <td class="text-center" style="font-weight:600;color:${marginColor}">${r.margin}%</td>
      </tr>`;
    }).join('');

    const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
    document.getElementById('reportTotal').innerHTML = `
      <span>${lang === 'en' ? 'Revenue:' : '收入:'} ${formatNum(totalRevenue)}</span>
      <span style="margin-left:12px">${lang === 'en' ? 'Cost:' : '成本:'} ${formatNum(totalCost)}</span>
      <span style="margin-left:12px;color:var(--green)">${lang === 'en' ? 'Profit:' : '毛利:'} ${formatNum(totalProfit)}</span>
      <span style="margin-left:12px;color:var(--blue)">${lang === 'en' ? 'Margin:' : '毛利率:'} ${overallMargin}%</span>
    `;
    applyLang();
  } catch(e) { /* ignore */ }
}

async function downloadBackup() {
  try {
    const res = await fetch('/api/backup', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) throw new Error('Failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert('Backup failed'); }
}
async function loadUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  try {
    const data = await api('/api/users');
    document.getElementById('usersBody').innerHTML = data.map(u => `
      <tr>
        <td>${esc(u.username)}</td>
        <td>${esc(u.role)}</td>
        <td>${u.created_at || ''}</td>
      </tr>
    `).join('');
  } catch(e) { /* ignore */ }
}

function showUserModal() {
  document.getElementById('mUUser').value = '';
  document.getElementById('mUPass').value = '';
  document.getElementById('userModal').classList.add('active');
}

async function addUser() {
  const username = document.getElementById('mUUser').value.trim();
  const password = document.getElementById('mUPass').value.trim();
  if (!username || !password) { alert('Username and password required'); return; }
  try {
    await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password, role: 'user' }) });
    closeModal('userModal');
    loadUsers();
  } catch(e) { alert(e.message); }
}

// ─── Modal ────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['recordModal','paymentModal','depositModal','userModal'].forEach(id => closeModal(id));
  }
});

// ─── CSV Export ───────────────────────────────────────────────
async function exportCSV() {
  try {
    const data = await api('/api/records?' + new URLSearchParams({
      desc: document.getElementById('fDesc').value,
      car_type: document.getElementById('fCarType').value,
      plate: document.getElementById('fPlate').value,
      used_by: document.getElementById('fGuy').value,
      date_from: document.getElementById('fDateFrom').value,
      date_to: document.getElementById('fDateTo').value,
    }).toString());
    const header = 'Date,Description,QTY,Car Type,Plate Number,Amount,Used By';
    const rows = data.map(r =>
      [formatDate(r.date), '"'+(r.description||'').replace(/"/g,'""')+'"', r.qty, '"'+(r.car_type||'')+'"', '"'+(r.plate_number||'')+'"', r.amount, '"'+(r.used_by||'')+'"'].join(',')
    );
    const csv = '﻿' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle_expenses_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert(e.message); }
}

// ─── XLSX Import ─────────────────────────────────────────────
function importXLSX() {
  document.getElementById('xlsxFileInput').click();
}

function handleXLSXFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.match(/\.xlsx?$/i)) {
    alert(lang === 'en' ? 'Please select an .xlsx or .xls file' : '请选择 .xlsx 或 .xls 文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function() {
    const base64 = reader.result.split(',')[1];
    try {
      const result = await api('/api/import', {
        method: 'POST',
        body: JSON.stringify({ base64 })
      });
      alert((lang === 'en' ? 'Imported ' : '成功导入 ') + result.imported + ' / ' + result.total + (lang === 'en' ? ' records' : ' 条记录'));
      loadRecords();
    } catch (e) {
      alert((lang === 'en' ? 'Import failed: ' : '导入失败: ') + e.message);
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ─── Backup Restore ──────────────────────────────────────────
async function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm(lang === 'en' ? 'Restore backup? This will replace ALL current data. A safety backup will be saved on the server.' : '确认恢复备份？将替换所有现有数据，服务器会保留一份安全备份。')) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await api('/api/restore', { method: 'POST', body: JSON.stringify(data) });
    alert(lang === 'en' ? 'Restore successful. Reloading...' : '恢复成功，重新加载...');
    location.reload();
  } catch(e) {
    alert((lang === 'en' ? 'Restore failed: ' : '恢复失败: ') + e.message);
  }
  event.target.value = '';
}

// ─── Sample Data ──────────────────────────────────────────────
async function loadSampleData() {
  // Load sample data via the server
  const sample = [
    { date:'2026-05-26', description:'LED BULB AND TRANSPORT', qty:'', car_type:'VANGUARD', plate_number:'T951EAU', amount:90000, used_by:'' },
    { date:'2026-05-26', description:'CAR WASH', qty:'', car_type:'HILUX', plate_number:'T818DCU', amount:10000, used_by:'HAMIS' },
    { date:'2026-05-26', description:'PETROL', qty:'', car_type:'SUZUKI', plate_number:'', amount:30000, used_by:'HAMIS' },
    { date:'2026-05-26', description:'SPARK PLUG', qty:'4', car_type:'SUZUKI', plate_number:'', amount:5000, used_by:'HAMIS' },
    { date:'2026-05-26', description:'OVERPULLATOR', qty:'', car_type:'HILUX', plate_number:'T7777DLK', amount:250000, used_by:'HAMIS' },
    { date:'2026-05-26', description:'EXPANSION', qty:'', car_type:'HILUX', plate_number:'T7777DLK', amount:60000, used_by:'' },
    { date:'2026-05-26', description:'COMPRESSOR OIL', qty:'', car_type:'HILUX', plate_number:'T7777DLK', amount:5000, used_by:'' },
    { date:'2026-05-26', description:'AC GAS', qty:'', car_type:'HILUX', plate_number:'T7777DLK', amount:120000, used_by:'' },
    { date:'2026-05-26', description:'OXYGEN SENSER', qty:'', car_type:'ALPHARD NEW', plate_number:'T656EFU', amount:60000, used_by:'' },
    { date:'2026-05-26', description:'GASKET MAKER', qty:'', car_type:'', plate_number:'', amount:5000, used_by:'' },
    { date:'2026-05-26', description:'DRIVER', qty:'', car_type:'', plate_number:'', amount:10000, used_by:'' },
    { date:'2026-05-26', description:'ENGINE OIL', qty:'', car_type:'HILUX', plate_number:'T818DCU', amount:32000, used_by:'' },
    { date:'2026-05-26', description:'FUNDI', qty:'', car_type:'', plate_number:'', amount:100000, used_by:'' },
  ];

  try {
    for (const r of sample) {
      await api('/api/records', { method: 'POST', body: JSON.stringify(r) });
    }
    await api('/api/deposit', { method: 'PUT', body: JSON.stringify({ amount: 1200000 }) });
    loadRecords();
    loadDeposit();
  } catch(e) { alert(e.message); }
}

// ─── Clear All ────────────────────────────────────────────────
async function clearAll() {
  if (!confirm(t('clearConfirm'))) return;
  try {
    const data = await api('/api/records?' + new URLSearchParams({}));
    for (const r of data) {
      await api('/api/records/' + r.id, { method: 'DELETE' });
    }
    loadRecords();
    loadDeposit();
  } catch(e) { alert(e.message); }
}
