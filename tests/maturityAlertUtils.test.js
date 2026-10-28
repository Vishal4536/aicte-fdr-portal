/**
 * Unit & Integration Tests for AICTE FDR Maturity Alert Utilities
 * Executed with Node.js built-in test runner: `node --test tests/maturityAlertUtils.test.js`
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLocalDateComponents,
  getSafeCalendarDaysRemaining,
  getMaturityCategory,
  isMaturityAlert,
  calculateMaturitySummary,
  filterMaturityRecords,
  getMaturityBadgeInfo,
  MATURITY_CATEGORIES,
  URGENCY_FILTERS,
} from '../src/utils/maturityAlertUtils.js';

describe('AICTE FDR Maturity Alert Utilities Tests', () => {
  // Fixed reference date: 2026-10-27 (Tuesday)
  const REFERENCE_DATE = '2026-10-27';

  describe('parseLocalDateComponents()', () => {
    test('safely parses YYYY-MM-DD string into local calendar components', () => {
      const res = parseLocalDateComponents('2026-10-27');
      assert.deepEqual(res, { year: 2026, month: 9, day: 27 }); // month 9 = October
    });

    test('safely parses Date object', () => {
      const d = new Date(2026, 9, 27, 15, 30);
      const res = parseLocalDateComponents(d);
      assert.deepEqual(res, { year: 2026, month: 9, day: 27 });
    });

    test('safely parses epoch milliseconds timestamp', () => {
      const d = new Date(2026, 9, 27);
      const res = parseLocalDateComponents(d.getTime());
      assert.deepEqual(res, { year: 2026, month: 9, day: 27 });
    });

    test('returns null for null, empty, or undefined', () => {
      assert.equal(parseLocalDateComponents(null), null);
      assert.equal(parseLocalDateComponents(undefined), null);
      assert.equal(parseLocalDateComponents(''), null);
      assert.equal(parseLocalDateComponents('   '), null);
    });

    test('returns null for invalid dates like "not-a-date" or "2026-02-31"', () => {
      assert.equal(parseLocalDateComponents('not-a-date'), null);
      assert.equal(parseLocalDateComponents('2026-02-31'), null); // Feb 31 does not exist
      assert.equal(parseLocalDateComponents('2026-13-01'), null); // month 13 does not exist
    });
  });

  describe('getSafeCalendarDaysRemaining() - Timezone-safe calculations', () => {
    test('calculates record maturing TODAY as 0 days', () => {
      const days = getSafeCalendarDaysRemaining('2026-10-27', REFERENCE_DATE);
      assert.equal(days, 0);
    });

    test('calculates record that matured YESTERDAY as -1 day', () => {
      const days = getSafeCalendarDaysRemaining('2026-10-26', REFERENCE_DATE);
      assert.equal(days, -1);
    });

    test('calculates record that matured 14 days ago as -14 days', () => {
      const days = getSafeCalendarDaysRemaining('2026-10-13', REFERENCE_DATE);
      assert.equal(days, -14);
    });

    test('calculates record maturing in exactly 7 days', () => {
      // 2026-10-27 + 7 days = 2026-11-03
      const days = getSafeCalendarDaysRemaining('2026-11-03', REFERENCE_DATE);
      assert.equal(days, 7);
    });

    test('calculates record maturing in exactly 15 days', () => {
      // 2026-10-27 + 15 days = 2026-11-11
      const days = getSafeCalendarDaysRemaining('2026-11-11', REFERENCE_DATE);
      assert.equal(days, 15);
    });

    test('calculates record maturing in exactly 30 days', () => {
      // 2026-10-27 + 30 days = 2026-11-26
      const days = getSafeCalendarDaysRemaining('2026-11-26', REFERENCE_DATE);
      assert.equal(days, 30);
    });

    test('calculates record maturing in 31 days (more than 30 days away)', () => {
      // 2026-10-27 + 31 days = 2026-11-27
      const days = getSafeCalendarDaysRemaining('2026-11-27', REFERENCE_DATE);
      assert.equal(days, 31);
    });

    test('handles invalid date strings gracefully by returning null', () => {
      assert.equal(getSafeCalendarDaysRemaining('invalid-date', REFERENCE_DATE), null);
      assert.equal(getSafeCalendarDaysRemaining(null, REFERENCE_DATE), null);
      assert.equal(getSafeCalendarDaysRemaining('', REFERENCE_DATE), null);
    });
  });

  describe('getMaturityCategory() - Mutually Exclusive Categorization', () => {
    test('categorizes record that matured yesterday as "matured"', () => {
      const fdr = { maturityDate: '2026-10-26' };
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.MATURED);
    });

    test('categorizes record maturing today (0 days) as "due_7_days"', () => {
      const fdr = { maturityDate: '2026-10-27' };
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_7_DAYS);
    });

    test('categorizes record maturing in 7 days as "due_7_days"', () => {
      const fdr = { maturityDate: '2026-11-03' };
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_7_DAYS);
    });

    test('categorizes record maturing in 8 days as "due_15_days"', () => {
      const fdr = { maturityDate: '2026-11-04' }; // 8 days away
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_15_DAYS);
    });

    test('categorizes record maturing in 15 days as "due_15_days"', () => {
      const fdr = { maturityDate: '2026-11-11' }; // 15 days away
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_15_DAYS);
    });

    test('categorizes record maturing in 16 days as "due_30_days"', () => {
      const fdr = { maturityDate: '2026-11-12' }; // 16 days away
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_30_DAYS);
    });

    test('categorizes record maturing in 30 days as "due_30_days"', () => {
      const fdr = { maturityDate: '2026-11-26' }; // 30 days away
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.DUE_30_DAYS);
    });

    test('categorizes record maturing in 31+ days as "active"', () => {
      const fdr = { maturityDate: '2026-11-27' }; // 31 days away
      assert.equal(getMaturityCategory(fdr, REFERENCE_DATE), MATURITY_CATEGORIES.ACTIVE);
    });

    test('categorizes record with missing or invalid date as "active"', () => {
      assert.equal(getMaturityCategory({ maturityDate: null }, REFERENCE_DATE), MATURITY_CATEGORIES.ACTIVE);
      assert.equal(getMaturityCategory({ maturityDate: 'invalid' }, REFERENCE_DATE), MATURITY_CATEGORIES.ACTIVE);
    });
  });

  describe('calculateMaturitySummary() - No Double-Counting Guarantee', () => {
    test('accurately computes mutually exclusive counts where sum === totalRecords', () => {
      const sampleSet = [
        { id: '1', maturityDate: '2026-10-20', principalAmount: 100000 }, // Matured (-7d)
        { id: '2', maturityDate: '2026-10-26', principalAmount: 200000 }, // Matured (-1d)
        { id: '3', maturityDate: '2026-10-27', principalAmount: 300000 }, // Due Today (0d) -> due_7_days
        { id: '4', maturityDate: '2026-11-03', principalAmount: 400000 }, // Due in 7d -> due_7_days
        { id: '5', maturityDate: '2026-11-07', principalAmount: 500000 }, // Due in 11d -> due_15_days
        { id: '6', maturityDate: '2026-11-11', principalAmount: 600000 }, // Due in 15d -> due_15_days
        { id: '7', maturityDate: '2026-11-20', principalAmount: 700000 }, // Due in 24d -> due_30_days
        { id: '8', maturityDate: '2026-11-26', principalAmount: 800000 }, // Due in 30d -> due_30_days
        { id: '9', maturityDate: '2026-11-27', principalAmount: 900000 }, // Due in 31d -> active
        { id: '10', maturityDate: '2027-10-27', principalAmount: 1000000 }, // Active (1 yr) -> active
      ];

      const summary = calculateMaturitySummary(sampleSet, REFERENCE_DATE);

      // Verify Total Records
      assert.equal(summary.totalRecords, 10);
      assert.equal(summary.totalPrincipal, 5500000);

      // Verify Mutually Exclusive Counts
      assert.equal(summary.matured.count, 2);
      assert.equal(summary.matured.totalPrincipal, 300000);

      assert.equal(summary.due7Days.count, 2);
      assert.equal(summary.due7Days.totalPrincipal, 700000);

      assert.equal(summary.due15Days.count, 2);
      assert.equal(summary.due15Days.totalPrincipal, 1100000);

      assert.equal(summary.due30Days.count, 2);
      assert.equal(summary.due30Days.totalPrincipal, 1500000);

      assert.equal(summary.active.count, 2);
      assert.equal(summary.active.totalPrincipal, 1900000);

      // CRITICAL: Verify NO DOUBLE-COUNTING!
      const sumOfExclusiveBuckets =
        summary.matured.count +
        summary.due7Days.count +
        summary.due15Days.count +
        summary.due30Days.count +
        summary.active.count;
      assert.equal(sumOfExclusiveBuckets, summary.totalRecords, 'Every record must belong to exactly one bucket');

      // Verify total alerts (Matured + <= 30 Days)
      assert.equal(summary.totalAlertsCount, 8);
      assert.equal(summary.totalAlertsPrincipal, 3600000);

      // Verify cumulative groupings
      assert.equal(summary.cumulative.within7Days, 2);
      assert.equal(summary.cumulative.within15Days, 4); // 2 (due7) + 2 (due15)
      assert.equal(summary.cumulative.within30Days, 6); // 2 (due7) + 2 (due15) + 2 (due30)
    });

    test('handles empty datasets safely without crashing', () => {
      const summary = calculateMaturitySummary([], REFERENCE_DATE);
      assert.equal(summary.totalRecords, 0);
      assert.equal(summary.totalPrincipal, 0);
      assert.equal(summary.totalAlertsCount, 0);
      assert.equal(summary.matured.count, 0);
      assert.equal(summary.due7Days.count, 0);
      assert.equal(summary.due15Days.count, 0);
      assert.equal(summary.due30Days.count, 0);
      assert.equal(summary.active.count, 0);
    });

    test('handles null or non-array dataset safely', () => {
      const summary = calculateMaturitySummary(null, REFERENCE_DATE);
      assert.equal(summary.totalRecords, 0);
    });
  });

  describe('filterMaturityRecords() - Urgency, Bank, and Query Filtering', () => {
    const records = [
      { id: '1', fdrNumber: 'FDR-001', bankName: 'State Bank of India', maturityDate: '2026-10-20', institutionName: 'Alpha College' }, // matured
      { id: '2', fdrNumber: 'FDR-002', bankName: 'Punjab National Bank', maturityDate: '2026-10-29', institutionName: 'Beta Institute' }, // due_7 (2 days)
      { id: '3', fdrNumber: 'FDR-003', bankName: 'State Bank of India', maturityDate: '2026-11-06', institutionName: 'Gamma Academy' }, // due_15 (10 days)
      { id: '4', fdrNumber: 'FDR-004', bankName: 'HDFC Bank', maturityDate: '2026-11-20', institutionName: 'Delta University' }, // due_30 (24 days)
      { id: '5', fdrNumber: 'FDR-005', bankName: 'Canara Bank', maturityDate: '2026-12-15', institutionName: 'Epsilon College' }, // active (49 days)
    ];

    test('default URGENCY_FILTERS.ALL_ALERTS returns only matured and <= 30 days records', () => {
      const filtered = filterMaturityRecords(records, { urgency: URGENCY_FILTERS.ALL_ALERTS }, REFERENCE_DATE);
      assert.equal(filtered.length, 4);
      assert.ok(!filtered.find((r) => r.id === '5'), 'Active record must not appear in ALL_ALERTS');
    });

    test('filters strictly by MATURED', () => {
      const filtered = filterMaturityRecords(records, { urgency: URGENCY_FILTERS.MATURED }, REFERENCE_DATE);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '1');
    });

    test('filters strictly by DUE_7', () => {
      const filtered = filterMaturityRecords(records, { urgency: URGENCY_FILTERS.DUE_7 }, REFERENCE_DATE);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '2');
    });

    test('filters by Bank name', () => {
      const filtered = filterMaturityRecords(
        records,
        { urgency: URGENCY_FILTERS.ALL, bank: 'State Bank of India' },
        REFERENCE_DATE
      );
      assert.equal(filtered.length, 2);
      assert.ok(filtered.every((r) => r.bankName === 'State Bank of India'));
    });

    test('filters by Search query across institution or FDR number', () => {
      const filtered = filterMaturityRecords(
        records,
        { urgency: URGENCY_FILTERS.ALL, query: 'beta' },
        REFERENCE_DATE
      );
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '2');
    });

    test('returns empty array when no records match', () => {
      const filtered = filterMaturityRecords(
        records,
        { urgency: URGENCY_FILTERS.MATURED, bank: 'HDFC Bank' },
        REFERENCE_DATE
      );
      assert.equal(filtered.length, 0);
    });
  });

  describe('getMaturityBadgeInfo()', () => {
    test('returns correct badge configuration for matured', () => {
      const fdr = { maturityDate: '2026-10-25' }; // 2 days ago
      const badge = getMaturityBadgeInfo(fdr, REFERENCE_DATE);
      assert.equal(badge.label, 'Matured');
      assert.equal(badge.daysRemaining, -2);
      assert.equal(badge.badgeClass, 'badge-status-matured');
      assert.equal(badge.category, MATURITY_CATEGORIES.MATURED);
    });

    test('returns correct badge for maturing today', () => {
      const fdr = { maturityDate: '2026-10-27' };
      const badge = getMaturityBadgeInfo(fdr, REFERENCE_DATE);
      assert.equal(badge.label, 'Maturing Today');
      assert.equal(badge.daysRemaining, 0);
      assert.equal(badge.badgeClass, 'badge-status-due-7');
    });

    test('returns correct badge for missing date', () => {
      const badge = getMaturityBadgeInfo({ maturityDate: null }, REFERENCE_DATE);
      assert.equal(badge.label, 'Date Pending');
      assert.equal(badge.daysRemaining, null);
    });
  });

  describe('Integration with sample dataset initialFDRRecords', () => {
    test('accurately processes initialFDRRecords with zero double-counting', async () => {
      const { initialFDRRecords } = await import('../src/data/sampleFDRs.js');
      assert.ok(initialFDRRecords.length > 0, 'initialFDRRecords should have sample records');

      const summary = calculateMaturitySummary(initialFDRRecords);
      assert.equal(summary.totalRecords, initialFDRRecords.length);

      // Verify mathematical identity: sum of exclusive categories === total records
      const sumCategories =
        summary.matured.count +
        summary.due7Days.count +
        summary.due15Days.count +
        summary.due30Days.count +
        summary.active.count;
      assert.equal(sumCategories, initialFDRRecords.length, 'Every sample record must be in exactly 1 category');

      // Verify total alerts count equals matured + due <= 30 days
      const expectedAlerts =
        summary.matured.count +
        summary.due7Days.count +
        summary.due15Days.count +
        summary.due30Days.count;
      assert.equal(summary.totalAlertsCount, expectedAlerts);
    });
  });
});

