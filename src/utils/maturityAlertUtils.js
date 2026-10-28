/**
 * AICTE Security Deposit / FDR Portal - Maturity Alert Utilities
 * 
 * Provides timezone-safe date difference calculations, mutually exclusive categorization,
 * urgency scoring, and summary aggregation for FDR maturity surveillance.
 */

import { computeFDRStatus } from '../data/sampleFDRs.js';

// Mutually exclusive category identifiers
export const MATURITY_CATEGORIES = {
  MATURED: 'matured',         // Days remaining < 0 (Past maturity date)
  DUE_7_DAYS: 'due_7_days',   // 0 <= Days remaining <= 7 (Critical urgent action)
  DUE_15_DAYS: 'due_15_days', // 8 <= Days remaining <= 15 (High priority)
  DUE_30_DAYS: 'due_30_days', // 16 <= Days remaining <= 30 (Upcoming within regulatory threshold)
  ACTIVE: 'active',           // Days remaining > 30 (Compliant & standard active)
};

// Filter keys for UI navigation
export const URGENCY_FILTERS = {
  ALL_ALERTS: 'all_alerts',   // Matured + due within 30 days
  MATURED: 'matured',         // Days < 0
  DUE_7: 'due_7',             // Days 0..7
  DUE_15: 'due_15',           // Days 8..15 (or cumulative <= 15)
  DUE_30: 'due_30',           // Days 16..30 (or cumulative <= 30)
  ACTIVE: 'active',           // Days > 30
  ALL: 'all',                 // All records
};

/**
 * Parses any date input safely into local calendar date components { year, month, day }.
 * Month returned is 0-indexed (0 for Jan, 11 for Dec).
 * 
 * Avoids UTC timezone shifts where "YYYY-MM-DD" is interpreted as UTC midnight
 * and shifted backwards or forwards by local timezone offsets.
 * 
 * @param {string|Date|number} dateInput
 * @returns {{ year: number, month: number, day: number } | null}
 */
export function parseLocalDateComponents(dateInput) {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return null;
  }

  // If already a Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return {
      year: dateInput.getFullYear(),
      month: dateInput.getMonth(),
      day: dateInput.getDate(),
    };
  }

  // If timestamp number
  if (typeof dateInput === 'number') {
    if (isNaN(dateInput)) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }

  // If string
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Fast parse ISO / YYYY-MM-DD pattern: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);

      // Validate month bounds
      if (month < 0 || month > 11 || day < 1 || day > 31) {
        return null;
      }

      // Check calendar validity (e.g. Feb 31 should not silently overflow)
      const testDate = new Date(year, month, day);
      if (
        testDate.getFullYear() === year &&
        testDate.getMonth() === month &&
        testDate.getDate() === day
      ) {
        return { year, month, day };
      }
      return null;
    }

    // Fallback standard parse for other valid string formats
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate(),
    };
  }

  return null;
}

/**
 * Calculates remaining calendar days between maturityDate and a reference date (defaults to today).
 * 
 * - Normalizes both calendar dates to 12:00:00 (local noon) to avoid daylight savings
 *   time transitions and UTC offset off-by-one errors.
 * - Returns exact integer differences:
 *     0: Maturing today
 *    -1: Matured yesterday
 *     7: Maturing in exactly 7 days
 *  null: Invalid date input
 * 
 * @param {string|Date|number} maturityDateInput
 * @param {string|Date|number} referenceDateInput
 * @returns {number|null}
 */
export function getSafeCalendarDaysRemaining(maturityDateInput, referenceDateInput = new Date()) {
  const matComponents = parseLocalDateComponents(maturityDateInput);
  if (!matComponents) return null;

  const refComponents = parseLocalDateComponents(referenceDateInput);
  if (!refComponents) return null;

  const matNoon = new Date(
    matComponents.year,
    matComponents.month,
    matComponents.day,
    12,
    0,
    0,
    0
  );

  const refNoon = new Date(
    refComponents.year,
    refComponents.month,
    refComponents.day,
    12,
    0,
    0,
    0
  );

  const diffMs = matNoon.getTime() - refNoon.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round(diffMs / ONE_DAY_MS);
}

/**
 * Categorizes an FDR record into one of 5 strictly mutually exclusive categories:
 * 1. 'matured'      : days < 0
 * 2. 'due_7_days'   : 0 <= days <= 7
 * 3. 'due_15_days'  : 8 <= days <= 15
 * 4. 'due_30_days'  : 16 <= days <= 30
 * 5. 'active'       : days > 30 (or invalid date / missing date treated as active)
 * 
 * @param {object} fdr - FDR record object
 * @param {string|Date|number} referenceDate - Reference date
 * @returns {string} One of MATURITY_CATEGORIES values
 */
export function getMaturityCategory(fdr, referenceDate = new Date()) {
  if (!fdr || !fdr.maturityDate) {
    return MATURITY_CATEGORIES.ACTIVE;
  }

  const days = getSafeCalendarDaysRemaining(fdr.maturityDate, referenceDate);
  if (days === null) {
    return MATURITY_CATEGORIES.ACTIVE;
  }

  if (days < 0) {
    return MATURITY_CATEGORIES.MATURED;
  }
  if (days <= 7) {
    return MATURITY_CATEGORIES.DUE_7_DAYS;
  }
  if (days <= 15) {
    return MATURITY_CATEGORIES.DUE_15_DAYS;
  }
  if (days <= 30) {
    return MATURITY_CATEGORIES.DUE_30_DAYS;
  }
  return MATURITY_CATEGORIES.ACTIVE;
}

/**
 * Checks whether an FDR record qualifies as an urgent maturity alert (within next 30 days or already matured).
 * 
 * @param {object} fdr
 * @param {string|Date|number} referenceDate
 * @returns {boolean}
 */
export function isMaturityAlert(fdr, referenceDate = new Date()) {
  const category = getMaturityCategory(fdr, referenceDate);
  return category !== MATURITY_CATEGORIES.ACTIVE;
}

/**
 * Calculates aggregated maturity statistics across all FDR records.
 * 
 * Summary counts are guaranteed to be MUTUALLY EXCLUSIVE:
 * totalRecords = matured.count + due7Days.count + due15Days.count + due30Days.count + active.count
 * 
 * No record is counted twice in the summary totals breakdown.
 * 
 * @param {Array<object>} records
 * @param {string|Date|number} referenceDate
 * @returns {object} Summary totals and breakdown
 */
export function calculateMaturitySummary(records = [], referenceDate = new Date()) {
  const safeRecords = Array.isArray(records) ? records : [];

  let totalRecords = 0;
  let totalPrincipal = 0;

  const matured = { count: 0, totalPrincipal: 0 };
  const due7Days = { count: 0, totalPrincipal: 0 };
  const due15Days = { count: 0, totalPrincipal: 0 };
  const due30Days = { count: 0, totalPrincipal: 0 };
  const active = { count: 0, totalPrincipal: 0 };

  for (const record of safeRecords) {
    totalRecords += 1;
    const amount = Number(record.principalAmount) || 0;
    totalPrincipal += amount;

    const category = getMaturityCategory(record, referenceDate);

    switch (category) {
      case MATURITY_CATEGORIES.MATURED:
        matured.count += 1;
        matured.totalPrincipal += amount;
        break;
      case MATURITY_CATEGORIES.DUE_7_DAYS:
        due7Days.count += 1;
        due7Days.totalPrincipal += amount;
        break;
      case MATURITY_CATEGORIES.DUE_15_DAYS:
        due15Days.count += 1;
        due15Days.totalPrincipal += amount;
        break;
      case MATURITY_CATEGORIES.DUE_30_DAYS:
        due30Days.count += 1;
        due30Days.totalPrincipal += amount;
        break;
      case MATURITY_CATEGORIES.ACTIVE:
      default:
        active.count += 1;
        active.totalPrincipal += amount;
        break;
    }
  }

  // Total records needing regulatory surveillance / intervention (Matured + <= 30 Days)
  const totalAlertsCount = matured.count + due7Days.count + due15Days.count + due30Days.count;
  const totalAlertsPrincipal =
    matured.totalPrincipal +
    due7Days.totalPrincipal +
    due15Days.totalPrincipal +
    due30Days.totalPrincipal;

  // Cumulative helper aggregates (for convenience in urgent metrics)
  const cumulativeWithin7Count = due7Days.count;
  const cumulativeWithin15Count = due7Days.count + due15Days.count;
  const cumulativeWithin30Count = due7Days.count + due15Days.count + due30Days.count;

  return {
    totalRecords,
    totalPrincipal,
    totalAlertsCount,
    totalAlertsPrincipal,

    // Mutually exclusive breakdown (Sum of counts === totalRecords)
    matured,
    due7Days,
    due15Days,
    due30Days,
    active,

    // Cumulative numbers clearly distinguished from mutually exclusive counts
    cumulative: {
      within7Days: cumulativeWithin7Count,
      within15Days: cumulativeWithin15Count,
      within30Days: cumulativeWithin30Count,
    },
  };
}

/**
 * Filter records based on urgency filter, bank filter, and search query.
 * 
 * @param {Array<object>} records
 * @param {object} filters
 * @param {string} filters.urgency - One of URGENCY_FILTERS
 * @param {string} filters.bank - Bank name or 'All Banks'
 * @param {string} filters.query - Search text
 * @param {string|Date|number} referenceDate - Reference date
 * @returns {Array<object>} Filtered array
 */
export function filterMaturityRecords(
  records = [],
  { urgency = URGENCY_FILTERS.ALL_ALERTS, bank = 'All Banks', query = '' } = {},
  referenceDate = new Date()
) {
  if (!Array.isArray(records)) return [];

  const lowerQuery = query ? query.toLowerCase().trim() : '';

  return records.filter((record) => {
    const category = getMaturityCategory(record, referenceDate);
    const days = getSafeCalendarDaysRemaining(record.maturityDate, referenceDate);

    // 1. Urgency Filter
    switch (urgency) {
      case URGENCY_FILTERS.ALL_ALERTS:
        // Shows all deposits needing surveillance (Matured or <= 30 days)
        if (category === MATURITY_CATEGORIES.ACTIVE) return false;
        break;

      case URGENCY_FILTERS.MATURED:
        if (category !== MATURITY_CATEGORIES.MATURED) return false;
        break;

      case URGENCY_FILTERS.DUE_7:
        if (category !== MATURITY_CATEGORIES.DUE_7_DAYS) return false;
        break;

      case URGENCY_FILTERS.DUE_15:
        // Matches records due within 15 days (discrete 8-15 days or <= 15 days if desired)
        if (category !== MATURITY_CATEGORIES.DUE_15_DAYS) return false;
        break;

      case URGENCY_FILTERS.DUE_30:
        if (category !== MATURITY_CATEGORIES.DUE_30_DAYS) return false;
        break;

      case URGENCY_FILTERS.ACTIVE:
        if (category !== MATURITY_CATEGORIES.ACTIVE) return false;
        break;

      case URGENCY_FILTERS.ALL:
      default:
        // No urgency filtering; show all
        break;
    }

    // 2. Bank Filter
    if (bank && bank !== 'All Banks') {
      if (record.bankName !== bank) return false;
    }

    // 3. Search Query
    if (lowerQuery) {
      const fdrMatch = record.fdrNumber?.toLowerCase().includes(lowerQuery);
      const certMatch = record.certificateNo?.toLowerCase().includes(lowerQuery);
      const instMatch = record.institutionName?.toLowerCase().includes(lowerQuery);
      const bankMatch = record.bankName?.toLowerCase().includes(lowerQuery);
      const codeMatch = record.institutionCode?.toLowerCase().includes(lowerQuery);
      const stateMatch = record.state?.toLowerCase().includes(lowerQuery);
      const purposeMatch = record.depositPurpose?.toLowerCase().includes(lowerQuery);

      if (
        !fdrMatch &&
        !certMatch &&
        !instMatch &&
        !bankMatch &&
        !codeMatch &&
        !stateMatch &&
        !purposeMatch
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Returns human-readable UI badge styling and copy for a record's maturity status.
 * 
 * @param {object} fdr
 * @param {string|Date|number} referenceDate
 * @returns {object} Badge metadata { label, sublabel, badgeClass, urgencyLevel, daysRemaining }
 */
export function getMaturityBadgeInfo(fdr, referenceDate = new Date()) {
  const days = getSafeCalendarDaysRemaining(fdr?.maturityDate, referenceDate);
  const category = getMaturityCategory(fdr, referenceDate);

  if (days === null) {
    return {
      label: 'Date Pending',
      sublabel: 'No maturity date recorded',
      badgeClass: 'badge-muted',
      urgencyLevel: 'Unknown',
      daysRemaining: null,
      category: MATURITY_CATEGORIES.ACTIVE,
    };
  }

  if (category === MATURITY_CATEGORIES.MATURED) {
    const elapsed = Math.abs(days);
    return {
      label: 'Matured',
      sublabel: elapsed === 1 ? '1 day overdue' : `${elapsed} days overdue`,
      badgeClass: 'badge-status-matured',
      urgencyLevel: 'Critical Past Due',
      daysRemaining: days,
      category,
    };
  }

  if (category === MATURITY_CATEGORIES.DUE_7_DAYS) {
    return {
      label: days === 0 ? 'Maturing Today' : `Due in ${days} ${days === 1 ? 'day' : 'days'}`,
      sublabel: 'Immediate Action (≤7 Days)',
      badgeClass: 'badge-status-due-7',
      urgencyLevel: 'Critical Action',
      daysRemaining: days,
      category,
    };
  }

  if (category === MATURITY_CATEGORIES.DUE_15_DAYS) {
    return {
      label: `Due in ${days} days`,
      sublabel: 'Urgent Review (≤15 Days)',
      badgeClass: 'badge-status-due-15',
      urgencyLevel: 'Urgent',
      daysRemaining: days,
      category,
    };
  }

  if (category === MATURITY_CATEGORIES.DUE_30_DAYS) {
    return {
      label: `Due in ${days} days`,
      sublabel: 'Regulatory Notice (≤30 Days)',
      badgeClass: 'badge-status-due-30',
      urgencyLevel: 'Upcoming Notice',
      daysRemaining: days,
      category,
    };
  }

  return {
    label: 'Active Deposit',
    sublabel: `${days} days remaining`,
    badgeClass: 'badge-status-active',
    urgencyLevel: 'Compliant',
    daysRemaining: days,
    category,
  };
}
