/**
 * Automated Verification Suite for AICTE FDR Portal
 * Renewal & Release Request Management: Creation, Validation, Status Transitions,
 * Terminal States, Audit Logging, and Master FDR Record Synchronization.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRequest,
  generateRequestRef,
  generateRequestId,
  applyStatusChange,
  isValidTransition,
  synchronizeFDRWithApprovedRequest,
  VALID_TRANSITIONS,
  REQUEST_STATUSES,
} from '../src/data/requestStorage.js';

// ============================================================================
// SUITE 1: REQUEST CREATION & REFERENCE NUMBER GENERATION
// ============================================================================
test('Request Creation: createRequest generates valid Renewal request structure', () => {
  const params = {
    fdrId: 'fdr-test-101',
    fdrNumber: 'FDR/AICTE/2026/8842',
    bankName: 'State Bank of India',
    requestType: 'Renewal',
    remarks: 'Applying for 3-year extension under APH regulations.',
    renewalDetails: {
      proposedTenure: '3 Years',
      proposedInterestRate: 7.25,
      proposedMaturityDate: '2029-10-28',
    },
    releaseDetails: null,
  };

  const request = createRequest(params, []);

  assert.ok(request.id && request.id.startsWith('req-'), 'Request must have unique id prefixed with req-');
  assert.ok(/^REQ-\d{8}-\d{4}$/.test(request.requestRef), 'Reference must match REQ-YYYYMMDD-XXXX pattern');
  assert.equal(request.fdrId, 'fdr-test-101');
  assert.equal(request.fdrNumber, 'FDR/AICTE/2026/8842');
  assert.equal(request.bankName, 'State Bank of India');
  assert.equal(request.requestType, 'Renewal');
  assert.equal(request.status, 'Requested');
  assert.ok(request.submittedAt && !isNaN(new Date(request.submittedAt).getTime()));
  assert.deepEqual(request.renewalDetails, params.renewalDetails);
  assert.equal(request.releaseDetails, null);

  // Status history verification
  assert.equal(Array.isArray(request.statusHistory), true);
  assert.equal(request.statusHistory.length, 1);
  assert.equal(request.statusHistory[0].fromStatus, null);
  assert.equal(request.statusHistory[0].toStatus, 'Requested');
  assert.ok(request.statusHistory[0].timestamp);
});

test('Request Creation: createRequest generates valid Release request structure', () => {
  const params = {
    fdrId: 'fdr-test-202',
    fdrNumber: 'FDR/AICTE/2016/9901',
    bankName: 'Punjab National Bank',
    requestType: 'Release',
    remarks: 'Completion of 10-year lock-in period. Requesting refund NOC.',
    renewalDetails: null,
    releaseDetails: {
      releaseReason: 'Completion of 10-Year Mandated Lock-in Period',
      beneficiaryRemarks: 'Transfer to college account at PNB Connaught Place',
    },
  };

  const request = createRequest(params, []);

  assert.equal(request.requestType, 'Release');
  assert.equal(request.status, 'Requested');
  assert.deepEqual(request.releaseDetails, params.releaseDetails);
  assert.equal(request.renewalDetails, null);
  assert.equal(request.statusHistory.length, 1);
});

test('Request Reference: generateRequestRef produces sequential padded references', () => {
  const now = new Date();
  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const todayPrefix = `REQ-${datePart}-`;

  // First request of the day
  const ref1 = generateRequestRef([]);
  assert.equal(ref1, `${todayPrefix}0001`);

  // Subsequent requests in sequence
  const existing = [
    { requestRef: `${todayPrefix}0001` },
    { requestRef: `${todayPrefix}0002` },
  ];
  const ref3 = generateRequestRef(existing);
  assert.equal(ref3, `${todayPrefix}0003`);

  // Handles malformed suffixes safely without crashing
  const corrupted = [
    { requestRef: `${todayPrefix}0001` },
    { requestRef: `${todayPrefix}not-a-number` },
    { requestRef: null },
  ];
  const refNext = generateRequestRef(corrupted);
  assert.equal(refNext, `${todayPrefix}0002`);
});

// ============================================================================
// SUITE 2: STATUS TRANSITION VALIDATION & FINITE STATE MACHINE
// ============================================================================
test('Status Machine: Valid transitions are correctly permitted', () => {
  // Requested -> Under Review or Rejected
  assert.equal(isValidTransition('Requested', 'Under Review'), true);
  assert.equal(isValidTransition('Requested', 'Rejected'), true);

  // Under Review -> Approved or Rejected
  assert.equal(isValidTransition('Under Review', 'Approved'), true);
  assert.equal(isValidTransition('Under Review', 'Rejected'), true);
});

test('Status Machine: Invalid transitions are strictly rejected', () => {
  // Direct approval without review is disallowed by APH protocol
  assert.equal(isValidTransition('Requested', 'Approved'), false);

  // Regression from Under Review back to Requested is disallowed
  assert.equal(isValidTransition('Under Review', 'Requested'), false);

  // Self transitions
  assert.equal(isValidTransition('Requested', 'Requested'), false);
  assert.equal(isValidTransition('Under Review', 'Under Review'), false);
});

test('Status Machine: Terminal states (Approved, Rejected) allow zero further transitions', () => {
  assert.deepEqual(VALID_TRANSITIONS['Approved'], []);
  assert.deepEqual(VALID_TRANSITIONS['Rejected'], []);

  for (const status of REQUEST_STATUSES) {
    assert.equal(isValidTransition('Approved', status), false, `Approved cannot transition to ${status}`);
    assert.equal(isValidTransition('Rejected', status), false, `Rejected cannot transition to ${status}`);
  }
});

// ============================================================================
// SUITE 3: STATUS CHANGE APPLICATION & AUDIT HISTORY LOGGING
// ============================================================================
test('Audit Logging: applyStatusChange transitions state and appends immutable history', () => {
  const initial = createRequest(
    {
      fdrId: 'fdr-101',
      fdrNumber: 'FDR/AICTE/TEST/01',
      bankName: 'Canara Bank',
      requestType: 'Renewal',
      remarks: 'Initial submission',
    },
    []
  );

  // Transition 1: Requested -> Under Review
  const underReview = applyStatusChange(initial, 'Under Review', 'Scrutiny assigned to WRO.');
  assert.equal(underReview.status, 'Under Review');
  assert.equal(underReview.statusHistory.length, 2);
  assert.equal(underReview.statusHistory[1].fromStatus, 'Requested');
  assert.equal(underReview.statusHistory[1].toStatus, 'Under Review');
  assert.equal(underReview.statusHistory[1].remarks, 'Scrutiny assigned to WRO.');
  assert.ok(underReview.statusHistory[1].timestamp);

  // Immutability check: initial object must not be mutated
  assert.equal(initial.status, 'Requested');
  assert.equal(initial.statusHistory.length, 1);

  // Transition 2: Under Review -> Approved
  const approved = applyStatusChange(underReview, 'Approved', 'Renewal sanctioned by Regional Officer.');
  assert.equal(approved.status, 'Approved');
  assert.equal(approved.statusHistory.length, 3);
  assert.equal(approved.statusHistory[2].fromStatus, 'Under Review');
  assert.equal(approved.statusHistory[2].toStatus, 'Approved');
  assert.equal(approved.statusHistory[2].remarks, 'Renewal sanctioned by Regional Officer.');
});

test('Audit Logging: applyStatusChange throws descriptive error on invalid transition', () => {
  const req = createRequest(
    {
      fdrId: 'fdr-102',
      fdrNumber: 'FDR/AICTE/TEST/02',
      requestType: 'Release',
    },
    []
  );

  assert.throws(
    () => applyStatusChange(req, 'Approved', 'Direct approval bypass'),
    /Invalid status transition: "Requested" → "Approved"/
  );

  const underReview = applyStatusChange(req, 'Under Review');
  const rejected = applyStatusChange(underReview, 'Rejected', 'Deficient documentation');

  assert.throws(
    () => applyStatusChange(rejected, 'Approved'),
    /Invalid status transition: "Rejected" → "Approved"/
  );
});

// ============================================================================
// SUITE 4: MASTER FDR RECORD SYNCHRONIZATION WITH APPROVED REQUESTS
// ============================================================================
test('Synchronization: Approved Renewal request updates linked FDR maturity, tenure, rate, and remarks', () => {
  const originalFDR = {
    id: 'fdr-orig-001',
    fdrNumber: 'FDR/AICTE/2021/8842',
    bankName: 'State Bank of India',
    principalAmount: 3500000,
    interestRate: 7.10,
    issueDate: '2021-10-28',
    maturityDate: '2026-10-28',
    tenureYears: 5,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    remarks: 'Original deposit remarks.',
  };

  const approvedRenewalRequest = {
    id: 'req-renewal-001',
    requestRef: 'REQ-20261028-0001',
    fdrId: 'fdr-orig-001',
    requestType: 'Renewal',
    status: 'Approved',
    renewalDetails: {
      proposedTenure: '3 Years',
      proposedInterestRate: 7.45,
      proposedMaturityDate: '2029-10-28',
    },
  };

  const updatedFDR = synchronizeFDRWithApprovedRequest(originalFDR, approvedRenewalRequest);

  // Critical checks: stable ID and immutable fields
  assert.equal(updatedFDR.id, originalFDR.id, 'Stable internal ID must be strictly preserved');
  assert.equal(updatedFDR.fdrNumber, originalFDR.fdrNumber);
  assert.equal(updatedFDR.principalAmount, originalFDR.principalAmount);
  assert.equal(updatedFDR.bankName, originalFDR.bankName);

  // Updated fields
  assert.equal(updatedFDR.maturityDate, '2029-10-28');
  assert.equal(updatedFDR.interestRate, 7.45);
  assert.equal(updatedFDR.tenureYears, 3);
  assert.ok(updatedFDR.remarks.includes('[Renewal Approved: Ref REQ-20261028-0001]'));
  assert.ok(updatedFDR.remarks.includes('Original deposit remarks.'));
});

test('Synchronization: Approved Release request updates lienStatus and notes in remarks', () => {
  const originalFDR = {
    id: 'fdr-orig-002',
    fdrNumber: 'FDR/AICTE/2016/1109',
    bankName: 'Canara Bank',
    principalAmount: 1500000,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    remarks: '10-year term deposit.',
  };

  const approvedReleaseRequest = {
    id: 'req-release-001',
    requestRef: 'REQ-20261028-0002',
    fdrId: 'fdr-orig-002',
    requestType: 'Release',
    status: 'Approved',
    releaseDetails: {
      releaseReason: 'Completion of 10-Year Mandated Lock-in Period',
      beneficiaryRemarks: 'Refund approved',
    },
  };

  const updatedFDR = synchronizeFDRWithApprovedRequest(originalFDR, approvedReleaseRequest);

  assert.equal(updatedFDR.id, originalFDR.id, 'Stable internal ID must be strictly preserved');
  assert.equal(updatedFDR.lienStatus, 'Lien Released / Encashment NOC Issued');
  assert.ok(updatedFDR.remarks.includes('[Security Deposit Released: Ref REQ-20261028-0002'));
  assert.ok(updatedFDR.remarks.includes('10-year term deposit.'));
});

test('Synchronization: Non-Approved requests (Under Review, Rejected) do not mutate FDR record', () => {
  const originalFDR = {
    id: 'fdr-orig-003',
    maturityDate: '2026-10-28',
    interestRate: 7.10,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
  };

  const underReviewReq = {
    fdrId: 'fdr-orig-003',
    requestType: 'Renewal',
    status: 'Under Review',
    renewalDetails: { proposedMaturityDate: '2030-01-01' },
  };

  const result1 = synchronizeFDRWithApprovedRequest(originalFDR, underReviewReq);
  assert.deepEqual(result1, originalFDR);

  const rejectedReq = {
    fdrId: 'fdr-orig-003',
    requestType: 'Release',
    status: 'Rejected',
  };

  const result2 = synchronizeFDRWithApprovedRequest(originalFDR, rejectedReq);
  assert.deepEqual(result2, originalFDR);
});
