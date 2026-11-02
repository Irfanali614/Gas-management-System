/**
 * AL ZAHOOR GAS CENTER - PROFESSIONAL LPG SHOP MANAGEMENT SYSTEM
 * Frontend Application Controller (Vanilla ES6+)
 */

// ============================================================================
// 1. GLOBAL STATE & CONFIGURATION
// ============================================================================
const AppState = {
  currentUser: null,
  activeView: 'dashboard',
  dashboardPeriod: 'today',
  reportPeriod: 'today',
  settings: null,
  customers: [],
  stockList: [],
  currentReceipt: null,
  receiptFormat: '80mm', // '80mm' or 'a4'
  selectedKhataCustomer: null
};

// ============================================================================
// 2. API SERVICE WRAPPER
// ============================================================================
const API = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = localStorage.getItem('azgc_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
        credentials: 'omit' // We rely on Bearer token in headers for pure portability
      });

      const data = await response.json();

      if (response.status === 401) {
        // Session expired or unauthenticated
        localStorage.removeItem('azgc_token');
        AppState.currentUser = null;
        AuthModule.showAuthScreen();
        throw new Error(data.message || 'Please sign in to continue.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Server request failed.');
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// ============================================================================
// 3. UI HELPERS & NOTIFICATIONS
// ============================================================================
const UI = {
  formatPKR(amount) {
    const num = Math.round(Number(amount) || 0);
    return 'Rs ' + num.toLocaleString('en-PK');
  },

  formatKg(kg) {
    const num = Number(kg) || 0;
    return num.toFixed(2) + ' KG';
  },

  formatDateTime(isoDate) {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  formatDateOnly(isoDate) {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  },

  setButtonLoading(btn, isLoading, originalHtml = '') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.original || originalHtml;
    }
  }
};

// ============================================================================
// 4. AUTHENTICATION MODULE
// ============================================================================
const AuthModule = {
  async init() {
    const token = localStorage.getItem('azgc_token');
    if (!token) {
      this.showAuthScreen();
      return;
    }

    try {
      const data = await API.get('/auth/me');
      AppState.currentUser = data.user;
      this.showAppLayout();
    } catch (err) {
      this.showAuthScreen();
    }
  },

  showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
  },

  showAppLayout() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    if (AppState.currentUser) {
      document.getElementById('user-display-name').textContent = AppState.currentUser.fullName || AppState.currentUser.username;
    }

    // Load initial data
    SettingsModule.loadSettings();
    CustomersModule.loadCustomersList();
    DashboardModule.loadDashboardData();
    startClock();
  },

  async login(username, password, submitBtn) {
    const alertBox = document.getElementById('login-alert');
    alertBox.classList.add('hidden');
    UI.setButtonLoading(submitBtn, true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      localStorage.setItem('azgc_token', data.token);
      AppState.currentUser = data.user;
      UI.showToast(`Welcome back, ${data.user.fullName || data.user.username}!`, 'success');
      this.showAppLayout();
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove('hidden');
    } finally {
      UI.setButtonLoading(submitBtn, false);
    }
  },

  async logout() {
    try {
      await API.post('/auth/logout', {});
    } catch (e) {}
    localStorage.removeItem('azgc_token');
    AppState.currentUser = null;
    UI.showToast('Signed out safely.', 'info');
    this.showAuthScreen();
  }
};

// Global Handlers for Auth
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('btn-login-submit');
  AuthModule.login(username, password, submitBtn);
}

function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    AuthModule.logout();
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(inputId + '-eye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
}

// Live Clock
function startClock() {
  const clockEl = document.getElementById('system-live-clock');
  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-PK', { hour12: true });
  }
  update();
  setInterval(update, 1000);
}

// ============================================================================
// 5. NAVIGATION & ROUTING
// ============================================================================
function navigate(viewName) {
  AppState.activeView = viewName;

  // Update Nav links
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.view === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Hide all sections, show active
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) targetSection.classList.remove('hidden');

  // Update Topbar Title
  const titles = {
    dashboard: 'Dashboard Overview',
    sales: 'LPG Cylinder Sales & Refilling',
    customers: 'Customer Accounts & Khata',
    payments: 'Payment Collection',
    receipts: 'Receipts & Billing Archive',
    stock: 'LPG Cylinder Stock Management',
    expenses: 'Shop Expense Tracking',
    reports: 'Financial Reports & Profit/Loss',
    settings: 'Business Profile & Settings',
    audit: 'System Audit Logs'
  };
  document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

  // Close mobile sidebar
  toggleSidebar(false);

  // Trigger view data refresh
  switch (viewName) {
    case 'dashboard':
      DashboardModule.loadDashboardData();
      break;
    case 'sales':
      SalesModule.loadSales();
      break;
    case 'customers':
      CustomersModule.loadCustomersList();
      break;
    case 'payments':
      PaymentsModule.loadPayments();
      break;
    case 'receipts':
      ReceiptsModule.loadReceipts();
      break;
    case 'stock':
      StockModule.loadStockOverview();
      StockModule.loadStockMovements();
      break;
    case 'expenses':
      ExpensesModule.loadExpenses();
      break;
    case 'reports':
      ReportsModule.loadReports();
      break;
    case 'settings':
      SettingsModule.loadSettings();
      break;
    case 'audit':
      AuditModule.loadLogs();
      break;
  }
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (open) {
    sidebar.classList.add('open');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.remove('open');
    backdrop.classList.add('hidden');
  }
}

// ============================================================================
// 6. DASHBOARD MODULE
// ============================================================================
const DashboardModule = {
  async loadDashboardData() {
    try {
      const data = await API.get(`/dashboard?period=${AppState.dashboardPeriod}`);
      const d = data.data;

      // KPI values
      document.getElementById('kpi-today-sales').textContent = UI.formatPKR(d.periodSalesAmount);
      document.getElementById('kpi-today-kg').textContent = `${d.periodLpgKg} KG Refilled`;
      document.getElementById('kpi-today-collected').textContent = UI.formatPKR(d.periodCollected);
      document.getElementById('kpi-total-outstanding').textContent = UI.formatPKR(d.totalOutstanding);
      document.getElementById('kpi-today-expenses').textContent = UI.formatPKR(d.periodExpenses);
      document.getElementById('kpi-total-customers').textContent = d.totalCustomers;

      // Low Stock Alerts
      const banner = document.getElementById('dashboard-low-stock-banner');
      const navBadge = document.getElementById('badge-low-stock');
      if (d.lowStockAlerts && d.lowStockAlerts.length > 0) {
        banner.classList.remove('hidden');
        navBadge.classList.remove('hidden');
        const alertSizes = d.lowStockAlerts.map(s => `${s.cylinderSize} KG (${s.currentStock} left)`).join(', ');
        document.getElementById('dashboard-low-stock-text').textContent = `Low stock on: ${alertSizes}`;
      } else {
        banner.classList.add('hidden');
        navBadge.classList.add('hidden');
      }

      // Cylinder Stock Status Cards
      this.renderStockCards(d.stockList || []);

      // Recent Transactions
      this.renderRecentTransactions(d.recentSales || [], d.recentPayments || []);

      // Monthly Chart
      this.renderMonthlyChart(d.monthlySalesAgg || [], d.monthlyExpensesAgg || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err.message);
    }
  },

  renderStockCards(stockList) {
    const container = document.getElementById('dashboard-stock-cards');
    if (!stockList || stockList.length === 0) {
      container.innerHTML = '<div class="text-muted p-3">No stock records found.</div>';
      return;
    }

    AppState.stockList = stockList;

    container.innerHTML = stockList.map(s => {
      const isLow = s.currentStock <= s.lowStockThreshold;
      const totalKg = (s.currentStock * s.cylinderSize).toFixed(1);
      const percent = Math.min(100, Math.max(8, Math.round((s.currentStock / 40) * 100)));

      return `
        <div class="cylinder-status-card ${isLow ? 'low-stock' : ''}">
          <div class="cylinder-header">
            <span class="cylinder-size-tag">${s.cylinderSize} KG Cylinder</span>
            <span class="cylinder-rate-tag">Rate: ${UI.formatPKR(s.sellingRate)}</span>
          </div>
          <div class="cylinder-count-val">${s.currentStock} <span class="text-sm font-normal text-slate-500">cylinders</span></div>
          <div class="cylinder-weight-val">Total Gas: <strong>${totalKg} KG</strong></div>
          <div class="cylinder-progress-bar">
            <div class="cylinder-progress-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="flex justify-between items-center mt-2 text-xs text-slate-500">
            <span>Threshold: ${s.lowStockThreshold} units</span>
            ${isLow ? '<strong class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock</strong>' : '<span class="text-success"><i class="fa-solid fa-check"></i> In Stock</span>'}
          </div>
        </div>
      `;
    }).join('');
  },

  renderRecentTransactions(sales, payments) {
    const container = document.getElementById('dashboard-recent-transactions');
    const combined = [
      ...sales.map(s => ({
        type: 'SALE',
        id: s.saleId,
        date: s.date,
        customer: s.customerName,
        desc: `${s.quantity}x ${s.cylinderSize} KG (${s.paymentType})`,
        amount: s.totalAmount,
        paid: s.amountPaid,
        status: s.status
      })),
      ...payments.map(p => ({
        type: 'PAYMENT',
        id: p.paymentId,
        date: p.paymentDate,
        customer: p.customerName,
        desc: `Udhar Payment (${p.paymentMethod})`,
        amount: p.amount,
        paid: p.amount,
        status: p.status
      }))
    ];

    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = combined.slice(0, 7);

    if (recent.length === 0) {
      container.innerHTML = '<div class="text-muted p-4 text-center">No recent transactions yet.</div>';
      return;
    }

    container.innerHTML = recent.map(t => {
      const isSale = t.type === 'SALE';
      const isCancelled = t.status === 'CANCELLED';

      return `
        <div class="recent-trx-item">
          <div class="trx-left">
            <div class="trx-icon ${isSale ? 'bg-blue-subtle text-blue' : 'bg-emerald-subtle text-emerald'}">
              <i class="fa-solid ${isSale ? 'fa-fire-flame-curved' : 'fa-hand-holding-dollar'}"></i>
            </div>
            <div class="trx-details">
              <span class="trx-customer">${t.customer}</span>
              <span class="trx-meta">${t.desc} • ${UI.formatDateTime(t.date)}</span>
            </div>
          </div>
          <div class="trx-right">
            <span class="trx-amount ${isSale ? 'text-blue' : 'text-emerald'}">
              ${isSale ? UI.formatPKR(t.amount) : '+' + UI.formatPKR(t.amount)}
            </span>
            ${isCancelled ? '<span class="badge badge-danger text-xs">Cancelled</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderMonthlyChart(salesData, expensesData) {
    const canvas = document.getElementById('monthly-sales-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 400;
    const height = 220;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Prepare labels (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${monthNames[d.getMonth()]}` });
    }

    // Map sales & expenses to months
    const salesValues = months.map(m => {
      const match = salesData.find(s => s._id.year === m.year && s._id.month === m.month);
      return match ? match.total : 0;
    });

    const expenseValues = months.map(m => {
      const match = expensesData.find(e => e._id.year === m.year && e._id.month === m.month);
      return match ? match.total : 0;
    });

    const maxVal = Math.max(10000, ...salesValues, ...expenseValues) * 1.2;

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = height - 30 - (i / 4) * (height - 50);
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(width - 15, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((maxVal * i) / 4 / 1000) + 'k', 30, y + 3);
    }

    // Bar chart layout
    const groupWidth = (width - 60) / months.length;
    const barWidth = Math.min(22, groupWidth * 0.35);

    months.forEach((m, idx) => {
      const groupX = 45 + idx * groupWidth;

      // Draw Month Label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, groupX + barWidth, height - 10);

      // Sales Bar (Blue)
      const saleHeight = (salesValues[idx] / maxVal) * (height - 50);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(groupX, height - 30 - saleHeight, barWidth, saleHeight);

      // Expense Bar (Amber)
      const expHeight = (expenseValues[idx] / maxVal) * (height - 50);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(groupX + barWidth + 3, height - 30 - expHeight, barWidth, expHeight);
    });

    // Legend
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(width - 160, 10, 10, 10);
    ctx.fillStyle = '#1e293b';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Sales (PKR)', width - 145, 19);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(width - 80, 10, 10, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Expenses', width - 65, 19);
  }
};

function setDashboardPeriod(period, btn) {
  AppState.dashboardPeriod = period;
  document.querySelectorAll('#dashboard-period-pills .filter-pill').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  DashboardModule.loadDashboardData();
}

function applyCustomDashboardDate() {
  const start = document.getElementById('dash-start-date').value;
  const end = document.getElementById('dash-end-date').value;
  if (!start || !end) {
    UI.showToast('Please select both start and end dates.', 'warning');
    return;
  }
  document.querySelectorAll('#dashboard-period-pills .filter-pill').forEach(el => el.classList.remove('active'));
  API.get(`/dashboard?startDate=${start}&endDate=${end}`)
    .then(data => {
      DashboardModule.renderStockCards(data.data.stockList || []);
      document.getElementById('kpi-today-sales').textContent = UI.formatPKR(data.data.periodSalesAmount);
      document.getElementById('kpi-today-kg').textContent = `${data.data.periodLpgKg} KG Refilled`;
      document.getElementById('kpi-today-collected').textContent = UI.formatPKR(data.data.periodCollected);
      document.getElementById('kpi-today-expenses').textContent = UI.formatPKR(data.data.periodExpenses);
    });
}

// ============================================================================
// 7. LPG SALES MODULE
// ============================================================================
const SalesModule = {
  salesCache: [],

  async loadSales() {
    try {
      const data = await API.get('/sales');
      this.salesCache = data.sales || [];
      this.renderSalesTable(this.salesCache);
    } catch (err) {
      console.error('Failed to load sales:', err.message);
    }
  },

  renderSalesTable(sales) {
    const tbody = document.getElementById('sales-table-body');
    if (!sales || sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-muted">No sales records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = sales.map(s => {
      const isCancelled = s.status === 'CANCELLED';
      return `
        <tr class="${isCancelled ? 'opacity-60 bg-slate-50' : ''}">
          <td class="whitespace-nowrap">${UI.formatDateTime(s.date)}</td>
          <td>
            <strong class="mono text-blue-700">${s.saleId}</strong><br>
            <span class="text-xs text-slate-500">${s.receiptNumber}</span>
          </td>
          <td><strong>${s.customerName}</strong></td>
          <td class="mono text-xs">${s.customerMobile}</td>
          <td><span class="badge badge-info">${s.cylinderSize} KG</span></td>
          <td><strong>${s.quantity}</strong></td>
          <td class="mono">${s.totalKg} KG</td>
          <td class="mono font-bold">${UI.formatPKR(s.totalAmount)}</td>
          <td class="mono text-emerald-700">${UI.formatPKR(s.amountPaid)}</td>
          <td class="mono ${s.remainingBalance > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">
            ${UI.formatPKR(s.remainingBalance)}
          </td>
          <td>
            <span class="badge ${isCancelled ? 'badge-danger' : s.remainingBalance === 0 ? 'badge-success' : 'badge-warning'}">
              ${isCancelled ? 'CANCELLED' : s.paymentType}
            </span>
          </td>
          <td class="text-right whitespace-nowrap">
            <button class="btn btn-xs btn-outline" title="Print Receipt" onclick="ReceiptsModule.viewReceipt('${s.receiptNumber}')">
              <i class="fa-solid fa-receipt"></i>
            </button>
            ${!isCancelled ? `
              <button class="btn btn-xs btn-danger ml-1" title="Cancel Sale" onclick="SalesModule.openCancelModal('${s._id}')">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  openCancelModal(saleId) {
    document.getElementById('cancel-sale-id').value = saleId;
    document.getElementById('cancel-sale-reason').value = '';
    openModal('modal-cancel-sale');
  }
};

function filterSalesTable() {
  const search = document.getElementById('sales-search-input').value.toLowerCase().trim();
  const size = document.getElementById('sales-filter-size').value;
  const payment = document.getElementById('sales-filter-payment').value;
  const status = document.getElementById('sales-filter-status').value;

  const filtered = SalesModule.salesCache.filter(s => {
    const matchesSearch = !search ||
      s.customerName.toLowerCase().includes(search) ||
      s.customerMobile.includes(search) ||
      s.saleId.toLowerCase().includes(search) ||
      s.receiptNumber.toLowerCase().includes(search);

    const matchesSize = !size || s.cylinderSize.toString() === size;
    const matchesPayment = !payment || s.paymentType === payment;
    const matchesStatus = !status || s.status === status;

    return matchesSearch && matchesSize && matchesPayment && matchesStatus;
  });

  SalesModule.renderSalesTable(filtered);
}

// SALE FORM LOGIC & AUTO CALCULATIONS
function openSaleModal() {
  const form = document.getElementById('sale-form');
  form.reset();

  populateCustomerDropdown('sale-customer-select');
  document.getElementById('sale-customer-balance-box').classList.add('hidden');

  // Default to 11.8 KG
  document.getElementById('sale-cylinder-size').value = '11.8';
  document.getElementById('sale-quantity').value = '1';

  // Populate selling rate from settings
  const rates = AppState.settings?.rates || { '45.5': 12000, '11.8': 3200, '3.9': 1100 };
  document.getElementById('sale-rate').value = rates['11.8'] || 3200;

  onSaleSizeOrQtyChange();
  openModal('modal-sale');
}

function onSaleCustomerChange() {
  const customerId = document.getElementById('sale-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  const balanceBox = document.getElementById('sale-customer-balance-box');

  if (customer) {
    balanceBox.classList.remove('hidden');
    document.getElementById('sale-cust-balance-val').textContent = UI.formatPKR(customer.currentBalance);
    document.getElementById('sale-cust-mobile-val').textContent = `Mobile: ${customer.mobile} (${customer.customerType})`;
    document.getElementById('sale-calc-prev-balance').textContent = UI.formatPKR(customer.currentBalance);
  } else {
    balanceBox.classList.add('hidden');
    document.getElementById('sale-calc-prev-balance').textContent = 'Rs 0';
  }
  recalculateSaleTotals();
}

function onSaleSizeOrQtyChange() {
  const size = Number(document.getElementById('sale-cylinder-size').value);
  const qty = parseInt(document.getElementById('sale-quantity').value, 10) || 0;

  // Set default rate if not manually touched
  const rates = AppState.settings?.rates || { '45.5': 12000, '11.8': 3200, '3.9': 1100 };
  const currentRateInput = document.getElementById('sale-rate');
  if (rates[size.toString()]) {
    currentRateInput.value = rates[size.toString()];
  }

  const totalKg = (size * qty).toFixed(2);
  document.getElementById('sale-total-kg').value = `${totalKg} KG`;

  recalculateSaleTotals();
}

function recalculateSaleTotals() {
  const qty = parseInt(document.getElementById('sale-quantity').value, 10) || 0;
  const rate = Number(document.getElementById('sale-rate').value) || 0;
  const totalAmount = qty * rate;

  document.getElementById('sale-calc-total-amount').textContent = UI.formatPKR(totalAmount);

  // Customer previous balance
  const customerId = document.getElementById('sale-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  const prevBalance = customer ? customer.currentBalance : 0;

  const maxBalance = prevBalance + totalAmount;
  document.getElementById('sale-calc-max-balance').textContent = UI.formatPKR(maxBalance);

  // Check amount paid
  onSalePaymentChange();
}

function onSalePaymentChange() {
  const qty = parseInt(document.getElementById('sale-quantity').value, 10) || 0;
  const rate = Number(document.getElementById('sale-rate').value) || 0;
  const totalAmount = qty * rate;

  const paidInput = document.getElementById('sale-amount-paid');
  let paid = Math.max(0, Number(paidInput.value) || 0);

  if (paid > totalAmount) {
    paid = totalAmount;
    paidInput.value = paid;
  }

  const remaining = totalAmount - paid;
  const customerId = document.getElementById('sale-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  const prevBalance = customer ? customer.currentBalance : 0;
  const newBalance = prevBalance + remaining;

  document.getElementById('sale-calc-remaining').value = UI.formatPKR(remaining);
  document.getElementById('sale-calc-new-balance').value = UI.formatPKR(newBalance);
}

function setSalePaidFull() {
  const qty = parseInt(document.getElementById('sale-quantity').value, 10) || 0;
  const rate = Number(document.getElementById('sale-rate').value) || 0;
  document.getElementById('sale-amount-paid').value = qty * rate;
  onSalePaymentChange();
}

function setSalePaidZero() {
  document.getElementById('sale-amount-paid').value = 0;
  onSalePaymentChange();
}

async function handleSaleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-sale');
  UI.setButtonLoading(btn, true);

  const payload = {
    customerId: document.getElementById('sale-customer-select').value,
    cylinderSize: Number(document.getElementById('sale-cylinder-size').value),
    quantity: parseInt(document.getElementById('sale-quantity').value, 10),
    ratePerCylinder: Number(document.getElementById('sale-rate').value),
    amountPaid: Number(document.getElementById('sale-amount-paid').value),
    paymentMethod: document.getElementById('sale-payment-method').value,
    notes: document.getElementById('sale-notes').value.trim()
  };

  try {
    const res = await API.post('/sales', payload);
    UI.showToast('Sale completed successfully!', 'success');
    closeModal('modal-sale');

    // Refresh state
    CustomersModule.loadCustomersList();
    DashboardModule.loadDashboardData();
    if (AppState.activeView === 'sales') SalesModule.loadSales();

    // Immediately open receipt preview for printing
    ReceiptsModule.viewReceipt(res.sale.receiptNumber);
  } catch (err) {
    UI.showToast(err.message, 'danger');
  } finally {
    UI.setButtonLoading(btn, false);
  }
}

async function handleCancelSaleSubmit(e) {
  e.preventDefault();
  const saleId = document.getElementById('cancel-sale-id').value;
  const reason = document.getElementById('cancel-sale-reason').value.trim();

  try {
    await API.post(`/sales/${saleId}/cancel`, { cancellationReason: reason });
    UI.showToast('Sale cancelled and inventory/balances reversed.', 'success');
    closeModal('modal-cancel-sale');
    SalesModule.loadSales();
    DashboardModule.loadDashboardData();
    CustomersModule.loadCustomersList();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

// ============================================================================
// 8. CUSTOMER & KHATA LEDGER MODULE
// ============================================================================
const CustomersModule = {
  async loadCustomersList() {
    try {
      const data = await API.get('/customers');
      AppState.customers = data.customers || [];
      this.renderCustomersTable(AppState.customers);
      populateCustomerDropdown('sale-customer-select');
      populateCustomerDropdown('pay-customer-select');
    } catch (err) {
      console.error('Failed to load customers:', err.message);
    }
  },

  renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    if (!customers || customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No customers found.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td><strong class="mono text-blue-700">${c.customerId}</strong></td>
        <td>
          <strong>${c.name}</strong>
          ${c.remarks ? `<br><small class="text-muted">${c.remarks}</small>` : ''}
        </td>
        <td class="mono font-semibold">${c.mobile}</td>
        <td><span class="badge badge-secondary">${c.customerType}</span></td>
        <td class="text-xs text-slate-600">${c.address || '-'}</td>
        <td class="mono text-blue-700">${UI.formatPKR(c.totalDebit)}</td>
        <td class="mono text-emerald-700">${UI.formatPKR(c.totalCredit)}</td>
        <td class="mono font-bold ${c.currentBalance > 0 ? 'text-rose-600' : 'text-slate-800'}">
          ${UI.formatPKR(c.currentBalance)}
        </td>
        <td class="text-right whitespace-nowrap">
          <button class="btn btn-xs btn-primary" title="View Customer Khata / Ledger" onclick="CustomersModule.viewKhata('${c._id}')">
            <i class="fa-solid fa-book"></i> Khata
          </button>
          <button class="btn btn-xs btn-outline ml-1" title="Edit Customer" onclick="CustomersModule.openEditModal('${c._id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-xs btn-outline text-danger ml-1" title="Deactivate Customer" onclick="CustomersModule.deactivateCustomer('${c._id}')">
            <i class="fa-solid fa-user-xmark"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async viewKhata(customerId) {
    try {
      const data = await API.get(`/customers/${customerId}/ledger`);
      const c = data.customer;
      AppState.selectedKhataCustomer = c;

      document.getElementById('khata-title').textContent = `${c.name} - Account Khata`;
      document.getElementById('khata-cust-name').textContent = c.name;
      document.getElementById('khata-cust-id').textContent = c.customerId;
      document.getElementById('khata-cust-mobile').textContent = c.mobile;
      document.getElementById('khata-cust-type').textContent = c.customerType;

      document.getElementById('khata-total-debit').textContent = UI.formatPKR(data.summary.totalDebit);
      document.getElementById('khata-total-credit').textContent = UI.formatPKR(data.summary.totalCredit);
      document.getElementById('khata-running-balance').textContent = UI.formatPKR(data.summary.currentBalance);

      const tbody = document.getElementById('khata-table-body');
      if (!data.ledger || data.ledger.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No transactions in this ledger yet.</td></tr>`;
      } else {
        tbody.innerHTML = data.ledger.map(entry => `
          <tr>
            <td class="whitespace-nowrap text-xs">${UI.formatDateTime(entry.date)}</td>
            <td class="mono text-xs font-bold text-slate-700">${entry.transactionId}</td>
            <td class="text-sm">${entry.description}</td>
            <td class="mono text-right text-blue-700 font-semibold">${entry.debit > 0 ? UI.formatPKR(entry.debit) : '-'}</td>
            <td class="mono text-right text-emerald-700 font-semibold">${entry.credit > 0 ? UI.formatPKR(entry.credit) : '-'}</td>
            <td class="mono text-right font-bold ${entry.runningBalance > 0 ? 'text-rose-600' : 'text-slate-800'}">
              ${UI.formatPKR(entry.runningBalance)}
            </td>
            <td><span class="badge badge-secondary text-xs">${entry.paymentMethod || '-'}</span></td>
            <td class="text-xs text-slate-500">${entry.remarks || '-'}</td>
          </tr>
        `).join('');
      }

      openModal('modal-khata');
    } catch (err) {
      UI.showToast(err.message, 'danger');
    }
  },

  openEditModal(customerId) {
    const c = AppState.customers.find(item => item._id === customerId);
    if (!c) return;

    document.getElementById('edit-cust-id').value = c._id;
    document.getElementById('edit-cust-name').value = c.name;
    document.getElementById('edit-cust-mobile').value = c.mobile;
    document.getElementById('edit-cust-alt-mobile').value = c.altMobile || '';
    document.getElementById('edit-cust-type').value = c.customerType || 'Regular Customer';
    document.getElementById('edit-cust-address').value = c.address || '';
    document.getElementById('edit-cust-remarks').value = c.remarks || '';

    openModal('modal-edit-customer');
  },

  async deactivateCustomer(customerId) {
    const c = AppState.customers.find(item => item._id === customerId);
    if (!c) return;

    if (c.currentBalance !== 0) {
      UI.showToast(`Cannot deactivate customer with outstanding balance of ${UI.formatPKR(c.currentBalance)}. Clear balance first.`, 'warning');
      return;
    }

    if (confirm(`Are you sure you want to deactivate customer "${c.name}"? Historical ledger records will be preserved.`)) {
      try {
        await API.delete(`/customers/${customerId}`);
        UI.showToast('Customer deactivated successfully.', 'success');
        this.loadCustomersList();
      } catch (err) {
        UI.showToast(err.message, 'danger');
      }
    }
  }
};

function populateCustomerDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Choose Customer --</option>' +
    AppState.customers.map(c => `
      <option value="${c._id}" ${c._id === currentVal ? 'selected' : ''}>
        ${c.name} (${c.mobile}) - Udhar: ${UI.formatPKR(c.currentBalance)}
      </option>
    `).join('');
}

function filterCustomersTable() {
  const search = document.getElementById('customers-search-input').value.toLowerCase().trim();
  const type = document.getElementById('customers-filter-type').value;

  const filtered = AppState.customers.filter(c => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search) ||
      c.mobile.includes(search) ||
      c.customerId.toLowerCase().includes(search);

    const matchesType = (type === 'ALL' || !type) || c.customerType === type;
    return matchesSearch && matchesType;
  });

  CustomersModule.renderCustomersTable(filtered);
}

function openCustomerModal() {
  document.getElementById('customer-form').reset();
  openModal('modal-customer');
}

function openCustomerModalFromSale() {
  openCustomerModal();
}

async function handleCustomerSubmit(e, confirmDuplicate = false) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-customer');
  UI.setButtonLoading(btn, true);

  const payload = {
    name: document.getElementById('cust-name').value.trim(),
    mobile: document.getElementById('cust-mobile').value.trim(),
    altMobile: document.getElementById('cust-alt-mobile').value.trim(),
    customerType: document.getElementById('cust-type').value,
    openingBalance: Number(document.getElementById('cust-opening-balance').value) || 0,
    address: document.getElementById('cust-address').value.trim(),
    remarks: document.getElementById('cust-remarks').value.trim(),
    confirmDuplicate
  };

  try {
    const res = await API.post('/customers', payload);
    UI.showToast('Customer registered successfully!', 'success');
    closeModal('modal-customer');
    await CustomersModule.loadCustomersList();

    // If opened from sale modal, auto-select this new customer
    const saleSelect = document.getElementById('sale-customer-select');
    if (saleSelect) {
      saleSelect.value = res.customer._id;
      onSaleCustomerChange();
    }
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      if (confirm(`${err.message}\nDo you want to register this customer anyway?`)) {
        handleCustomerSubmit(e, true);
        return;
      }
    } else {
      UI.showToast(err.message, 'danger');
    }
  } finally {
    UI.setButtonLoading(btn, false);
  }
}

async function handleEditCustomerSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-cust-id').value;
  const payload = {
    name: document.getElementById('edit-cust-name').value.trim(),
    mobile: document.getElementById('edit-cust-mobile').value.trim(),
    altMobile: document.getElementById('edit-cust-alt-mobile').value.trim(),
    customerType: document.getElementById('edit-cust-type').value,
    address: document.getElementById('edit-cust-address').value.trim(),
    remarks: document.getElementById('edit-cust-remarks').value.trim()
  };

  try {
    await API.put(`/customers/${id}`, payload);
    UI.showToast('Customer updated successfully!', 'success');
    closeModal('modal-edit-customer');
    CustomersModule.loadCustomersList();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

function printCustomerKhataStatement() {
  window.print();
}

// ============================================================================
// 9. PAYMENT COLLECTION MODULE
// ============================================================================
const PaymentsModule = {
  paymentsCache: [],

  async loadPayments() {
    try {
      const data = await API.get('/payments');
      this.paymentsCache = data.payments || [];
      this.renderPaymentsTable(this.paymentsCache);
    } catch (err) {
      console.error('Failed to load payments:', err.message);
    }
  },

  renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-table-body');
    if (!payments || payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">No payments recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td class="whitespace-nowrap">${UI.formatDateTime(p.paymentDate)}</td>
        <td><strong class="mono text-emerald-700">${p.paymentId}</strong></td>
        <td class="mono text-xs text-slate-500">${p.receiptNumber}</td>
        <td><strong>${p.customerName}</strong></td>
        <td class="mono text-xs">${p.customerMobile}</td>
        <td class="mono font-bold text-emerald-700">${UI.formatPKR(p.amount)}</td>
        <td><span class="badge badge-secondary">${p.paymentMethod}</span></td>
        <td class="text-xs text-slate-500">${p.referenceNumber || '-'}</td>
        <td class="mono text-slate-500">${UI.formatPKR(p.previousBalance)}</td>
        <td class="mono font-bold text-slate-800">${UI.formatPKR(p.newBalance)}</td>
        <td class="text-right whitespace-nowrap">
          <button class="btn btn-xs btn-outline" title="Print Receipt" onclick="ReceiptsModule.viewReceipt('${p.receiptNumber}')">
            <i class="fa-solid fa-receipt"></i> Print
          </button>
        </td>
      </tr>
    `).join('');
  }
};

function openPaymentModal() {
  const form = document.getElementById('payment-form');
  form.reset();
  populateCustomerDropdown('pay-customer-select');
  document.getElementById('pay-balance-info').classList.add('hidden');
  document.getElementById('pay-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('pay-new-balance').value = 'Rs 0';
  openModal('modal-payment');
}

function onPaymentCustomerChange() {
  const customerId = document.getElementById('pay-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  const infoBox = document.getElementById('pay-balance-info');

  if (customer) {
    infoBox.classList.remove('hidden');
    document.getElementById('pay-balance-val').textContent = UI.formatPKR(customer.currentBalance);
    document.getElementById('pay-amount').value = customer.currentBalance > 0 ? customer.currentBalance : '';
  } else {
    infoBox.classList.add('hidden');
  }
  onPayAmountChange();
}

function onPayAmountChange() {
  const customerId = document.getElementById('pay-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  const prevBalance = customer ? customer.currentBalance : 0;

  const amt = Number(document.getElementById('pay-amount').value) || 0;
  const newBalance = prevBalance - amt;

  document.getElementById('pay-new-balance').value = UI.formatPKR(newBalance);
}

function setPaymentAmountFull() {
  const customerId = document.getElementById('pay-customer-select').value;
  const customer = AppState.customers.find(c => c._id === customerId);
  if (customer && customer.currentBalance > 0) {
    document.getElementById('pay-amount').value = customer.currentBalance;
    onPayAmountChange();
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-payment');
  UI.setButtonLoading(btn, true);

  const payload = {
    customerId: document.getElementById('pay-customer-select').value,
    amount: Number(document.getElementById('pay-amount').value),
    paymentMethod: document.getElementById('pay-method').value,
    paymentDate: document.getElementById('pay-date').value,
    referenceNumber: document.getElementById('pay-ref').value.trim(),
    remarks: document.getElementById('pay-remarks').value.trim()
  };

  try {
    const res = await API.post('/payments', payload);
    UI.showToast('Payment recorded successfully!', 'success');
    closeModal('modal-payment');

    CustomersModule.loadCustomersList();
    DashboardModule.loadDashboardData();
    if (AppState.activeView === 'payments') PaymentsModule.loadPayments();

    ReceiptsModule.viewReceipt(res.payment.receiptNumber);
  } catch (err) {
    UI.showToast(err.message, 'danger');
  } finally {
    UI.setButtonLoading(btn, false);
  }
}

function filterPaymentsTable() {
  const search = document.getElementById('payments-search-input').value.toLowerCase().trim();
  const method = document.getElementById('payments-filter-method').value;

  const filtered = PaymentsModule.paymentsCache.filter(p => {
    const matchesSearch = !search ||
      p.customerName.toLowerCase().includes(search) ||
      p.customerMobile.includes(search) ||
      p.paymentId.toLowerCase().includes(search) ||
      p.receiptNumber.toLowerCase().includes(search);

    const matchesMethod = !method || p.paymentMethod === method;
    return matchesSearch && matchesMethod;
  });

  PaymentsModule.renderPaymentsTable(filtered);
}

// ============================================================================
// 10. RECEIPTS & BILLING MODULE
// ============================================================================
const ReceiptsModule = {
  receiptsCache: [],

  async loadReceipts() {
    try {
      const data = await API.get('/receipts');
      this.receiptsCache = data.receipts || [];
      this.renderReceiptsTable(this.receiptsCache);
    } catch (err) {
      console.error('Failed to load receipts:', err.message);
    }
  },

  renderReceiptsTable(receipts) {
    const tbody = document.getElementById('receipts-table-body');
    if (!receipts || receipts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No receipts in archive.</td></tr>`;
      return;
    }

    tbody.innerHTML = receipts.map(r => `
      <tr>
        <td><strong class="mono text-blue-700">${r.receiptNumber}</strong></td>
        <td><span class="badge ${r.type === 'SALE' ? 'badge-info' : 'badge-success'}">${r.type}</span></td>
        <td class="mono text-xs text-slate-500">${r.transactionId}</td>
        <td class="whitespace-nowrap text-xs">${UI.formatDateTime(r.date)}</td>
        <td><strong>${r.customerName}</strong></td>
        <td class="mono text-xs">${r.customerMobile}</td>
        <td class="mono font-bold">${UI.formatPKR(r.amount)}</td>
        <td class="mono text-emerald-700">${UI.formatPKR(r.paid)}</td>
        <td class="mono text-rose-600">${UI.formatPKR(r.remaining)}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-primary" onclick="ReceiptsModule.viewReceipt('${r.receiptNumber}')">
            <i class="fa-solid fa-print"></i> View / Print
          </button>
        </td>
      </tr>
    `).join('');
  },

  async viewReceipt(receiptId) {
    try {
      const data = await API.get(`/receipts/${receiptId}`);
      AppState.currentReceipt = data;

      // Set default format from settings
      AppState.receiptFormat = AppState.settings?.defaultReceiptFormat || '80mm';
      this.renderReceiptContent();
      openModal('modal-receipt');
    } catch (err) {
      UI.showToast('Could not load receipt: ' + err.message, 'danger');
    }
  },

  renderReceiptContent() {
    const container = document.getElementById('printable-receipt');
    const { type, business, data } = AppState.currentReceipt;

    container.className = `printable-receipt format-${AppState.receiptFormat}`;

    // Update switcher pills
    document.getElementById('btn-format-80mm').classList.toggle('active', AppState.receiptFormat === '80mm');
    document.getElementById('btn-format-a4').classList.toggle('active', AppState.receiptFormat === 'a4');

    if (AppState.receiptFormat === '80mm') {
      container.innerHTML = this.build80mmTemplate(type, business, data);
    } else {
      container.innerHTML = this.buildA4Template(type, business, data);
    }
  },

  build80mmTemplate(type, business, data) {
    const isSale = type === 'SALE';
    const bizName = business.businessName || 'AL ZAHOOR GAS CENTER';
    const category = business.category || 'LPG Refilling & Gas Services';
    const phone = business.mobile || '0300-1234567';
    const address = business.address || 'Main GT Road, Pakistan';
    const footer = business.receiptFooter || 'Thank you for your business!';

    return `
      <div class="thermal-header">
        <div class="thermal-biz-name">${bizName.toUpperCase()}</div>
        <div class="thermal-biz-sub">${category}</div>
        <div class="thermal-contact">Ph: ${phone} | ${address}</div>
      </div>

      <div class="thermal-meta">
        <div class="thermal-row">
          <span>Receipt #: <strong>${data.receiptNumber}</strong></span>
          <span>${UI.formatDateOnly(data.date || data.paymentDate)}</span>
        </div>
        <div class="thermal-row">
          <span>TRX: ${data.saleId || data.paymentId}</span>
          <span>${new Date(data.date || data.paymentDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
        <div class="thermal-row" style="margin-top: 4px;">
          <span>Customer: <strong>${data.customerName}</strong></span>
        </div>
        <div class="thermal-row">
          <span>Mobile: ${data.customerMobile}</span>
        </div>
      </div>

      ${isSale ? `
        <table class="thermal-table">
          <thead>
            <tr>
              <th>Item / Size</th>
              <th>Qty</th>
              <th>Rate</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LPG ${data.cylinderSize} KG (${data.totalKg} KG)</td>
              <td>${data.quantity}</td>
              <td>${data.ratePerCylinder}</td>
              <td style="text-align: right;">${UI.formatPKR(data.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="thermal-totals">
          <div class="thermal-total-row highlight">
            <span>Bill Amount:</span>
            <span>${UI.formatPKR(data.totalAmount)}</span>
          </div>
          <div class="thermal-total-row">
            <span>Amount Paid:</span>
            <span>${UI.formatPKR(data.amountPaid)}</span>
          </div>
          <div class="thermal-total-row">
            <span>Remaining This Bill:</span>
            <span>${UI.formatPKR(data.remainingBalance)}</span>
          </div>
          <div class="thermal-total-row">
            <span>Previous Balance:</span>
            <span>${UI.formatPKR(data.previousBalance)}</span>
          </div>
        </div>

        <div class="thermal-balance-box">
          <div style="font-size: 10px; font-weight: bold;">TOTAL OUTSTANDING BALANCE</div>
          <div style="font-size: 15px; font-weight: 800; margin-top: 2px;">${UI.formatPKR(data.newBalance)}</div>
          <div style="font-size: 9px; margin-top: 2px;">Status: ${data.paymentType} (${data.paymentMethod})</div>
        </div>
      ` : `
        <div class="thermal-totals" style="margin-top: 10px;">
          <div class="thermal-total-row highlight">
            <span>Payment Received:</span>
            <span style="font-size: 14px;">${UI.formatPKR(data.amount)}</span>
          </div>
          <div class="thermal-total-row">
            <span>Payment Method:</span>
            <span>${data.paymentMethod}</span>
          </div>
          ${data.referenceNumber ? `
            <div class="thermal-total-row">
              <span>Reference #:</span>
              <span>${data.referenceNumber}</span>
            </div>
          ` : ''}
          <div class="thermal-total-row">
            <span>Previous Balance:</span>
            <span>${UI.formatPKR(data.previousBalance)}</span>
          </div>
        </div>

        <div class="thermal-balance-box">
          <div style="font-size: 10px; font-weight: bold;">REMAINING OUTSTANDING BALANCE</div>
          <div style="font-size: 15px; font-weight: 800; margin-top: 2px;">${UI.formatPKR(data.newBalance)}</div>
        </div>
      `}

      <div class="thermal-footer">
        <div class="thermal-barcode">*${data.receiptNumber}*</div>
        <p>${footer}</p>
        <p style="margin-top: 4px; font-size: 8px;">Software: Al Zahoor Gas ERP</p>
      </div>
    `;
  },

  buildA4Template(type, business, data) {
    const isSale = type === 'SALE';
    const bizName = business.businessName || 'Al Zahoor Gas Center';
    const category = business.category || 'LPG Refilling & Gas Services';
    const phone = business.mobile || '0300-1234567';
    const address = business.address || 'Main GT Road, Pakistan';
    const footer = business.receiptFooter || 'Thank you for your business!';

    return `
      <div class="a4-header">
        <div>
          <h2 class="a4-brand-name">${bizName}</h2>
          <div class="a4-brand-sub">${category}</div>
          <div class="text-xs text-slate-500 mt-1">${address} • Phone: ${phone}</div>
        </div>
        <div class="a4-invoice-meta">
          <div class="a4-invoice-badge">${isSale ? 'LPG SALES INVOICE' : 'PAYMENT RECEIPT'}</div>
          <div class="mono text-xs mt-1">Receipt #: <strong>${data.receiptNumber}</strong></div>
          <div class="mono text-xs">Date: ${UI.formatDateTime(data.date || data.paymentDate)}</div>
          <div class="mono text-xs">TRX ID: ${data.saleId || data.paymentId}</div>
        </div>
      </div>

      <div class="a4-details-grid">
        <div class="p-3 bg-slate-50 rounded border">
          <div class="font-bold text-slate-700 mb-1">Billed To (Customer Details):</div>
          <div class="font-bold text-base text-slate-900">${data.customerName}</div>
          <div>Mobile: <strong class="mono">${data.customerMobile}</strong></div>
        </div>
        <div class="p-3 bg-slate-50 rounded border">
          <div class="font-bold text-slate-700 mb-1">Transaction Details:</div>
          <div>Payment Status: <strong>${data.paymentType || 'Payment Received'}</strong></div>
          <div>Payment Method: <strong>${data.paymentMethod || 'Cash'}</strong></div>
          ${data.paymentReference || data.referenceNumber ? `<div>Ref: <strong>${data.paymentReference || data.referenceNumber}</strong></div>` : ''}
        </div>
      </div>

      ${isSale ? `
        <table class="a4-table">
          <thead>
            <tr>
              <th>Description / Cylinder Size</th>
              <th>Quantity</th>
              <th>Gas Weight</th>
              <th>Unit Rate (PKR)</th>
              <th class="text-right">Total Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>LPG Cylinder Refilling (${data.cylinderSize} KG)</strong></td>
              <td>${data.quantity} Cylinders</td>
              <td>${data.totalKg} KG</td>
              <td>${UI.formatPKR(data.ratePerCylinder)}</td>
              <td class="text-right font-bold mono">${UI.formatPKR(data.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="a4-totals-box">
          <div class="flex justify-between py-1 border-b">
            <span>Bill Amount:</span>
            <strong class="mono">${UI.formatPKR(data.totalAmount)}</strong>
          </div>
          <div class="flex justify-between py-1 border-b">
            <span>Amount Paid:</span>
            <strong class="mono text-emerald-700">${UI.formatPKR(data.amountPaid)}</strong>
          </div>
          <div class="flex justify-between py-1 border-b">
            <span>Remaining This Bill:</span>
            <strong class="mono text-rose-600">${UI.formatPKR(data.remainingBalance)}</strong>
          </div>
          <div class="flex justify-between py-1 border-b">
            <span>Previous Account Balance:</span>
            <span class="mono">${UI.formatPKR(data.previousBalance)}</span>
          </div>
          <div class="flex justify-between py-1 font-bold text-base text-slate-900 mt-1">
            <span>Total Outstanding Udhar:</span>
            <span class="mono text-rose-700">${UI.formatPKR(data.newBalance)}</span>
          </div>
        </div>
      ` : `
        <table class="a4-table">
          <thead>
            <tr>
              <th>Payment Description</th>
              <th>Payment Method</th>
              <th>Reference #</th>
              <th class="text-right">Amount Received (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Customer Udhar Payment Credited</strong></td>
              <td>${data.paymentMethod}</td>
              <td>${data.referenceNumber || 'N/A'}</td>
              <td class="text-right font-bold mono text-emerald-700">${UI.formatPKR(data.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="a4-totals-box">
          <div class="flex justify-between py-1 border-b">
            <span>Previous Balance:</span>
            <span class="mono">${UI.formatPKR(data.previousBalance)}</span>
          </div>
          <div class="flex justify-between py-1 border-b">
            <span>Payment Received:</span>
            <strong class="mono text-emerald-700">${UI.formatPKR(data.amount)}</strong>
          </div>
          <div class="flex justify-between py-1 font-bold text-base text-slate-900 mt-1">
            <span>Updated Account Balance:</span>
            <span class="mono text-rose-700">${UI.formatPKR(data.newBalance)}</span>
          </div>
        </div>
      `}

      <div class="a4-signatures">
        <div class="signature-line">Customer Signature</div>
        <div class="signature-line">Authorized Sign &amp; Stamp</div>
      </div>

      <div class="text-center text-xs text-slate-500 mt-4 border-t pt-2">
        ${footer}
      </div>
    `;
  }
};

function switchReceiptFormat(format) {
  AppState.receiptFormat = format;
  ReceiptsModule.renderReceiptContent();
}

function printReceiptDirectly() {
  window.print();
}

function filterReceiptsTable() {
  const search = document.getElementById('receipts-search-input').value.toLowerCase().trim();
  const filtered = ReceiptsModule.receiptsCache.filter(r =>
    !search ||
    r.receiptNumber.toLowerCase().includes(search) ||
    r.customerName.toLowerCase().includes(search) ||
    r.customerMobile.includes(search) ||
    r.transactionId.toLowerCase().includes(search)
  );
  ReceiptsModule.renderReceiptsTable(filtered);
}

// ============================================================================
// 11. CYLINDER STOCK MODULE
// ============================================================================
const StockModule = {
  async loadStockOverview() {
    try {
      const data = await API.get('/stock');
      const container = document.getElementById('stock-inventory-cards');

      if (!data.stock || data.stock.length === 0) {
        container.innerHTML = '<div class="text-muted p-4">No inventory configured.</div>';
        return;
      }

      container.innerHTML = data.stock.map(s => {
        const isLow = s.currentStock <= s.lowStockThreshold;
        const totalKg = (s.currentStock * s.cylinderSize).toFixed(1);

        return `
          <div class="cylinder-status-card ${isLow ? 'low-stock' : ''}">
            <div class="cylinder-header">
              <span class="cylinder-size-tag">${s.cylinderSize} KG Commercial/Domestic</span>
              <span class="cylinder-rate-tag">Rate: ${UI.formatPKR(s.sellingRate)}</span>
            </div>
            <div class="cylinder-count-val">${s.currentStock} <span class="text-sm font-normal text-slate-500">cylinders</span></div>
            <div class="cylinder-weight-val">Total Gas Volume: <strong>${totalKg} KG</strong></div>
            <div class="text-xs text-slate-500 mt-1">Alert Threshold: <strong>${s.lowStockThreshold} units</strong></div>
            <div class="flex gap-2 mt-3">
              <button class="btn btn-xs btn-primary" onclick="openReceiveStockModalFor('${s.cylinderSize}')">
                <i class="fa-solid fa-plus"></i> Add Stock
              </button>
              <button class="btn btn-xs btn-outline" onclick="openAdjustStockModalFor('${s.cylinderSize}')">
                <i class="fa-solid fa-sliders"></i> Adjust
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load stock overview:', err.message);
    }
  },

  async loadStockMovements() {
    const size = document.getElementById('movements-filter-size')?.value || '';
    try {
      const data = await API.get(`/stock/movements?cylinderSize=${size}`);
      const tbody = document.getElementById('movements-table-body');

      if (!data.movements || data.movements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No stock movements recorded.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.movements.map(m => {
        const isAdd = ['RECEIVE', 'ADJUSTMENT_ADD', 'CANCEL_REVERSAL'].includes(m.movementType);
        return `
          <tr>
            <td class="whitespace-nowrap text-xs">${UI.formatDateTime(m.date)}</td>
            <td class="mono text-xs font-bold">${m.movementId}</td>
            <td><span class="badge badge-info">${m.cylinderSize} KG</span></td>
            <td class="font-bold ${isAdd ? 'text-emerald-700' : 'text-rose-600'}">
              ${isAdd ? '+' + m.quantity : '-' + m.quantity}
            </td>
            <td><span class="badge ${isAdd ? 'badge-success' : 'badge-warning'}">${m.movementType}</span></td>
            <td class="mono text-slate-500">${m.previousStock}</td>
            <td class="mono font-bold">${m.newStock}</td>
            <td class="mono text-xs">${m.referenceNumber || '-'}</td>
            <td class="text-xs text-slate-600">${m.remarks || '-'}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load stock movements:', err.message);
    }
  }
};

function openReceiveStockModal() {
  document.getElementById('stock-receive-form').reset();
  openModal('modal-stock-receive');
}

function openReceiveStockModalFor(size) {
  openReceiveStockModal();
  document.getElementById('stock-rec-size').value = size;
}

function openAdjustStockModal() {
  document.getElementById('stock-adjust-form').reset();
  openModal('modal-stock-adjust');
}

function openAdjustStockModalFor(size) {
  openAdjustStockModal();
  document.getElementById('stock-adj-size').value = size;
}

async function handleStockReceiveSubmit(e) {
  e.preventDefault();
  const payload = {
    cylinderSize: Number(document.getElementById('stock-rec-size').value),
    quantity: parseInt(document.getElementById('stock-rec-qty').value, 10),
    unitCost: Number(document.getElementById('stock-rec-cost').value) || 0,
    supplierName: document.getElementById('stock-rec-supplier').value.trim(),
    referenceNumber: document.getElementById('stock-rec-ref').value.trim(),
    remarks: document.getElementById('stock-rec-remarks').value.trim()
  };

  try {
    await API.post('/stock/receive', payload);
    UI.showToast('Stock received and added to inventory!', 'success');
    closeModal('modal-stock-receive');
    StockModule.loadStockOverview();
    StockModule.loadStockMovements();
    DashboardModule.loadDashboardData();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

async function handleStockAdjustSubmit(e) {
  e.preventDefault();
  const payload = {
    cylinderSize: Number(document.getElementById('stock-adj-size').value),
    movementType: document.getElementById('stock-adj-type').value,
    adjustmentQuantity: parseInt(document.getElementById('stock-adj-qty').value, 10),
    remarks: document.getElementById('stock-adj-remarks').value.trim()
  };

  try {
    await API.post('/stock/adjust', payload);
    UI.showToast('Stock inventory adjusted.', 'success');
    closeModal('modal-stock-adjust');
    StockModule.loadStockOverview();
    StockModule.loadStockMovements();
    DashboardModule.loadDashboardData();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

// ============================================================================
// 12. EXPENSE MANAGEMENT MODULE
// ============================================================================
const ExpensesModule = {
  expensesCache: [],

  async loadExpenses() {
    try {
      const data = await API.get('/expenses');
      this.expensesCache = data.expenses || [];
      document.getElementById('total-expense-badge').textContent = `Total: ${UI.formatPKR(data.totalAmount)}`;
      this.renderExpensesTable(this.expensesCache);
    } catch (err) {
      console.error('Failed to load expenses:', err.message);
    }
  },

  renderExpensesTable(expenses) {
    const tbody = document.getElementById('expenses-table-body');
    if (!expenses || expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No expenses recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = expenses.map(e => `
      <tr>
        <td class="whitespace-nowrap text-xs">${UI.formatDateOnly(e.date)}</td>
        <td class="mono text-xs font-bold">${e.expenseId}</td>
        <td><span class="badge badge-warning">${e.category}</span></td>
        <td><strong>${e.description}</strong></td>
        <td class="mono font-bold text-rose-600">${UI.formatPKR(e.amount)}</td>
        <td><span class="badge badge-secondary">${e.paymentMethod}</span></td>
        <td class="text-xs text-slate-500">${e.remarks || '-'}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-outline text-danger" title="Delete" onclick="ExpensesModule.deleteExpense('${e._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense record?')) {
      try {
        await API.delete(`/expenses/${id}`);
        UI.showToast('Expense removed.', 'success');
        this.loadExpenses();
        DashboardModule.loadDashboardData();
      } catch (err) {
        UI.showToast(err.message, 'danger');
      }
    }
  }
};

function openExpenseModal() {
  document.getElementById('expense-form').reset();
  document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
  openModal('modal-expense');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const payload = {
    category: document.getElementById('exp-category').value,
    description: document.getElementById('exp-desc').value.trim(),
    amount: Number(document.getElementById('exp-amount').value),
    paymentMethod: document.getElementById('exp-method').value,
    date: document.getElementById('exp-date').value,
    remarks: document.getElementById('exp-remarks').value.trim()
  };

  try {
    await API.post('/expenses', payload);
    UI.showToast('Expense recorded successfully.', 'success');
    closeModal('modal-expense');
    ExpensesModule.loadExpenses();
    DashboardModule.loadDashboardData();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

function filterExpensesTable() {
  const search = document.getElementById('expenses-search-input').value.toLowerCase().trim();
  const cat = document.getElementById('expenses-filter-category').value;

  const filtered = ExpensesModule.expensesCache.filter(e => {
    const matchesSearch = !search ||
      e.description.toLowerCase().includes(search) ||
      e.expenseId.toLowerCase().includes(search);

    const matchesCat = (cat === 'ALL' || !cat) || e.category === cat;
    return matchesSearch && matchesCat;
  });

  ExpensesModule.renderExpensesTable(filtered);
}

// ============================================================================
// 13. REPORTS & PROFIT/LOSS MODULE
// ============================================================================
const ReportsModule = {
  currentReportData: null,

  async loadReports() {
    try {
      const plData = await API.get(`/reports/profit-loss?period=${AppState.reportPeriod}`);
      const pl = plData.data;
      this.currentReportData = pl;

      // Profit & Loss Cards
      document.getElementById('rep-revenue').textContent = UI.formatPKR(pl.totalRevenue);
      document.getElementById('rep-cogs').textContent = UI.formatPKR(pl.costOfGoodsSold);
      document.getElementById('rep-gross-profit').textContent = UI.formatPKR(pl.grossProfit);
      document.getElementById('rep-expenses').textContent = UI.formatPKR(pl.totalExpenses);
      document.getElementById('rep-net-profit').textContent = UI.formatPKR(pl.netProfit);

      // Cash Inflow vs Receivables
      document.getElementById('rep-sales-downpay').textContent = UI.formatPKR(pl.totalCashCollectedFromSales);
      document.getElementById('rep-khata-pay').textContent = UI.formatPKR(pl.totalKhataPayments);
      document.getElementById('rep-total-inflow').textContent = UI.formatPKR(pl.totalCashInflow);
      document.getElementById('rep-total-receivables').textContent = UI.formatPKR(pl.totalOutstandingReceivables);

      // Cylinder sales breakdown
      const salesData = await API.get(`/reports/sales?period=${AppState.reportPeriod}`);
      const counts = salesData.summary.cylinderCounts;
      const rates = AppState.settings?.rates || { '45.5': 12000, '11.8': 3200, '3.9': 1100 };

      document.getElementById('cb-qty-45').textContent = counts['45.5'] || 0;
      document.getElementById('cb-kg-45').textContent = ((counts['45.5'] || 0) * 45.5).toFixed(1) + ' KG';
      document.getElementById('cb-rate-45').textContent = UI.formatPKR(rates['45.5']);
      document.getElementById('cb-val-45').textContent = UI.formatPKR((counts['45.5'] || 0) * rates['45.5']);

      document.getElementById('cb-qty-11').textContent = counts['11.8'] || 0;
      document.getElementById('cb-kg-11').textContent = ((counts['11.8'] || 0) * 11.8).toFixed(1) + ' KG';
      document.getElementById('cb-rate-11').textContent = UI.formatPKR(rates['11.8']);
      document.getElementById('cb-val-11').textContent = UI.formatPKR((counts['11.8'] || 0) * rates['11.8']);

      document.getElementById('cb-qty-3').textContent = counts['3.9'] || 0;
      document.getElementById('cb-kg-3').textContent = ((counts['3.9'] || 0) * 3.9).toFixed(1) + ' KG';
      document.getElementById('cb-rate-3').textContent = UI.formatPKR(rates['3.9']);
      document.getElementById('cb-val-3').textContent = UI.formatPKR((counts['3.9'] || 0) * rates['3.9']);

      // Outstanding count
      const outData = await API.get('/reports/outstanding');
      document.getElementById('rep-udhar-customers-count').textContent = `${outData.count} Customers`;
    } catch (err) {
      console.error('Failed to load reports:', err.message);
    }
  }
};

function setReportPeriod(period, btn) {
  AppState.reportPeriod = period;
  document.querySelectorAll('#report-period-pills .filter-pill').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ReportsModule.loadReports();
}

function printFinancialReport() {
  window.print();
}

function exportReportToCSV() {
  const pl = ReportsModule.currentReportData;
  if (!pl) {
    UI.showToast('Please wait for reports to load.', 'warning');
    return;
  }

  const csvContent = "data:text/csv;charset=utf-8," +
    "Al Zahoor Gas Center - Financial Statement\n" +
    `Period,${AppState.reportPeriod}\n` +
    `Generated,${new Date().toISOString()}\n\n` +
    "Metric,Amount (PKR)\n" +
    `Sales Revenue,${pl.totalRevenue}\n` +
    `Cost of Goods Sold (COGS),${pl.costOfGoodsSold}\n` +
    `Gross Profit,${pl.grossProfit}\n` +
    `Expenses,${pl.totalExpenses}\n` +
    `Net Profit,${pl.netProfit}\n` +
    `Total Cash Inflow,${pl.totalCashInflow}\n` +
    `Total Outstanding Receivables,${pl.totalOutstandingReceivables}\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Al_Zahoor_Report_${AppState.reportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ============================================================================
// 14. SETTINGS & BUSINESS CONFIGURATION MODULE
// ============================================================================
const SettingsModule = {
  async loadSettings() {
    try {
      const data = await API.get('/settings');
      const s = data.settings;
      AppState.settings = s;

      document.getElementById('set-biz-name').value = s.businessName || 'Al Zahoor Gas Center';
      document.getElementById('set-category').value = s.category || 'LPG Refilling & Gas Services';
      document.getElementById('set-tagline').value = s.tagline || '';
      document.getElementById('set-mobile').value = s.mobile || '';
      document.getElementById('set-whatsapp').value = s.whatsapp || '';
      document.getElementById('set-address').value = s.address || '';
      document.getElementById('set-receipt-footer').value = s.receiptFooter || '';
      document.getElementById('set-currency').value = s.currency || 'PKR';
      document.getElementById('set-receipt-format').value = s.defaultReceiptFormat || '80mm';
      document.getElementById('set-allow-negative-stock').checked = Boolean(s.allowNegativeStock);

      if (s.rates) {
        document.getElementById('rate-45').value = s.rates['45.5'] || 12000;
        document.getElementById('rate-11').value = s.rates['11.8'] || 3200;
        document.getElementById('rate-3').value = s.rates['3.9'] || 1100;
      }

      if (s.thresholds) {
        document.getElementById('thresh-45').value = s.thresholds['45.5'] || 5;
        document.getElementById('thresh-11').value = s.thresholds['11.8'] || 10;
        document.getElementById('thresh-3').value = s.thresholds['3.9'] || 15;
      }
    } catch (err) {
      console.error('Failed to load settings:', err.message);
    }
  }
};

async function saveSettings(e) {
  e.preventDefault();
  const payload = {
    businessName: document.getElementById('set-biz-name').value.trim(),
    category: document.getElementById('set-category').value.trim(),
    tagline: document.getElementById('set-tagline').value.trim(),
    mobile: document.getElementById('set-mobile').value.trim(),
    whatsapp: document.getElementById('set-whatsapp').value.trim(),
    address: document.getElementById('set-address').value.trim(),
    receiptFooter: document.getElementById('set-receipt-footer').value.trim(),
    currency: document.getElementById('set-currency').value.trim(),
    defaultReceiptFormat: document.getElementById('set-receipt-format').value,
    allowNegativeStock: document.getElementById('set-allow-negative-stock').checked,
    rates: {
      '45.5': Number(document.getElementById('rate-45').value),
      '11.8': Number(document.getElementById('rate-11').value),
      '3.9': Number(document.getElementById('rate-3').value)
    },
    thresholds: {
      '45.5': Number(document.getElementById('thresh-45').value),
      '11.8': Number(document.getElementById('thresh-11').value),
      '3.9': Number(document.getElementById('thresh-3').value)
    }
  };

  try {
    await API.put('/settings', payload);
    UI.showToast('Settings and LPG rates updated successfully!', 'success');
    SettingsModule.loadSettings();
    DashboardModule.loadDashboardData();
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

// Change Password
function openChangePasswordModal() {
  document.getElementById('change-password-form').reset();
  openModal('modal-change-password');
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const cur = document.getElementById('cp-current').value;
  const newP = document.getElementById('cp-new').value;
  const conf = document.getElementById('cp-confirm').value;

  if (newP !== conf) {
    UI.showToast('New passwords do not match!', 'warning');
    return;
  }

  try {
    await API.post('/auth/change-password', { currentPassword: cur, newPassword: newP });
    UI.showToast('Admin password changed successfully!', 'success');
    closeModal('modal-change-password');
  } catch (err) {
    UI.showToast(err.message, 'danger');
  }
}

// ============================================================================
// 15. AUDIT TRAIL MODULE
// ============================================================================
const AuditModule = {
  async loadLogs() {
    try {
      const data = await API.get('/audit-logs');
      const tbody = document.getElementById('audit-table-body');

      if (!data.logs || data.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No audit events recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.logs.map(log => `
        <tr>
          <td class="whitespace-nowrap text-xs">${UI.formatDateTime(log.createdAt)}</td>
          <td><span class="badge badge-secondary">${log.action}</span></td>
          <td><strong>${log.module}</strong></td>
          <td class="text-xs text-slate-700">${log.performedBy}</td>
          <td class="text-sm">${log.details}</td>
          <td class="mono text-xs text-slate-400">${log.ip || '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load audit logs:', err.message);
    }
  }
};

// ============================================================================
// 16. MODAL UTILITIES & EVENT LISTENERS
// ============================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// Close modal on escape or background click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => {
      modal.classList.add('hidden');
    });
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.add('hidden');
  }
});

// App Entry Point
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
