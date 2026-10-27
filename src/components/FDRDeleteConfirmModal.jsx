import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Landmark, Building2, IndianRupee } from 'lucide-react';
import { formatINR } from '../data/sampleFDRs';

export default function FDRDeleteConfirmModal({ fdr, onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!fdr) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-container delete-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="delete-dialog-header">
          <div className="delete-warning-icon">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <div>
            <h3 className="delete-title">Confirm Deletion</h3>
            <p className="delete-subtitle">
              You are about to delete an institutional security deposit record.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="delete-dialog-body">
          <div className="delete-record-card">
            <div className="delete-record-row fdr-highlight">
              <span className="del-label">FDR / Ref No:</span>
              <span className="del-value font-mono font-bold text-navy">
                {fdr.fdrNumber}
              </span>
            </div>
            <div className="delete-record-row">
              <span className="del-label">Institution:</span>
              <span className="del-value font-medium">{fdr.institutionName}</span>
            </div>
            <div className="delete-record-row">
              <span className="del-label">Bank:</span>
              <span className="del-value">{fdr.bankName}</span>
            </div>
            <div className="delete-record-row">
              <span className="del-label">Principal Amount:</span>
              <span className="del-value text-navy font-bold">
                {formatINR(fdr.principalAmount)}
              </span>
            </div>
          </div>

          <div className="delete-caution-notice">
            <AlertTriangle size={16} className="text-danger flex-shrink-0" />
            <span>
              <strong>Warning:</strong> This will permanently remove the record from
              the AICTE Central FDR Registry and recalculate portfolio statistics.
              This action cannot be undone.
            </span>
          </div>
        </div>

        <div className="delete-dialog-footer">
          <button
            type="button"
            className="btn-cancel-dialog"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm-delete"
            onClick={() => onConfirm(fdr)}
          >
            <Trash2 size={16} />
            <span>Confirm & Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
