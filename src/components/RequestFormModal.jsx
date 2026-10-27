import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Unlock,
  Search,
  ChevronDown,
  AlertCircle,
  Calendar,
  IndianRupee,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { formatINR, formatDate } from '../data/sampleFDRs';
import { createRequest } from '../data/requestStorage';

const RENEWAL_TENURE_OPTIONS = ['1 Year', '2 Years', '3 Years', '4 Years', '5 Years'];

export default function RequestFormModal({
  isOpen,
  onClose,
  onSubmit,
  fdrRecords = [],
  existingRequests = [],
  defaultRequestType = 'Renewal',
}) {
  const [step, setStep] = useState(1); // 1: select FDR & type, 2: fill details
  const [fdrSearchQuery, setFdrSearchQuery] = useState('');
  const [selectedFDR, setSelectedFDR] = useState(null);
  const [requestType, setRequestType] = useState(defaultRequestType || 'Renewal');
  const [formData, setFormData] = useState({
    remarks: '',
    // Renewal-specific
    proposedTenure: '',
    proposedInterestRate: '',
    proposedMaturityDate: '',
    // Release-specific
    releaseReason: '',
    beneficiaryRemarks: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset when modal opens/closes or defaultRequestType changes
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setFdrSearchQuery('');
    setSelectedFDR(null);
    setRequestType(defaultRequestType || 'Renewal');
    setFormData({
      remarks: '',
      proposedTenure: '',
      proposedInterestRate: '',
      proposedMaturityDate: '',
      releaseReason: '',
      beneficiaryRemarks: '',
    });
    setErrors({});
    setTouched({});
  }, [isOpen, defaultRequestType]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter FDR records for the search dropdown
  const filteredFDRs = fdrRecords.filter((fdr) => {
    if (!fdrSearchQuery.trim()) return true;
    const q = fdrSearchQuery.toLowerCase();
    return (
      fdr.fdrNumber?.toLowerCase().includes(q) ||
      fdr.bankName?.toLowerCase().includes(q) ||
      fdr.institutionName?.toLowerCase().includes(q)
    );
  });

  // Field validation
  const validateField = (name, value) => {
    switch (name) {
      case 'remarks':
        if (!value.trim()) return 'Remarks / reason is required.';
        if (value.trim().length < 10) return 'Please provide at least 10 characters.';
        return '';
      case 'proposedInterestRate': {
        if (!value) return ''; // optional
        const r = parseFloat(value);
        if (isNaN(r) || r < 0 || r > 25) return 'Enter a valid rate between 0 and 25%.';
        return '';
      }
      case 'proposedMaturityDate': {
        if (!value) return ''; // optional
        const d = new Date(value);
        if (isNaN(d.getTime())) return 'Invalid date.';
        if (selectedFDR?.maturityDate && d <= new Date(selectedFDR.maturityDate)) {
          return 'Proposed maturity must be after current maturity date.';
        }
        return '';
      }
      default:
        return '';
    }
  };

  const validateStep2 = () => {
    const newErrors = {};
    const remarksErr = validateField('remarks', formData.remarks);
    if (remarksErr) newErrors.remarks = remarksErr;

    if (requestType === 'Renewal') {
      const rateErr = validateField('proposedInterestRate', formData.proposedInterestRate);
      if (rateErr) newErrors.proposedInterestRate = rateErr;
      const matErr = validateField('proposedMaturityDate', formData.proposedMaturityDate);
      if (matErr) newErrors.proposedMaturityDate = matErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleNextStep = () => {
    if (!selectedFDR) {
      setErrors({ fdr: 'Please select an FDR record to continue.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ remarks: true, proposedInterestRate: true, proposedMaturityDate: true });
    if (!validateStep2()) return;

    // Build renewal / release details objects
    const renewalDetails =
      requestType === 'Renewal'
        ? {
            proposedTenure: formData.proposedTenure || null,
            proposedInterestRate: formData.proposedInterestRate
              ? parseFloat(formData.proposedInterestRate)
              : null,
            proposedMaturityDate: formData.proposedMaturityDate || null,
          }
        : null;

    const releaseDetails =
      requestType === 'Release'
        ? {
            releaseReason: formData.releaseReason || null,
            beneficiaryRemarks: formData.beneficiaryRemarks || null,
          }
        : null;

    // Verify FDR still exists in records (guard against stale selection)
    const fdrStillExists = fdrRecords.find((r) => r.id === selectedFDR.id);
    if (!fdrStillExists) {
      setErrors({ fdr: 'The selected FDR no longer exists. Please refresh and try again.' });
      setStep(1);
      return;
    }

    const newRequest = createRequest(
      {
        fdrId: selectedFDR.id,
        fdrNumber: selectedFDR.fdrNumber,
        bankName: selectedFDR.bankName,
        requestType,
        remarks: formData.remarks.trim(),
        renewalDetails,
        releaseDetails,
      },
      existingRequests
    );

    onSubmit(newRequest);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container req-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-icon-badge ${requestType === 'Release' ? 'bg-amber-soft' : ''}`}>
              {requestType === 'Renewal' ? (
                <RotateCw size={22} className="text-blue" />
              ) : (
                <Unlock size={22} className="text-amber" />
              )}
            </div>
            <div>
              <h3 className="modal-title text-navy">Submit New Request</h3>
              <p className="modal-cert-ref">
                {step === 1
                  ? 'Step 1 of 2 — Select FDR and request type'
                  : `Step 2 of 2 — ${requestType} details for ${selectedFDR?.fdrNumber}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: FDR Selection */}
        {step === 1 && (
          <div className="modal-body form-modal-body">
            {/* Request Type Toggle */}
            <div className="form-section-card">
              <h4 className="form-section-title">1. Request Type</h4>
              <div className="req-type-toggle">
                <button
                  type="button"
                  className={`req-type-btn ${requestType === 'Renewal' ? 'req-type-active-renewal' : ''}`}
                  onClick={() => setRequestType('Renewal')}
                >
                  <RotateCw size={16} />
                  <span>FDR Renewal Request</span>
                </button>
                <button
                  type="button"
                  className={`req-type-btn ${requestType === 'Release' ? 'req-type-active-release' : ''}`}
                  onClick={() => setRequestType('Release')}
                >
                  <Unlock size={16} />
                  <span>Security Release Request</span>
                </button>
              </div>
              <p className="field-hint" style={{ marginTop: '0.5rem' }}>
                {requestType === 'Renewal'
                  ? 'Submit when an FDR is approaching maturity and requires extension under APH norms.'
                  : 'Submit when an institution has completed the mandated lock-in period and seeks deposit release.'}
              </p>
            </div>

            {/* FDR Selection */}
            <div className="form-section-card">
              <h4 className="form-section-title">
                2. Select FDR Record <span className="req-star">*</span>
              </h4>

              {/* Search */}
              <div className="req-fdr-search-wrap">
                <Search size={15} className="req-fdr-search-icon" />
                <input
                  type="text"
                  className="form-input req-fdr-search-input"
                  placeholder="Search by FDR number, bank, or institution..."
                  value={fdrSearchQuery}
                  onChange={(e) => setFdrSearchQuery(e.target.value)}
                />
              </div>

              {errors.fdr && (
                <div className="req-field-error-banner">
                  <AlertCircle size={14} />
                  <span>{errors.fdr}</span>
                </div>
              )}

              {/* FDR List */}
              <div className="req-fdr-list">
                {filteredFDRs.length === 0 ? (
                  <div className="req-fdr-empty">
                    <HelpCircle size={24} className="text-muted" />
                    <p>No FDR records match your search.</p>
                  </div>
                ) : (
                  filteredFDRs.map((fdr) => {
                    const isSelected = selectedFDR?.id === fdr.id;
                    return (
                      <button
                        key={fdr.id}
                        type="button"
                        className={`req-fdr-item ${isSelected ? 'req-fdr-item-selected' : ''}`}
                        onClick={() => {
                          setSelectedFDR(fdr);
                          setErrors((prev) => ({ ...prev, fdr: '' }));
                        }}
                      >
                        <div className="req-fdr-item-left">
                          {isSelected ? (
                            <CheckCircle size={16} className="text-blue" />
                          ) : (
                            <div className="req-fdr-unselected-dot" />
                          )}
                          <div className="req-fdr-item-info">
                            <span className="req-fdr-number font-mono">{fdr.fdrNumber}</span>
                            <span className="req-fdr-bank">{fdr.bankName}</span>
                          </div>
                        </div>
                        <div className="req-fdr-item-right">
                          <span className="req-fdr-amount">{formatINR(fdr.principalAmount)}</span>
                          <span className="req-fdr-dates">
                            Matures: {formatDate(fdr.maturityDate)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected FDR preview */}
              {selectedFDR && (
                <div className="req-fdr-selected-preview">
                  <div className="preview-row">
                    <span className="preview-label">FDR Number:</span>
                    <span className="preview-val font-mono">{selectedFDR.fdrNumber}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Bank:</span>
                    <span className="preview-val">{selectedFDR.bankName}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Principal:</span>
                    <span className="preview-val">{formatINR(selectedFDR.principalAmount)}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Issue Date:</span>
                    <span className="preview-val">{formatDate(selectedFDR.issueDate)}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Maturity Date:</span>
                    <span className="preview-val">{formatDate(selectedFDR.maturityDate)}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Institution:</span>
                    <span className="preview-val">{selectedFDR.institutionName}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-modal-close" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn-banner-add-fdr" onClick={handleNextStep}>
                <span>Continue to Details</span>
                <ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body form-modal-body">
              {/* Selected FDR Summary Banner */}
              <div className="req-selected-fdr-banner">
                <div className="req-banner-icon">
                  {requestType === 'Renewal' ? (
                    <RotateCw size={14} className="text-blue" />
                  ) : (
                    <Unlock size={14} className="text-amber" />
                  )}
                </div>
                <div>
                  <span className="req-banner-type">
                    {requestType} Request
                  </span>
                  {' · '}
                  <span className="req-banner-fdrno font-mono">{selectedFDR?.fdrNumber}</span>
                  {' · '}
                  <span className="req-banner-bank">{selectedFDR?.bankName}</span>
                </div>
              </div>

              {/* Remarks */}
              <div className="form-section-card">
                <h4 className="form-section-title">
                  1. Reason & Remarks <span className="req-star">*</span>
                </h4>
                <div className="form-group">
                  <label htmlFor="remarks" className="form-label">
                    {requestType === 'Renewal'
                      ? 'Renewal Justification / Remarks'
                      : 'Release Justification / Remarks'}{' '}
                    <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows={3}
                    className={`form-textarea ${errors.remarks ? 'input-error' : ''}`}
                    placeholder={
                      requestType === 'Renewal'
                        ? 'e.g. FDR approaching maturity. Institution seeks 3-year renewal under APH 2026-27 norms...'
                        : 'e.g. Institution has completed 10-year lock-in. All compliance obligations met. Requesting NOC for release...'
                    }
                    value={formData.remarks}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.remarks && (
                    <span className="field-error-msg">{errors.remarks}</span>
                  )}
                  <span className="field-hint">
                    Minimum 10 characters. This will be recorded in the request history.
                  </span>
                </div>
              </div>

              {/* Renewal-specific fields */}
              {requestType === 'Renewal' && (
                <div className="form-section-card">
                  <h4 className="form-section-title">2. Proposed Renewal Terms (Optional)</h4>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="proposedTenure" className="form-label">
                        Proposed Renewal Tenure
                      </label>
                      <select
                        id="proposedTenure"
                        name="proposedTenure"
                        className="form-select"
                        value={formData.proposedTenure}
                        onChange={handleChange}
                      >
                        <option value="">— Select tenure —</option>
                        {RENEWAL_TENURE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="proposedInterestRate" className="form-label">
                        Proposed Interest Rate (% p.a.)
                      </label>
                      <div className="input-with-adornment">
                        <input
                          type="number"
                          id="proposedInterestRate"
                          name="proposedInterestRate"
                          min="0"
                          max="25"
                          step="0.05"
                          className={`form-input ${errors.proposedInterestRate ? 'input-error' : ''}`}
                          placeholder="e.g. 7.25"
                          value={formData.proposedInterestRate}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <span className="adornment-tag end">%</span>
                      </div>
                      {errors.proposedInterestRate && (
                        <span className="field-error-msg">{errors.proposedInterestRate}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="proposedMaturityDate" className="form-label">
                        Proposed New Maturity Date
                      </label>
                      <input
                        type="date"
                        id="proposedMaturityDate"
                        name="proposedMaturityDate"
                        className={`form-input ${errors.proposedMaturityDate ? 'input-error' : ''}`}
                        value={formData.proposedMaturityDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {errors.proposedMaturityDate && (
                        <span className="field-error-msg">{errors.proposedMaturityDate}</span>
                      )}
                      <span className="field-hint">Must be after current maturity date.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Release-specific fields */}
              {requestType === 'Release' && (
                <div className="form-section-card">
                  <h4 className="form-section-title">2. Release Details (Optional)</h4>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="releaseReason" className="form-label">
                        Release Reason / Regulatory Basis
                      </label>
                      <input
                        type="text"
                        id="releaseReason"
                        name="releaseReason"
                        className="form-input"
                        placeholder="e.g. Completion of 10-year mandatory lock-in period"
                        value={formData.releaseReason}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="beneficiaryRemarks" className="form-label">
                        Beneficiary / Payment Remarks
                      </label>
                      <input
                        type="text"
                        id="beneficiaryRemarks"
                        name="beneficiaryRemarks"
                        className="form-input"
                        placeholder="e.g. Refund to Managing Trust A/c at Canara Bank"
                        value={formData.beneficiaryRemarks}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button type="submit" className="btn-banner-add-fdr">
                {requestType === 'Renewal' ? (
                  <RotateCw size={15} />
                ) : (
                  <Unlock size={15} />
                )}
                <span>Submit {requestType} Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
