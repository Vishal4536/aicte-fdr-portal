import React, { useEffect } from 'react';
import {
  X,
  Building,
  Landmark,
  ShieldCheck,
  Calendar,
  IndianRupee,
  FileCheck,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Printer,
  FileText,
} from 'lucide-react';
import {
  formatINR,
  formatDate,
  computeFDRStatus,
  getDaysRemaining,
} from '../data/sampleFDRs';

export default function FDRDetailModal({ fdr, onClose }) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!fdr) return null;

  const status = computeFDRStatus(fdr);
  const daysRemaining = getDaysRemaining(fdr.maturityDate);

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText(fdr.fdrNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <FileCheck size={24} className="text-navy" />
            </div>
            <div>
              <div className="modal-fdr-id-row">
                <h3 className="modal-title">{fdr.fdrNumber}</h3>
                <button
                  type="button"
                  className="modal-copy-btn"
                  onClick={handleCopyNumber}
                  title="Copy FDR Number"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="modal-cert-ref">
                Cert No: <strong>{fdr.certificateNo}</strong> • AICTE App ID:{' '}
                <strong>{fdr.aicteAppId}</strong>
              </p>
            </div>
          </div>

          <div className="modal-header-right">
            {status === 'active' && (
              <span className="status-badge status-active">
                <span className="status-dot"></span>
                <span>Active Deposit</span>
              </span>
            )}
            {status === 'expiring_soon' && (
              <span className="status-badge status-expiring">
                <Clock size={14} />
                <span>Expiring Soon</span>
              </span>
            )}
            {status === 'matured' && (
              <span className="status-badge status-matured">
                <AlertCircle size={14} />
                <span>Matured</span>
              </span>
            )}

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
          {/* Key Metric Highlights */}
          <div className="modal-stats-banner">
            <div className="modal-stat-item">
              <span className="modal-stat-label">Principal Amount</span>
              <span className="modal-stat-val text-navy">
                {formatINR(fdr.principalAmount)}
              </span>
              <span className="modal-stat-sub">Fixed Security Deposit</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Interest Rate</span>
              <span className="modal-stat-val text-blue">
                {fdr.interestRate}% p.a.
              </span>
              <span className="modal-stat-sub">Compounded Quarterly</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Issue Date</span>
              <span className="modal-stat-val">
                {formatDate(fdr.issueDate)}
              </span>
              <span className="modal-stat-sub">{fdr.tenureYears || 5} Years Tenure</span>
            </div>
            <div className="modal-stat-item">
              <span className="modal-stat-label">Maturity Date</span>
              <span className="modal-stat-val">
                {formatDate(fdr.maturityDate)}
              </span>
              <span
                className={`modal-stat-sub font-semibold ${
                  daysRemaining < 0
                    ? 'text-danger'
                    : daysRemaining <= 30
                    ? 'text-warning'
                    : 'text-success'
                }`}
              >
                {daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : daysRemaining === 0
                  ? 'Maturing Today'
                  : `${daysRemaining} days remaining`}
              </span>
            </div>
          </div>

          <div className="modal-grid-2">
            {/* Institution Particulars */}
            <div className="modal-section-card">
              <div className="modal-sec-header">
                <Building size={18} className="text-blue" />
                <h4>Technical Institution Particulars</h4>
              </div>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-key">Institution Name:</span>
                  <span className="detail-value font-medium">
                    {fdr.institutionName}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Institution Code:</span>
                  <span className="detail-value">{fdr.institutionCode}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Managing Trust / Society:</span>
                  <span className="detail-value">{fdr.trustName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">State & Region:</span>
                  <span className="detail-value">{fdr.state}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Deposit Norm Purpose:</span>
                  <span className="detail-value text-navy">
                    {fdr.depositPurpose}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank & Legal Custody Particulars */}
            <div className="modal-section-card">
              <div className="modal-sec-header">
                <Landmark size={18} className="text-emerald" />
                <h4>Banking & Joint-Custody Particulars</h4>
              </div>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-key">Depository Bank:</span>
                  <span className="detail-value font-medium">{fdr.bankName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Branch Name:</span>
                  <span className="detail-value">{fdr.bankBranch}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">IFSC Code:</span>
                  <span className="detail-value font-mono">{fdr.ifscCode}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Joint Account Holders:</span>
                  <span className="detail-value">{fdr.jointHolder}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Lien Status:</span>
                  <span className="detail-value text-emerald font-semibold">
                    {fdr.lienStatus}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Auto-Renewal Opted:</span>
                  <span className="detail-value">
                    {fdr.autoRenewal ? (
                      <span className="pill-status-yes">Yes (Under APH Norms)</span>
                    ) : (
                      <span className="pill-status-no">No (Manual Extension Required)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Scrutiny Remarks */}
          <div className="modal-section-card remarks-card">
            <div className="modal-sec-header">
              <ShieldCheck size={18} className="text-amber" />
              <h4>AICTE FDR Cell Scrutiny Remarks</h4>
            </div>
            <p className="remarks-text">{fdr.remarks || 'No special remarks recorded.'}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-print-docket"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Print Verification Docket</span>
          </button>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
