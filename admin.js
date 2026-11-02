const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'al_zahoor_gas_center_super_secret_jwt_key_2026_secure!';

// ============================================================================
// 1. MONGOOSE SCHEMAS & MODELS
// ============================================================================

// --- User Schema ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  password: { type: String, required: true },
  fullName: { type: String, default: 'Al Zahoor Admin' },
  role: { type: String, default: 'admin', enum: ['admin'] },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// --- Customer Schema ---
const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  mobile: { type: String, required: true, trim: true, index: true },
  altMobile: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  customerType: {
    type: String,
    enum: ['Regular Customer', 'Shop', 'Hotel', 'Restaurant', 'Business Customer', 'Other'],
    default: 'Regular Customer',
    index: true
  },
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 }, // Positive = Customer owes shop (Udhar / Debit)
  totalDebit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true }, // Soft delete flag
  registrationDate: { type: Date, default: Date.now }
}, { timestamps: true });

// --- Sale Schema ---
const saleSchema = new mongoose.Schema({
  saleId: { type: String, required: true, unique: true, index: true },
  receiptNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerName: { type: String, required: true },
  customerMobile: { type: String, required: true },
  cylinderSize: { type: Number, required: true, enum: [45.5, 11.8, 3.9] },
  quantity: { type: Number, required: true, min: 1 },
  totalKg: { type: Number, required: true },
  ratePerCylinder: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  previousBalance: { type: Number, required: true },
  amountPaid: { type: Number, required: true, min: 0 },
  remainingBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  paymentType: {
    type: String,
    enum: ['Full Payment', 'Partial Payment', 'Credit / Udhar'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'],
    default: 'Cash'
  },
  paymentReference: { type: String, default: '' },
  status: {
    type: String,
    enum: ['COMPLETED', 'CANCELLED', 'EDITED'],
    default: 'COMPLETED',
    index: true
  },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  notes: { type: String, default: '' },
  date: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// --- Payment Schema ---
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  receiptNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerName: { type: String, required: true },
  customerMobile: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'],
    required: true
  },
  paymentDate: { type: Date, default: Date.now, index: true },
  referenceNumber: { type: String, default: '' },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  remarks: { type: String, default: '' },
  status: { type: String, enum: ['COMPLETED', 'CANCELLED'], default: 'COMPLETED', index: true },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, default: '' }
}, { timestamps: true });

// --- Customer Ledger Schema (Khata) ---
const customerLedgerSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  transactionId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['SALE', 'PAYMENT', 'OPENING_BALANCE', 'CANCEL_SALE', 'CANCEL_PAYMENT', 'ADJUSTMENT'],
    required: true
  },
  description: { type: String, required: true },
  debit: { type: Number, default: 0 },   // Amount owed to shop (sales)
  credit: { type: Number, default: 0 },  // Payment received from customer
  runningBalance: { type: Number, required: true },
  paymentMethod: { type: String, default: '' },
  reference: { type: String, default: '' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

// --- Stock Schema ---
const stockSchema = new mongoose.Schema({
  cylinderSize: { type: Number, required: true, unique: true, enum: [45.5, 11.8, 3.9] },
  currentStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  sellingRate: { type: Number, required: true },
  purchaseCost: { type: Number, default: 0 }, // latest or average purchase cost
  updatedAt: { type: Date, default: Date.now }
});

// --- Stock Movement Schema ---
const stockMovementSchema = new mongoose.Schema({
  movementId: { type: String, required: true, unique: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  cylinderSize: { type: Number, required: true, enum: [45.5, 11.8, 3.9], index: true },
  quantity: { type: Number, required: true },
  movementType: {
    type: String,
    enum: ['RECEIVE', 'SALE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'CANCEL_REVERSAL', 'RETURN'],
    required: true,
    index: true
  },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  referenceNumber: { type: String, default: '' },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  supplierName: { type: String, default: '' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

// --- Expense Schema ---
const expenseSchema = new mongoose.Schema({
  expenseId: { type: String, required: true, unique: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  category: {
    type: String,
    enum: ['Transportation', 'Electricity', 'Employee Salary', 'Maintenance', 'Rent', 'Loading / Unloading', 'Other'],
    required: true,
    index: true
  },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'],
    default: 'Cash'
  },
  remarks: { type: String, default: '' }
}, { timestamps: true });

// --- Settings Schema ---
const settingsSchema = new mongoose.Schema({
  businessName: { type: String, default: 'Al Zahoor Gas Center' },
  category: { type: String, default: 'LPG Refilling & Gas Services' },
  tagline: { type: String, default: 'Professional LPG Cylinder Sales & Refilling' },
  mobile: { type: String, default: '0300-1234567' },
  whatsapp: { type: String, default: '0300-1234567' },
  address: { type: String, default: 'Main GT Road, Al Zahoor Gas Center, Pakistan' },
  receiptFooter: { type: String, default: 'Thank you for your business! Cylinders once sold are strictly tested for safety. For gas delivery or refilling, contact us.' },
  currency: { type: String, default: 'PKR' },
  defaultReceiptFormat: { type: String, enum: ['80mm', 'A4'], default: '80mm' },
  allowNegativeStock: { type: Boolean, default: false },
  rates: {
    '45.5': { type: Number, default: 12000 },
    '11.8': { type: Number, default: 3200 },
    '3.9': { type: Number, default: 1100 }
  },
  thresholds: {
    '45.5': { type: Number, default: 5 },
    '11.8': { type: Number, default: 10 },
    '3.9': { type: Number, default: 15 }
  }
}, { timestamps: true });

// --- Audit Log Schema ---
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  module: { type: String, required: true },
  performedBy: { type: String, default: 'Admin' },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compile Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
const CustomerLedger = mongoose.models.CustomerLedger || mongoose.model('CustomerLedger', customerLedgerSchema);
const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);
const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// ============================================================================
// 2. HELPER UTILITIES
// ============================================================================

// Unique ID generators with timestamp and random digits
function generateId(prefix) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}

async function logAudit(action, module, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : '';
    const user = req && req.user ? req.user.username : 'System';
    await AuditLog.create({ action, module, performedBy: user, details, ip });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Authentication Middleware
function verifyAdminToken(req, res, next) {
  try {
    let token = null;
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  }
}

// Helper: Date filter builder
function buildDateFilter(query, dateField = 'createdAt') {
  const { period, startDate, endDate } = query;
  const now = new Date();

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { [dateField]: { $gte: start, $lte: end } };
  }

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { [dateField]: { $gte: start } };
  } else if (period === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { [dateField]: { $gte: start, $lte: end } };
  } else if (period === 'this_week' || period === '7_days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { [dateField]: { $gte: start } };
  } else if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { [dateField]: { $gte: start } };
  } else if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { [dateField]: { $gte: start, $lte: end } };
  } else if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { [dateField]: { $gte: start } };
  }

  return {};
}

// Initial Data Seeder (Default Admin, Stock, Settings)
async function seedInitialData() {
  try {
    // 1. Settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        businessName: 'Al Zahoor Gas Center',
        category: 'LPG Refilling & Gas Services',
        tagline: 'Professional LPG Cylinder Sales & Refilling',
        mobile: '0300-1234567',
        whatsapp: '0300-1234567',
        address: 'Main Bazar, Al Zahoor Gas Center, Pakistan',
        rates: { '45.5': 12000, '11.8': 3200, '3.9': 1100 },
        thresholds: { '45.5': 5, '11.8': 10, '3.9': 15 }
      });
      console.log('Default Settings initialized.');
    }

    // 2. Default Cylinder Stock
    const cylinderSizes = [45.5, 11.8, 3.9];
    for (const size of cylinderSizes) {
      const existing = await Stock.findOne({ cylinderSize: size });
      if (!existing) {
        const rate = settings.rates[size.toString()] || (size === 45.5 ? 12000 : size === 11.8 ? 3200 : 1100);
        const thresh = settings.thresholds[size.toString()] || (size === 45.5 ? 5 : size === 11.8 ? 10 : 15);
        await Stock.create({
          cylinderSize: size,
          currentStock: size === 11.8 ? 50 : size === 45.5 ? 20 : 30, // Realistic initial stock
          sellingRate: rate,
          lowStockThreshold: thresh,
          purchaseCost: rate * 0.85
        });
      }
    }

    // 3. Admin User
    const adminCount = await User.countDocuments();
    if (adminCount === 0) {
      const initialUser = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const initialPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(initialPass, salt);

      await User.create({
        username: initialUser,
        password: hashedPassword,
        fullName: process.env.INITIAL_ADMIN_NAME || 'Al Zahoor Manager',
        email: 'admin@alzahoor.com',
        role: 'admin'
      });
      console.log(`Default admin created: ${initialUser} / ${initialPass}`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

// ============================================================================
// 3. AUTHENTICATION APIS
// ============================================================================

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit('LOGIN', 'AUTH', `User ${user.username} logged in successfully`, req);

    return res.json({
      success: true,
      message: 'Sign in successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_token');
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// GET /api/auth/me
router.get('/auth/me', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/change-password
router.post('/auth/change-password', verifyAdminToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAudit('CHANGE_PASSWORD', 'AUTH', `Password changed for ${user.username}`, req);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4. DASHBOARD APIS
// ============================================================================

// GET /api/dashboard
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'date');
    const createdAtFilter = buildDateFilter(req.query, 'createdAt');

    // 1. Total active customers
    const totalCustomers = await Customer.countDocuments({ isActive: true });

    // 2. Sales in filtered period
    const salesAgg = await Sale.aggregate([
      { $match: { ...dateFilter, status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalLpgKg: { $sum: '$totalKg' },
          salesCashCollected: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      }
    ]);
    const periodSales = salesAgg[0] || { totalSales: 0, totalLpgKg: 0, salesCashCollected: 0, count: 0 };

    // 3. Direct Payments received in period
    const paymentsAgg = await Payment.aggregate([
      { $match: { ...buildDateFilter(req.query, 'paymentDate'), status: 'COMPLETED' } },
      { $group: { _id: null, totalDirectPayments: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const periodPayments = paymentsAgg[0]?.totalDirectPayments || 0;

    // Total collected = Downpayments received during sales + Direct payments received
    const totalCollected = periodSales.salesCashCollected + periodPayments;

    // 4. Total outstanding balances across all active customers
    const outstandingAgg = await Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalOutstanding: { $sum: '$currentBalance' } } }
    ]);
    const totalOutstanding = Math.max(0, outstandingAgg[0]?.totalOutstanding || 0);

    // 5. Total Expenses in period
    const expensesAgg = await Expense.aggregate([
      { $match: { ...dateFilter } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;

    // 6. Stock overview & low-stock alerts
    const stockList = await Stock.find().sort({ cylinderSize: -1 });
    const lowStockAlerts = stockList.filter(s => s.currentStock <= s.lowStockThreshold);

    // 7. Recent transactions (Latest sales and payments)
    const recentSales = await Sale.find().sort({ date: -1 }).limit(5);
    const recentPayments = await Payment.find().sort({ paymentDate: -1 }).limit(5);

    // 8. Monthly Sales for chart (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySalesAgg = await Sale.aggregate([
      { $match: { date: { $gte: sixMonthsAgo }, status: 'COMPLETED' } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$totalAmount' },
          kg: { $sum: '$totalKg' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyExpensesAgg = await Expense.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return res.json({
      success: true,
      data: {
        totalCustomers,
        periodSalesAmount: periodSales.totalSales,
        periodLpgKg: Number(periodSales.totalLpgKg.toFixed(2)),
        periodCollected: totalCollected,
        totalOutstanding,
        periodExpenses: totalExpenses,
        salesCount: periodSales.count,
        stockList,
        lowStockAlerts,
        recentSales,
        recentPayments,
        monthlySalesAgg,
        monthlyExpensesAgg
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 5. CUSTOMER MANAGEMENT APIS
// ============================================================================

// GET /api/customers
router.get('/customers', verifyAdminToken, async (req, res) => {
  try {
    const { search, customerType, status } = req.query;
    const filter = {};

    if (status === 'deactivated') {
      filter.isActive = false;
    } else {
      filter.isActive = true;
    }

    if (customerType && customerType !== 'ALL') {
      filter.customerType = customerType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { customerId: { $regex: q, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter).sort({ name: 1 });
    return res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers
router.post('/customers', verifyAdminToken, async (req, res) => {
  try {
    const { name, mobile, altMobile, address, customerType, openingBalance, remarks, confirmDuplicate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    const cleanMobile = mobile.trim();

    // Duplicate Check
    const existingCustomer = await Customer.findOne({ mobile: cleanMobile, isActive: true });
    if (existingCustomer && !confirmDuplicate) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: `A customer with mobile ${cleanMobile} already exists: "${existingCustomer.name}" (${existingCustomer.customerId}). Do you still want to proceed?`,
        existingCustomer
      });
    }

    // Generate Customer ID
    const count = await Customer.countDocuments();
    const customerId = `CUST-${1000 + count + 1}`;

    const numOpeningBalance = Number(openingBalance) || 0;

    const newCustomer = await Customer.create({
      customerId,
      name: name.trim(),
      mobile: cleanMobile,
      altMobile: (altMobile || '').trim(),
      address: (address || '').trim(),
      customerType: customerType || 'Regular Customer',
      openingBalance: numOpeningBalance,
      currentBalance: numOpeningBalance,
      totalDebit: numOpeningBalance > 0 ? numOpeningBalance : 0,
      totalCredit: numOpeningBalance < 0 ? Math.abs(numOpeningBalance) : 0,
      remarks: (remarks || '').trim(),
      isActive: true
    });

    // If opening balance != 0, add an entry to CustomerLedger
    if (numOpeningBalance !== 0) {
      await CustomerLedger.create({
        customerId: newCustomer._id,
        transactionId: `OPN-${customerId}`,
        type: 'OPENING_BALANCE',
        description: 'Account Opening Balance',
        debit: numOpeningBalance > 0 ? numOpeningBalance : 0,
        credit: numOpeningBalance < 0 ? Math.abs(numOpeningBalance) : 0,
        runningBalance: numOpeningBalance,
        remarks: 'Initial balance during customer creation'
      });
    }

    await logAudit('CREATE_CUSTOMER', 'CUSTOMERS', `Created customer ${newCustomer.name} (${customerId})`, req);
    return res.status(201).json({ success: true, message: 'Customer registered successfully.', customer: newCustomer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id
router.get('/customers/:id', verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    const recentLedger = await CustomerLedger.find({ customerId: customer._id }).sort({ date: -1 }).limit(10);
    return res.json({ success: true, customer, recentLedger });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/customers/:id', verifyAdminToken, async (req, res) => {
  try {
    const { name, mobile, altMobile, address, customerType, remarks } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (name) customer.name = name.trim();
    if (mobile) customer.mobile = mobile.trim();
    if (altMobile !== undefined) customer.altMobile = altMobile.trim();
    if (address !== undefined) customer.address = address.trim();
    if (customerType) customer.customerType = customerType;
    if (remarks !== undefined) customer.remarks = remarks.trim();

    await customer.save();
    await logAudit('UPDATE_CUSTOMER', 'CUSTOMERS', `Updated customer ${customer.name} (${customer.customerId})`, req);
    return res.json({ success: true, message: 'Customer details updated successfully.', customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id (Soft-deactivate)
router.delete('/customers/:id', verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (customer.currentBalance !== 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate customer with an outstanding balance of PKR ${customer.currentBalance}. Please clear the balance first.`
      });
    }

    customer.isActive = false;
    await customer.save();

    await logAudit('DEACTIVATE_CUSTOMER', 'CUSTOMERS', `Deactivated customer ${customer.name} (${customer.customerId})`, req);
    return res.json({ success: true, message: 'Customer deactivated successfully. Historical financial ledger is preserved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 6. CUSTOMER LEDGER / KHATA APIS
// ============================================================================

// GET /api/customers/:id/ledger
router.get('/customers/:id/ledger', verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const dateFilter = buildDateFilter(req.query, 'date');
    const ledger = await CustomerLedger.find({ customerId: customer._id, ...dateFilter }).sort({ date: 1, _id: 1 });

    const totalDebit = ledger.reduce((acc, curr) => acc + (curr.debit || 0), 0);
    const totalCredit = ledger.reduce((acc, curr) => acc + (curr.credit || 0), 0);

    return res.json({
      success: true,
      customer,
      summary: {
        totalDebit,
        totalCredit,
        currentBalance: customer.currentBalance,
        openingBalance: customer.openingBalance
      },
      ledger
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id/statement
router.get('/customers/:id/statement', verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const settings = (await Settings.findOne()) || {};
    const ledger = await CustomerLedger.find({ customerId: customer._id }).sort({ date: 1, _id: 1 });

    return res.json({
      success: true,
      business: settings,
      customer,
      statementDate: new Date(),
      ledger
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 7. LPG SALES & REFILLING APIS
// ============================================================================

// GET /api/sales
router.get('/sales', verifyAdminToken, async (req, res) => {
  try {
    const { customerId, cylinderSize, paymentType, status, search } = req.query;
    const filter = buildDateFilter(req.query, 'date');

    if (customerId) filter.customerId = customerId;
    if (cylinderSize) filter.cylinderSize = Number(cylinderSize);
    if (paymentType) filter.paymentType = paymentType;
    if (status) filter.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { customerMobile: { $regex: q, $options: 'i' } },
        { saleId: { $regex: q, $options: 'i' } },
        { receiptNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const sales = await Sale.find(filter).sort({ date: -1 }).limit(200);
    return res.json({ success: true, count: sales.length, sales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sales
router.post('/sales', verifyAdminToken, async (req, res) => {
  try {
    const {
      customerId,
      cylinderSize,
      quantity,
      ratePerCylinder,
      amountPaid,
      paymentMethod,
      paymentReference,
      notes
    } = req.body;

    // 1. Validation
    if (!customerId) return res.status(400).json({ success: false, message: 'Customer is required.' });
    const numSize = Number(cylinderSize);
    if (![45.5, 11.8, 3.9].includes(numSize)) {
      return res.status(400).json({ success: false, message: 'Invalid cylinder size. Allowed: 45.5, 11.8, 3.9 KG.' });
    }
    const numQty = parseInt(quantity, 10);
    if (!numQty || numQty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1 cylinder.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    if (!customer.isActive) return res.status(400).json({ success: false, message: 'Cannot bill an inactive customer.' });

    // 2. Stock Verification
    const stock = await Stock.findOne({ cylinderSize: numSize });
    const settings = await Settings.findOne() || {};
    if (!stock) return res.status(404).json({ success: false, message: `Stock configuration for ${numSize} KG not found.` });

    if (stock.currentStock < numQty && !settings.allowNegativeStock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Available: ${stock.currentStock} cylinders of ${numSize} KG, requested: ${numQty}.`
      });
    }

    // 3. Reliable Server-Side Calculations
    const rate = Number(ratePerCylinder) > 0 ? Number(ratePerCylinder) : stock.sellingRate;
    const totalKg = Number((numSize * numQty).toFixed(2));
    const totalAmount = Math.round(numQty * rate);
    const paid = Math.max(0, Math.round(Number(amountPaid) || 0));

    if (paid > totalAmount) {
      return res.status(400).json({ success: false, message: 'Amount paid cannot exceed total bill amount.' });
    }

    const remainingBalance = totalAmount - paid;
    const previousBalance = customer.currentBalance;
    const newBalance = previousBalance + remainingBalance;

    let paymentType = 'Full Payment';
    if (paid === 0) {
      paymentType = 'Credit / Udhar';
    } else if (paid < totalAmount) {
      paymentType = 'Partial Payment';
    }

    // 4. Unique identifiers
    const saleId = generateId('TRX');
    const receiptNumber = generateId('REC');

    // 5. Create Sale Record
    const newSale = await Sale.create({
      saleId,
      receiptNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      cylinderSize: numSize,
      quantity: numQty,
      totalKg,
      ratePerCylinder: rate,
      totalAmount,
      previousBalance,
      amountPaid: paid,
      remainingBalance,
      newBalance,
      paymentType,
      paymentMethod: paymentMethod || 'Cash',
      paymentReference: paymentReference || '',
      notes: notes || '',
      status: 'COMPLETED',
      date: new Date()
    });

    // 6. Update Customer Balance and Totals
    customer.currentBalance = newBalance;
    customer.totalDebit += totalAmount;
    customer.totalCredit += paid;
    await customer.save();

    // 7. Add Customer Ledger Entry
    let ledgerDesc = `LPG Refilling: ${numQty}x ${numSize} KG Cylinders (${totalKg} KG @ Rs ${rate})`;
    if (paid > 0 && paid < totalAmount) {
      ledgerDesc += ` (Partial Cash Paid: Rs ${paid})`;
    } else if (paid === totalAmount) {
      ledgerDesc += ` (Paid Full: Rs ${paid})`;
    } else {
      ledgerDesc += ` (Credit / Udhar)`;
    }

    await CustomerLedger.create({
      customerId: customer._id,
      date: new Date(),
      transactionId: saleId,
      type: 'SALE',
      description: ledgerDesc,
      debit: totalAmount,
      credit: paid,
      runningBalance: newBalance,
      paymentMethod: paymentMethod || 'Cash',
      reference: receiptNumber,
      remarks: notes || ''
    });

    // 8. Decrement Stock & Record Movement
    const previousStock = stock.currentStock;
    stock.currentStock -= numQty;
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      movementId: generateId('SM'),
      date: new Date(),
      cylinderSize: numSize,
      quantity: numQty,
      movementType: 'SALE',
      previousStock,
      newStock: stock.currentStock,
      referenceNumber: saleId,
      remarks: `Sale to ${customer.name} (${saleId})`
    });

    await logAudit(
      'CREATE_SALE',
      'SALES',
      `Sale ${saleId} created: ${numQty}x ${numSize}KG, Total Rs ${totalAmount}, Paid Rs ${paid} by ${customer.name}`,
      req
    );

    return res.status(201).json({
      success: true,
      message: 'Sale completed and recorded successfully.',
      sale: newSale
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sales/:id
router.get('/sales/:id', verifyAdminToken, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    return res.json({ success: true, sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sales/:id/cancel
router.post('/sales/:id/cancel', verifyAdminToken, async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason for transaction cancellation is required.' });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This sale has already been cancelled.' });
    }

    const customer = await Customer.findById(sale.customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer record missing.' });

    // Reverse financial effect on Customer balance
    // Original effect was: customer.currentBalance += sale.remainingBalance
    customer.currentBalance -= sale.remainingBalance;
    customer.totalDebit -= sale.totalAmount;
    customer.totalCredit -= sale.amountPaid;
    await customer.save();

    // Add Ledger Reversal Entry
    await CustomerLedger.create({
      customerId: customer._id,
      date: new Date(),
      transactionId: `REV-${sale.saleId}`,
      type: 'CANCEL_SALE',
      description: `Reversal / Cancelled Sale: ${sale.saleId} (${cancellationReason.trim()})`,
      debit: 0,
      credit: sale.remainingBalance, // Reverses the net debit
      runningBalance: customer.currentBalance,
      reference: sale.saleId,
      remarks: cancellationReason.trim()
    });

    // Revert Stock
    const stock = await Stock.findOne({ cylinderSize: sale.cylinderSize });
    if (stock) {
      const prevStock = stock.currentStock;
      stock.currentStock += sale.quantity;
      stock.updatedAt = new Date();
      await stock.save();

      await StockMovement.create({
        movementId: generateId('SM'),
        date: new Date(),
        cylinderSize: sale.cylinderSize,
        quantity: sale.quantity,
        movementType: 'CANCEL_REVERSAL',
        previousStock: prevStock,
        newStock: stock.currentStock,
        referenceNumber: sale.saleId,
        remarks: `Reversal of cancelled sale ${sale.saleId}`
      });
    }

    // Mark Sale as CANCELLED
    sale.status = 'CANCELLED';
    sale.cancellationReason = cancellationReason.trim();
    sale.cancelledAt = new Date();
    sale.cancelledBy = req.user.username;
    await sale.save();

    await logAudit(
      'CANCEL_SALE',
      'SALES',
      `Sale ${sale.saleId} cancelled by ${req.user.username}. Reason: ${cancellationReason}`,
      req
    );

    return res.json({ success: true, message: 'Sale cancelled and financial/stock reversal completed.', sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 8. PAYMENT MANAGEMENT APIS
// ============================================================================

// GET /api/payments
router.get('/payments', verifyAdminToken, async (req, res) => {
  try {
    const { customerId, paymentMethod, status, search } = req.query;
    const filter = buildDateFilter(req.query, 'paymentDate');

    if (customerId) filter.customerId = customerId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { customerMobile: { $regex: q, $options: 'i' } },
        { paymentId: { $regex: q, $options: 'i' } },
        { receiptNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(filter).sort({ paymentDate: -1 }).limit(200);
    return res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments
router.post('/payments', verifyAdminToken, async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, referenceNumber, remarks, paymentDate } = req.body;

    if (!customerId) return res.status(400).json({ success: false, message: 'Customer is required.' });
    const numAmount = Math.round(Number(amount));
    if (!numAmount || numAmount < 1) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const previousBalance = customer.currentBalance;
    const newBalance = previousBalance - numAmount;

    const paymentId = generateId('PAY');
    const receiptNumber = generateId('REC-P');

    const newPayment = await Payment.create({
      paymentId,
      receiptNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      amount: numAmount,
      paymentMethod: paymentMethod || 'Cash',
      referenceNumber: referenceNumber || '',
      previousBalance,
      newBalance,
      remarks: remarks || '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      status: 'COMPLETED'
    });

    // Update Customer
    customer.currentBalance = newBalance;
    customer.totalCredit += numAmount;
    await customer.save();

    // Customer Ledger Credit Entry
    await CustomerLedger.create({
      customerId: customer._id,
      date: newPayment.paymentDate,
      transactionId: paymentId,
      type: 'PAYMENT',
      description: `Payment Received (${paymentMethod || 'Cash'}${referenceNumber ? ` - Ref: ${referenceNumber}` : ''})`,
      debit: 0,
      credit: numAmount,
      runningBalance: newBalance,
      paymentMethod: paymentMethod || 'Cash',
      reference: receiptNumber,
      remarks: remarks || ''
    });

    await logAudit(
      'RECORD_PAYMENT',
      'PAYMENTS',
      `Received payment Rs ${numAmount} from ${customer.name} (${paymentId})`,
      req
    );

    return res.status(201).json({
      success: true,
      message: 'Payment recorded and credited to customer account.',
      payment: newPayment
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payments/:id
router.get('/payments/:id', verifyAdminToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });
    return res.json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 9. RECEIPTS & BILLING APIS
// ============================================================================

// GET /api/receipts
router.get('/receipts', verifyAdminToken, async (req, res) => {
  try {
    const { search, type } = req.query;
    // Collect from both Sales and Payments
    const saleReceipts = await Sale.find().sort({ date: -1 }).limit(100);
    const paymentReceipts = await Payment.find().sort({ paymentDate: -1 }).limit(100);

    let allReceipts = [
      ...saleReceipts.map(s => ({
        id: s._id,
        receiptNumber: s.receiptNumber,
        type: 'SALE',
        transactionId: s.saleId,
        date: s.date,
        customerName: s.customerName,
        customerMobile: s.customerMobile,
        amount: s.totalAmount,
        paid: s.amountPaid,
        remaining: s.remainingBalance,
        status: s.status
      })),
      ...paymentReceipts.map(p => ({
        id: p._id,
        receiptNumber: p.receiptNumber,
        type: 'PAYMENT',
        transactionId: p.paymentId,
        date: p.paymentDate,
        customerName: p.customerName,
        customerMobile: p.customerMobile,
        amount: p.amount,
        paid: p.amount,
        remaining: p.newBalance,
        status: p.status
      }))
    ];

    allReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allReceipts = allReceipts.filter(r =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerMobile.includes(q) ||
        r.transactionId.toLowerCase().includes(q)
      );
    }

    return res.json({ success: true, receipts: allReceipts.slice(0, 100) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/receipts/:id (Details for printing)
router.get('/receipts/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const settings = (await Settings.findOne()) || {};

    // Check Sale
    const sale = await Sale.findById(id).catch(() => null) ||
                 await Sale.findOne({ receiptNumber: id }).catch(() => null);

    if (sale) {
      return res.json({
        success: true,
        type: 'SALE',
        business: settings,
        data: sale
      });
    }

    // Check Payment
    const payment = await Payment.findById(id).catch(() => null) ||
                    await Payment.findOne({ receiptNumber: id }).catch(() => null);

    if (payment) {
      return res.json({
        success: true,
        type: 'PAYMENT',
        business: settings,
        data: payment
      });
    }

    return res.status(404).json({ success: false, message: 'Receipt not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 10. STOCK MANAGEMENT APIS
// ============================================================================

// GET /api/stock
router.get('/stock', verifyAdminToken, async (req, res) => {
  try {
    const stock = await Stock.find().sort({ cylinderSize: -1 });
    const settings = (await Settings.findOne()) || {};
    return res.json({ success: true, stock, allowNegativeStock: settings.allowNegativeStock });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stock/receive (Stock In / Purchase)
router.post('/stock/receive', verifyAdminToken, async (req, res) => {
  try {
    const { cylinderSize, quantity, unitCost, supplierName, remarks, referenceNumber } = req.body;
    const numSize = Number(cylinderSize);
    const numQty = parseInt(quantity, 10);

    if (![45.5, 11.8, 3.9].includes(numSize)) {
      return res.status(400).json({ success: false, message: 'Invalid cylinder size.' });
    }
    if (!numQty || numQty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1 cylinder.' });
    }

    const stock = await Stock.findOne({ cylinderSize: numSize });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock item not found.' });

    const cost = Math.max(0, Number(unitCost) || 0);
    const previousStock = stock.currentStock;
    stock.currentStock += numQty;
    if (cost > 0) stock.purchaseCost = cost;
    stock.updatedAt = new Date();
    await stock.save();

    const movementId = generateId('SM');
    await StockMovement.create({
      movementId,
      date: new Date(),
      cylinderSize: numSize,
      quantity: numQty,
      movementType: 'RECEIVE',
      previousStock,
      newStock: stock.currentStock,
      referenceNumber: referenceNumber || '',
      unitCost: cost,
      totalCost: cost * numQty,
      supplierName: supplierName || '',
      remarks: remarks || 'Stock received from supplier'
    });

    await logAudit(
      'RECEIVE_STOCK',
      'STOCK',
      `Received ${numQty} cylinders of ${numSize} KG into stock. Supplier: ${supplierName || 'N/A'}`,
      req
    );

    return res.json({ success: true, message: `Successfully added ${numQty} cylinders of ${numSize} KG to stock.`, stock });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stock/adjust
router.post('/stock/adjust', verifyAdminToken, async (req, res) => {
  try {
    const { cylinderSize, adjustmentQuantity, movementType, remarks } = req.body;
    const numSize = Number(cylinderSize);
    const numQty = parseInt(adjustmentQuantity, 10);

    if (![45.5, 11.8, 3.9].includes(numSize)) {
      return res.status(400).json({ success: false, message: 'Invalid cylinder size.' });
    }
    if (!numQty || numQty < 1) {
      return res.status(400).json({ success: false, message: 'Adjustment quantity must be at least 1.' });
    }
    if (!['ADJUSTMENT_ADD', 'ADJUSTMENT_SUB'].includes(movementType)) {
      return res.status(400).json({ success: false, message: 'Invalid movement type.' });
    }

    const stock = await Stock.findOne({ cylinderSize: numSize });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock item not found.' });

    const previousStock = stock.currentStock;
    if (movementType === 'ADJUSTMENT_ADD') {
      stock.currentStock += numQty;
    } else {
      stock.currentStock -= numQty;
    }
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      movementId: generateId('SM'),
      date: new Date(),
      cylinderSize: numSize,
      quantity: numQty,
      movementType,
      previousStock,
      newStock: stock.currentStock,
      remarks: remarks || 'Manual stock adjustment'
    });

    await logAudit('ADJUST_STOCK', 'STOCK', `Stock adjusted for ${numSize} KG: ${movementType} ${numQty}`, req);
    return res.json({ success: true, message: 'Stock adjusted successfully.', stock });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stock/movements
router.get('/stock/movements', verifyAdminToken, async (req, res) => {
  try {
    const { cylinderSize, movementType } = req.query;
    const filter = buildDateFilter(req.query, 'date');

    if (cylinderSize) filter.cylinderSize = Number(cylinderSize);
    if (movementType) filter.movementType = movementType;

    const movements = await StockMovement.find(filter).sort({ date: -1 }).limit(200);
    return res.json({ success: true, count: movements.length, movements });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 11. EXPENSE MANAGEMENT APIS
// ============================================================================

// GET /api/expenses
router.get('/expenses', verifyAdminToken, async (req, res) => {
  try {
    const { category, paymentMethod, search } = req.query;
    const filter = buildDateFilter(req.query, 'date');

    if (category && category !== 'ALL') filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { expenseId: { $regex: q, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return res.json({ success: true, count: expenses.length, totalAmount, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/expenses
router.post('/expenses', verifyAdminToken, async (req, res) => {
  try {
    const { category, description, amount, paymentMethod, remarks, date } = req.body;

    if (!category) return res.status(400).json({ success: false, message: 'Category is required.' });
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }
    const numAmount = Math.round(Number(amount));
    if (!numAmount || numAmount < 1) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than 0.' });
    }

    const expenseId = generateId('EXP');
    const newExpense = await Expense.create({
      expenseId,
      category,
      description: description.trim(),
      amount: numAmount,
      paymentMethod: paymentMethod || 'Cash',
      remarks: remarks || '',
      date: date ? new Date(date) : new Date()
    });

    await logAudit('CREATE_EXPENSE', 'EXPENSES', `Expense created: Rs ${numAmount} for ${category} (${description})`, req);
    return res.status(201).json({ success: true, message: 'Expense recorded successfully.', expense: newExpense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/expenses/:id', verifyAdminToken, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    await logAudit('DELETE_EXPENSE', 'EXPENSES', `Deleted expense ${expense.expenseId} (${expense.amount} PKR)`, req);
    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 12. REPORTS & ACCOUNTING APIS
// ============================================================================

// GET /api/reports/sales
router.get('/reports/sales', verifyAdminToken, async (req, res) => {
  try {
    const filter = buildDateFilter(req.query, 'date');
    filter.status = 'COMPLETED';

    const sales = await Sale.find(filter).sort({ date: -1 });

    const summary = {
      totalSalesAmount: 0,
      totalKg: 0,
      totalAmountPaid: 0,
      totalRemaining: 0,
      cylinderCounts: { '45.5': 0, '11.8': 0, '3.9': 0 }
    };

    sales.forEach(s => {
      summary.totalSalesAmount += s.totalAmount;
      summary.totalKg += s.totalKg;
      summary.totalAmountPaid += s.amountPaid;
      summary.totalRemaining += s.remainingBalance;
      if (summary.cylinderCounts[s.cylinderSize.toString()] !== undefined) {
        summary.cylinderCounts[s.cylinderSize.toString()] += s.quantity;
      }
    });

    summary.totalKg = Number(summary.totalKg.toFixed(2));

    return res.json({ success: true, summary, sales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/expenses
router.get('/reports/expenses', verifyAdminToken, async (req, res) => {
  try {
    const filter = buildDateFilter(req.query, 'date');
    const expenses = await Expense.find(filter).sort({ date: -1 });

    const categoryBreakdown = {};
    let totalExpense = 0;

    expenses.forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
      totalExpense += e.amount;
    });

    return res.json({ success: true, totalExpense, categoryBreakdown, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/profit-loss
router.get('/reports/profit-loss', verifyAdminToken, async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query, 'date');

    // 1. Total Completed Sales Revenue
    const sales = await Sale.find({ ...dateFilter, status: 'COMPLETED' });
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCashCollectedFromSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);

    // 2. Direct Khata Payments in period
    const payments = await Payment.find({ ...buildDateFilter(req.query, 'paymentDate'), status: 'COMPLETED' });
    const totalKhataPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    const totalCashInflow = totalCashCollectedFromSales + totalKhataPayments;

    // 3. Cost of Goods Sold (Cylinder purchase cost lookup)
    const stockItems = await Stock.find();
    const costMap = {};
    stockItems.forEach(s => { costMap[s.cylinderSize.toString()] = s.purchaseCost || 0; });

    let costOfGoodsSold = 0;
    sales.forEach(s => {
      const unitCost = costMap[s.cylinderSize.toString()] || 0;
      costOfGoodsSold += (unitCost * s.quantity);
    });

    // 4. Expenses in period
    const expenses = await Expense.find({ ...dateFilter });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Profit calculations
    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    // 6. Outstanding Receivables
    const activeCustomers = await Customer.find({ isActive: true });
    const totalOutstandingReceivables = activeCustomers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);

    return res.json({
      success: true,
      data: {
        totalRevenue,
        costOfGoodsSold: Math.round(costOfGoodsSold),
        grossProfit: Math.round(grossProfit),
        totalExpenses,
        netProfit: Math.round(netProfit),
        totalCashCollectedFromSales,
        totalKhataPayments,
        totalCashInflow,
        totalOutstandingReceivables
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/outstanding
router.get('/reports/outstanding', verifyAdminToken, async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true, currentBalance: { $gt: 0 } }).sort({ currentBalance: -1 });
    const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);
    return res.json({ success: true, count: customers.length, totalOutstanding, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/stock
router.get('/reports/stock', verifyAdminToken, async (req, res) => {
  try {
    const stock = await Stock.find().sort({ cylinderSize: -1 });
    let totalCylinders = 0;
    let totalKg = 0;
    let totalEstimatedValue = 0;

    stock.forEach(s => {
      totalCylinders += s.currentStock;
      totalKg += (s.currentStock * s.cylinderSize);
      totalEstimatedValue += (s.currentStock * s.sellingRate);
    });

    return res.json({
      success: true,
      totalCylinders,
      totalKg: Number(totalKg.toFixed(2)),
      totalEstimatedValue,
      stock
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 13. SETTINGS & BUSINESS CONFIGURATION APIS
// ============================================================================

// GET /api/settings
router.get('/settings', verifyAdminToken, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      await seedInitialData();
      settings = await Settings.findOne();
    }
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings
router.put('/settings', verifyAdminToken, async (req, res) => {
  try {
    const {
      businessName,
      category,
      tagline,
      mobile,
      whatsapp,
      address,
      receiptFooter,
      currency,
      defaultReceiptFormat,
      allowNegativeStock,
      rates,
      thresholds
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    if (businessName) settings.businessName = businessName.trim();
    if (category) settings.category = category.trim();
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (mobile) settings.mobile = mobile.trim();
    if (whatsapp) settings.whatsapp = whatsapp.trim();
    if (address) settings.address = address.trim();
    if (receiptFooter) settings.receiptFooter = receiptFooter.trim();
    if (currency) settings.currency = currency.trim();
    if (defaultReceiptFormat) settings.defaultReceiptFormat = defaultReceiptFormat;
    if (allowNegativeStock !== undefined) settings.allowNegativeStock = Boolean(allowNegativeStock);

    if (rates && typeof rates === 'object') {
      if (rates['45.5']) settings.rates['45.5'] = Number(rates['45.5']);
      if (rates['11.8']) settings.rates['11.8'] = Number(rates['11.8']);
      if (rates['3.9']) settings.rates['3.9'] = Number(rates['3.9']);

      // Also update sellingRate in Stock collection
      await Stock.updateOne({ cylinderSize: 45.5 }, { sellingRate: settings.rates['45.5'] });
      await Stock.updateOne({ cylinderSize: 11.8 }, { sellingRate: settings.rates['11.8'] });
      await Stock.updateOne({ cylinderSize: 3.9 }, { sellingRate: settings.rates['3.9'] });
    }

    if (thresholds && typeof thresholds === 'object') {
      if (thresholds['45.5']) settings.thresholds['45.5'] = Number(thresholds['45.5']);
      if (thresholds['11.8']) settings.thresholds['11.8'] = Number(thresholds['11.8']);
      if (thresholds['3.9']) settings.thresholds['3.9'] = Number(thresholds['3.9']);

      // Update Stock thresholds
      await Stock.updateOne({ cylinderSize: 45.5 }, { lowStockThreshold: settings.thresholds['45.5'] });
      await Stock.updateOne({ cylinderSize: 11.8 }, { lowStockThreshold: settings.thresholds['11.8'] });
      await Stock.updateOne({ cylinderSize: 3.9 }, { lowStockThreshold: settings.thresholds['3.9'] });
    }

    await settings.save();
    await logAudit('UPDATE_SETTINGS', 'SETTINGS', 'Updated business and LPG configuration settings', req);

    return res.json({ success: true, message: 'Settings saved successfully.', settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/audit-logs
router.get('/audit-logs', verifyAdminToken, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Export router and seed function
module.exports = {
  router,
  seedInitialData,
  models: { User, Customer, Sale, Payment, CustomerLedger, Stock, StockMovement, Expense, Settings, AuditLog }
};
