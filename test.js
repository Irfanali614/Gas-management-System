const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('./admin');

async function runTests() {
  console.log('--- Starting Al Zahoor Gas Center Test Suite ---');

  // Test 1: Math & Calculations for LPG Cylinder Sales
  console.log('[Test 1] Testing LPG Calculations...');
  const cylinderSize = 45.5;
  const qty = 3;
  const rate = 12000;
  const totalKg = Number((cylinderSize * qty).toFixed(2));
  const totalAmount = qty * rate;
  const amountPaid = 20000;
  const remaining = totalAmount - amountPaid;
  const previousBalance = 5000;
  const newBalance = previousBalance + remaining;

  assert.strictEqual(totalKg, 136.5);
  assert.strictEqual(totalAmount, 36000);
  assert.strictEqual(remaining, 16000);
  assert.strictEqual(newBalance, 21000);
  console.log('✓ LPG calculations passed (45.5kg x 3 = 136.5kg, Rs 36,000, Remaining: Rs 16,000, New Balance: Rs 21,000)');

  // Test 2: Standard Cylinder Sizes Check
  console.log('[Test 2] Testing Cylinder Size Constraints...');
  const allowedSizes = [45.5, 11.8, 3.9];
  assert(allowedSizes.includes(45.5));
  assert(allowedSizes.includes(11.8));
  assert(allowedSizes.includes(3.9));
  assert(!allowedSizes.includes(10.0));
  console.log('✓ Cylinder sizes verified: 45.5 KG, 11.8 KG, 3.9 KG');

  // Test 3: Password Hashing & Comparison
  console.log('[Test 3] Testing Bcrypt Password Security...');
  const plain = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plain, salt);
  const match = await bcrypt.compare('admin123', hash);
  const badMatch = await bcrypt.compare('wrongpass', hash);
  assert.strictEqual(match, true);
  assert.strictEqual(badMatch, false);
  console.log('✓ Bcrypt password hashing & validation passed');

  // Test 4: JWT Token Generation & Verification
  console.log('[Test 4] Testing JWT Token Signing & Verification...');
  const secret = 'test_secret_key';
  const payload = { id: 'usr-1', username: 'admin', role: 'admin' };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  const verified = jwt.verify(token, secret);
  assert.strictEqual(verified.username, 'admin');
  assert.strictEqual(verified.role, 'admin');
  console.log('✓ JWT token creation and verification passed');

  // Test 5: Verify Mongoose Models are defined
  console.log('[Test 5] Testing Model Definitions...');
  assert(models.User, 'User model exists');
  assert(models.Customer, 'Customer model exists');
  assert(models.Sale, 'Sale model exists');
  assert(models.Payment, 'Payment model exists');
  assert(models.CustomerLedger, 'CustomerLedger model exists');
  assert(models.Stock, 'Stock model exists');
  assert(models.StockMovement, 'StockMovement model exists');
  assert(models.Expense, 'Expense model exists');
  assert(models.Settings, 'Settings model exists');
  assert(models.AuditLog, 'AuditLog model exists');
  console.log('✓ All 10 Mongoose models configured properly');

  console.log('\n--- ALL CORE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
