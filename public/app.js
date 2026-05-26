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
    if (data.role === 'admin') document.getElementById('tabUsers').style.display = '';
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
      if (payload.role === 'admin') document.getElementById('tabUsers').style.display = '';
      initApp();
    }).catch(() => { doLogout(); });
  }
  document.getElementById('btnLang').textContent = lang === 'en' ? '中文' : 'English';

  // Tab clicks
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.getAttribute('data-tab');
      if (id === 'expenses') { document.getElementById('tabExpenses').classList.add('active'); renderRecords(); }
      else if (id === 'payments') { document.getElementById('tabPayments').classList.add('active'); renderPayments(); }
      else if (id === 'reports') { document.getElementById('tabReports').classList.add('active'); loadReport('daily'); }
      else if (id === 'users') { document.getElementById('tabUsers').classList.add('active'); loadUsers(); }
      applyLang();
    });
  });

  // Enter key to login
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

// ─── SSE ──────────────────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/api/events?token=' + encodeURIComponent(token));
  es.addEventListener('record_created', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('record_updated', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('record_deleted', () => { loadRecords(); loadDeposit(); });
  es.addEventListener('payment_updated', () => renderPayments());
  es.addEventListener('deposit_updated', () => loadDeposit());
  es.addEventListener('connected', () => {});
  es.onerror = () => { es.close(); setTimeout(connectSSE, 5000); };
}

// ─── Date Formatting ──────────────────────────────────────────
// Display: DDMMMYY (e.g., 26MAY26)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = parts[2];
  const m = parseInt(parts[1]) - 1;
  const y = parts[0].slice(2);
  return d + MONTHS[m] + y;
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
    const data = await api('/api/deposit');
    document.getElementById('sumDeposit').textContent = formatNum(data.amount);
    updateBalance(data.amount);
  } catch(e) { /* ignore */ }
}

let currentExpenseTotal = 0;

function updateBalance(dep) {
  document.getElementById('sumExpense').textContent = formatNum(currentExpenseTotal);
  const bal = (dep || 0) - currentExpenseTotal;
  document.getElementById('sumBalance').textContent = formatNum(bal);
  const balEl = document.getElementById('sumBalance');
  balEl.style.color = bal >= 0 ? 'var(--blue)' : 'var(--danger)';
}

function showDepositModal() {
  document.getElementById('dCurrent').value = formatNum(document.getElementById('sumDeposit').textContent.replace(/,/g,''));
  document.getElementById('dOp').value = 'add';
  document.getElementById('dAmount').value = '';
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
  try {
    await api('/api/deposit', { method: 'PUT', body: JSON.stringify({ amount: current }) });
    document.getElementById('depositModal').classList.remove('active');
  } catch(e) { alert(e.message); }
}

// ─── Records ──────────────────────────────────────────────────
async function loadRecords() {
  try {
    const fDate = document.getElementById('fDate').value;
    const fDesc = document.getElementById('fDesc').value;
    const fCarType = document.getElementById('fCarType').value;
    const fPlate = document.getElementById('fPlate').value;
    const fGuy = document.getElementById('fGuy').value;
    const params = new URLSearchParams();
    if (fDate) params.set('date', fDate);
    if (fDesc) params.set('desc', fDesc);
    if (fCarType) params.set('car_type', fCarType);
    if (fPlate) params.set('plate', fPlate);
    if (fGuy) params.set('used_by', fGuy);

    const data = await api('/api/records?' + params.toString());
    currentExpenseTotal = data.reduce((s, r) => s + (r.amount || 0), 0);
    renderRecordsData(data);
    const depText = document.getElementById('sumDeposit').textContent.replace(/,/g,'');
    updateBalance(parseInt(depText) || 0);
  } catch(e) { /* ignore */ }
}

function renderRecords() { loadRecords(); }

function renderRecordsData(data) {
  const tbody = document.getElementById('recordsBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">' + t('noRecords') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
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

  if (!date) { alert(t('selectDate')); return; }

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
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">' + t('noPayments') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="w-plate">${esc(p.plate_number)}</td>
      <td class="w-status">
        <span class="badge ${p.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${t(p.status)}</span>
      </td>
      <td class="w-date">${p.payment_date ? formatDate(p.payment_date) : '-'}</td>
      <td class="w-amt text-right">${p.amount ? formatNum(p.amount) : '-'}</td>
      <td class="w-desc">${esc(p.notes)}</td>
      <td class="w-act text-center">
        <button class="btn-xs btn-edit" onclick="editPayment(${p.id})">${lang==='en'?'Edit':'编辑'}</button>
        <button class="btn-xs btn-del" onclick="deletePayment(${p.id})">${lang==='en'?'Del':'删除'}</button>
      </td>
    </tr>
  `).join('');
}

function showPaymentModal() {
  editingPaymentId = null;
  document.getElementById('paymentModalTitle').textContent = t('newPayment');
  document.getElementById('btnSavePayment').textContent = t('save');
  document.getElementById('mPPlate').value = '';
  document.getElementById('mPStatus').value = 'unpaid';
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
  document.getElementById('mPPayDate').value = p.payment_date || '';
  document.getElementById('mPAmount').value = p.amount || '';
  document.getElementById('mPNotes').value = p.notes || '';
  document.getElementById('paymentModal').classList.add('active');
}

async function savePayment() {
  const plate = document.getElementById('mPPlate').value.trim();
  const status = document.getElementById('mPStatus').value;
  const payDate = document.getElementById('mPPayDate').value;
  const amount = parseInt(document.getElementById('mPAmount').value) || 0;
  const notes = document.getElementById('mPNotes').value.trim();

  if (!plate) { alert('Plate number is required'); return; }

  const body = { plate_number: plate, status, payment_date: payDate, amount, notes };
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
  } catch(e) { /* ignore */ }
}

// ─── Users ────────────────────────────────────────────────────
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
      date: document.getElementById('fDate').value,
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
