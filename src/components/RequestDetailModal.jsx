import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Unlock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Building,
  Landmark,
  Calendar,
  IndianRupee,
  FileText,
  History,
} from 'lucide-react';
import { formatINR, formatDate } from '../data/sampleFDRs';
import {
  applyStatusChange,
  VALID_TRANSITIONS,
  REQUEST_STATUSES,
} from '../data/requestStorage';

// Badge component for request status
function RequestStatusBadge({ status }) {
  const cfg = {
    Requested: { cls: 'req-badge-requested', Icon: FileText },
    'Under Review': { cls: 'req-badge-review', Icon: Clock },
    Approved: { cls: 'req-badge-approved', Icon: CheckCircle2 },
    Rejected: { cls: 'req-badge-rejected', Icon: XCircle },
  };
  const { cls, Icon } = cfg[status] || { cls: 'req-badge-requested', Icon: FileText };
  return (
    <span className={`req-status-badge ${cls}`}>
      <Icon size={12} />
      <span>{status}</span>
    </span>
  );
}

// Format ISO timestamp for display
function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function RequestDetailModal({
  request,
  fdrRecords = [],
  onClose,
  onStatusUpdate,
}) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!request) return null;

  // Find the linked FDR record for display
  const linkedFDR = fdrRecords.find((r) => r.id === request.fdrId);

  const allowedTransitions = VALID_TRANSITIONS[request.status] || [];
  const isTerminal = allowedTransitions.length === 0;

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!newStatus) {
      setStatusError('Please select a new status.');
      return;
    }
    try {
      const updatedRequest = applyStatusChange(request, newStatus, statusRemarks);
      onStatusUpdate(updatedRequest);
      setShowStatusForm(false);
      setNewStatus('');
      setStatusRemarks('');
      setStatusError('');
    } catch (err) {
      setStatusError(err.message);
    }
  };

  const handleCancelStatusChange = () => {
    setShowStatusForm(false);
    setNewStatus('');
    setStatusRemarks('');
    setStatusError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container req-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-icon-badge ${request.requestType === 'Release' ? 'bg-amber-soft' : ''}`}>
              {request.requestType === 'Renewal' ? (
                <RotateCw size={22} className="text-blue" />
              ) : (
                <Unlock size={22} className="text-amber" />
              )}
            </div>
            <div>
              <div className="modal-fdr-id-row">
                <h3 className="modal-title text-navy">{request.requestRef}</h3>
                <button
                  type="button"
                  className="modal-copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(request.requestRef);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title="Copy Request Reference"
                >
                  {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="modal-cert-ref">
                {request.requestType} Request &nbsp;·&nbsp; FDR:{' '}
                <strong className="font-mono">{request.fdrNumber}</strong>
              </p>
            </div>
          </div>
          <div className="modal-header-right">
            <RequestStatusBadge status={request.status} />
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Key Metrics Strip */}
          <div className="modal-stats-banner req-stats-strip">
            <div className="modal-stat-item">
              <span className="modal-stat-label">Request Ref</span>
              <span className="modal-stat-val text-navy font-mono" style={{ fontSize: '0.9rem' }}>
                {request.requestRef}
              </span>
              <span className="modal-stat-sub">Reference Number</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Type</span>
              <span className="modal-stat-val" style={{ fontSize: '1rem' }}>
                {request.requestType}
              </span>
              <span className="modal-stat-sub">Request Category</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Submitted</span>
              <span className="modal-stat-val" style={{ fontSize: '0.85rem' }}>
                {formatTimestamp(request.submittedAt)}
              </span>
              <span className="modal-stat-sub">Date & Time</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Current Status</span>
              <span className="modal-stat-val">
                <RequestStatusBadge status={request.status} />
              </span>
              <span className="modal-stat-sub">
                {isTerminal ? 'Terminal — no further changes' : 'Awaiting action'}
              </span>
            </div>
          </div>

          <div className="modal-grid-2">
            {/* Linked FDR Details */}
            <div className="modal-section-card">
              <div className="modal-sec-header">
                <Landmark size={18} className="text-blue" />
                <h4>Linked FDR Details</h4>
              </div>
              {linkedFDR ? (
                <div className="details-list">
                  <div className="detail-row">
                    <span className="detail-key">FDR Number:</span>
                    <span className="detail-value font-mono">{linkedFDR.fdrNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Bank:</span>
                    <span className="detail-value font-medium">{linkedFDR.bankName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Institution:</span>
                    <span className="detail-value">{linkedFDR.institutionName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Principal:</span>
                    <span className="detail-value font-medium">{formatINR(linkedFDR.principalAmount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Issue Date:</span>
                    <span className="detail-value">{formatDate(linkedFDR.issueDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Maturity Date:</span>
                    <span className="detail-value">{formatDate(linkedFDR.maturityDate)}</span>
                  </div>
                </div>
              ) : (
                <div className="req-fdr-unlinked-notice">
                  <AlertCircle size={16} className="text-amber-icon" />
                  <span>
                    Original FDR (ID: <code className="font-mono">{request.fdrId}</code>) is no longer in records.
                    The FDR may have been deleted.
                  </span>
                </div>
              )}
            </div>

            {/* Submission Info */}
            <div className="modal-section-card">
              <div className="modal-sec-header">
                <FileText size={18} className="text-emerald" />
                <h4>Submission Information</h4>
              </div>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-key">Bank (from FDR):</span>
                  <span className="detail-value">{request.bankName || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Submitted At:</span>
                  <span className="detail-value">{formatTimestamp(request.submittedAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Remarks:</span>
                  <span className="detail-value" style={{ lineHeight: 1.4 }}>
                    {request.remarks || '—'}
                  </span>
                </div>

                {/* Renewal-specific */}
                {request.requestType === 'Renewal' && request.renewalDetails && (
                  <>
                    {request.renewalDetails.proposedTenure && (
                      <div className="detail-row">
                        <span className="detail-key">Proposed Tenure:</span>
                        <span className="detail-value">{request.renewalDetails.proposedTenure}</span>
                      </div>
                    )}
                    {request.renewalDetails.proposedInterestRate && (
                      <div className="detail-row">
                        <span className="detail-key">Proposed Rate:</span>
                        <span className="detail-value">
                          {request.renewalDetails.proposedInterestRate}% p.a.
                        </span>
                      </div>
                    )}
                    {request.renewalDetails.proposedMaturityDate && (
                      <div className="detail-row">
                        <span className="detail-key">Proposed Maturity:</span>
                        <span className="detail-value">
                          {formatDate(request.renewalDetails.proposedMaturityDate)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Release-specific */}
                {request.requestType === 'Release' && request.releaseDetails && (
                  <>
                    {request.releaseDetails.releaseReason && (
                      <div className="detail-row">
                        <span className="detail-key">Release Reason:</span>
                        <span className="detail-value">{request.releaseDetails.releaseReason}</span>
                      </div>
                    )}
                    {request.releaseDetails.beneficiaryRemarks && (
                      <div className="detail-row">
                        <span className="detail-key">Beneficiary Remarks:</span>
                        <span className="detail-value">{request.releaseDetails.beneficiaryRemarks}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Change Form */}
          {!isTerminal && (
            <div className="modal-section-card req-status-update-card">
              <div className="modal-sec-header">
                <ChevronDown size={18} className="text-blue" />
                <h4>Update Request Status</h4>
              </div>

              {!showStatusForm ? (
                <div className="req-status-action-row">
                  <p className="field-hint">
                    Allowed transitions from <strong>{request.status}</strong>:{' '}
                    {allowedTransitions.join(', ')}.
                  </p>
                  <button
                    type="button"
                    className="btn-view-details req-update-status-btn"
                    onClick={() => setShowStatusForm(true)}
                  >
                    Update Status
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStatusSubmit} noValidate>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="newStatus" className="form-label">
                        New Status <span className="req-star">*</span>
                      </label>
                      <select
                        id="newStatus"
                        className={`form-select ${statusError && !newStatus ? 'input-error' : ''}`}
                        value={newStatus}
                        onChange={(e) => {
                          setNewStatus(e.target.value);
                          setStatusError('');
                        }}
                      >
                        <option value="">— Select new status —</option>
                        {allowedTransitions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {statusError && !newStatus && (
                        <span className="field-error-msg">{statusError}</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="statusRemarks" className="form-label">
                        Status Update Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        id="statusRemarks"
                        className="form-input"
                        placeholder="e.g. Documents verified by AICTE FDR Cell..."
                        value={statusRemarks}
                        onChange={(e) => setStatusRemarks(e.target.value)}
                      />
                    </div>
                  </div>

                  {statusError && newStatus && (
                    <div className="req-field-error-banner" style={{ marginTop: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{statusError}</span>
                    </div>
                  )}

                  <div className="req-status-form-actions">
                    <button
                      type="button"
                      className="btn-modal-close"
                      onClick={handleCancelStatusChange}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-banner-add-fdr">
                      <CheckCircle2 size={15} />
                      <span>Confirm Status Update</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {isTerminal && (
            <div className="req-terminal-notice">
              <CheckCircle2 size={16} className={request.status === 'Approved' ? 'text-success' : 'text-danger'} />
              <span>
                This request is in a <strong>{request.status}</strong> state. No further status changes are permitted.
              </span>
            </div>
          )}

          {/* Status History */}
          <div className="modal-section-card req-history-card">
            <div className="modal-sec-header">
              <History size={18} className="text-navy" />
              <h4>Status History</h4>
            </div>
            <div className="req-history-timeline">
              {(request.statusHistory || []).map((entry, idx) => (
                <div key={idx} className="req-history-entry">
                  <div className="req-history-dot-col">
                    <div className={`req-history-dot ${idx === (request.statusHistory.length - 1) ? 'dot-current' : 'dot-past'}`} />
                    {idx < request.statusHistory.length - 1 && (
                      <div className="req-history-line" />
                    )}
                  </div>
                  <div className="req-history-content">
                    <div className="req-history-status-row">
                      {entry.fromStatus && (
                        <>
                          <RequestStatusBadge status={entry.fromStatus} />
                          <span className="req-history-arrow">→</span>
                        </>
                      )}
                      <RequestStatusBadge status={entry.toStatus} />
                    </div>
                    <div className="req-history-meta">
                      <span className="req-history-timestamp">{formatTimestamp(entry.timestamp)}</span>
                      {entry.remarks && (
                        <span className="req-history-remarks">{entry.remarks}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-modal-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

