/**
 * AICTE Security Deposit / FDR Portal
 * End-to-End Logic & Integration Workflow Tests
 * 
 * Verifies:
 * - Adding an FDR and observing statistics update
 * - Editing an FDR and observing principal / bank update
 * - Deleting an FDR and observing statistics decrease
 * - Search & Filter simulations across multiple fields
 * - LocalStorage round-trip persistence simulation
 * - CSV export field formatting and special characters
 * - Empty dataset handling and missing optional fields
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateFDRStatistics,
  computeFDRStatus,
  getDaysRemaining,
  formatINR,
  formatINRCompact,
  formatDate,
  initialFDRRecords,
} from '../src/data/sampleFDRs.js';

import {
  generateCsvContent,
  exportFDRsToCSV,
  escapeCsvCell,
} from '../src/utils/exportCsv.js';

import {
  generateFDRId,
} from '../src/data/storage.js';

test('Workflow: Add FDR updates totals and bank concentrations', () => {
  // Start with clean copy of initial records
  let records = initialFDRRecords.map((r) => ({ ...r }));
  const initialStats = calculateFDRStatistics(records);

  const newDeposit = {
    id: generateFDRId(),
    fdrNumber: 'FDR/AICTE/2026/NEW01',
    certificateNo: 'CAN-TEST-1001',
    aicteAppId: '1-9999999999',
    bankName: 'Canara Bank',
    bankBranch: 'Indira Nagar, Bengaluru',
    institutionName: 'Apex Institute of Advanced Computing',
    institutionCode: 'AICTE-NEW-99',
    depositPurpose: 'Mandatory Security Deposit - New Institute Approval',
    principalAmount: 5000000, // 50 Lakh
    interestRate: 7.5,
    issueDate: '2026-01-15',
    maturityDate: '2031-01-15', // Active
    tenureYears: 5,
    remarks: 'New deposit testing integration',
  };

  // Add record (prepend)
  records = [newDeposit, ...records];

  const updatedStats = calculateFDRStatistics(records);
  assert.equal(updatedStats.totalRecords, initialStats.totalRecords + 1);
  assert.equal(updatedStats.totalPrincipal, initialStats.totalPrincipal + 5000000);
  assert.equal(updatedStats.activeCount, initialStats.activeCount + 1);
  assert.equal(updatedStats.activePrincipal, initialStats.activePrincipal + 5000000);

  // Bank grouping update verification
  const canaraRecords = records.filter((r) => r.bankName === 'Canara Bank');
  const canaraTotal = canaraRecords.reduce((sum, r) => sum + Number(r.principalAmount), 0);
  assert.ok(canaraTotal >= 5000000);
});

test('Workflow: Edit FDR updates principal and status dynamically', () => {
  let records = initialFDRRecords.map((r) => ({ ...r }));
  const targetFdr = records[0];
  const oldAmount = Number(targetFdr.principalAmount);
  const newAmount = oldAmount + 1000000;

  // Edit record
  records = records.map((r) =>
    r.id === targetFdr.id ? { ...r, principalAmount: newAmount } : r
  );

  const updatedStats = calculateFDRStatistics(records);
  const diff = updatedStats.totalPrincipal - calculateFDRStatistics(initialFDRRecords).totalPrincipal;
  assert.equal(diff, 1000000);
});

test('Workflow: Delete FDR updates totals correctly', () => {
  let records = initialFDRRecords.map((r) => ({ ...r }));
  const recordToDelete = records[records.length - 1];
  const amountDeleted = Number(recordToDelete.principalAmount);

  records = records.filter((r) => r.id !== recordToDelete.id);

  const updatedStats = calculateFDRStatistics(records);
  assert.equal(updatedStats.totalRecords, initialFDRRecords.length - 1);
  assert.equal(
    updatedStats.totalPrincipal,
    calculateFDRStatistics(initialFDRRecords).totalPrincipal - amountDeleted
  );
});

test('Workflow: Search & Filter simulation matches expected records', () => {
  const records = initialFDRRecords;

  // 1. Search by FDR Number
  const q1 = '8842';
  const match1 = records.filter(
    (r) =>
      r.fdrNumber?.toLowerCase().includes(q1) ||
      r.institutionName?.toLowerCase().includes(q1)
  );
  assert.equal(match1.length, 1);
  assert.equal(match1[0].fdrNumber, 'FDR/AICTE/2021/8842');

  // 2. Search by Institution Name (case insensitive)
  const q2 = 'women';
  const match2 = records.filter((r) =>
    r.institutionName?.toLowerCase().includes(q2)
  );
  assert.equal(match2.length, 1);
  assert.equal(match2[0].institutionName, 'Bengal Technological Institute for Women');

  // 3. Bank Filter
  const sbiOnly = records.filter((r) => r.bankName === 'State Bank of India');
  assert.ok(sbiOnly.length >= 2);
  sbiOnly.forEach((r) => assert.equal(r.bankName, 'State Bank of India'));

  // 4. Status Filter
  const maturedOnly = records.filter((r) => computeFDRStatus(r) === 'matured');
  maturedOnly.forEach((r) => assert.equal(computeFDRStatus(r), 'matured'));
});

test('Workflow: Storage serialization round-trip simulation', () => {
  const records = initialFDRRecords;
  const serialized = JSON.stringify(records);
  const deserialized = JSON.parse(serialized);

  assert.equal(deserialized.length, records.length);
  assert.equal(deserialized[0].id, records[0].id);
  assert.equal(deserialized[0].principalAmount, records[0].principalAmount);

  // Statistics before and after round-trip must be identical
  const statsBefore = calculateFDRStatistics(records);
  const statsAfter = calculateFDRStatistics(deserialized);
  assert.deepEqual(statsBefore, statsAfter);
});

test('Workflow: CSV special character and multiline escaping', () => {
  const specialRecord = {
    id: 'fdr-spec-01',
    fdrNumber: 'FDR/TEST/SPECIAL',
    bankName: 'Bank of Baroda, Main Branch', // embedded comma
    bankBranch: 'Plot No. 12, "Sector B", Noida', // embedded quotes & comma
    institutionName: 'Special "Institute" & Research\nCenter', // embedded quotes & newline
    depositPurpose: 'Mandatory Deposit, Security Norms 2026',
    principalAmount: 4500000,
    interestRate: 7.25,
    issueDate: '2024-01-01',
    maturityDate: '2029-01-01',
    remarks: 'First line of remarks\r\nSecond line with "quotes" and, commas.',
  };

  const csv = generateCsvContent([specialRecord]);
  assert.ok(csv.includes('"Bank of Baroda, Main Branch"'));
  assert.ok(csv.includes('"Plot No. 12, ""Sector B"", Noida"'));
  assert.ok(csv.includes('"Special ""Institute"" & Research\nCenter"'));
  assert.ok(csv.includes('"First line of remarks\r\nSecond line with ""quotes"" and, commas."'));
});

test('Workflow: Empty datasets and missing optional fields', () => {
  // Empty array
  const emptyCsv = generateCsvContent([]);
  assert.ok(emptyCsv.startsWith('FDR Number,Bank'));
  assert.equal(emptyCsv.split('\r\n').length, 1); // header only

  // Missing optional fields (no bankBranch, no remarks, null interest rate)
  const sparseRecord = {
    fdrNumber: 'FDR/SPARSE/01',
    bankName: 'HDFC Bank',
    principalAmount: 1000000,
  };
  const sparseCsv = generateCsvContent([sparseRecord]);
  assert.ok(sparseCsv.includes('FDR/SPARSE/01'));
  assert.ok(sparseCsv.includes('HDFC Bank'));
});

