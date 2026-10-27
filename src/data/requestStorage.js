/**
 * AICTE FDR Portal - Renewal & Release Request Storage Service
 * Stores request data separately from FDR records under its own localStorage key.
 * Never touches aicte_fdr_records_v1.
 */

const REQUESTS_KEY = 'aicte_fdr_requests_v1';
const INITIALIZED_FLAG_KEY = 'aicte_fdr_requests_initialized_v1';

/**
 * Initial sample requests matching realistic AICTE institutions and the sidebar badge
 */
export const initialRequests = [
  {
    id: 'req-init-001',
    requestRef: 'REQ-20261020-0001',
    fdrId: 'fdr-004',
    fdrNumber: 'FDR/AICTE/2020/5541',
    bankName: 'HDFC Bank',
    requestType: 'Renewal',
    submittedAt: '2026-10-20T10:30:00.000Z',
    status: 'Under Review',
    remarks: 'College applied for renewal of security deposit for another 3-year term under APH norms.',
    renewalDetails: {
      proposedTenure: '3 Years',
      proposedInterestRate: 7.25,
      proposedMaturityDate: '2029-11-14',
    },
    releaseDetails: null,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'Requested',
        timestamp: '2026-10-20T10:30:00.000Z',
        remarks: 'Request submitted by Institution Registrar.',
      },
      {
        fromStatus: 'Requested',
        toStatus: 'Under Review',
        timestamp: '2026-10-21T14:15:00.000Z',
        remarks: 'Scrutiny initiated by Western Regional Office (WRO).',
      },
    ],
  },
  {
    id: 'req-init-002',
    requestRef: 'REQ-20261022-0002',
    fdrId: 'fdr-009',
    fdrNumber: 'FDR/AICTE/2016/1109',
    bankName: 'Canara Bank',
    requestType: 'Release',
    submittedAt: '2026-10-22T09:45:00.000Z',
    status: 'Requested',
    remarks: 'Completed 10-year mandatory lock-in period. All compliance inspections cleared. Requesting release NOC.',
    renewalDetails: null,
    releaseDetails: {
      releaseReason: 'Completion of 10-Year Mandated Lock-in Period',
      beneficiaryRemarks: 'Refund into Awadh Welfare & Technical Society Canara Bank Account',
    },
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'Requested',
        timestamp: '2026-10-22T09:45:00.000Z',
        remarks: 'Release application filed with No-Dues documentation.',
      },
    ],
  },
];

/**
 * Generate a stable unique request ID.
 */
export function generateRequestId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Generate a human-readable request reference number.
 * Format: REQ-YYYYMMDD-XXXX (4-digit zero-padded sequence within the day)
 */
export function generateRequestRef(existingRequests = []) {
  const now = new Date();
  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  // Count how many requests already exist for today to determine sequence
  const todayPrefix = `REQ-${datePart}-`;
  const todayCount = existingRequests.filter((r) =>
    r.requestRef?.startsWith(todayPrefix)
  ).length;

  const seq = String(todayCount + 1).padStart(4, '0');
  return `${todayPrefix}${seq}`;
}

/**
 * Load all requests from localStorage.
 * Seeds with initialRequests on first launch, preserves user state afterwards.
 * Returns [] if nothing stored or on parse failure.
 */
export function loadRequests() {
  try {
    const isInitialized = localStorage.getItem(INITIALIZED_FLAG_KEY);
    const raw = localStorage.getItem(REQUESTS_KEY);

    if (!isInitialized) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(initialRequests));
      localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
      return initialRequests;
    }

    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Ensure every request has a stable id and required shape
        return parsed.filter(
          (r) => r && typeof r === 'object' && r.id && r.fdrId && r.requestType
        );
      }
    }

    return [];
  } catch (err) {
    console.error('[requestStorage] Error loading requests:', err);
    return [];
  }
}

/**
 * Save the full request list to localStorage.
 */
export function saveRequests(requests) {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
    return true;
  } catch (err) {
    console.error('[requestStorage] Error saving requests:', err);
    return false;
  }
}

/**
 * Reset request storage back to sample requests (useful for demo/testing).
 */
export function resetRequestStorage() {
  try {
    localStorage.removeItem(REQUESTS_KEY);
    localStorage.removeItem(INITIALIZED_FLAG_KEY);
    return loadRequests();
  } catch (err) {
    console.error('[requestStorage] Error resetting request storage:', err);
    return initialRequests;
  }
}

/**
 * Valid status values for requests.
 */
export const REQUEST_STATUSES = ['Requested', 'Under Review', 'Approved', 'Rejected'];

/**
 * Valid status transitions.
 * Maps current status → array of allowed next statuses.
 * Requested: must move to Under Review (or can be directly Rejected). Cannot approve without review.
 * Under Review: can be Approved or Rejected.
 * Approved / Rejected: terminal states.
 */
export const VALID_TRANSITIONS = {
  Requested: ['Under Review', 'Rejected'],
  'Under Review': ['Approved', 'Rejected'],
  Approved: [],
  Rejected: [],
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * Create a new request object (does NOT save — caller must call saveRequests).
 * @param {object} params
 * @param {string} params.fdrId        - Stable FDR ID from FDR records
 * @param {string} params.fdrNumber    - Human-readable FDR number for display
 * @param {string} params.bankName     - Bank name for display
 * @param {string} params.requestType  - 'Renewal' or 'Release'
 * @param {string} params.remarks      - General remarks / reason
 * @param {object} [params.renewalDetails] - Optional renewal-specific fields
 * @param {object} [params.releaseDetails] - Optional release-specific fields
 * @param {array}  existingRequests    - Pass existing list to generate correct ref
 */
export function createRequest(
  { fdrId, fdrNumber, bankName, requestType, remarks, renewalDetails, releaseDetails },
  existingRequests = []
) {
  const now = new Date().toISOString();
  const id = generateRequestId();
  const requestRef = generateRequestRef(existingRequests);

  return {
    id,
    requestRef,
    fdrId,
    fdrNumber: fdrNumber || '',
    bankName: bankName || '',
    requestType, // 'Renewal' | 'Release'
    submittedAt: now,
    status: 'Requested',
    remarks: remarks || '',
    renewalDetails: renewalDetails || null,
    releaseDetails: releaseDetails || null,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'Requested',
        timestamp: now,
        remarks: 'Request submitted.',
      },
    ],
  };
}

/**
 * Apply a status change to a request object (immutably).
 * Returns updated request or throws with a message on invalid transition.
 */
export function applyStatusChange(request, newStatus, changeRemarks = '') {
  if (!isValidTransition(request.status, newStatus)) {
    throw new Error(
      `Invalid status transition: "${request.status}" → "${newStatus}". ` +
        `Allowed: ${(VALID_TRANSITIONS[request.status] || []).join(', ') || 'none (terminal status)'}.`
    );
  }

  const historyEntry = {
    fromStatus: request.status,
    toStatus: newStatus,
    timestamp: new Date().toISOString(),
    remarks: changeRemarks.trim() || `Status changed to ${newStatus}.`,
  };

  return {
    ...request,
    status: newStatus,
    statusHistory: [...(request.statusHistory || []), historyEntry],
  };
}
