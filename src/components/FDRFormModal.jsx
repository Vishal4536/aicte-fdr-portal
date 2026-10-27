import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  Edit3,
  Building,
  Landmark,
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { BANK_OPTIONS } from '../data/sampleFDRs';

const COMMON_DEPOSIT_PURPOSES = [
  'Mandatory Security Deposit - New Institute Approval (Engineering & Tech)',
  'Mandatory Security Deposit - Establishment of Technical Campus',
  'Introduction of New Supernumerary UG Programs (AI & Data Science)',
  'Introduction of New PGDM / MBA Program',
  'Increase in Approved Intake from 60 to 120 (B.Pharm)',
  'Establishment of New Diploma Institute in Emerging Technologies',
  'Establishment of New Women Engineering Institution (Concession Rate)',
  'Mandatory Security Deposit - New Institute Approval (10-Year Lock-in)',
  'New Specialized Institution in Industry 4.0 / Robotics',
  'Mandatory Security Deposit - MBA & MCA Dual Department',
];

const MAJOR_BANKS = BANK_OPTIONS.filter((b) => b !== 'All Banks');

export default function FDRFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingRecord = null,
  existingRecords = [],
}) {
  const isEditMode = Boolean(editingRecord);

  // Form state
  const [formData, setFormData] = useState({
    fdrNumber: '',
    bankName: '',
    customBankName: '',
    institutionName: '',
    depositPurpose: '',
    customPurpose: '',
    principalAmount: '',
    interestRate: '',
    issueDate: '',
    maturityDate: '',
    remarks: '',
    // Additional optional details
    aicteAppId: '',
    certificateNo: '',
    bankBranch: '',
    ifscCode: '',
    state: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset or prefill form data when opened / record changed
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setTouched({});
      return;
    }

    if (editingRecord) {
      const isKnownBank = MAJOR_BANKS.includes(editingRecord.bankName);
      const isKnownPurpose = COMMON_DEPOSIT_PURPOSES.includes(
        editingRecord.depositPurpose
      );

      setFormData({
        fdrNumber: editingRecord.fdrNumber || '',
        bankName: isKnownBank ? editingRecord.bankName : 'Other',
        customBankName: isKnownBank ? '' : editingRecord.bankName || '',
        institutionName: editingRecord.institutionName || '',
        depositPurpose: isKnownPurpose ? editingRecord.depositPurpose : 'Other',
        customPurpose: isKnownPurpose ? '' : editingRecord.depositPurpose || '',
        principalAmount: editingRecord.principalAmount?.toString() || '',
        interestRate: editingRecord.interestRate?.toString() || '',
        issueDate: editingRecord.issueDate || '',
        maturityDate: editingRecord.maturityDate || '',
        remarks: editingRecord.remarks || '',
        aicteAppId: editingRecord.aicteAppId || '',
        certificateNo: editingRecord.certificateNo || '',
        bankBranch: editingRecord.bankBranch || '',
        ifscCode: editingRecord.ifscCode || '',
        state: editingRecord.state || '',
      });
    } else {
      // Default blank values for new record
      setFormData({
        fdrNumber: '',
        bankName: 'State Bank of India',
        customBankName: '',
        institutionName: '',
        depositPurpose: COMMON_DEPOSIT_PURPOSES[0],
        customPurpose: '',
        principalAmount: '',
        interestRate: '7.10',
        issueDate: new Date().toISOString().split('T')[0],
        maturityDate: '',
        remarks: '',
        aicteAppId: '',
        certificateNo: '',
        bankBranch: '',
        ifscCode: '',
        state: '',
      });
    }
    setErrors({});
    setTouched({});
  }, [isOpen, editingRecord]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validation function
  const validateField = (name, value, currentFormData = formData) => {
    let error = '';

    switch (name) {
      case 'fdrNumber': {
        const trimmed = value.trim();
        if (!trimmed) {
          error = 'FDR / Reference number is required.';
        } else {
          // Check for duplicates (case-insensitive & whitespace-trimmed)
          const lower = trimmed.toLowerCase();
          const duplicate = existingRecords.find((rec) => {
            // When editing, ignore the record itself
            if (isEditMode && rec.id === editingRecord.id) {
              return false;
            }
            return rec.fdrNumber?.trim().toLowerCase() === lower;
          });
          if (duplicate) {
            error = `FDR number "${trimmed}" is already registered in the portal.`;
          }
        }
        break;
      }

      case 'bankName':
        if (!value) {
          error = 'Bank name is required.';
        }
        break;

      case 'customBankName':
        if (currentFormData.bankName === 'Other' && !value.trim()) {
          error = 'Please specify the depository bank name.';
        }
        break;

      case 'institutionName':
        if (!value.trim()) {
          error = 'Institution / Beneficiary name is required.';
        }
        break;

      case 'depositPurpose':
        if (!value) {
          error = 'Deposit purpose is required.';
        }
        break;

      case 'customPurpose':
        if (currentFormData.depositPurpose === 'Other' && !value.trim()) {
          error = 'Please specify the deposit purpose.';
        }
        break;

      case 'principalAmount': {
        const amt = parseFloat(value);
        if (value === '' || isNaN(amt)) {
          error = 'Principal amount is required.';
        } else if (amt <= 0) {
          error = 'Principal amount must be greater than zero.';
        }
        break;
      }

      case 'interestRate': {
        const rate = parseFloat(value);
        if (value === '' || isNaN(rate)) {
          error = 'Interest rate is required.';
        } else if (rate < 0) {
          error = 'Interest rate cannot be negative.';
        } else if (rate > 25) {
          error = 'Interest rate appears unusually high (>25%).';
        }
        break;
      }

      case 'issueDate': {
        if (!value) {
          error = 'Issue date is required.';
        } else {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            error = 'Invalid issue date.';
          }
        }
        break;
      }

      case 'maturityDate': {
        if (!value) {
          error = 'Maturity date is required.';
        } else {
          const mat = new Date(value);
          if (isNaN(mat.getTime())) {
            error = 'Invalid maturity date.';
          } else if (currentFormData.issueDate) {
            const iss = new Date(currentFormData.issueDate);
            if (!isNaN(iss.getTime()) && mat <= iss) {
              error = 'Maturity date must be later than the issue date.';
            }
          }
        }
        break;
      }

      default:
        break;
    }

    return error;
  };

  const validateAll = () => {
    const newErrors = {};
    const fieldsToValidate = [
      'fdrNumber',
      'bankName',
      'customBankName',
      'institutionName',
      'depositPurpose',
      'customPurpose',
      'principalAmount',
      'interestRate',
      'issueDate',
      'maturityDate',
    ];

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, formData[f], formData);
      if (err) {
        newErrors[f] = err;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (touched[name]) {
      const err = validateField(name, value, updated);
      setErrors((prev) => ({ ...prev, [name]: err }));

      // If issueDate changes, also re-validate maturityDate
      if (name === 'issueDate' && formData.maturityDate) {
        const matErr = validateField('maturityDate', formData.maturityDate, updated);
        setErrors((prev) => ({ ...prev, maturityDate: matErr }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value, formData);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({
      fdrNumber: true,
      bankName: true,
      customBankName: true,
      institutionName: true,
      depositPurpose: true,
      customPurpose: true,
      principalAmount: true,
      interestRate: true,
      issueDate: true,
      maturityDate: true,
    });

    if (!validateAll()) {
      return;
    }

    // Determine final bank name and purpose
    const finalBank =
      formData.bankName === 'Other'
        ? formData.customBankName.trim()
        : formData.bankName;

    const finalPurpose =
      formData.depositPurpose === 'Other'
        ? formData.customPurpose.trim()
        : formData.depositPurpose;

    const principal = parseFloat(formData.principalAmount);
    const rate = parseFloat(formData.interestRate);

    // Calculate approximate tenure in years
    const iss = new Date(formData.issueDate);
    const mat = new Date(formData.maturityDate);
    const diffYears = Math.max(
      1,
      Math.round((mat - iss) / (1000 * 60 * 60 * 24 * 365.25))
    );

    const recordToSave = {
      ...(editingRecord || {}),
      fdrNumber: formData.fdrNumber.trim(),
      bankName: finalBank,
      institutionName: formData.institutionName.trim(),
      depositPurpose: finalPurpose,
      principalAmount: principal,
      interestRate: rate,
      issueDate: formData.issueDate,
      maturityDate: formData.maturityDate,
      remarks: formData.remarks.trim() || 'Verified and recorded in AICTE portal.',
      tenureYears: diffYears,
      // Optional preserved or defaulted fields
      certificateNo:
        formData.certificateNo.trim() ||
        (editingRecord?.certificateNo ||
          `${finalBank.substring(0, 3).toUpperCase()}-FDR-${Math.floor(
            1000000 + Math.random() * 9000000
          )}`),
      aicteAppId:
        formData.aicteAppId.trim() ||
        (editingRecord?.aicteAppId ||
          `1-${Math.floor(1000000000 + Math.random() * 9000000000)}`),
      bankBranch:
        formData.bankBranch.trim() ||
        (editingRecord?.bankBranch || `${finalBank} Main City Branch`),
      ifscCode:
        formData.ifscCode.trim() ||
        (editingRecord?.ifscCode || 'SBIN0000001'),
      institutionCode:
        editingRecord?.institutionCode ||
        `AICTE-INST-${Math.floor(1000 + Math.random() * 9000)}`,
      trustName:
        editingRecord?.trustName ||
        `${formData.institutionName.trim()} Educational Trust`,
      state: formData.state.trim() || editingRecord?.state || 'National Capital Region',
      autoRenewal: editingRecord?.autoRenewal ?? true,
      lienStatus:
        editingRecord?.lienStatus ||
        'Lien Marked in Favor of Member Secretary, AICTE',
      jointHolder:
        editingRecord?.jointHolder ||
        `Member Secretary AICTE & Chairman, ${formData.institutionName.trim()}`,
    };

    onSubmit(recordToSave, isEditMode);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container fdr-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-icon-badge ${isEditMode ? 'bg-amber-soft' : ''}`}>
              {isEditMode ? (
                <Edit3 size={22} className="text-amber" />
              ) : (
                <FilePlus size={22} className="text-blue" />
              )}
            </div>
            <div>
              <h3 className="modal-title text-navy">
                {isEditMode ? 'Edit Security Deposit / FDR' : 'Add New Security Deposit / FDR'}
              </h3>
              <p className="modal-cert-ref">
                {isEditMode
                  ? `Updating record: ${editingRecord.fdrNumber} • Stable ID: ${editingRecord.id}`
                  : 'Enter institutional fixed deposit details under AICTE APH regulations.'}
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body form-modal-body">
            {/* Top Form Banner */}
            <div className="form-info-strip">
              <Landmark size={16} className="text-blue flex-shrink-0" />
              <span>
                Mandatory fields marked with <span className="req-star">*</span>. All
                deposits must be held in joint custody with Member Secretary, AICTE.
              </span>
            </div>

            {/* SECTION 1: PRIMARY IDENTIFICATION */}
            <div className="form-section-card">
              <h4 className="form-section-title">
                1. Identification & Depository Institution
              </h4>

              <div className="form-grid-2">
                {/* FDR Reference Number */}
                <div className="form-group">
                  <label htmlFor="fdrNumber" className="form-label">
                    FDR / Reference Number <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="fdrNumber"
                    name="fdrNumber"
                    className={`form-input font-mono ${
                      errors.fdrNumber ? 'input-error' : ''
                    }`}
                    placeholder="e.g. FDR/AICTE/2026/1042"
                    value={formData.fdrNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {errors.fdrNumber && (
                    <span className="field-error-msg">{errors.fdrNumber}</span>
                  )}
                  <span className="field-hint">
                    Unique receipt number issued by the depository bank.
                  </span>
                </div>

                {/* Depository Bank */}
                <div className="form-group">
                  <label htmlFor="bankName" className="form-label">
                    Depository Bank <span className="req-star">*</span>
                  </label>
                  <select
                    id="bankName"
                    name="bankName"
                    className={`form-select ${errors.bankName ? 'input-error' : ''}`}
                    value={formData.bankName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  >
                    {MAJOR_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="Other">Other Scheduled Commercial Bank</option>
                  </select>
                  {errors.bankName && (
                    <span className="field-error-msg">{errors.bankName}</span>
                  )}
                </div>
              </div>

              {/* Custom Bank Name if "Other" */}
              {formData.bankName === 'Other' && (
                <div className="form-group mt-2">
                  <label htmlFor="customBankName" className="form-label">
                    Specify Bank Name <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="customBankName"
                    name="customBankName"
                    className={`form-input ${
                      errors.customBankName ? 'input-error' : ''
                    }`}
                    placeholder="Enter scheduled commercial bank name"
                    value={formData.customBankName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.customBankName && (
                    <span className="field-error-msg">
                      {errors.customBankName}
                    </span>
                  )}
                </div>
              )}

              {/* Institution / Beneficiary Name */}
              <div className="form-group mt-3">
                <label htmlFor="institutionName" className="form-label">
                  Institution / Beneficiary Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  id="institutionName"
                  name="institutionName"
                  className={`form-input ${
                    errors.institutionName ? 'input-error' : ''
                  }`}
                  placeholder="e.g. Sardar Patel Institute of Technology & Research"
                  value={formData.institutionName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.institutionName && (
                  <span className="field-error-msg">
                    {errors.institutionName}
                  </span>
                )}
              </div>

              {/* Deposit Purpose */}
              <div className="form-group mt-3">
                <label htmlFor="depositPurpose" className="form-label">
                  Deposit Purpose <span className="req-star">*</span>
                </label>
                <select
                  id="depositPurpose"
                  name="depositPurpose"
                  className={`form-select ${
                    errors.depositPurpose ? 'input-error' : ''
                  }`}
                  value={formData.depositPurpose}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                >
                  {COMMON_DEPOSIT_PURPOSES.map((purp) => (
                    <option key={purp} value={purp}>
                      {purp}
                    </option>
                  ))}
                  <option value="Other">Other Specific Regulatory Purpose</option>
                </select>
                {errors.depositPurpose && (
                  <span className="field-error-msg">
                    {errors.depositPurpose}
                  </span>
                )}
              </div>

              {formData.depositPurpose === 'Other' && (
                <div className="form-group mt-2">
                  <label htmlFor="customPurpose" className="form-label">
                    Specify Purpose Details <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="customPurpose"
                    name="customPurpose"
                    className={`form-input ${
                      errors.customPurpose ? 'input-error' : ''
                    }`}
                    placeholder="Enter approved regulatory purpose"
                    value={formData.customPurpose}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.customPurpose && (
                    <span className="field-error-msg">
                      {errors.customPurpose}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: FINANCIAL & TENOR DETAILS */}
            <div className="form-section-card">
              <h4 className="form-section-title">
                2. Financial Particulars & Tenor Dates
              </h4>

              <div className="form-grid-2">
                {/* Principal Amount */}
                <div className="form-group">
                  <label htmlFor="principalAmount" className="form-label">
                    Principal Amount (in INR ₹) <span className="req-star">*</span>
                  </label>
                  <div className="input-with-adornment">
                    <span className="adornment-tag">₹</span>
                    <input
                      type="number"
                      id="principalAmount"
                      name="principalAmount"
                      min="1"
                      step="1"
                      className={`form-input adorned ${
                        errors.principalAmount ? 'input-error' : ''
                      }`}
                      placeholder="e.g. 3500000"
                      value={formData.principalAmount}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                  </div>
                  {errors.principalAmount && (
                    <span className="field-error-msg">
                      {errors.principalAmount}
                    </span>
                  )}
                  <span className="field-hint">
                    Norms: ₹15L (Diploma/PGDM), ₹35L (New Engg), ₹50L+ (Campus).
                  </span>
                </div>

                {/* Interest Rate */}
                <div className="form-group">
                  <label htmlFor="interestRate" className="form-label">
                    Interest Rate (% p.a.) <span className="req-star">*</span>
                  </label>
                  <div className="input-with-adornment">
                    <input
                      type="number"
                      id="interestRate"
                      name="interestRate"
                      min="0"
                      max="25"
                      step="0.05"
                      className={`form-input ${
                        errors.interestRate ? 'input-error' : ''
                      }`}
                      placeholder="e.g. 7.10"
                      value={formData.interestRate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                    <span className="adornment-tag end">%</span>
                  </div>
                  {errors.interestRate && (
                    <span className="field-error-msg">
                      {errors.interestRate}
                    </span>
                  )}
                  <span className="field-hint">
                    Contracted bank interest rate at the time of deposit.
                  </span>
                </div>
              </div>

              <div className="form-grid-2 mt-3">
                {/* Issue Date */}
                <div className="form-group">
                  <label htmlFor="issueDate" className="form-label">
                    Issue Date <span className="req-star">*</span>
                  </label>
                  <input
                    type="date"
                    id="issueDate"
                    name="issueDate"
                    className={`form-input ${errors.issueDate ? 'input-error' : ''}`}
                    value={formData.issueDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {errors.issueDate && (
                    <span className="field-error-msg">{errors.issueDate}</span>
                  )}
                </div>

                {/* Maturity Date */}
                <div className="form-group">
                  <label htmlFor="maturityDate" className="form-label">
                    Maturity Date <span className="req-star">*</span>
                  </label>
                  <input
                    type="date"
                    id="maturityDate"
                    name="maturityDate"
                    className={`form-input ${
                      errors.maturityDate ? 'input-error' : ''
                    }`}
                    value={formData.maturityDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {errors.maturityDate && (
                    <span className="field-error-msg">
                      {errors.maturityDate}
                    </span>
                  )}
                  <span className="field-hint">
                    Must be later than the issue date.
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: REMARKS & OPTIONAL RECORD METADATA */}
            <div className="form-section-card">
              <h4 className="form-section-title">
                3. Regulatory Scrutiny Remarks & Custody Notes
              </h4>

              <div className="form-group">
                <label htmlFor="remarks" className="form-label">
                  Remarks / Scrutiny Notes
                </label>
                <textarea
                  id="remarks"
                  name="remarks"
                  rows={2}
                  className="form-textarea"
                  placeholder="e.g. Verified by Regional Officer during 2026-27 approval cycle. Auto-renewal clause checked."
                  value={formData.remarks}
                  onChange={handleChange}
                ></textarea>
                <span className="field-hint">
                  Optional notes for AICTE Finance Cell and Regional Office.
                </span>
              </div>

              {/* Optional details row for thoroughness */}
              <div className="form-grid-3 mt-3">
                <div className="form-group">
                  <label htmlFor="bankBranch" className="form-label">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    id="bankBranch"
                    name="bankBranch"
                    className="form-input"
                    placeholder="e.g. Connaught Place Branch"
                    value={formData.bankBranch}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ifscCode" className="form-label">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    id="ifscCode"
                    name="ifscCode"
                    className="form-input font-mono"
                    placeholder="e.g. SBIN0000691"
                    value={formData.ifscCode}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state" className="form-label">
                    State / Region
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    className="form-input"
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-modal-submit"
            >
              {isEditMode ? (
                <>
                  <CheckCircle size={16} />
                  <span>Save Record Changes</span>
                </>
              ) : (
                <>
                  <FilePlus size={16} />
                  <span>Add Security Deposit FDR</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
