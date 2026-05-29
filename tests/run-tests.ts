import { test } from 'node:test';
import assert from 'node:assert';
import { FraudDetectionEngine } from '../server/services/fraud';
import { loadDatabase, saveDatabase } from '../server/db';

test('Apex SACCO Digital Suite - Integrity Verification Testing', async (t) => {
  
  await t.test('Fraud Detection Gate: Velocity Guard Test', () => {
    // Attempt transaction with high velocity/repetition
    const firstCheck = FraudDetectionEngine.evaluateTransaction({
      memberId: 'SACCO-MOCK-TEST-001',
      type: 'Withdrawal',
      amount: 120000, // Large withdrawal triggering velocity restrictions
      paymentMethod: 'Bank Transfer'
    });

    assert.strictEqual(firstCheck.blockAction, true, 'First huge withdrawal above threshold must block.');
    assert.ok(firstCheck.reasons.some(r => r.includes('exceeds safe withdrawal limit')), 'Reason list must include withdrawal limit block');
  });

  await t.test('Fraud Detection Gate: Duplicate Protection Guard Test', () => {
    // Fire exact identical transaction requests in sub-second timelines
    const firstCall = FraudDetectionEngine.evaluateTransaction({
      memberId: 'SACCO-MOCK-TEST-002',
      type: 'Deposit',
      amount: 2500,
      paymentMethod: 'M-Pesa'
    });

    const secondCall = FraudDetectionEngine.evaluateTransaction({
      memberId: 'SACCO-MOCK-TEST-002',
      type: 'Deposit',
      amount: 2500,
      paymentMethod: 'M-Pesa'
    });

    assert.strictEqual(firstCall.blockAction, false, 'Initial deposit request must succeed.');
    assert.strictEqual(secondCall.blockAction, true, 'Immediate identical request must be flagged as duplicate.');
    assert.ok(secondCall.reasons.some(r => r.includes('Duplicate transaction request')), 'Reason list must state duplicate block');
  });

  await t.test('Database Local Schema Setup Verification', () => {
    const db = loadDatabase();
    assert.ok(db.members, 'Database must have a members array ledger.');
    assert.ok(db.transactions, 'Database must have a transactions array ledger.');
    assert.ok(db.users, 'Database must have an authenticated system user list.');
  });
});
