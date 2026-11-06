/**
 * BudgetBuddy — app.js
 * Personal Finance AI Agent for Indonesian Students & Fresh Graduates
 * Vanilla JS only, localStorage persistence, offline-ready
 *
 * Sections:
 *  1. Constants & Config
 *  2. Storage Layer
 *  3. Utility / Formatting Helpers
 *  4. Auto-Categorization Engine
 *  5. Navigation & View Router
 *  6. First-Run Setup & Setup Form
 *  7. Transaction CRUD
 *  8. Dashboard KPIs & Budget Rule 50/30/20
 *  9. SVG Charts (Category Donut + Daily Trend Line)
 * 10. AI Insights Engine
 * 11. Savings Goal Tracker
 * 12. Transaction Table (search, filter, delete)
 * 13. Export CSV
 * 14. Sample Data Loader
 * 15. Toast Notifications
 * 16. Sidebar / Mobile Nav
 * 17. Init & Event Wiring
 */

'use strict';

/* ============================================================
   1. CONSTANTS & CONFIG
   ============================================================ */

const STORAGE_KEY_SETUP        = 'bb_setup';
const STORAGE_KEY_TRANSACTIONS = 'bb_transactions';
const STORAGE_KEY_LEARNED      = 'bb_learned_keywords';

/** Category palette – used by charts and tags */
const CATEGORY_COLORS = {
  Food:          '#0F62FE',
  Transport:     '#F59E0B',
  Housing:       '#8B5CF6',
  Subscriptions: '#EC4899',
  Education:     '#06B6D4',
  Health:        '#10B981',
  Entertainment: '#F97316',
  Shopping:      '#6366F1',
  Misc:          '#94A3B8',
  Income:        '#16A34A',
};

/** Category emoji labels */
const CATEGORY_LABELS = {
  Food:          '🍜 Makanan',
  Transport:     '🚗 Transportasi',
  Housing:       '🏠 Tempat Tinggal',
  Subscriptions: '📱 Langganan',
  Education:     '📚 Pendidikan',
  Health:        '🏥 Kesehatan',
  Entertainment: '🎮 Hiburan',
  Shopping:      '🛍 Belanja',
  Misc:          '📦 Lainnya',
};

/**
 * 50/30/20 budget rule buckets.
 * Maps category names → bucket.
 * "Needs" = 50%, "Wants" = 30%, "Savings" = 20% (kept as balance).
 */
const BUCKET_RULES = {
  Needs:   { pct: 0.50, label: 'Kebutuhan (Needs)',  color: '#0F62FE' },
  Wants:   { pct: 0.30, label: 'Keinginan (Wants)',  color: '#F59E0B' },
  Savings: { pct: 0.20, label: 'Tabungan (Savings)', color: '#10B981' },
};

const CATEGORY_BUCKET = {
  Food:          'Needs',
  Transport:     'Needs',
  Housing:       'Needs',
  Health:        'Needs',
  Education:     'Needs',
  Subscriptions: 'Wants',
  Entertainment: 'Wants',
  Shopping:      'Wants',
  Misc:          'Wants',
};

/** Auto-categorization keyword map (Indonesian + common English) */
const KEYWORD_MAP = [
  { cat: 'Food',          kw: ['makan','makanan','minum','kopi','cafe','restoran','warung','gofood','grabfood','shopeefood','nasi','bakso','mie','pizza','burger','ayam','soto','indomie','jajan','snack','boba','teh','es','lunch','dinner','breakfast','sarapan'] },
  { cat: 'Transport',     kw: ['grab','gojek','ojek','bensin','bbm','pertamax','solar','parkir','tol','busway','trans','kereta','krl','mrt','lrt','tiket','bus','angkot','taksi','taxi','uber','gocar','motor','mobil','servis'] },
  { cat: 'Housing',       kw: ['kos','kost','kontrakan','sewa','listrik','pln','air','pdam','wifi','internet','indihome','firstmedia','myrepublic','token','iuran','rt','rw','sampah','kebersihan','renovasi'] },
  { cat: 'Subscriptions', kw: ['netflix','spotify','youtube','prime','disney','vidio','viu','mola','kuota','pulsa','xl','telkomsel','indosat','by.u','smartfren','paket','data','office365','icloud','google'] },
  { cat: 'Education',     kw: ['ukt','spp','kuliah','buku','buku','modul','kursus','les','pelatihan','seminar','workshop','ujian','skripsi','tugas','praktikum','alat tulis','atk','stationery','kampus'] },
  { cat: 'Health',        kw: ['obat','apotek','apotik','dokter','klinik','rs','rumah sakit','puskesmas','bpjs','vitamin','suplemen','gym','fitnes','fitness','olahraga','masker','antigen'] },
  { cat: 'Entertainment', kw: ['bioskop','cinema','xxi','cgv','konser','nonton','game','steam','playstation','xbox','nintendo','karaoke','bowling','outbound','liburan','wisata','hotel','villa','airbnb'] },
  { cat: 'Shopping',      kw: ['shopee','tokopedia','lazada','bukalapak','blibli','tiktok shop','baju','celana','sepatu','tas','pakaian','fashion','kosmetik','skincare','belanja','supermarket','indomaret','alfamart','giant','hypermart','mall'] },
];

/* ============================================================
   2. STORAGE LAYER
   ============================================================ */

/** Load app setup (income, month, goal) from localStorage */
function loadSetup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETUP);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Persist app setup */
function saveSetup(data) {
  localStorage.setItem(STORAGE_KEY_SETUP, JSON.stringify(data));
}

/** Load transaction list */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Persist transaction list */
function saveTransactions(txList) {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txList));
}

/**
 * Load learned keyword→category map from localStorage.
 * Shape: { "keyword": "CategoryName", ... }
 * @returns {Object}
 */
function loadLearnedKeywords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEARNED);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/**
 * Persist a single learned keyword correction.
 * Extracts meaningful tokens (≥3 chars) from description and maps them to category.
 * @param {string} description
 * @param {string} category
 */
function saveLearnedKeyword(description, category) {
  const learned = loadLearnedKeywords();
  // Tokenise: lowercase words ≥3 chars, skip common stop-words
  const STOP = new Set(['dan','atau','ke','di','yang','ini','itu','ada','aja','beli','buat','dari','sama','bersama','dengan','untuk','bulan','teman','baru','online']);
  const tokens = description.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP.has(t));
  // Store every extracted token → category
  for (const token of tokens) {
    learned[token] = category;
  }
  localStorage.setItem(STORAGE_KEY_LEARNED, JSON.stringify(learned));
}

/** Remove all learned keyword corrections */
function clearLearnedKeywords() {
  localStorage.removeItem(STORAGE_KEY_LEARNED);
}

/* ============================================================
   3. UTILITY & FORMATTING HELPERS
   ============================================================ */

/**
 * Format a number as Rupiah: Rp 1.250.000
 * @param {number} n
 * @returns {string}
 */
function formatRupiah(n) {
  const abs = Math.abs(n);
  return 'Rp ' + abs.toLocaleString('id-ID');
}

/**
 * Format a date string (YYYY-MM-DD) to locale display: 6 Nov 2026
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns today as YYYY-MM-DD
 * @returns {string}
 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns current month as YYYY-MM
 * @returns {string}
 */
function currentMonthStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Format a month string YYYY-MM to "November 2026"
 * @param {string} monthStr
 * @returns {string}
 */
function formatMonth(monthStr) {
  if (!monthStr) return '—';
  const [y, m] = monthStr.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * Generate a simple unique ID
 * @returns {string}
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Clamp a value between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

/* ============================================================
   4. AUTO-CATEGORIZATION ENGINE
   ============================================================ */

/**
 * Given a free-text description, return the best-matching category.
 * Searches KEYWORD_MAP against lowercased words/tokens from description.
 * @param {string} description
 * @returns {string} category name
 */
function autoCategory(description) {
  if (!description) return 'Misc';
  const lower = description.toLowerCase();

  // ── Check user-learned keywords first (highest priority) ──
  const learned = loadLearnedKeywords();
  const learnedKeys = Object.keys(learned).sort((a, b) => b.length - a.length); // longest first
  for (const kw of learnedKeys) {
    if (lower.includes(kw)) return learned[kw];
  }

  // ── Fall back to built-in KEYWORD_MAP ──
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.kw) {
      if (lower.includes(kw)) return entry.cat;
    }
  }
  return 'Misc';
}

/* ============================================================
   5. NAVIGATION & VIEW ROUTER
   ============================================================ */

let currentView = 'dashboard';

/**
 * Switch the active view panel and update nav buttons
 * @param {string} viewId - e.g. "dashboard"
 */
function navigateTo(viewId) {
  // Hide all views
  document.querySelectorAll('.view').forEach(el => {
    el.hidden = true;
    el.classList.remove('active');
  });
  // Show target view
  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.hidden = false;
    target.classList.add('active');
  }
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.view === viewId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });
  currentView = viewId;
  // Refresh view-specific content
  refreshCurrentView(viewId);
  // Close mobile sidebar
  closeSidebar();
}

/**
 * Refresh view-specific content when navigating
 * @param {string} viewId
 */
function refreshCurrentView(viewId) {
  switch (viewId) {
    case 'dashboard':    renderDashboard();    break;
    case 'transactions': renderTransactionTable(); break;
    case 'insights':     renderInsights();     break;
    case 'savings':      renderSavingsGoal();  break;
    case 'setup':        populateSetupForm();  break;
  }
}

/* ============================================================
   6. FIRST-RUN SETUP & SETUP FORM
   ============================================================ */

/** Show first-run overlay if no setup data exists */
function checkFirstRun() {
  const setup = loadSetup();
  if (!setup) {
    const overlay = document.getElementById('firstRunOverlay');
    overlay.removeAttribute('hidden');
    // Pre-fill month to current
    document.getElementById('frMonth').value = currentMonthStr();
    document.getElementById('frMonth').focus();
  }
}

/** Handle first-run form submission */
function onFirstRunSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('frFormError');
  errEl.hidden = true;

  const month      = document.getElementById('frMonth').value.trim();
  const incomeRaw  = document.getElementById('frIncome').value.trim();
  const goalName   = document.getElementById('frGoalName').value.trim();
  const goalAmtRaw = document.getElementById('frGoalAmount').value.trim();

  // Validation
  if (!month) {
    showFormError(errEl, 'Pilih bulan terlebih dahulu.');
    return;
  }
  const income = parseFloat(incomeRaw);
  if (!incomeRaw || isNaN(income) || income <= 0) {
    showFormError(errEl, 'Masukkan pemasukan yang valid (lebih dari 0).');
    return;
  }
  const goalAmt = goalAmtRaw ? parseFloat(goalAmtRaw) : 0;
  if (goalAmtRaw && (isNaN(goalAmt) || goalAmt < 0)) {
    showFormError(errEl, 'Jumlah target tidak valid.');
    return;
  }

  saveSetup({ month, income, goalName, goalAmt });
  document.getElementById('firstRunOverlay').hidden = true;
  updateMonthBadge();
  renderDashboard();
  showToast('Pengaturan tersimpan! Selamat mencatat keuangan 🎉', 'success');
}

/** Populate the Setup view form with current data */
function populateSetupForm() {
  const setup = loadSetup();
  if (!setup) return;
  document.getElementById('setupMonth').value      = setup.month || currentMonthStr();
  document.getElementById('setupIncome').value     = setup.income || '';
  document.getElementById('setupGoalName').value   = setup.goalName || '';
  document.getElementById('setupGoalAmount').value = setup.goalAmt || '';
}

/** Handle Setup form submission */
function onSetupSubmit(e) {
  e.preventDefault();
  const month      = document.getElementById('setupMonth').value.trim();
  const incomeRaw  = document.getElementById('setupIncome').value.trim();
  const goalName   = document.getElementById('setupGoalName').value.trim();
  const goalAmtRaw = document.getElementById('setupGoalAmount').value.trim();

  if (!month) { showToast('Pilih bulan!', 'error'); return; }
  const income = parseFloat(incomeRaw);
  if (!incomeRaw || isNaN(income) || income <= 0) {
    showToast('Pemasukan harus lebih dari 0!', 'error'); return;
  }
  const goalAmt = goalAmtRaw ? parseFloat(goalAmtRaw) : 0;
  if (goalAmtRaw && (isNaN(goalAmt) || goalAmt < 0)) {
    showToast('Jumlah target tidak valid!', 'error'); return;
  }

  saveSetup({ month, income, goalName, goalAmt });
  updateMonthBadge();
  showToast('Pengaturan berhasil disimpan ✔', 'success');
}

/** Update the sidebar month badge and topbar month display */
function updateMonthBadge() {
  const setup = loadSetup();
  const label = setup ? formatMonth(setup.month) : '—';
  document.getElementById('currentMonthBadge').textContent = label;
  document.getElementById('topbarMonth').textContent = label;
  document.getElementById('dashSubtitle').textContent = setup
    ? `Ringkasan keuangan ${label}`
    : 'Ringkasan keuangan bulan ini';
}

/* ============================================================
   7. TRANSACTION CRUD
   ============================================================ */

/** Open the Add Transaction modal with default values */
function openAddTxModal() {
  document.getElementById('txModalTitle').textContent = 'Tambah Transaksi';
  document.getElementById('txId').value       = '';
  document.getElementById('txDate').value     = todayStr();
  document.getElementById('txType').value     = '';
  document.getElementById('txAmount').value   = '';
  document.getElementById('txDesc').value     = '';
  document.getElementById('txCategory').value = '';
  document.getElementById('txFormError').hidden = true;
  document.getElementById('txModalOverlay').removeAttribute('hidden');
  document.getElementById('txDate').focus();
}

/** Close the transaction modal */
function closeTxModal() {
  document.getElementById('txModalOverlay').hidden = true;
}

/** Handle transaction form submission (add or update) */
function onTxFormSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('txFormError');
  errEl.hidden = true;

  const id      = document.getElementById('txId').value;
  const dateVal = document.getElementById('txDate').value;
  const typeVal = document.getElementById('txType').value;
  const amtRaw  = document.getElementById('txAmount').value.trim();
  const descVal = document.getElementById('txDesc').value.trim();
  const catVal  = document.getElementById('txCategory').value;

  // ── Validation ──
  if (!dateVal) {
    showFormError(errEl, 'Tanggal wajib diisi.'); return;
  }
  if (!typeVal) {
    showFormError(errEl, 'Pilih tipe transaksi (Pemasukan / Pengeluaran).'); return;
  }
  const amount = parseFloat(amtRaw);
  if (!amtRaw || isNaN(amount) || amount <= 0) {
    showFormError(errEl, 'Jumlah harus lebih dari 0 dan tidak boleh negatif.'); return;
  }
  if (!descVal) {
    showFormError(errEl, 'Deskripsi wajib diisi.'); return;
  }

  // Determine category: manual override or auto-detect
  const category = (catVal && catVal !== '') ? catVal : (typeVal === 'income' ? 'Income' : autoCategory(descVal));

  const txList = loadTransactions();

  if (id) {
    // Update existing
    const idx = txList.findIndex(t => t.id === id);
    if (idx !== -1) {
      txList[idx] = { ...txList[idx], date: dateVal, type: typeVal, amount, description: descVal, category };
    }
    showToast('Transaksi diperbarui ✔', 'success');
  } else {
    // Add new
    txList.push({ id: genId(), date: dateVal, type: typeVal, amount, description: descVal, category });
    showToast('Transaksi ditambahkan ✔', 'success');
  }

  saveTransactions(txList);
  closeTxModal();
  refreshCurrentView(currentView);
  // If on dashboard, also ensure dashboard renders
  if (currentView !== 'transactions') renderDashboard();
}

/**
 * Delete a transaction by ID with inline confirmation
 * @param {string} txId
 */
function deleteTx(txId) {
  openConfirmModal(
    'Hapus transaksi ini? Tindakan tidak bisa dibatalkan.',
    () => {
      const txList = loadTransactions().filter(t => t.id !== txId);
      saveTransactions(txList);
      renderTransactionTable();
      renderDashboard();
      showToast('Transaksi dihapus.', 'success');
    }
  );
}

/* ============================================================
   8. DASHBOARD KPIs & BUDGET RULE 50/30/20
   ============================================================ */

/** Get transactions filtered to current setup month */
function getMonthTransactions() {
  const setup = loadSetup();
  if (!setup) return [];
  const txList = loadTransactions();
  return txList.filter(t => t.date && t.date.startsWith(setup.month));
}

/**
 * Get transactions for the month immediately before the setup month.
 * Returns an empty array if no setup or no transactions for that month.
 * @returns {Array}
 */
function getPrevMonthTransactions() {
  const setup = loadSetup();
  if (!setup || !setup.month) return [];
  const [y, m] = setup.month.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1); // m-2 because getMonth is 0-based
  const prevMonth = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
  return loadTransactions().filter(t => t.date && t.date.startsWith(prevMonth));
}

/** Calculate aggregate KPIs from a transaction list */
function calcKPIs(txList, income) {
  const totalIncome  = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) + (income || 0);
  // Note: income from setup is the declared monthly income, shown separately
  // Actual: income in tx = extra income, setup income = base
  // We'll treat setup income as the primary income source
  const txIncome     = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const baseIncome   = income || 0;
  const grandIncome  = baseIncome + txIncome;
  const balance      = grandIncome - totalExpense;
  const savingsRate  = grandIncome > 0 ? Math.max(0, (balance / grandIncome) * 100) : 0;
  return { baseIncome, txIncome, grandIncome, totalExpense, balance, savingsRate, txIncomeCount: txList.filter(t => t.type === 'income').length, txExpenseCount: txList.filter(t => t.type === 'expense').length };
}

/** Render all dashboard components */
function renderDashboard() {
  const setup  = loadSetup();
  const txList = getMonthTransactions();
  const kpis   = calcKPIs(txList, setup ? setup.income : 0);

  // ── KPI Cards ──
  const balEl   = document.getElementById('kpiBalance');
  balEl.textContent = formatRupiah(kpis.balance);
  balEl.className   = 'kpi-value ' + (kpis.balance >= 0 ? 'positive' : 'negative');

  document.getElementById('kpiIncome').textContent       = formatRupiah(kpis.grandIncome);
  document.getElementById('kpiExpense').textContent      = formatRupiah(kpis.totalExpense);
  document.getElementById('kpiSavingsRate').textContent  = kpis.savingsRate.toFixed(1) + '%';
  document.getElementById('kpiIncomeCount').textContent  = (setup ? '1 sumber utama' : '') + (kpis.txIncomeCount > 0 ? ` + ${kpis.txIncomeCount} transaksi` : '');
  document.getElementById('kpiExpenseCount').textContent = kpis.txExpenseCount + ' transaksi';
  document.getElementById('kpiBalancePct').textContent   = kpis.grandIncome > 0
    ? ((kpis.balance / kpis.grandIncome) * 100).toFixed(1) + '% dari total pemasukan'
    : '—';

  // Color savings rate
  const srEl = document.getElementById('kpiSavingsRate');
  srEl.className = 'kpi-value' + (kpis.savingsRate >= 20 ? ' positive' : kpis.savingsRate >= 10 ? '' : ' negative');

  // ── KPI: Daily Allowance ──
  renderDailyAllowance(kpis, setup);

  // ── MoM Comparison ──
  renderMomCard();

  // ── Budget Rule ──
  renderBudgetRule(txList, kpis.grandIncome);

  // ── Charts ──
  renderCategoryChart(txList);
  renderTrendChart(txList, setup ? setup.month : currentMonthStr());
}

/**
 * Render the "Batas Harian" (daily allowance) KPI card.
 * Allowance = remaining balance / remaining days in current month (including today).
 * @param {Object} kpis
 * @param {Object|null} setup
 */
function renderDailyAllowance(kpis, setup) {
  const el    = document.getElementById('kpiDailyAllowance');
  const subEl = document.getElementById('kpiDailyAllowanceSub');

  if (!setup) {
    el.textContent  = '—';
    el.className    = 'kpi-value';
    subEl.textContent = 'Atur pengaturan dulu';
    return;
  }

  // Determine remaining days in the setup month (inclusive of today if same month)
  const now = new Date();
  const [y, m] = setup.month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayLocal  = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  let remainingDays;
  if (todayLocal === setup.month) {
    // From today to end of month, inclusive
    remainingDays = daysInMonth - now.getDate() + 1;
  } else if (todayLocal < setup.month) {
    // Setup month is in the future — full month available
    remainingDays = daysInMonth;
  } else {
    // Setup month has passed — 0 days remaining
    remainingDays = 0;
  }

  if (remainingDays <= 0 || kpis.balance <= 0) {
    el.textContent  = kpis.balance <= 0 ? 'Rp 0 / hari' : '—';
    el.className    = 'kpi-value negative';
    subEl.textContent = kpis.balance <= 0 ? '⚠ Saldo habis atau minus' : '0 hari tersisa';
    return;
  }

  const daily = Math.floor(kpis.balance / remainingDays);
  el.textContent  = formatRupiah(daily) + ' / hari';
  el.className    = 'kpi-value' + (daily >= 0 ? '' : ' negative');
  subEl.textContent = `${remainingDays} hari tersisa bulan ini`;
}

/**
 * Render the month-over-month comparison card.
 * Compares this month's total expense and per-category expense vs previous month.
 */
function renderMomCard() {
  const content  = document.getElementById('momContent');
  const setup    = loadSetup();
  const thisTx   = getMonthTransactions();
  const prevTx   = getPrevMonthTransactions();

  const thisExp  = thisTx.filter(t => t.type === 'expense');
  const prevExp  = prevTx.filter(t => t.type === 'expense');

  // Empty state: no previous-month data at all
  if (prevExp.length === 0) {
    content.innerHTML = `
      <div class="empty-state" style="padding:20px 0">
        <span aria-hidden="true">📅</span>
        <p>Belum ada data bulan lalu untuk dibandingkan.</p>
      </div>`;
    return;
  }

  const thisTotal = thisExp.reduce((s, t) => s + t.amount, 0);
  const prevTotal = prevExp.reduce((s, t) => s + t.amount, 0);

  // Overall total change
  const totalDiff   = thisTotal - prevTotal;
  const totalPct    = prevTotal > 0 ? (totalDiff / prevTotal) * 100 : 0;
  const totalUp     = totalDiff > 0;
  const totalArrow  = totalDiff === 0 ? '→' : (totalUp ? '▲' : '▼');
  const totalClass  = totalDiff === 0 ? '' : (totalUp ? 'mom-up' : 'mom-down');

  // Per-category aggregation
  const thisMap = {}, prevMap = {};
  for (const tx of thisExp) thisMap[tx.category] = (thisMap[tx.category] || 0) + tx.amount;
  for (const tx of prevExp) prevMap[tx.category] = (prevMap[tx.category] || 0) + tx.amount;
  const allCats = [...new Set([...Object.keys(thisMap), ...Object.keys(prevMap)])].sort();

  const catRows = allCats.map(cat => {
    const tVal  = thisMap[cat] || 0;
    const pVal  = prevMap[cat] || 0;
    const diff  = tVal - pVal;
    const pct   = pVal > 0 ? (diff / pVal) * 100 : (tVal > 0 ? 100 : 0);
    const up    = diff > 0;
    const arrow = diff === 0 ? '→' : (up ? '▲' : '▼');
    const cls   = diff === 0 ? '' : (up ? 'mom-up' : 'mom-down');
    const label = CATEGORY_LABELS[cat] || cat;
    return `
      <tr>
        <td><span class="cat-tag">${label}</span></td>
        <td class="text-right mom-num">${formatRupiah(pVal)}</td>
        <td class="text-right mom-num">${formatRupiah(tVal)}</td>
        <td class="text-right"><span class="mom-badge ${cls}" aria-label="${diff >= 0 ? 'naik' : 'turun'} ${Math.abs(pct).toFixed(1)} persen">${arrow} ${Math.abs(pct).toFixed(1)}%</span></td>
      </tr>`;
  }).join('');

  const prevMonthLabel = (() => {
    if (!setup) return 'Bulan Lalu';
    const [y, m] = setup.month.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    return prev.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  })();

  content.innerHTML = `
    <div class="mom-summary">
      <div class="mom-total">
        <span class="mom-total-label">Total Pengeluaran Bulan Ini</span>
        <span class="mom-total-value">${formatRupiah(thisTotal)}</span>
      </div>
      <div class="mom-total-change">
        <span class="mom-badge ${totalClass}" aria-label="Perubahan total pengeluaran">
          ${totalArrow} ${Math.abs(totalPct).toFixed(1)}%
        </span>
        <span class="mom-vs">vs ${prevMonthLabel} (${formatRupiah(prevTotal)})</span>
      </div>
    </div>
    <div class="table-wrapper" role="region" aria-label="Perbandingan per kategori" tabindex="0">
      <table aria-label="Tabel perbandingan pengeluaran per kategori">
        <thead>
          <tr>
            <th scope="col">Kategori</th>
            <th scope="col" class="text-right">Bulan Lalu</th>
            <th scope="col" class="text-right">Bulan Ini</th>
            <th scope="col" class="text-right">Perubahan</th>
          </tr>
        </thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>`;
}

/**
 * Render 50/30/20 budget rule buckets
 * @param {Array} txList
 * @param {number} income
 */
function renderBudgetRule(txList, income) {
  const container = document.getElementById('budgetBuckets');
  const expenses  = txList.filter(t => t.type === 'expense');

  // Sum expenses per bucket
  const bucketSpend = { Needs: 0, Wants: 0, Savings: 0 };
  for (const tx of expenses) {
    const bucket = CATEGORY_BUCKET[tx.category] || 'Wants';
    bucketSpend[bucket] += tx.amount;
  }
  // Savings bucket = income - all expenses (not a spend bucket)
  const actualSavings = Math.max(0, income - expenses.reduce((s, t) => s + t.amount, 0));
  bucketSpend.Savings = income > 0 ? income - expenses.reduce((s, t) => s + t.amount, 0) : 0;

  let html = '';
  for (const [key, rule] of Object.entries(BUCKET_RULES)) {
    const limit   = income * rule.pct;
    const display = key === 'Savings' ? actualSavings : bucketSpend[key];
    const pct     = limit > 0 ? clamp((display / limit) * 100, 0, 110) : 0;

    let fillClass, statusClass, statusMsg;

    if (key === 'Savings') {
      // Savings is a MINIMUM target — more is always better, never a warning
      const met  = display >= limit;
      const near = !met && pct >= 75; // within 75–99% of target: nudge, not danger
      fillClass   = met ? '' : (near ? 'warn' : 'danger');
      statusClass = met ? '' : (near ? 'warn' : 'danger');
      // Override fill color to green when target is met
      const fillStyle = met ? 'background:var(--color-positive)' : '';
      statusMsg = met
        ? `✅ Target tercapai! (${pct.toFixed(0)}%)`
        : near
        ? `⚡ Kurang ${formatRupiah(limit - display)} dari target`
        : `⚠ Di bawah target — kurang ${formatRupiah(limit - display)}`;
      html += `
        <div class="bucket-row" role="group" aria-label="${rule.label}">
          <div class="bucket-meta">
            <span class="bucket-label">${rule.label}</span>
            <span class="bucket-values">${formatRupiah(display)} / ${formatRupiah(limit)}</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuenow="${clamp(pct,0,100).toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${rule.label} progress">
            <div class="progress-fill ${fillClass}" style="width:${clamp(pct, 0, 100)}%;${fillStyle}"></div>
          </div>
          <div class="bucket-status ${statusClass}">${income > 0 ? statusMsg : 'Belum ada data pemasukan'}</div>
        </div>`;
    } else {
      // Needs & Wants are MAXIMUM limits — spending over is bad
      const over = display > limit;
      const near = !over && pct >= 85;
      fillClass   = over ? 'danger' : (near ? 'warn' : '');
      statusClass = over ? 'danger' : (near ? 'warn' : '');
      statusMsg   = over
        ? `⚠ Melebihi batas ${formatRupiah(display - limit)}`
        : near
        ? `⚡ Mendekati batas (${pct.toFixed(0)}%)`
        : `${pct.toFixed(0)}% dari batas`;
      html += `
        <div class="bucket-row" role="group" aria-label="${rule.label}">
          <div class="bucket-meta">
            <span class="bucket-label">${rule.label}</span>
            <span class="bucket-values">${formatRupiah(display)} / ${formatRupiah(limit)}</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuenow="${clamp(pct,0,100).toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${rule.label} progress">
            <div class="progress-fill ${fillClass}" style="width:${clamp(pct, 0, 100)}%"></div>
          </div>
          <div class="bucket-status ${statusClass}">${income > 0 ? statusMsg : 'Belum ada data pemasukan'}</div>
        </div>`;
    }
  }
  container.innerHTML = html;
}

/* ============================================================
   9. SVG CHARTS
   ============================================================ */

/** Color pool for donut chart slices */
const DONUT_COLORS = Object.values(CATEGORY_COLORS);

/**
 * Render expense-by-category donut chart (pure SVG)
 * @param {Array} txList
 */
function renderCategoryChart(txList) {
  const container  = document.getElementById('categoryChartContainer');
  const emptyEl    = document.getElementById('categoryChartEmpty');
  const legendEl   = document.getElementById('categoryLegend');

  const expenses = txList.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    emptyEl.hidden = false;
    legendEl.innerHTML = '';
    // Remove old SVG
    const old = container.querySelector('svg');
    if (old) old.remove();
    return;
  }
  emptyEl.hidden = true;

  // Aggregate by category
  const catMap = {};
  for (const tx of expenses) {
    catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
  }
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  // Build SVG donut
  const SIZE   = 200;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const R      = 75;
  const INNER  = 46;
  let angle    = -Math.PI / 2; // start at top

  const catColors = {};
  entries.forEach(([cat], i) => { catColors[cat] = CATEGORY_COLORS[cat] || DONUT_COLORS[i % DONUT_COLORS.length]; });

  let paths = '';
  for (let i = 0; i < entries.length; i++) {
    const [cat, val] = entries[i];
    const slice = (val / total) * 2 * Math.PI;
    const x1    = CX + R * Math.cos(angle);
    const y1    = CY + R * Math.sin(angle);
    const x2    = CX + R * Math.cos(angle + slice);
    const y2    = CY + R * Math.sin(angle + slice);
    const xi1   = CX + INNER * Math.cos(angle);
    const yi1   = CY + INNER * Math.sin(angle);
    const xi2   = CX + INNER * Math.cos(angle + slice);
    const yi2   = CY + INNER * Math.sin(angle + slice);
    const large = slice > Math.PI ? 1 : 0;
    const pct   = ((val / total) * 100).toFixed(1);

    paths += `<path
      d="M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1} Z"
      fill="${catColors[cat]}"
      opacity="0.92"
      role="img"
      aria-label="${CATEGORY_LABELS[cat] || cat}: ${pct}% (${formatRupiah(val)})"
      tabindex="0">
      <title>${CATEGORY_LABELS[cat] || cat}: ${pct}% · ${formatRupiah(val)}</title>
    </path>`;
    angle += slice;
  }

  // Center label
  const centerText = `
    <text x="${CX}" y="${CY - 6}" text-anchor="middle" class="svg-label" style="font-size:.65rem;fill:#57606A">Total</text>
    <text x="${CX}" y="${CY + 12}" text-anchor="middle" style="font-size:.72rem;font-weight:700;fill:#1F2328;font-family:monospace">${formatRupiah(total)}</text>`;

  const svgHtml = `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="Donut chart pengeluaran per kategori">
    <title>Pengeluaran per Kategori</title>
    ${paths}
    ${centerText}
  </svg>`;

  // Remove old, inject new
  const old = container.querySelector('svg');
  if (old) old.remove();
  container.insertAdjacentHTML('afterbegin', svgHtml);

  // Legend
  legendEl.innerHTML = entries.map(([cat, val]) => `
    <div class="legend-item" role="listitem">
      <span class="legend-dot" style="background:${catColors[cat]}" aria-hidden="true"></span>
      <span>${CATEGORY_LABELS[cat] || cat} · <strong>${((val/total)*100).toFixed(0)}%</strong></span>
    </div>`).join('');
}

/**
 * Render daily spending trend as an SVG line chart
 * @param {Array} txList
 * @param {string} monthStr  YYYY-MM
 */
function renderTrendChart(txList, monthStr) {
  const container = document.getElementById('trendChartContainer');
  const emptyEl   = document.getElementById('trendChartEmpty');

  const expenses = txList.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    emptyEl.hidden = false;
    const old = container.querySelector('svg');
    if (old) old.remove();
    return;
  }
  emptyEl.hidden = true;

  // Aggregate by day
  const dayMap = {};
  for (const tx of expenses) {
    const day = parseInt(tx.date.split('-')[2], 10);
    dayMap[day] = (dayMap[day] || 0) + tx.amount;
  }

  // Determine days in month
  const [y, m] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const now = new Date();
  const todayLocal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const isCurrentMonth = todayLocal === monthStr;
  const todayDay = now.getDate();
  // Last day with any transaction data
  const lastDataDay = Object.keys(dayMap).reduce((max, d) => Math.max(max, parseInt(d, 10)), 0);
  // Plot up to max(today, lastDataDay) for current month, all days for past months
  const maxDay = isCurrentMonth
    ? Math.min(Math.max(todayDay, lastDataDay), daysInMonth)
    : daysInMonth;

  const days   = Array.from({ length: maxDay }, (_, i) => i + 1);
  const values = days.map(d => dayMap[d] || 0);
  const maxVal = Math.max(...values, 1);

  // SVG dimensions
  const W = 360; const H = 180;
  const PAD_L = 54; const PAD_R = 12; const PAD_T = 14; const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xScale = (d) => PAD_L + ((d - 1) / Math.max(days.length - 1, 1)) * chartW;
  const yScale = (v) => PAD_T + chartH - (v / maxVal) * chartH;

  // Y axis ticks
  const yTicks = [0, maxVal * 0.5, maxVal];
  const yLines = yTicks.map(v => {
    const y = yScale(v);
    return `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y}" y2="${y}" class="svg-axis-line" />
            <text x="${PAD_L - 4}" y="${y + 4}" text-anchor="end" class="svg-value-label">${v >= 1e6 ? (v/1e6).toFixed(1)+'jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'rb' : v}</text>`;
  }).join('');

  // X axis ticks (every 5 days)
  const xTickDays = days.filter(d => d === 1 || d % 5 === 0 || d === days.length);
  const xLines = xTickDays.map(d => {
    const x = xScale(d);
    return `<text x="${x}" y="${H - PAD_B + 14}" text-anchor="middle" class="svg-label">${d}</text>`;
  }).join('');

  // Line path
  const points = days.map(d => `${xScale(d)},${yScale(dayMap[d] || 0)}`).join(' ');
  const linePath = `M ${days.map(d => `${xScale(d)} ${yScale(dayMap[d] || 0)}`).join(' L ')}`;

  // Area fill path
  const firstX = xScale(1); const lastX = xScale(days[days.length - 1]);
  const areaPath = `M ${firstX} ${yScale(0)} L ${linePath.slice(2)} L ${lastX} ${yScale(0)} Z`;

  // Dots for days with data
  const dots = Object.entries(dayMap).map(([d, v]) => {
    const x = xScale(parseInt(d, 10)); const y = yScale(v);
    return `<circle cx="${x}" cy="${y}" r="3.5" class="svg-dot" aria-label="Hari ${d}: ${formatRupiah(v)}"><title>Hari ${d}: ${formatRupiah(v)}</title></circle>`;
  }).join('');

  const svgHtml = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Grafik tren pengeluaran harian bulan ${formatMonth(monthStr)}">
    <title>Tren Pengeluaran Harian</title>
    <!-- Axis lines -->
    ${yLines}
    <!-- X labels -->
    ${xLines}
    <!-- Area -->
    <path d="${areaPath}" class="svg-area-path" />
    <!-- Line -->
    <path d="${linePath}" class="svg-line-path" />
    <!-- Dots -->
    ${dots}
  </svg>`;

  const old = container.querySelector('svg');
  if (old) old.remove();
  container.insertAdjacentHTML('afterbegin', svgHtml);
}

/* ============================================================
   10. AI INSIGHTS ENGINE
   ============================================================ */

/**
 * Generate 3–5 plain-language financial tips from data.
 * Each insight cites specific numbers.
 * @returns {Array<{type: string, icon: string, title: string, body: string}>}
 */
function generateInsights() {
  const setup   = loadSetup();
  if (!setup) return [{ type: 'info', icon: 'ℹ️', title: 'Belum Ada Data', body: 'Tambahkan pengaturan bulanan dan transaksimu untuk mulai mendapatkan insight.' }];

  const txList  = getMonthTransactions();
  const kpis    = calcKPIs(txList, setup.income);
  const insights = [];

  const expenses = txList.filter(t => t.type === 'expense');
  const totalExp = kpis.totalExpense;
  const income   = kpis.grandIncome;

  // ── Insight 1: Biggest spending category ──
  if (expenses.length > 0) {
    const catMap = {};
    for (const tx of expenses) {
      catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
    }
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const pct = income > 0 ? ((topCat[1] / income) * 100).toFixed(1) : '—';
    insights.push({
      type:  'info',
      icon:  '🏆',
      title: 'Kategori Terbesar: ' + (CATEGORY_LABELS[topCat[0]] || topCat[0]),
      body:  `Pengeluaran terbanyak kamu ada di <strong class="insight-number">${CATEGORY_LABELS[topCat[0]] || topCat[0]}</strong> sebesar <strong class="insight-number">${formatRupiah(topCat[1])}</strong>, yaitu <strong class="insight-number">${pct}%</strong> dari total pemasukanmu (${formatRupiah(income)}).`,
    });
  }

  // ── Insight 2: Daily spend average & projection ──
  if (expenses.length > 0) {
    const [yr, mo] = setup.month.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const today       = new Date();
    const isThisMonth = today.toISOString().slice(0,7) === setup.month;
    const daysPassed  = isThisMonth ? today.getDate() : daysInMonth;
    const dailyAvg    = daysPassed > 0 ? totalExp / daysPassed : 0;
    const projected   = dailyAvg * daysInMonth;
    const surplus     = income - projected;
    const type        = surplus < 0 ? 'danger' : surplus < income * 0.1 ? 'warn' : 'info';

    insights.push({
      type,
      icon:  '📅',
      title: 'Proyeksi Akhir Bulan',
      body:  `Rata-rata pengeluaran harianmu adalah <strong class="insight-number">${formatRupiah(Math.round(dailyAvg))}</strong>/hari (${daysPassed} hari terhitung). Jika berlanjut, total pengeluaran akhir bulan diperkirakan <strong class="insight-number">${formatRupiah(Math.round(projected))}</strong> — ${surplus >= 0 ? `menyisakan saldo <strong class="insight-number">${formatRupiah(Math.round(surplus))}</strong>` : `melebihi pemasukan sebesar <strong class="insight-number">${formatRupiah(Math.round(-surplus))}</strong>`}.`,
    });
  }

  // ── Insight 3: Spending pace vs income ──
  if (income > 0 && totalExp > 0) {
    const ratio = totalExp / income;
    if (ratio > 0.9) {
      insights.push({
        type:  'danger',
        icon:  '🚨',
        title: 'Kecepatan Pengeluaran Tinggi!',
        body:  `Total pengeluaranmu saat ini (<strong class="insight-number">${formatRupiah(totalExp)}</strong>) sudah mencapai <strong class="insight-number">${(ratio * 100).toFixed(1)}%</strong> dari total pemasukan (<strong class="insight-number">${formatRupiah(income)}</strong>). Pertimbangkan untuk mengurangi pengeluaran tidak mendesak agar keuanganmu tetap sehat.`,
      });
    } else if (ratio > 0.7) {
      insights.push({
        type:  'warn',
        icon:  '⚠️',
        title: 'Pengeluaran Mendekati Batas',
        body:  `Pengeluaranmu sudah mencapai <strong class="insight-number">${(ratio * 100).toFixed(1)}%</strong> dari pemasukanmu (${formatRupiah(totalExp)} dari ${formatRupiah(income)}). Sisakan minimal 20% untuk tabungan!`,
      });
    } else {
      insights.push({
        type:  'info',
        icon:  '✅',
        title: 'Pengeluaran Terkontrol',
        body:  `Pengeluaranmu masih terkendali di <strong class="insight-number">${(ratio * 100).toFixed(1)}%</strong> dari pemasukan (${formatRupiah(totalExp)} dari ${formatRupiah(income)}). Pertahankan gaya hidupmu!`,
      });
    }
  }

  // ── Insight 4: Savings rate vs 50/30/20 benchmark ──
  const sr = kpis.savingsRate;
  if (income > 0) {
    if (sr >= 20) {
      insights.push({
        type:  'info',
        icon:  '🎉',
        title: 'Target Tabungan 20% Tercapai!',
        body:  `Tingkat tabunganmu saat ini <strong class="insight-number">${sr.toFixed(1)}%</strong> dari pemasukan — melampaui target 20% dari aturan 50/30/20. Kamu berada di jalur yang tepat untuk mencapai kebebasan finansial!`,
      });
    } else if (sr > 0) {
      insights.push({
        type:  'warn',
        icon:  '💡',
        title: `Tingkat Tabungan ${sr.toFixed(1)}% — Bisa Lebih Baik`,
        body:  `Berdasarkan aturan 50/30/20, idealnya kamu menabung minimal <strong class="insight-number">${formatRupiah(income * 0.2)}</strong>/bulan (20% dari ${formatRupiah(income)}). Saat ini kamu menabung estimasi <strong class="insight-number">${formatRupiah(Math.max(0, kpis.balance))}</strong>. Coba kurangi pengeluaran kategori Keinginan (Wants).`,
      });
    } else {
      insights.push({
        type:  'danger',
        icon:  '😰',
        title: 'Tabungan Negatif!',
        body:  `Pengeluaranmu melebihi pemasukanmu sehingga tidak ada ruang untuk menabung. Segera tinjau ulang pengeluaranmu dan cari pos yang bisa dipangkas.`,
      });
    }
  }

  // ── Insight 5: Savings goal progress ──
  if (setup.goalName && setup.goalAmt > 0) {
    const { saved, pct, monthsLeft } = calcSavingsGoalData(kpis);
    insights.push({
      type:  pct >= 100 ? 'info' : 'info',
      icon:  '🎯',
      title: `Target: ${setup.goalName}`,
      body:  pct >= 100
        ? `Selamat! Kamu sudah mencapai target tabungan <strong class="insight-number">${setup.goalName}</strong> (${formatRupiah(setup.goalAmt)})! 🎉`
        : `Progres tabungan untuk <strong class="insight-number">${setup.goalName}</strong>: <strong class="insight-number">${formatRupiah(saved)}</strong> dari <strong class="insight-number">${formatRupiah(setup.goalAmt)}</strong> (<strong class="insight-number">${pct.toFixed(1)}%</strong>). Estimasi tercapai dalam <strong class="insight-number">~${monthsLeft} bulan</strong> lagi jika menabung ${formatRupiah(Math.max(0,kpis.balance))}/bulan.`,
    });
  }

  return insights.length > 0 ? insights : [{ type: 'info', icon: 'ℹ️', title: 'Belum Cukup Data', body: 'Tambahkan lebih banyak transaksi untuk mendapatkan insight yang lebih akurat.' }];
}

/** Render the insights view */
function renderInsights() {
  const list     = document.getElementById('insightsList');
  const insights = generateInsights();
  list.innerHTML = insights.map(i => `
    <article class="insight-card ${i.type === 'warn' ? 'warn' : i.type === 'danger' ? 'danger' : ''}" aria-label="${i.title}">
      <div class="insight-header"><span aria-hidden="true">${i.icon}</span> ${i.title}</div>
      <div class="insight-body">${i.body}</div>
    </article>`).join('');
}

/* ============================================================
   11. SAVINGS GOAL TRACKER
   ============================================================ */

/**
 * Calculate savings goal data
 * @param {Object} kpis
 * @returns {{saved: number, pct: number, monthsLeft: number}}
 */
function calcSavingsGoalData(kpis) {
  const setup   = loadSetup();
  const saved   = Math.max(0, kpis.balance);
  const target  = setup && setup.goalAmt > 0 ? setup.goalAmt : 0;
  const pct     = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;
  const monthly = Math.max(0, kpis.balance);
  const remaining = target - saved;
  const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : 99;
  return { saved, target, pct, monthsLeft, monthly };
}

/** Render the savings goal card */
function renderSavingsGoal() {
  const setup  = loadSetup();
  const panel  = document.getElementById('savingsGoalPanel');

  if (!setup || !setup.goalName || !setup.goalAmt) {
    panel.innerHTML = `
      <div class="goal-empty">
        <p style="font-size:2rem">🎯</p>
        <p style="margin-top:8px">Belum ada target tabungan.</p>
        <p style="margin-top:4px;font-size:.85rem;color:var(--color-text-muted)">Atur target di menu <strong>Pengaturan</strong>.</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="navigateTo('setup')">Atur Sekarang</button>
      </div>`;
    return;
  }

  const txList = getMonthTransactions();
  const kpis   = calcKPIs(txList, setup.income);
  const { saved, target, pct, monthsLeft, monthly } = calcSavingsGoalData(kpis);

  // ETA date
  const etaDate = new Date();
  etaDate.setMonth(etaDate.getMonth() + (pct < 100 ? monthsLeft : 0));
  const etaLabel = pct >= 100 ? 'Sudah Tercapai! 🎉' : etaDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  panel.innerHTML = `
    <div class="goal-header">
      <span class="goal-name">🎯 ${escapeHtml(setup.goalName)}</span>
      <span class="goal-percent">${pct.toFixed(1)}%</span>
    </div>
    <div class="goal-amounts">
      <span>Terkumpul: <strong>${formatRupiah(saved)}</strong></span>
      <span>Target: <strong>${formatRupiah(target)}</strong></span>
    </div>
    <div class="goal-progress-track" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progres tabungan ${setup.goalName}">
      <div class="goal-progress-fill" style="width:${pct}%"></div>
    </div>
    ${pct >= 100
      ? `<div class="goal-eta" style="color:var(--color-positive);border-left-color:var(--color-positive)">🎉 Selamat! Target <strong>${escapeHtml(setup.goalName)}</strong> sudah tercapai!</div>`
      : `<div class="goal-eta">
          📅 Estimasi tercapai: <strong>${etaLabel}</strong> (~${monthsLeft} bulan lagi)<br>
          <span style="font-size:.78rem">berdasarkan saldo bulanan saat ini: ${formatRupiah(monthly)}/bulan</span>
        </div>`
    }`;
}

/* ============================================================
   12. TRANSACTION TABLE
   ============================================================ */

/** Populate the category filter dropdown from current transactions */
function populateCategoryFilter() {
  const txList = loadTransactions();
  const cats   = [...new Set(txList.map(t => t.category).filter(Boolean))].sort();
  const sel    = document.getElementById('filterCategory');
  const cur    = sel.value;
  // Keep first option
  sel.innerHTML = '<option value="">Semua Kategori</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat] || cat;
    if (cat === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

/** Render the transaction table with current filters */
function renderTransactionTable() {
  populateCategoryFilter();

  const setup     = loadSetup();
  const txList    = loadTransactions();
  const search    = document.getElementById('txSearch').value.trim().toLowerCase();
  const typeF     = document.getElementById('filterType').value;
  const catF      = document.getElementById('filterCategory').value;
  const tbody     = document.getElementById('txTableBody');
  const emptyEl   = document.getElementById('txEmptyState');

  // Filter to current month, then by search/type/cat
  let rows = setup ? txList.filter(t => t.date && t.date.startsWith(setup.month)) : txList;
  if (search) rows = rows.filter(t => t.description.toLowerCase().includes(search) || (t.category || '').toLowerCase().includes(search));
  if (typeF)  rows = rows.filter(t => t.type === typeF);
  if (catF)   rows = rows.filter(t => t.category === catF);

  // Sort by date desc
  rows = rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  tbody.innerHTML = '';
  emptyEl.hidden  = rows.length > 0;

  // Category options HTML — reused per row
  const allCatOptions = [
    ['Food','🍜 Makanan'], ['Transport','🚗 Transportasi'], ['Housing','🏠 Tempat Tinggal'],
    ['Subscriptions','📱 Langganan'], ['Education','📚 Pendidikan'], ['Health','🏥 Kesehatan'],
    ['Entertainment','🎮 Hiburan'], ['Shopping','🛍 Belanja'], ['Income','💰 Pemasukan'],
    ['Misc','📦 Lainnya'],
  ].map(([val, lbl]) => `<option value="${val}">${lbl}</option>`).join('');

  for (const tx of rows) {
    const tr   = document.createElement('tr');
    const sign = tx.type === 'income' ? '+' : '−';
    // Inline category select: income-type rows get a simplified picker
    const catSelectHtml = `
      <select class="cat-select" data-id="${tx.id}" data-desc="${escapeHtml(tx.description)}"
              aria-label="Ubah kategori untuk: ${escapeHtml(tx.description)}">
        ${allCatOptions}
      </select>`;
    tr.innerHTML = `
      <td>${formatDate(tx.date)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(tx.description)}">${escapeHtml(tx.description)}</td>
      <td>${catSelectHtml}</td>
      <td><span class="type-badge ${tx.type}">${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
      <td class="text-right"><span class="${tx.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense'}">${sign} ${formatRupiah(tx.amount)}</span></td>
      <td class="text-center">
        <button class="btn-icon" data-id="${tx.id}" aria-label="Hapus transaksi: ${escapeHtml(tx.description)}" title="Hapus">🗑</button>
      </td>`;
    tbody.appendChild(tr);
    // Set the current category value after the element is in the DOM
    const sel = tr.querySelector('.cat-select');
    sel.value = tx.category || '';
  }

  // Delete button event delegation
  tbody.querySelectorAll('.btn-icon[data-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteTx(btn.dataset.id));
  });

  // Category-change event delegation (learning)
  tbody.querySelectorAll('.cat-select').forEach(sel => {
    sel.addEventListener('change', () => {
      learnCategory(sel.dataset.id, sel.dataset.desc, sel.value);
    });
  });
}

/**
 * Learn a category correction: update the transaction in storage and save the
 * keyword mapping for future auto-categorization.
 * @param {string} txId
 * @param {string} description  raw description text (may be HTML-escaped from data-attr)
 * @param {string} newCategory
 */
function learnCategory(txId, description, newCategory) {
  if (!newCategory) return;
  // Un-escape HTML entities from data attribute
  const rawDesc = description
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Update the transaction's category in storage
  const txList = loadTransactions();
  const idx = txList.findIndex(t => t.id === txId);
  if (idx !== -1) {
    txList[idx].category = newCategory;
    saveTransactions(txList);
  }
  // Persist keyword → category mapping
  saveLearnedKeyword(rawDesc, newCategory);
  showToast(`Kategori dipelajari: ${CATEGORY_LABELS[newCategory] || newCategory} ✔`, 'success');
  // Refresh dashboard and category filter
  renderDashboard();
  populateCategoryFilter();
}

/* ============================================================
   13. EXPORT CSV
   ============================================================ */

/** Export current month's transactions to a CSV file */
function exportCSV() {
  const setup  = loadSetup();
  const txList = setup
    ? loadTransactions().filter(t => t.date && t.date.startsWith(setup.month))
    : loadTransactions();

  if (txList.length === 0) {
    showToast('Tidak ada transaksi untuk diekspor.', 'error');
    return;
  }

  const header = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah (Rp)'];
  const rows   = txList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(tx => [
      tx.date,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.category || '',
      tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      tx.amount,
    ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `BudgetBuddy_${setup ? setup.month : 'export'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Berhasil mengekspor CSV ⬇', 'success');
}

/* ============================================================
   14. SAMPLE DATA LOADER
   ============================================================ */

/** Load sample demo data for demonstration */
function loadSampleData() {
  openConfirmModal(
    'Ini akan mengganti semua data yang ada dengan data contoh. Lanjutkan?',
    () => {
      const month = currentMonthStr();
      saveSetup({
        month,
        income:   5500000,
        goalName: 'Beli Laptop Gaming',
        goalAmt:  8000000,
      });

      const y = month.split('-')[0];
      const m = month.split('-')[1];
      const d = (n) => `${y}-${m}-${String(n).padStart(2,'0')}`;

      // Previous month date helper
      const prevDate  = new Date(Number(y), Number(m) - 2, 1);
      const py        = String(prevDate.getFullYear());
      const pm        = String(prevDate.getMonth() + 1).padStart(2, '0');
      const p = (n) => `${py}-${pm}-${String(n).padStart(2,'0')}`;

      const sampleTx = [
        // ── THIS MONTH ──
        // Income
        { id: genId(), date: d(5),  type: 'income',  amount: 200000,  description: 'Freelance desain logo',  category: 'Income' },
        // Food (higher this month for visible MoM change)
        { id: genId(), date: d(1),  type: 'expense', amount: 25000,   description: 'Makan siang warteg',     category: 'Food' },
        { id: genId(), date: d(2),  type: 'expense', amount: 45000,   description: 'Gofood ayam geprek',     category: 'Food' },
        { id: genId(), date: d(3),  type: 'expense', amount: 32000,   description: 'Kopi kekinian + snack',  category: 'Food' },
        { id: genId(), date: d(4),  type: 'expense', amount: 28000,   description: 'Nasi padang makan siang',category: 'Food' },
        { id: genId(), date: d(5),  type: 'expense', amount: 55000,   description: 'Grabfood pizza mini',    category: 'Food' },
        { id: genId(), date: d(7),  type: 'expense', amount: 22000,   description: 'Mie ayam + es teh',      category: 'Food' },
        { id: genId(), date: d(9),  type: 'expense', amount: 40000,   description: 'Dinner bersama teman',   category: 'Food' },
        { id: genId(), date: d(11), type: 'expense', amount: 35000,   description: 'Makan siang warteg',     category: 'Food' },
        { id: genId(), date: d(13), type: 'expense', amount: 60000,   description: 'Boba + jajan sore',      category: 'Food' },
        // Transport
        { id: genId(), date: d(2),  type: 'expense', amount: 35000,   description: 'Grab ke kampus',         category: 'Transport' },
        { id: genId(), date: d(4),  type: 'expense', amount: 80000,   description: 'Isi bensin motor full',  category: 'Transport' },
        { id: genId(), date: d(6),  type: 'expense', amount: 25000,   description: 'Gojek ke mall',          category: 'Transport' },
        { id: genId(), date: d(10), type: 'expense', amount: 15000,   description: 'Parkir motor + tol',     category: 'Transport' },
        { id: genId(), date: d(12), type: 'expense', amount: 35000,   description: 'Bensin pertamax',        category: 'Transport' },
        // Housing
        { id: genId(), date: d(1),  type: 'expense', amount: 800000,  description: 'Bayar kos bulanan',      category: 'Housing' },
        { id: genId(), date: d(3),  type: 'expense', amount: 75000,   description: 'Token listrik PLN',      category: 'Housing' },
        { id: genId(), date: d(5),  type: 'expense', amount: 50000,   description: 'Iuran PDAM air bulan ini',category:'Housing' },
        // Subscriptions
        { id: genId(), date: d(1),  type: 'expense', amount: 54000,   description: 'Netflix premium bulan ini',category:'Subscriptions' },
        { id: genId(), date: d(2),  type: 'expense', amount: 59000,   description: 'Spotify premium',        category: 'Subscriptions' },
        { id: genId(), date: d(3),  type: 'expense', amount: 105000,  description: 'Kuota internet 30GB XL', category: 'Subscriptions' },
        // Education
        { id: genId(), date: d(3),  type: 'expense', amount: 120000,  description: 'Buku teks pemrograman',  category: 'Education' },
        { id: genId(), date: d(8),  type: 'expense', amount: 250000,  description: 'Kursus online UI/UX',    category: 'Education' },
        // Health
        { id: genId(), date: d(6),  type: 'expense', amount: 45000,   description: 'Vitamin C + suplemen',   category: 'Health' },
        { id: genId(), date: d(11), type: 'expense', amount: 30000,   description: 'Masker dan obat flu',    category: 'Health' },
        // Entertainment
        { id: genId(), date: d(7),  type: 'expense', amount: 55000,   description: 'Nonton film CGV',        category: 'Entertainment' },
        { id: genId(), date: d(13), type: 'expense', amount: 45000,   description: 'Karaoke dengan teman',   category: 'Entertainment' },
        // Shopping
        { id: genId(), date: d(9),  type: 'expense', amount: 150000,  description: 'Beli baju di Shopee',    category: 'Shopping' },
        { id: genId(), date: d(12), type: 'expense', amount: 85000,   description: 'Skincare Indomaret',     category: 'Shopping' },

        // ── PREVIOUS MONTH (for MoM comparison demo) ──
        { id: genId(), date: p(1),  type: 'expense', amount: 800000,  description: 'Bayar kos bulanan',      category: 'Housing' },
        { id: genId(), date: p(2),  type: 'expense', amount: 70000,   description: 'Token listrik PLN',      category: 'Housing' },
        { id: genId(), date: p(1),  type: 'expense', amount: 20000,   description: 'Makan siang warteg',     category: 'Food' },
        { id: genId(), date: p(3),  type: 'expense', amount: 38000,   description: 'Gofood nasi goreng',     category: 'Food' },
        { id: genId(), date: p(5),  type: 'expense', amount: 25000,   description: 'Mie ayam + es teh',      category: 'Food' },
        { id: genId(), date: p(7),  type: 'expense', amount: 30000,   description: 'Kopi dan snack',         category: 'Food' },
        { id: genId(), date: p(9),  type: 'expense', amount: 18000,   description: 'Makan siang warteg',     category: 'Food' },
        { id: genId(), date: p(2),  type: 'expense', amount: 60000,   description: 'Isi bensin motor',       category: 'Transport' },
        { id: genId(), date: p(6),  type: 'expense', amount: 28000,   description: 'Grab ke kampus',         category: 'Transport' },
        { id: genId(), date: p(10), type: 'expense', amount: 18000,   description: 'Gojek ke mall',          category: 'Transport' },
        { id: genId(), date: p(1),  type: 'expense', amount: 54000,   description: 'Netflix premium',        category: 'Subscriptions' },
        { id: genId(), date: p(2),  type: 'expense', amount: 59000,   description: 'Spotify premium',        category: 'Subscriptions' },
        { id: genId(), date: p(3),  type: 'expense', amount: 100000,  description: 'Kuota internet XL',      category: 'Subscriptions' },
        { id: genId(), date: p(5),  type: 'expense', amount: 85000,   description: 'Buku pemrograman',       category: 'Education' },
        { id: genId(), date: p(4),  type: 'expense', amount: 40000,   description: 'Vitamin dan suplemen',   category: 'Health' },
        { id: genId(), date: p(8),  type: 'expense', amount: 50000,   description: 'Nonton bioskop',         category: 'Entertainment' },
        { id: genId(), date: p(7),  type: 'expense', amount: 200000,  description: 'Beli sepatu Shopee',     category: 'Shopping' },
      ];

      saveTransactions(sampleTx);
      updateMonthBadge();
      populateSetupForm();
      navigateTo('dashboard');
      showToast('Data contoh berhasil dimuat! Selamat mengeksplorasi 🎲', 'success');
    }
  );
}

/* ============================================================
   15. TOAST NOTIFICATIONS
   ============================================================ */

let toastTimer = null;

/**
 * Show a toast notification
 * @param {string} msg
 * @param {'success'|'error'|''} type
 * @param {number} duration  ms
 */
function showToast(msg, type = '', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'toast ' + type;
  // Trigger reflow so animation restarts
  toast.offsetHeight; // eslint-disable-line
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/* ============================================================
   16. MODAL HELPERS
   ============================================================ */

/**
 * Display a generic confirmation modal
 * @param {string} message
 * @param {Function} onConfirm
 */
function openConfirmModal(message, onConfirm) {
  document.getElementById('confirmModalMsg').textContent = message;
  document.getElementById('confirmModalOverlay').removeAttribute('hidden');
  document.getElementById('confirmOkBtn').onclick = () => {
    closeConfirmModal();
    onConfirm();
  };
  document.getElementById('confirmCancelBtn').focus();
}

function closeConfirmModal() {
  document.getElementById('confirmModalOverlay').hidden = true;
}

/**
 * Show error text in a form error element
 * @param {HTMLElement} el
 * @param {string} msg
 */
function showFormError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Escape HTML special chars to prevent XSS from user input rendered as HTML
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   17. SIDEBAR / MOBILE NAV
   ============================================================ */

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
}

/* ============================================================
   18. RESET ALL DATA
   ============================================================ */

function resetAllData() {
  openConfirmModal(
    '⚠ Ini akan menghapus SEMUA data termasuk transaksi dan pengaturan. Tindakan ini tidak bisa dibatalkan!',
    () => {
      localStorage.removeItem(STORAGE_KEY_SETUP);
      localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEY_LEARNED);
      // Reset UI
      document.getElementById('kpiIncome').textContent      = 'Rp 0';
      document.getElementById('kpiExpense').textContent     = 'Rp 0';
      document.getElementById('kpiBalance').textContent     = 'Rp 0';
      document.getElementById('kpiSavingsRate').textContent = '0%';
      document.getElementById('currentMonthBadge').textContent = '—';
      document.getElementById('topbarMonth').textContent    = '';
      navigateTo('dashboard');
      // Show first-run overlay again
      document.getElementById('frMonth').value   = currentMonthStr();
      document.getElementById('frIncome').value  = '';
      document.getElementById('frGoalName').value  = '';
      document.getElementById('frGoalAmount').value = '';
      document.getElementById('firstRunOverlay').removeAttribute('hidden');
      showToast('Semua data berhasil dihapus.', 'success');
    }
  );
}

/* ============================================================
   19. INIT & EVENT WIRING
   ============================================================ */

/** Wire up all event listeners */
function wireEvents() {
  // ── Navigation ──
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // ── Mobile hamburger ──
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    const isOpen = document.getElementById('sidebar').classList.contains('open');
    isOpen ? closeSidebar() : openSidebar();
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // ── First-run form ──
  document.getElementById('firstRunForm').addEventListener('submit', onFirstRunSubmit);

  // ── Setup form ──
  document.getElementById('setupForm').addEventListener('submit', onSetupSubmit);

  // ── Add transaction button ──
  document.getElementById('openAddTxBtn').addEventListener('click', openAddTxModal);

  // ── Transaction modal close ──
  document.getElementById('closeTxModal').addEventListener('click', closeTxModal);
  document.getElementById('cancelTxBtn').addEventListener('click', closeTxModal);
  document.getElementById('txModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('txModalOverlay')) closeTxModal();
  });

  // ── Transaction form submit ──
  document.getElementById('txForm').addEventListener('submit', onTxFormSubmit);

  // ── Category auto-hint while typing description ──
  document.getElementById('txDesc').addEventListener('input', (e) => {
    const cat = autoCategory(e.target.value);
    const hintEl = document.getElementById('categoryHint');
    const selEl  = document.getElementById('txCategory');
    if (selEl.value === '' && e.target.value.length > 2) {
      hintEl.textContent = `Auto-detect: ${CATEGORY_LABELS[cat] || cat}`;
    } else {
      hintEl.textContent = 'Kategori akan terdeteksi otomatis dari deskripsi';
    }
  });

  // ── Confirm modal ──
  document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
  document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmModal);
  document.getElementById('confirmModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmModalOverlay')) closeConfirmModal();
  });

  // ── Export CSV ──
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

  // ── Reset data ──
  document.getElementById('resetDataBtn').addEventListener('click', resetAllData);

  // ── Load sample data ──
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);

  // ── Reset learned keywords ──
  document.getElementById('resetLearnedBtn').addEventListener('click', () => {
    openConfirmModal(
      'Hapus semua kategori yang sudah dipelajari AI? Auto-kategorisasi akan kembali ke bawaan.',
      () => {
        clearLearnedKeywords();
        showToast('Kategori yang dipelajari berhasil direset 🧠', 'success');
      }
    );
  });

  // ── Transaction filters ──
  document.getElementById('txSearch').addEventListener('input', renderTransactionTable);
  document.getElementById('filterType').addEventListener('change', renderTransactionTable);
  document.getElementById('filterCategory').addEventListener('change', renderTransactionTable);

  // ── Keyboard: Escape closes modals ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('txModalOverlay').hidden)      closeTxModal();
      if (!document.getElementById('confirmModalOverlay').hidden) closeConfirmModal();
      closeSidebar();
    }
  });

  // ── Focus trap: Tab in modal should cycle inside ──
  trapFocus('txModalOverlay');
  trapFocus('confirmModalOverlay');
}

/**
 * Simple focus trap for modal dialogs
 * @param {string} modalId
 */
function trapFocus(modalId) {
  document.getElementById(modalId).addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const overlay = document.getElementById(modalId);
    if (overlay.hidden) return;
    const focusable = overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });
}

/** Main application init */
function init() {
  // Set default date for tx form
  document.getElementById('txDate').value   = todayStr();
  document.getElementById('frMonth').value  = currentMonthStr();
  document.getElementById('setupMonth').value = currentMonthStr();

  // Update badge from stored setup
  updateMonthBadge();

  // Wire all events
  wireEvents();

  // Show first-run or render dashboard
  checkFirstRun();

  // Render the default view
  renderDashboard();
}

// ── Bootstrap on DOM ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
