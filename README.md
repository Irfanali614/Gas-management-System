# AL ZAHOOR GAS CENTER
### Professional LPG Shop Management & Accounting System (Full-Stack)

[![Node.js Version](https://img.shields.io/badge/Node.js-24.x-brightgreen.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-forestgreen.svg)](https://www.mongodb.com/cloud/atlas)
[![Framework](https://img.shields.io/badge/Backend-Express.js-blue.svg)](https://expressjs.com/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20Serverless-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-Proprietary-navy.svg)](#)

---

## 1. Project Overview

**Al Zahoor Gas Center** is a production-grade, full-stack LPG (Liquefied Petroleum Gas) refilling and shop management system designed for real-world commercial gas distribution operations. 

Built using pure **HTML5, CSS3, Vanilla JavaScript (ES6+), Node.js 24.x, Express.js, and MongoDB Atlas**, the system delivers commercial accounting software performance with zero bloated frontend frameworks. Every calculation, transaction, ledger update, and stock movement is executed server-side with strict accounting integrity.

---

## 2. Key Modules & Features

### 🏢 LPG Cylinder Inventory Management
- **Standard Cylinder Sizes:**
  - **45.5 KG** (Commercial Cylinder)
  - **11.8 KG** (Domestic Cylinder)
  - **3.9 KG** (Small / Camping Cylinder)
- **Automatic Stock Tracking:** Stock decrements automatically upon sales completion and increments upon supplier purchases or returns.
- **Stock Movements Log:** Complete audit trail tracking date, size, quantity change, movement type (`RECEIVE`, `SALE`, `ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`, `CANCEL_REVERSAL`), reference numbers, and supplier notes.
- **Low-Stock Alert System:** Visual dashboard banners and badges alert the shop owner when inventory drops below configured safety thresholds.
- **Authorized Negative Stock Override:** Configurable setting for busy refilling hours.

### 💰 LPG Sales & Refilling Module
- **Sequential Transaction IDs:** Automated generation (e.g., `TRX-20261102-1001`).
- **Real-Time Client & Server Calculations:**
  $$\text{Total KG} = \text{Cylinder Size} \times \text{Quantity}$$
  $$\text{Total Amount} = \text{Quantity} \times \text{Rate}$$
  $$\text{Remaining Udhar} = \text{Total Amount} - \text{Amount Paid}$$
  $$\text{New Balance} = \text{Previous Balance} + \text{Remaining Udhar}$$
- **Flexible Payment Types:**
  - **Full Payment:** Customer pays entire bill in cash or bank transfer.
  - **Partial Payment:** Customer pays downpayment; remainder is posted to Khata.
  - **Credit / Udhar:** Full transaction amount is debited to the customer's ledger.
- **Payment Methods:** Cash, Bank Transfer, Easypaisa, JazzCash, Other.
- **Cancellation with Financial & Stock Reversal:** Completed transactions can be cancelled with an audit reason; the customer's balance and cylinder stock are safely reversed with an immutable ledger entry.

### 📖 Customer Khata / Account Ledger
- **Formal Accounting Convention:**
  - **Debit:** Money customer owes to the shop for cylinder refilling.
  - **Credit:** Payments received from the customer.
  - **Running Balance:** Customer's net outstanding balance owed.
- **Duplicate Customer Detection:** Checks phone numbers and alerts admin before creation.
- **Soft Deactivation:** Customers with zero balances can be deactivated without deleting historic financial ledgers.
- **Statement Generation:** Instant printout and PDF export for customer statements.

### 🧾 Dual-Format Receipts & Invoices
- **80mm Thermal Printer Format:** Optimized for standard POS roll printers with dashed lines, compact monospace typography, customer Udhar summary, barcode, and shop policy footer.
- **A4 Formal Tax Invoice:** Full-page layout with company header, metadata box, detailed breakdown, payment stamp, and signature lines.
- **Zero Financial Re-execution:** Receipts can be reprinted infinitely from the archive without creating duplicate database transactions.
- **Clean `@media print` CSS:** Navigation chrome, buttons, and backgrounds are hidden during browser print.

### 💼 Expense Management
- Categorized shop overhead tracking: **Transportation, Electricity, Employee Salary, Maintenance, Rent, Loading / Unloading, and Other**.
- Automatically integrated into profit/loss reports.

### 📊 Reports & Financial Accounting
- **Profit & Loss Analysis:** Completed Sales Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
- **Cash Flow vs. Receivables:** Clear distinction between actual cash collected (downpayments + Khata payments) versus uncollected customer receivables (Udhar).
- **Cylinder-Wise Sales Breakdown:** Volume in KG and revenue per cylinder size.
- **One-Click CSV Export:** Export accounting summaries for spreadsheet analysis.

### 🔒 Enterprise Security & Admin Authentication
- Secure password hashing using **bcrypt**.
- **JWT (JSON Web Tokens)** stored in HTTP-only cookies and supported via `Authorization: Bearer` headers.
- **Rate limiting** on login attempts to protect against brute-force attacks.
- Input validation and NoSQL query injection sanitization.
- Complete **Audit Log** recording user actions, IP addresses, and timestamps.

---

## 3. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) | Zero build steps, instant load times, responsive design |
| **Backend** | Node.js 24.x, Express.js | RESTful API, serverless-compatible Express handler |
| **Database** | MongoDB Atlas (Free M0 Cluster) | Mongoose ODM, connection caching, atomic updates |
| **Authentication** | Bcrypt + JSON Web Tokens (JWT) | Secure HTTP-only cookies and Bearer tokens |
| **Deployment** | Vercel + GitHub | Serverless functions (`/api/(.*)`) + static asset routing |

---

## 4. Project Directory Structure

```
Al-Zahoor-Gas-Center/
│
├── package.json          # Node.js engine (24.x), scripts, and dependencies
├── vercel.json           # Vercel serverless routing configuration
├── index.js              # Express app, serverless DB connection, API mounting
├── admin.js              # Mongoose schemas, controllers, seed data, and routes
├── test.js               # Core unit tests (math, bcrypt, JWT, schemas)
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusion rules
├── README.md             # Complete system documentation
│
└── public/               # Frontend single-page application
    ├── index.html        # Modern dashboard layout, modals, and print containers
    ├── style.css         # Commercial ERP styling and @media print rules
    ├── script.js         # Modular ES6 controllers and real-time calculations
    │
    └── assets/
        ├── logo.png      # Brand logo
        └── favicon.ico   # Browser favicon
```

---

## 5. Local Installation & Running

### Prerequisites
- [Node.js 24.x](https://nodejs.org/)
- MongoDB Atlas account (free) or local MongoDB instance

### Step 1: Clone or Open Directory
```bash
cd "Al-Zahoor-Gas-Center"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your settings:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/al_zahoor_gas_center?retryWrites=true&w=majority
DB_NAME=al_zahoor_gas_center
JWT_SECRET=al_zahoor_gas_center_super_secret_jwt_key_2026_secure!

INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin123
INITIAL_ADMIN_NAME=Al Zahoor Manager
```

### Step 4: Run Tests
```bash
node test.js
```

### Step 5: Start the Application
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:5000
```

### Initial Login Credentials:
- **Username:** `admin`
- **Password:** `admin123`
*(You can update this immediately from Business Settings > Change Admin Password).*

---

## 6. MongoDB Atlas Setup Guide (Free M0 Cluster)

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create a Deployment** and choose **M0 Free Cluster**.
3. Under **Database Access**, create a database user:
   - Example Username: `alzahoor_admin`
   - Example Password: `<secure_password>`
4. Under **Network Access**, click **Add IP Address**:
   - For local development and Vercel serverless deployment, select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Under **Clusters**, click **Connect** > **Drivers** (Node.js):
   - Copy the connection string:
     ```
     mongodb+srv://alzahoor_admin:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
     ```
6. Paste this URI into your `.env` file as `MONGODB_URI` (ensure you replace `<password>` with your actual password and append the database name `/al_zahoor_gas_center`).

---

## 7. Vercel Deployment Instructions

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Al Zahoor Gas Center"
   git branch -M main
   git remote add origin https://github.com/<your-username>/al-zahoor-gas-center.git
   git push -u origin main
   ```

2. **Import into Vercel:**
   - Log in to [Vercel Dashboard](https://vercel.com/).
   - Click **Add New** > **Project**.
   - Select your GitHub repository `al-zahoor-gas-center`.

3. **Configure Environment Variables in Vercel:**
   Add the following variables under the **Environment Variables** section:
   - `MONGODB_URI` = `mongodb+srv://...`
   - `DB_NAME` = `al_zahoor_gas_center`
   - `JWT_SECRET` = `<your-secure-random-jwt-key>`
   - `NODE_ENV` = `production`
   - `INITIAL_ADMIN_USERNAME` = `admin`
   - `INITIAL_ADMIN_PASSWORD` = `admin123`

4. **Deploy:**
   - Click **Deploy**. Vercel will automatically compile serverless functions using `vercel.json` and serve the frontend from `public/`.
   - On the first request to `/api`, MongoDB Atlas will connect and seed initial settings, cylinder stock records, and default admin account.

---

## 8. Final Testing Checklist

- [x] Admin authentication, token management, and logout.
- [x] Rate limiting on login attempts.
- [x] Adding, editing, and soft-deactivating customers.
- [x] Duplicate customer mobile number alert and review.
- [x] Real-time calculations: Total KG, Total Amount, Remaining Udhar, New Customer Balance.
- [x] Full cash sales, partial payment sales, and credit (Udhar) sales.
- [x] Automatic cylinder stock decrement on sales completion.
- [x] Customer payment collection crediting the Khata ledger.
- [x] Customer Khata ledger rendering (Date, Description, Debit, Credit, Running Balance).
- [x] Receipt preview with instant 80mm thermal and A4 invoice toggle.
- [x] Non-destructive sale cancellation with stock and financial reversal.
- [x] Supplier stock purchases and adjustments (damage/leakage).
- [x] Shop expense recording and categorization.
- [x] Profit and Loss calculations (Revenue, COGS, Gross Profit, Expenses, Net Profit).
- [x] Date filtering (Today, Yesterday, 7 Days, This Month, Custom).
- [x] One-click CSV export of financial reports.
- [x] Responsive layout on desktop, tablet, and mobile.
- [x] `@media print` clean print formatting without navigation elements.
- [x] Vercel serverless deployment compatibility.

---

## 9. License & Business Information

**Business:** Al Zahoor Gas Center  
**Category:** LPG Refilling & Gas Services  
**System Version:** 1.0.0 Production  
**Support:** Built for professional commercial shop management.
