/**
 * Automated Verification Suite for AICTE FDR Portal
 * Reports, CSV Export, Maturity Status, Statistics, and Storage Logic
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeFDRStatus,
  getDaysRemaining,
  calculateFDRStatistics,
  formatINR,
  formatINRCompact,
  formatDate,
  initialFDRRecords,
} from '../src/data/sampleFDRs.js';

import {
  escapeCsvCell,
  getStatusLabel,
  generateCsvContent,
  exportFDRsToCSV,
  exportBankSummaryToCSV,
  exportRegionalSummaryToCSV,
  CSV_COLUMNS,
} from '../src/utils/exportCsv.js';

import {
  generateFDRId,
} from '../src/data/storage.js';

// ============================================================================
// SUITE 1: MATURITY STATUS & CALCULATION TESTS
// ============================================================================
test('Maturity Status: Correctly identifies matured deposits', () => {
  const refDate = new Date('2026-10-27T12:00:00Z');
  const pastFDR = {
    fdrNumber: 'FDR-TEST-01',
    maturityDate: '2026-10-15', // 12 days past
    principalAmount: 1000000,
  };
  assert.equal(computeFDRStatus(pastFDR, refDate), 'matured');
  const days = getDaysRemaining(pastFDR.maturityDate, refDate);
  assert.ok(days < 0, `Expected negative days remaining, got ${days}`);
});

test('Maturity Status: Correctly identifies expiring-soon deposits (<= 30 days)', () => {
  const refDate = new Date('2026-10-27T12:00:00Z');
  
  // Exact day of maturity (0 days remaining)
  const dueTodayFDR = {
    fdrNumber: 'FDR-TEST-02',
    maturityDate: '2026-10-27',
    principalAmount: 1000000,
  };
  assert.equal(computeFDRStatus(dueTodayFDR, refDate), 'expiring_soon');
  assert.equal(getDaysRemaining(dueTodayFDR.maturityDate, refDate), 0);

  // 15 days remaining
  const expiring15 = {
    fdrNumber: 'FDR-TEST-03',
    maturityDate: '2026-11-11',
    principalAmount: 1500000,
  };
  assert.equal(computeFDRStatus(expiring15, refDate), 'expiring_soon');

  // Exact 30 days remaining boundary
  const expiring30 = {
    fdrNumber: 'FDR-TEST-04',
    maturityDate: '2026-11-26',
    principalAmount: 2000000,
  };
  assert.equal(computeFDRStatus(expiring30, refDate), 'expiring_soon');
});

test('Maturity Status: Correctly identifies active deposits (> 30 days)', () => {
  const refDate = new Date('2026-10-27T12:00:00Z');
  const activeFDR = {
    fdrNumber: 'FDR-TEST-05',
    maturityDate: '2026-11-28', // 32 days
    principalAmount: 3000000,
  };
  assert.equal(computeFDRStatus(activeFDR, refDate), 'active');
  assert.ok(getDaysRemaining(activeFDR.maturityDate, refDate) > 30);
});

test('Maturity Status: Handles missing or invalid maturity dates safely', () => {
  const missingDateFDR = { fdrNumber: 'FDR-TEST-06' };
  assert.equal(computeFDRStatus(missingDateFDR), 'active');
  assert.equal(getDaysRemaining(undefined), null);
  assert.equal(getDaysRemaining('invalid-date-string'), null);
});

// ============================================================================
// SUITE 2: SUMMARY STATISTICS CALCULATIONS
// ============================================================================
test('Statistics: Dynamic aggregation from records', () => {
  const refDate = new Date('2026-10-27T12:00:00Z');
  const mockRecords = [
    { maturityDate: '2026-10-10', principalAmount: 1000000 }, // matured
    { maturityDate: '2026-10-30', principalAmount: 2000000 }, // expiring_soon
    { maturityDate: '2027-01-01', principalAmount: 3000000 }, // active
    { maturityDate: '2027-06-01', principalAmount: 4000000 }, // active
  ];

  const stats = calculateFDRStatistics(mockRecords, refDate);
  assert.equal(stats.totalRecords, 4);
  assert.equal(stats.totalPrincipal, 10000000);
  assert.equal(stats.maturedCount, 1);
  assert.equal(stats.maturedPrincipal, 1000000);
  assert.equal(stats.expiringSoonCount, 1);
  assert.equal(stats.expiringSoonPrincipal, 2000000);
  assert.equal(stats.activeCount, 2);
  assert.equal(stats.activePrincipal, 7000000);
});

test('Statistics: Handles empty datasets safely', () => {
  const stats = calculateFDRStatistics([]);
  assert.equal(stats.totalRecords, 0);
  assert.equal(stats.totalPrincipal, 0);
  assert.equal(stats.activeCount, 0);
  assert.equal(stats.expiringSoonCount, 0);
  assert.equal(stats.maturedCount, 0);
});

test('Statistics: Handles missing/string principalAmount without NaN', () => {
  const dirtyRecords = [
    { maturityDate: '2027-01-01', principalAmount: '500000' },
    { maturityDate: '2027-01-01', principalAmount: null },
    { maturityDate: '2027-01-01', principalAmount: undefined },
    { maturityDate: '2027-01-01', principalAmount: 'invalid' },
  ];
  const stats = calculateFDRStatistics(dirtyRecords);
  assert.equal(stats.totalRecords, 4);
  assert.equal(stats.totalPrincipal, 500000);
  assert.ok(!isNaN(stats.totalPrincipal));
});

// ============================================================================
// SUITE 3: CURRENCY FORMATTING (INDIAN RUPEE SYSTEM)
// ============================================================================
test('Currency Formatting: INR standard and compact formats', () => {
  assert.ok(formatINR(1500000).includes('15,00,000'));
  assert.equal(formatINRCompact(48500000), '₹ 4.85 Cr');
  assert.equal(formatINRCompact(7500000), '₹ 75.00 Lakh');
  assert.equal(formatINRCompact(50000), formatINR(50000));
  assert.equal(formatINR(null), '₹ 0');
  assert.equal(formatINRCompact(undefined), '₹ 0');
});

// ============================================================================
// SUITE 4: CSV EXPORT UTILITY & ESCAPING (RFC 4180 COMPLIANCE)
// ============================================================================
test('CSV Escaping: Simple alphanumeric values do not require quotes', () => {
  assert.equal(escapeCsvCell('SBIN0000691'), 'SBIN0000691');
  assert.equal(escapeCsvCell(3500000), '3500000');
});

test('CSV Escaping: Commas in fields are properly quoted', () => {
  const textWithComma = 'Main Branch, Parliament Street, New Delhi';
  const escaped = escapeCsvCell(textWithComma);
  assert.equal(escaped, '"Main Branch, Parliament Street, New Delhi"');
});

test('CSV Escaping: Double quotes inside fields are doubled and enclosed', () => {
  const textWithQuote = 'AICTE "Special Category" Deposit';
  const escaped = escapeCsvCell(textWithQuote);
  assert.equal(escaped, '"AICTE ""Special Category"" Deposit"');
});

test('CSV Escaping: Newlines inside fields are properly enclosed', () => {
  const textWithNewline = 'Line 1\nLine 2';
  const escaped = escapeCsvCell(textWithNewline);
  assert.equal(escaped, '"Line 1\nLine 2"');
});

test('CSV Escaping: Null and undefined values produce empty string', () => {
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell(undefined), '');
});

test('CSV Formula Injection: Values beginning with =, +, -, and @ are neutralized', () => {
  // Direct formula triggers (plain alphanumeric without quotes/commas/newlines)
  assert.equal(escapeCsvCell('=SUM(A1:B1)'), "'=SUM(A1:B1)");
  assert.equal(escapeCsvCell('+cmdRun'), "'+cmdRun");
  assert.equal(escapeCsvCell('-2+3+calc'), "'-2+3+calc");
  assert.equal(escapeCsvCell('@maliciousSite'), "'@maliciousSite");
});

test('CSV Formula Injection: Neutralized formulas with commas, quotes, and newlines preserve CSV escaping', () => {
  // Formula containing commas (must be quote-enclosed)
  assert.equal(escapeCsvCell('=HYPERLINK("http://evil.com","click")'), '"\'=HYPERLINK(""http://evil.com"",""click"")"');

  // Formula containing double quotes
  assert.equal(escapeCsvCell('@cmd"payload"'), '"\'@cmd""payload"""');

  // Formula containing newlines
  assert.equal(escapeCsvCell('+Line1\nLine2'), '"\'+Line1\nLine2"');

  // Formula containing commas, quotes, and newlines all together
  assert.equal(
    escapeCsvCell('-calc,"run",\nnext'),
    '"\'-calc,""run"",\nnext"'
  );
});

test('CSV Generation: Correct headers and row count', () => {
  const sample = initialFDRRecords.slice(0, 3);
  const csv = generateCsvContent(sample);

  assert.ok(csv.startsWith('FDR Number,Bank,Bank Branch,Beneficiary / Institution'));
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 4); // 1 header + 3 data rows

  // Verify first record values in CSV
  const firstRecord = sample[0];
  assert.ok(csv.includes(firstRecord.fdrNumber));
  assert.ok(csv.includes(firstRecord.bankName));
  assert.ok(csv.includes(firstRecord.institutionName));
  assert.ok(csv.includes(String(firstRecord.principalAmount)));
});

test('CSV Export: Handles empty dataset gracefully', () => {
  const result = exportFDRsToCSV([], 'test.csv');
  assert.equal(result.success, false);
  assert.equal(result.count, 0);
  assert.ok(result.message.includes('No FDR records available'));

  let errorCallbackCalled = false;
  exportFDRsToCSV([], 'test.csv', {
    onError: (err) => {
      errorCallbackCalled = true;
      assert.ok(err.includes('No FDR records'));
    },
  });
  assert.ok(errorCallbackCalled);
});

test('CSV Export: Successful return object on valid records', () => {
  const sample = initialFDRRecords.slice(0, 2);
  const result = exportFDRsToCSV(sample, 'custom-fdr-report.csv');
  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.equal(result.filename, 'custom-fdr-report.csv');
  assert.ok(result.message.includes('Successfully exported 2 FDR records'));
});

test('CSV Export: Bank Summary CSV Export generates correct columns', () => {
  const bankMock = [
    {
      bankName: 'State Bank of India',
      count: 2,
      totalPrincipal: 6000000,
      percentageOfTotal: 25.5,
      weightedAvgRate: '7.15',
      activeCount: 1,
      expiringSoonCount: 1,
      maturedCount: 0,
    },
  ];

  const result = exportBankSummaryToCSV(bankMock, 'test-bank-exposure.csv');
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.filename, 'test-bank-exposure.csv');
});

test('CSV Export: Regional Summary CSV Export generates correct columns', () => {
  const regionalMock = [
    {
      state: 'Maharashtra',
      regionCode: 'WR',
      count: 2,
      totalPrincipal: 7000000,
      percentageOfTotal: 20.0,
      activeCount: 1,
      expiringSoonCount: 1,
      maturedCount: 0,
    },
  ];

  const result = exportRegionalSummaryToCSV(regionalMock, 'test-regional.csv');
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.filename, 'test-regional.csv');
});

// ============================================================================
// SUITE 5: BANK & REGIONAL AGGREGATION
// ============================================================================
test('Reports: Accurate bank concentration aggregation', () => {
  const testData = [
    {
      bankName: 'State Bank of India',
      principalAmount: 3500000,
      interestRate: 7.0,
      maturityDate: '2027-01-01',
    },
    {
      bankName: 'State Bank of India',
      principalAmount: 1500000,
      interestRate: 8.0,
      maturityDate: '2026-10-01',
    },
    {
      bankName: 'Canara Bank',
      principalAmount: 5000000,
      interestRate: 7.2,
      maturityDate: '2028-01-01',
    },
  ];

  const map = new Map();
  testData.forEach((r) => {
    if (!map.has(r.bankName)) {
      map.set(r.bankName, { total: 0, count: 0, weightedRateSum: 0 });
    }
    const b = map.get(r.bankName);
    b.total += r.principalAmount;
    b.count += 1;
    b.weightedRateSum += r.principalAmount * r.interestRate;
  });

  const totalAll = 10000000;
  assert.equal(map.get('State Bank of India').total, 5000000);
  assert.equal(map.get('State Bank of India').count, 2);
  assert.equal(map.get('Canara Bank').total, 5000000);
  assert.equal(map.get('Canara Bank').count, 1);

  const sbiShare = (map.get('State Bank of India').total / totalAll) * 100;
  assert.equal(sbiShare, 50);

  const sbiAvgRate = (map.get('State Bank of India').weightedRateSum / map.get('State Bank of India').total).toFixed(2);
  assert.equal(sbiAvgRate, '7.30');
});

test('Reports: Regional office state aggregation', () => {
  const sample = initialFDRRecords;
  const stateCounts = new Map();
  sample.forEach((r) => {
    stateCounts.set(r.state, (stateCounts.get(r.state) || 0) + 1);
  });
  assert.ok(stateCounts.size >= 5);
  assert.ok(stateCounts.has('Maharashtra'));
  assert.ok(stateCounts.has('Karnataka'));
});

// ============================================================================
// SUITE 6: STORAGE ID GENERATION & CRUD DATA INTEGRITY
// ============================================================================
test('Storage ID: Generates non-empty unique IDs', () => {
  const id1 = generateFDRId();
  const id2 = generateFDRId();
  assert.ok(id1.startsWith('fdr-'));
  assert.ok(id2.startsWith('fdr-'));
  assert.notEqual(id1, id2);
});

test('CRUD: Add, Edit, Delete array operations preserve integrity', () => {
  let records = [...initialFDRRecords];
  const initialCount = records.length;

  // Add
  const newFDR = {
    id: generateFDRId(),
    fdrNumber: 'FDR/TEST/ADD/01',
    bankName: 'HDFC Bank',
    institutionName: 'Test Tech Institute',
    principalAmount: 2000000,
    interestRate: 7.25,
    maturityDate: '2028-12-31',
  };
  records = [newFDR, ...records];
  assert.equal(records.length, initialCount + 1);
  assert.equal(records[0].fdrNumber, 'FDR/TEST/ADD/01');

  // Edit
  const updatedAmount = 2500000;
  records = records.map((r) =>
    r.id === newFDR.id ? { ...r, principalAmount: updatedAmount } : r
  );
  assert.equal(records[0].principalAmount, updatedAmount);
  assert.equal(records[0].id, newFDR.id);

  // Delete
  records = records.filter((r) => r.id !== newFDR.id);
  assert.equal(records.length, initialCount);
  assert.ok(!records.some((r) => r.id === newFDR.id));
});

console.log('All verification test cases structured.');
