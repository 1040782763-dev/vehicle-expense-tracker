// ═══════════════════════════════════════════════════════════════
// Vehicle Expense Tracker — Frontend
// ═══════════════════════════════════════════════════════════════

let token = localStorage.getItem('vet_token') || '';
let currentUser = null;
let lang = localStorage.getItem('vet_lang') || 'en';
let editingRecordId = null;
let editingPaymentId = null;
let plateCustomersMap = null; // {plate: {customer, model, tel}} loaded from API

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
  loadAutocomplete();
  loadRecords();
  loadDeposit();
  loadPartsMaster();
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
  es.addEventListener('record_created', () => { loadRecords(); loadDeposit(); refreshProfitIfActive(); });
  es.addEventListener('record_updated', () => { loadRecords(); loadDeposit(); refreshProfitIfActive(); });
  es.addEventListener('record_deleted', () => { loadRecords(); loadDeposit(); refreshProfitIfActive(); });
  es.addEventListener('payment_updated', () => { renderPayments(); refreshProfitIfActive(); });
  es.addEventListener('invoice_updated', () => { renderInvSavedList(); refreshProfitIfActive(); });
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
function parseNum(v) { return parseFloat(String(v||'').replace(/,/g,'')) || 0; }
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
    const fCategory = document.getElementById('fCategory').value;
    const params = new URLSearchParams();
    if (fDateFrom) params.set('date_from', fDateFrom);
    if (fDateTo) params.set('date_to', fDateTo);
    if (fDesc) params.set('desc', fDesc);
    if (fCarType) params.set('car_type', fCarType);
    if (fPlate) params.set('plate', fPlate);
    if (fGuy) params.set('used_by', fGuy);
    if (fCategory) params.set('category', fCategory);

    const data = await api('/api/records?' + params.toString());
    renderRecordsData(data);
    loadDeposit(); // sync deposit card to selected date
  } catch(e) { /* ignore */ }
}

function renderRecords() { loadRecords(); }

function renderRecordsData(data) {
  recordsCache = data;
  const tbody = document.getElementById('recordsBody');
  document.getElementById('recordCount').textContent = (lang === 'en' ? 'Records: ' : '记录数: ') + data.length;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="no-data">' + t('noRecords') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(r => {
    const cat = r.category || 'auto_parts';
    const catLabel = cat === 'office_supplies'
      ? (lang === 'en' ? 'Office' : '办公用品')
      : (lang === 'en' ? 'Auto' : '汽车配件');
    const catClass = cat === 'office_supplies' ? 'cat-badge-office' : 'cat-badge-auto';
    return `
    <tr data-id="${r.id}" onclick="inlineEditRecord(this, ${r.id}, event)" style="cursor:pointer">
      <td class="w-seq text-center">${r.seq || ''}</td>
      <td class="w-date">${formatDate(r.date)}</td>
      <td class="w-cat text-center"><span class="cat-badge ${catClass}">${catLabel}</span></td>
      <td class="w-desc">${esc(r.description)}</td>
      <td class="w-qty text-center">${esc(r.qty)}</td>
      <td class="w-type">${esc(r.car_type)}</td>
      <td class="w-plate">${esc(r.plate_number)}</td>
      <td class="w-amt text-right">${r.use_existing ? '<span style="color:#999;font-size:10px" title="Existing inventory / 已有库存">📦 </span>' : ''}${formatNum(r.amount)}</td>
      <td class="w-guy">${esc(r.used_by)}</td>
      <td class="w-act text-center">
        <button class="btn-xs btn-del" onclick="event.stopPropagation();deleteRecord(${r.id})">${lang==='en'?'Del':'删除'}</button>
      </td>
    </tr>
  `}).join('');
}

// Inline edit for records
let inlineEditingId = null;
let recordsCache = []; // for inline edit lookup
function inlineEditRecord(tr, id, evt) {
  if (evt) evt.stopPropagation();
  if (inlineEditingId === id) return; // already editing
  // Save any current inline edit first
  if (inlineEditingId) cancelInlineEdit();
  inlineEditingId = id;

  const cells = tr.children;
  const r = getRecordById(id); // sync helper
  if (!r) { loadRecords(); return; }

  // Col 1 (date): date input
  cells[1].innerHTML = `<input type="date" value="${r.date}" style="width:90px">`;
  // Col 2 (category): select
  const catVal = r.category || 'auto_parts';
  cells[2].innerHTML = `<select style="width:80px;font-size:12px">
    <option value="auto_parts" ${catVal==='auto_parts'?'selected':''}>Auto Parts</option>
    <option value="office_supplies" ${catVal==='office_supplies'?'selected':''}>Office</option>
  </select>`;
  // Col 3 (description): text
  cells[3].innerHTML = `<input type="text" value="${escAttr(r.description)}" style="width:120px">`;
  // Col 4 (qty): text
  cells[4].innerHTML = `<input type="text" value="${escAttr(r.qty||'')}" style="width:50px">`;
  // Col 5 (car_type): text
  cells[5].innerHTML = `<input type="text" value="${escAttr(r.car_type)}" style="width:90px">`;
  // Col 6 (plate): text
  cells[6].innerHTML = `<input type="text" value="${escAttr(r.plate_number)}" style="width:100px">`;
  // Col 7 (amount): number
  cells[7].innerHTML = `<input type="number" value="${r.amount||0}" style="width:85px">`;
  // Col 8 (used_by): text
  cells[8].innerHTML = `<input type="text" value="${escAttr(r.used_by)}" style="width:70px">`;
  // Col 9 (actions): save/cancel
  cells[9].innerHTML = `
    <button class="btn-xs" style="background:var(--success);color:#fff" onclick="saveInlineRecord(${id})">✓</button>
    <button class="btn-xs" style="background:var(--danger);color:#fff" onclick="event.stopPropagation();cancelInlineEdit()">✕</button>`;
}

function getRecordById(id) {
  return recordsCache.find(r => r.id === id) || null;
}

function cancelInlineEdit() {
  inlineEditingId = null;
  loadRecords();
}

async function saveInlineRecord(id) {
  const tr = document.querySelector('#recordsBody tr[data-id="'+id+'"]');
  if (!tr) return;
  const cells = tr.children;
  const date = cells[1].querySelector('input').value;
  const category = cells[2].querySelector('select').value;
  const description = cells[3].querySelector('input').value.trim();
  const qty = cells[4].querySelector('input').value.trim();
  const car_type = cells[5].querySelector('input').value.trim();
  const plate_number = cells[6].querySelector('input').value.trim();
  const amount = parseInt(cells[7].querySelector('input').value) || 0;
  const used_by = cells[8].querySelector('input').value.trim();
  try {
    await api('/api/records/' + id, { method: 'PUT', body: JSON.stringify({ date, category, description, qty, car_type, plate_number, amount, used_by }) });
    inlineEditingId = null;
    loadRecords();
  } catch(e) { alert(e.message); }
}

function onCategoryChange() {
  const cat = document.getElementById('mCategory').value;
  const autoFields = document.getElementById('autoFields');
  if (cat === 'office_supplies') {
    autoFields.style.display = 'none';
    document.getElementById('mCarType').value = '';
    document.getElementById('mPlate').value = '';
  } else {
    autoFields.style.display = '';
  }
}

function showRecordModal() {
  editingRecordId = null;
  document.getElementById('recordModalTitle').textContent = t('newRecord');
  document.getElementById('btnSaveRecord').textContent = t('save');
  document.getElementById('mDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('mCategory').value = 'auto_parts';
  document.getElementById('autoFields').style.display = '';
  document.getElementById('mDesc').value = '';
  document.getElementById('mQty').value = '';
  document.getElementById('mCarType').value = '';
  document.getElementById('mPlate').value = '';
  document.getElementById('mAmount').value = '';
  document.getElementById('mGuy').value = '';
  document.getElementById('mUseExisting').checked = false;
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
    document.getElementById('mCategory').value = r.category || 'auto_parts';
    onCategoryChange();
    document.getElementById('mDesc').value = r.description;
    document.getElementById('mQty').value = r.qty;
    document.getElementById('mCarType').value = r.car_type;
    document.getElementById('mPlate').value = r.plate_number;
    document.getElementById('mAmount').value = r.amount;
    document.getElementById('mGuy').value = r.used_by;
    document.getElementById('mUseExisting').checked = !!r.use_existing;
    document.getElementById('recordModal').classList.add('active');
  } catch(e) { alert(e.message); }
}

async function saveRecord() {
  const date = document.getElementById('mDate').value;
  const category = document.getElementById('mCategory').value;
  const desc = document.getElementById('mDesc').value.trim();
  const qty = document.getElementById('mQty').value.trim();
  const carType = document.getElementById('mCarType').value.trim();
  const plate = document.getElementById('mPlate').value.trim();
  const amount = parseInt(document.getElementById('mAmount').value) || 0;
  const guy = document.getElementById('mGuy').value.trim();

  if (!date) { alert(lang === 'en' ? 'Date is required' : '请选择日期'); return; }
  if (!desc) { alert(lang === 'en' ? 'Description is required' : '请填写描述'); return; }
  if (category === 'auto_parts') {
    if (!carType) { alert(lang === 'en' ? 'Car Type is required' : '请填写车型'); return; }
    if (!plate) { alert(lang === 'en' ? 'Plate No. is required' : '请填写车牌号'); return; }
  }
  if (!amount) { alert(lang === 'en' ? 'Amount is required' : '请填写金额'); return; }
  if (!guy) { alert(lang === 'en' ? 'Used By is required' : '请填写使用人'); return; }

  // Description specificity check
  const upperDesc = desc.toUpperCase();
  const alternatives = findSpecificAlternatives(upperDesc);
  if (alternatives.length > 0) {
    const list = alternatives.slice(0, 8).map(a => a).join('\n');
    const msg = (lang === 'en'
      ? '⚠ "' + desc + '" is too generic.\n\nDid you mean one of these?\n\n' + list + '\n\n[OK] Save anyway   [Cancel] Go back to edit'
      : '⚠ "' + desc + '" 太过泛指。\n\n您是否指以下具体零件？\n\n' + list + '\n\n[确定] 仍然保存   [取消] 返回修改');
    if (!confirm(msg)) return;
  }

  const useExisting = document.getElementById('mUseExisting').checked;
  const body = { date, category, description: desc, qty, car_type: carType, plate_number: plate, amount, used_by: guy, use_existing: useExisting };

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

// Find specific alternatives from PARTS_MASTER for a generic term
function findSpecificAlternatives(term) {
  if (!term || term.length < 3) return [];
  const results = [];
  for (const key of Object.keys(PARTS_ZH)) {
    if (key === term) continue; // skip exact match
    if (key.includes(term) && key.length > term.length + 1) {
      const t = PARTS_ZH[key];
      const zh = typeof t === 'string' ? t : (t.zh || '');
      results.push(zh ? key + ' | ' + zh : key);
    }
  }
  return results.sort((a, b) => a.length - b.length);
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
  const colSpan = isAdmin ? 9 : 7;

  const amtHeader = document.getElementById('payAmtHeader');
  const costHeader = document.getElementById('payCostHeader');
  if (amtHeader) amtHeader.style.display = isAdmin ? '' : 'none';
  if (costHeader) costHeader.style.display = isAdmin ? '' : 'none';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="'+colSpan+'" class="no-data">' + t('noPayments') + '</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr data-id="${p.id}" onclick="inlineEditPayment(this, ${p.id}, event)" style="cursor:pointer">
      <td class="w-plate">${esc(p.plate_number)}</td>
      <td class="w-status">
        <span class="badge ${p.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${t(p.status)}</span>
      </td>
      <td class="w-date">${p.in_date ? formatDate(p.in_date) : '-'}</td>
      <td class="w-date">${p.out_date ? formatDate(p.out_date) : '-'}</td>
      <td class="w-date">${p.payment_date ? formatDate(p.payment_date) : '-'}</td>
      ${isAdmin ? `<td class="w-amt text-right">${p.amount ? formatNum(p.amount) : '-'}</td>` : ''}
      ${isAdmin ? `<td class="w-amt text-right">${p.cost ? formatNum(p.cost) : '-'}</td>` : ''}
      <td class="w-desc">${esc(p.notes)}</td>
      <td class="w-act text-center">
        <button class="btn-xs btn-del" onclick="event.stopPropagation();deletePayment(${p.id})">${lang==='en'?'Del':'删除'}</button>
      </td>
    </tr>
  `).join('');
}

// Inline edit for payments
async function inlineEditPayment(tr, id, evt) {
  if (evt) evt.stopPropagation();
  if (inlineEditingId === id) return;
  if (inlineEditingId) cancelInlineEdit();
  inlineEditingId = id;

  const isAdmin = currentUser && currentUser.role === 'admin';
  // Re-fetch payment data
  const data = await loadPayments();
  const p = data.find(x => x.id === id);
  if (!p) { renderPayments(); return; }

  const cells = tr.children;
  let ci = 0; // cell index
  // Col 0: plate
  cells[ci].innerHTML = `<input type="text" value="${escAttr(p.plate_number)}" style="width:100px">`; ci++;
  // Col 1: status
  cells[ci].innerHTML = `<select style="width:70px;font-size:12px">
    <option value="paid" ${p.status==='paid'?'selected':''}>Paid</option>
    <option value="unpaid" ${p.status==='unpaid'?'selected':''}>Unpaid</option>
  </select>`; ci++;
  // Col 2-4: dates
  ['in_date','out_date','payment_date'].forEach(f => {
    cells[ci].innerHTML = `<input type="date" value="${p[f]||''}" style="width:90px">`; ci++;
  });
  // Col 5: amount (admin only)
  if (isAdmin) {
    cells[ci].innerHTML = `<input type="number" value="${p.amount||0}" style="width:85px">`; ci++;
  }
  // Col 6: cost (admin only)
  if (isAdmin) {
    cells[ci].innerHTML = `<input type="number" value="${p.cost||0}" style="width:85px">`; ci++;
  }
  // Col 7: notes
  cells[ci].innerHTML = `<input type="text" value="${escAttr(p.notes||'')}" style="width:100px">`; ci++;
  // Col 8: actions
  cells[ci].innerHTML = `
    <button class="btn-xs" style="background:var(--success);color:#fff" onclick="saveInlinePayment(${id})">✓</button>
    <button class="btn-xs" style="background:var(--danger);color:#fff" onclick="event.stopPropagation();cancelInlineEditPayment()">✕</button>`;
}

function cancelInlineEditPayment() {
  inlineEditingId = null;
  renderPayments();
}

async function saveInlinePayment(id) {
  const tr = document.querySelector('#paymentsBody tr[data-id="'+id+'"]');
  if (!tr) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const cells = tr.children;
  let ci = 0;
  const plate_number = cells[ci].querySelector('input').value.trim(); ci++;
  const status = cells[ci].querySelector('select').value; ci++;
  const in_date = cells[ci].querySelector('input').value; ci++;
  const out_date = cells[ci].querySelector('input').value; ci++;
  const payment_date = cells[ci].querySelector('input').value; ci++;
  let amount, cost;
  if (isAdmin) {
    amount = parseInt(cells[ci].querySelector('input').value) || 0; ci++;
    cost = parseInt(cells[ci].querySelector('input').value) || 0; ci++;
  }
  const notes = cells[ci].querySelector('input').value.trim();
  try {
    const body = { plate_number, status, in_date, out_date, payment_date, notes };
    if (isAdmin) { body.amount = amount; body.cost = cost; }
    await api('/api/payments/' + id, { method: 'PUT', body: JSON.stringify(body) });
    inlineEditingId = null;
    renderPayments();
  } catch(e) { alert(e.message); }
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

async function showPaymentModal() {
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

  // Auto-populate plate list from records and payments
  try {
    const [records, payments] = await Promise.all([
      api('/api/records?limit=9999'),
      api('/api/payments')
    ]);
    const plates = new Set();
    (records || []).forEach(r => { if (r.plate_number) plates.add(r.plate_number.toUpperCase()); });
    (payments || []).forEach(p => { if (p.plate_number) plates.add(p.plate_number.toUpperCase()); });
    document.getElementById('dlPPlate').innerHTML = [...plates].sort().map(p => `<option value="${p}">`).join('');
  } catch(e) { /* ignore */ }
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

// ─── Car Parts Trilingual Map (EN → {zh, sw}) ─────────────────
// Loaded from server (parts_master.json) — 1600+ standardized entries
let PARTS_ZH = {};

async function loadPartsMaster() {
  try {
    PARTS_ZH = await api('/api/parts-master');
  } catch(e) {
    // fallback minimal dictionary (new format: {zh, sw})
    PARTS_ZH = {
      'AC GAS':{zh:'空调冷媒',sw:'gesi ya AC'},
      'AIR FILTER':{zh:'空气滤清器',sw:'chujio la hewa'},
      'BATTERY':{zh:'电瓶',sw:'betri'},
      'BRAKE PAD':{zh:'刹车片',sw:'padi ya breki'},
      'BULB':{zh:'灯泡',sw:'bulb'},
      'CAR WASH':{zh:'洗车',sw:'kuosha gari'},
      'COMPRESSOR':{zh:'压缩机',sw:'compressor'},
      'ENGINE OIL':{zh:'机油',sw:'mafuta ya injini'},
      'FUEL FILTER':{zh:'燃油滤清器',sw:'chujio la mafuta'},
      'FUNDI':{zh:'人工费',sw:'mshahara wa fundi'},
      'OIL FILTER':{zh:'机油滤清器',sw:'chujio la mafuta'},
      'PETROL':{zh:'汽油',sw:'petroli'},
      'SPARK PLUG':{zh:'火花塞',sw:'spark plug'},
      'TRANSPORT':{zh:'运输费',sw:'usafiri'},
      'WATER':{zh:'水',sw:'maji'}
    };
  }
}

// In-memory cache for API-translated terms (avoid re-fetching)
const TRANSLATION_CACHE = {};

function getZh(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.zh || entry.sw || '';
}

async function translatePart(name, lang) {
  lang = lang || 'zh';
  const upper = (name || '').trim().toUpperCase();
  if (!upper) return name;

  // 1. Local dictionary — exact match
  const entry = PARTS_ZH[upper];
  if (entry) {
    const t = typeof entry === 'string' ? entry : (entry[lang] || entry.zh || '');
    return t ? name + ' | ' + t : name;
  }

  // 2. Local dictionary — partial match
  for (const [en, val] of Object.entries(PARTS_ZH)) {
    if (upper.includes(en)) {
      const t = typeof val === 'string' ? val : (val[lang] || val.zh || '');
      return t ? name + ' | ' + t : name;
    }
  }

  // 3. In-memory cache (previous API lookups)
  if (TRANSLATION_CACHE[upper] !== undefined) {
    return TRANSLATION_CACHE[upper] ? name + ' | ' + TRANSLATION_CACHE[upper] : name;
  }

  // 4. Server-side API fallback (MyMemory)
  try {
    const resp = await api('/api/translate?term=' + encodeURIComponent(upper));
    const t = (resp && resp.translation) || '';
    TRANSLATION_CACHE[upper] = t;
    return t ? name + ' | ' + t : name;
  } catch (e) {
    TRANSLATION_CACHE[upper] = '';
    return name;
  }
}

// ─── Invoice ───────────────────────────────────────────────────
let INV_TOTAL_ROWS = 14;
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

// ─── Invoice Draft Auto-Save (localStorage) ──────────────────
let invDraftTimer = null;
const INV_DRAFT_KEY = 'invDraft';

function scheduleInvDraftSave() {
  if (invDraftTimer) clearTimeout(invDraftTimer);
  invDraftTimer = setTimeout(saveInvDraft, 1500);
}

function saveInvDraft() {
  const data = getInvFormData();
  if (!data.plate && !data.customer && !data.items.length && !data.remark) {
    return;
  }
  data._savedAt = new Date().toISOString();
  try { localStorage.setItem(INV_DRAFT_KEY, JSON.stringify(data)); } catch(e) { /* quota exceeded */ }
  const indicator = document.getElementById('invDraftIndicator');
  if (indicator) { indicator.style.display = ''; indicator.textContent = 'Draft saved ' + new Date().toLocaleTimeString(); }
}

function loadInvDraft() {
  try {
    const raw = localStorage.getItem(INV_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || (!data.plate && !data.customer && !(data.items||[]).length)) return null;
    return data;
  } catch { return null; }
}

function clearInvDraft() {
  localStorage.removeItem(INV_DRAFT_KEY);
  const indicator = document.getElementById('invDraftIndicator');
  if (indicator) indicator.style.display = 'none';
}

async function initInvoice() {
  if (!invInited) {
    document.getElementById('invDate').value = new Date().toISOString().slice(0, 10);
    await refreshOrderNo();
    await loadInvAutocomplete();
    buildInvTable();

    // Check for saved draft
    const draft = loadInvDraft();
    if (draft && (draft.plate || draft.customer || (draft.items || []).length)) {
      const savedTime = draft._savedAt ? new Date(draft._savedAt).toLocaleString() : '';
      const msg = savedTime
        ? (lang === 'en' ? 'Found unsaved draft from ' + savedTime + '. Restore?' : '发现未保存的草稿（' + savedTime + '），恢复吗？')
        : (lang === 'en' ? 'Found unsaved draft. Restore?' : '发现未保存的草稿，恢复吗？');
      if (confirm(msg)) {
        setInvFormData(draft);
      } else {
        clearInvDraft();
      }
    }

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
    // Store plate→customer mapping for auto-fill
    plateCustomersMap = autoData.plate_customers || {};
    const fillDl = (id, items) => {
      const dl = document.getElementById(id);
      if (!dl || dl.children.length > 0) return;
      items.forEach(v => { const o = document.createElement('option'); o.value = v; dl.appendChild(o); });
    };
    fillDl('dlInvPlate', autoData.plate_numbers || []);
    fillDl('dlInvPart', autoData.spare_parts || []);
    const invCustomers = invoices.map(inv => inv.customer).filter(Boolean);
    const importCustomers = autoData.customers || [];
    const customers = [...new Set([...importCustomers, ...invCustomers])].sort();
    fillDl('dlInvCustomer', customers);
  } catch(e) { /* ignore */ }
}

function buildInvTable() {
  const tbody = document.getElementById('invPartsTable');
  let html = '';
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    html += `<tr>
      <td class="inv-row-num">${i}</td>
      <td><input class="inv-inp-name" data-invrow="${i}" data-invfield="name" placeholder="" list="dlInvPart" autocomplete="off" oninput="onInvNameChange(${i});scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-unit" data-invrow="${i}" data-invfield="unit" placeholder="" oninput="scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-qty" data-invrow="${i}" data-invfield="qty" type="number" step="1" value="1" oninput="calcInvRow(${i});calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-cost" data-invrow="${i}" data-invfield="cost" type="number" step="0.01" placeholder="0" oninput="calcInvRow(${i});calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-amount" data-invrow="${i}" data-invfield="amount" type="text" placeholder="0" readonly></td>
      <td><input class="inv-inp-costprice" data-invrow="${i}" data-invfield="cost_price" type="number" step="0.01" placeholder="" oninput="calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-remark" data-invrow="${i}" data-invfield="remark" placeholder="" oninput="scheduleInvDraftSave()"></td>
    </tr>`;
  }
  tbody.innerHTML = html;
  // Update add-row button visibility
  document.getElementById('addRowBtn').style.display = '';
}

function addInvRows(n) {
  n = n || 5;
  const oldRows = INV_TOTAL_ROWS;
  INV_TOTAL_ROWS += n;
  const tbody = document.getElementById('invPartsTable');
  let html = '';
  for (let i = oldRows + 1; i <= INV_TOTAL_ROWS; i++) {
    html += `<tr>
      <td class="inv-row-num">${i}</td>
      <td><input class="inv-inp-name" data-invrow="${i}" data-invfield="name" placeholder="" list="dlInvPart" autocomplete="off" oninput="onInvNameChange(${i});scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-unit" data-invrow="${i}" data-invfield="unit" placeholder="" oninput="scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-qty" data-invrow="${i}" data-invfield="qty" type="number" step="1" value="1" oninput="calcInvRow(${i});calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-cost" data-invrow="${i}" data-invfield="cost" type="number" step="0.01" placeholder="0" oninput="calcInvRow(${i});calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-amount" data-invrow="${i}" data-invfield="amount" type="text" placeholder="0" readonly></td>
      <td><input class="inv-inp-costprice" data-invrow="${i}" data-invfield="cost_price" type="number" step="0.01" placeholder="" oninput="calcInvTotals();scheduleInvDraftSave()"></td>
      <td><input class="inv-inp-remark" data-invrow="${i}" data-invfield="remark" placeholder="" oninput="scheduleInvDraftSave()"></td>
    </tr>`;
  }
  tbody.insertAdjacentHTML('beforeend', html);
}

function onInvNameChange(row) {
  const nameEl = document.querySelector('[data-invrow="'+row+'"][data-invfield="name"]');
  const name = (nameEl.value || '').toUpperCase().trim();
  // VAT detection: auto-set QTY to 0.18
  if (name === 'VAT') {
    document.querySelector('[data-invrow="'+row+'"][data-invfield="qty"]').value = '0.18';
  }
  calcInvTotals();
}

function calcInvRow(row) {
  // Just updates this row's AMOUNT instantly; VAT handled in calcInvTotals
  const nameEl = document.querySelector('[data-invrow="'+row+'"][data-invfield="name"]');
  const name = (nameEl.value || '').toUpperCase().trim();
  if (name === 'VAT') {
    document.querySelector('[data-invrow="'+row+'"][data-invfield="qty"]').value = '0.18';
  }
  calcInvTotals(); // let calcInvTotals handle everything
}

function calcInvTotals() {
  // Find VAT row
  let vatRow = -1;
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    const name = (document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value || '').toUpperCase().trim();
    if (name === 'VAT') { vatRow = i; break; }
  }

  // Calculate non-VAT rows: AMOUNT = QTY × COST
  let nonVatTotal = 0;
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    if (i === vatRow) continue;
    const qty = parseNum(document.querySelector('[data-invrow="'+i+'"][data-invfield="qty"]').value);
    const cost = parseNum(document.querySelector('[data-invrow="'+i+'"][data-invfield="cost"]').value);
    const amt = qty * cost;
    document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value = amt > 0 ? amt : '';
    nonVatTotal += amt;
  }

  let total = nonVatTotal;
  if (vatRow > 0) {
    // VAT: COST = sum of other AMOUNTs, QTY = 0.18, VAT AMOUNT = 0.18 * nonVatTotal
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="qty"]').value = '0.18';
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="cost"]').value = nonVatTotal;
    const vatAmt = Math.round(0.18 * nonVatTotal);
    document.querySelector('[data-invrow="'+vatRow+'"][data-invfield="amount"]').value = vatAmt > 0 ? vatAmt : '';
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
    const amount = document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value.trim();
    const costPrice = document.querySelector('[data-invrow="'+i+'"][data-invfield="cost_price"]').value.trim();
    const remark = document.querySelector('[data-invrow="'+i+'"][data-invfield="remark"]').value.trim();
    if (name) items.push({ name, unit, qty, cost, amount, cost_price: costPrice, remark });
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
  // Expand rows if invoice has more items than current
  if (data.items && data.items.length > INV_TOTAL_ROWS) {
    INV_TOTAL_ROWS = data.items.length;
    buildInvTable();
  }
  // Clear all rows
  for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
    ['name','unit','qty','cost','amount','cost_price','remark'].forEach(f => {
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
        document.querySelector('[data-invrow="'+i+'"][data-invfield="amount"]').value = item.amount || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="cost_price"]').value = item.cost_price || '';
        document.querySelector('[data-invrow="'+i+'"][data-invfield="remark"]').value = item.remark || '';
      }
    });
  }
  calcInvTotals();
}

function lookupPlateCustomer(plate) {
  if (!plateCustomersMap) return null;
  const key = plate.toUpperCase().replace(/\s+/g, ' ').trim();
  const keyCompact = key.replace(/\s/g, '');
  if (plateCustomersMap[key]) return plateCustomersMap[key];
  if (plateCustomersMap[keyCompact]) return plateCustomersMap[keyCompact];
  for (const [k, v] of Object.entries(plateCustomersMap)) {
    if (k.replace(/\s/g, '') === keyCompact) return v;
  }
  return null;
}

async function autoFillInvoice() {
  const plate = document.getElementById('invPlate').value.trim();

  const clearItems = () => {
    for (let i = 1; i <= INV_TOTAL_ROWS; i++) {
      ['name','unit','cost','amount','cost_price','remark'].forEach(f => {
        document.querySelector('[data-invrow="'+i+'"][data-invfield="'+f+'"]').value = '';
      });
      document.querySelector('[data-invrow="'+i+'"][data-invfield="qty"]').value = '1';
    }
  };

  if (!plate) {
    clearItems();
    document.getElementById('invCustomer').value = '';
    document.getElementById('invRemark').value = '';
    calcInvTotals();
    return;
  }

  // Reset customer & remark — will refill below
  document.getElementById('invCustomer').value = '';
  document.getElementById('invRemark').value = '';

  // Ensure plate data is loaded from API
  if (!plateCustomersMap) {
    try {
      const ad = await api('/api/autocomplete');
      plateCustomersMap = ad.plate_customers || {};
    } catch(e) { plateCustomersMap = {}; }
  }

  // ── Step 1: Direct plate → customer mapping ──
  const custInfo = lookupPlateCustomer(plate);
  if (custInfo) {
    if (custInfo.customer) document.getElementById('invCustomer').value = custInfo.customer;
    if (custInfo.model) document.getElementById('invRemark').value = custInfo.model;
  }

  try {
    const [records, invoices] = await Promise.all([
      api('/api/records?plate=' + encodeURIComponent(plate)),
      api('/api/invoices')
    ]);

    // ── Step 2: Customer fallback from invoice history ──
    if (!document.getElementById('invCustomer').value) {
      const prevInvoices = invoices.filter(inv => inv.plate && inv.plate.toUpperCase() === plate.toUpperCase());
      if (prevInvoices.length > 0 && prevInvoices[0].customer) {
        document.getElementById('invCustomer').value = prevInvoices[0].customer;
      }
    }

    // ── Step 3: Remark fallback from expense records ──
    if (!document.getElementById('invRemark').value && records.length > 0) {
      const types = [...new Set(records.map(r => r.car_type).filter(Boolean))];
      const topType = types.sort((a, b) =>
        records.filter(r => r.car_type === b).length - records.filter(r => r.car_type === a).length
      )[0] || '';
      if (topType) document.getElementById('invRemark').value = topType;
    }

    // ── Step 4: Auto-fill items from expense records ──
    if (records.length > 0) {
      clearItems();
      const costMap = {};
      records.forEach(r => {
        if (r.description && r.amount) {
          const desc = r.description.toUpperCase().trim();
          if (!costMap[desc]) costMap[desc] = r.amount;
        }
      });
      const parts = [...new Set(records.map(r => r.description).filter(Boolean))];
      const topParts = parts.slice(0, INV_TOTAL_ROWS);
      for (let idx = 0; idx < topParts.length; idx++) {
        const p = topParts[idx];
        const i = idx + 1;
        document.querySelector('[data-invrow="'+i+'"][data-invfield="name"]').value = await translatePart(p);
        const cp = costMap[p.toUpperCase().trim()];
        if (cp) {
          document.querySelector('[data-invrow="'+i+'"][data-invfield="cost_price"]').value = cp;
        }
      }
    }

    calcInvTotals();
    scheduleInvDraftSave();
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
    clearInvDraft();
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
        const total = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || (Number(it.qty)||0)*(Number(it.cost)||0) || 0), 0);
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
      const total = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || (Number(it.qty)||0)*(Number(it.cost)||0) || 0), 0);
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
  clearInvDraft();
  INV_TOTAL_ROWS = 14;
  buildInvTable();
  invInited = true;
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
    const amt = parseNum(item.qty) * parseNum(item.cost);
    total += amt;
    const a = amt > 0 ? amt.toLocaleString('en-US') : '';
    tbody.innerHTML += `<tr>
      <td>${i+1}</td><td style="text-align:left">${esc(item.name||'')}</td><td>${esc(item.unit||'')}</td>
      <td>${esc(item.qty||'')}</td><td style="text-align:right">${c}</td>
      <td style="text-align:right">${a}</td>
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
    const amt = parseNum(item.qty) * parseNum(item.cost);
    total += amt;
    const a = amt > 0 ? amt.toLocaleString('en-US') : '';
    rowsHtml += `<tr>
      <td>${i+1}</td><td style="text-align:left">${esc(item.name||'')}</td><td>${esc(item.unit||'')}</td>
      <td>${esc(item.qty||'')}</td><td style="text-align:right">${c}</td>
      <td style="text-align:right">${a}</td>
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
        <tr><th>S/N</th><th style="text-align:left">ITEAM</th><th>UNIT</th><th>QTY</th><th>COST (TZS)</th><th>AMOUNT (TZS)</th><th style="text-align:left">REMARK</th></tr>
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

function refreshProfitIfActive() {
  if (document.getElementById('profitBtn') && document.getElementById('profitBtn').classList.contains('active')) {
    const group = document.getElementById('profitGroup').value || 'plate';
    loadProfitReport(group, document.getElementById('profitBtn'));
  }
}

async function loadProfitReport(group, btn) {
  if (!currentUser || currentUser.role !== 'admin') return;
  document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    const data = await api('/api/reports/profit?group=' + group);
    document.getElementById('reportHead').innerHTML = `<tr>
      <th>${group === 'monthly' ? (lang === 'en' ? 'Month' : '月份') : (lang === 'en' ? 'Plate No.' : '车牌号')}</th>
      <th style="text-align:right">${lang === 'en' ? 'Invoice Price (TZS)' : '开单价格'}</th>
      <th style="text-align:right">${lang === 'en' ? 'VAT 18% (TZS)' : '增值税18%'}</th>
      <th style="text-align:right">${lang === 'en' ? 'Net Rev (TZS)' : '净收入'}</th>
      <th style="text-align:right">${lang === 'en' ? 'Cost (TZS)' : '成本'}</th>
      <th style="text-align:right">${lang === 'en' ? 'Profit (TZS)' : '毛利'}</th>
      <th style="text-align:center">${lang === 'en' ? 'Margin %' : '毛利率'}</th>
    </tr>`;

    let totalGross = 0, totalVat = 0, totalNet = 0, totalCost = 0, totalProfit = 0;
    document.getElementById('reportsBody').innerHTML = data.map(r => {
      totalGross += r.grossRevenue;
      totalVat += r.vat;
      totalNet += r.netRevenue;
      totalCost += r.cost;
      totalProfit += r.profit;
      const marginColor = r.margin >= 20 ? 'var(--green)' : r.margin >= 0 ? 'var(--orange)' : 'var(--danger)';
      return `<tr>
        <td>${esc(r.key)}</td>
        <td class="w-amt text-right">${formatNum(r.grossRevenue)}</td>
        <td class="w-amt text-right" style="color:var(--orange)">${formatNum(r.vat)}</td>
        <td class="w-amt text-right">${formatNum(r.netRevenue)}</td>
        <td class="w-amt text-right">${formatNum(r.cost)}</td>
        <td class="w-amt text-right" style="color:${r.profit >= 0 ? 'var(--green)' : 'var(--danger)'}">${formatNum(r.profit)}</td>
        <td class="text-center" style="font-weight:600;color:${marginColor}">${r.margin}%</td>
      </tr>`;
    }).join('');

    const overallMargin = totalNet > 0 ? ((totalProfit / totalNet) * 100).toFixed(1) : '0.0';
    document.getElementById('reportTotal').innerHTML = `
      <span>${lang === 'en' ? 'Invoice:' : '开单价格:'} ${formatNum(totalGross)}</span>
      <span style="margin-left:8px;color:var(--orange)">${lang === 'en' ? 'VAT:' : '增值税:'} ${formatNum(totalVat)}</span>
      <span style="margin-left:8px">${lang === 'en' ? 'Net:' : '净收入:'} ${formatNum(totalNet)}</span>
      <span style="margin-left:8px">${lang === 'en' ? 'Cost:' : '成本:'} ${formatNum(totalCost)}</span>
      <span style="margin-left:8px;color:var(--green)">${lang === 'en' ? 'Profit:' : '毛利:'} ${formatNum(totalProfit)}</span>
      <span style="margin-left:8px;color:var(--blue)">${lang === 'en' ? 'Margin:' : '毛利率:'} ${overallMargin}%</span>
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
  // Guard: only allow if < 5 records exist
  try {
    const existing = await api('/api/records?limit=5');
    if (existing.length >= 5) {
      alert(lang === 'en' ? 'Data already exists. Clear all first if you want to reload sample.' : '已有数据，若要重新加载示例请先清空。');
      return;
    }
  } catch(e) { return; }
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

async function deduplicateRecords() {
  if (!confirm(lang === 'en' ? 'Remove duplicate records (same date+desc+amount+plate)?' : '删除重复记录（同日期+描述+金额+车牌）？')) return;
  try {
    const resp = await api('/api/deduplicate', { method: 'POST' });
    alert((lang === 'en' ? 'Removed ' : '已删除 ') + resp.removed.length + (lang === 'en' ? ' duplicate records' : ' 条重复记录'));
    loadRecords();
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
