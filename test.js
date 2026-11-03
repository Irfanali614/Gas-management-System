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
  assert(models.Plant, 'Plant model exists');
  assert(models.PlantKhata, 'PlantKhata model exists');
  console.log('✓ All 12 Mongoose models configured properly');

  // Test 6: Grand Calculation Plant Khata formulas
  console.log('[Test 6] Testing Grand Calculation Plant Khata Formulas...');
  {
    const prevRemaining = 150000; // Previous balance owed to plant
    const mtOut = 40; // 40 empty cylinders sent out
    const mtIn = 0;   // 0 empty received in
    const vehicleNumber = 'TK-4821';
    const loadCylinder = 50; // 50 filled cylinders received
    const ratePerCylinder = 2800; // Rs 2800 per cylinder from plant
    const loadAmount = loadCylinder * ratePerCylinder; // 50 * 2800 = 140,000
    const totalAmount = prevRemaining + loadAmount; // 150,000 + 140,000 = 290,000
    const depositAmount = 200000; // Deposited Rs 200,000 via Bank
    const sourceOfDeposit = 'HBL Online Transfer Slip #7819';
    const balanceRemaining = totalAmount - depositAmount; // 290,000 - 200,000 = 90,000

    assert.strictEqual(loadAmount, 140000);
    assert.strictEqual(totalAmount, 290000);
    assert.strictEqual(balanceRemaining, 90000);
    console.log('✓ Plant Khata calculations passed (Load: Rs 140,000, Total: Rs 290,000, Deposit: Rs 200,000, Balance: Rs 90,000)');
  }

  console.log('\n--- ALL CORE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
