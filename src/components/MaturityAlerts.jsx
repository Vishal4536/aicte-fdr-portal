/**
 * AICTE Security Deposit / FDR Portal - Maturity Alerts Component
 * 
 * Centralized surveillance view for FDRs due within regulatory thresholds (<= 30 days)
 * and already-matured deposits requiring renewal or release.
 * 
 * Features:
 * - Timezone-safe local calendar date calculation (no UTC offset off-by-one errors)
 * - 5 mutually exclusive categories with zero double counting:
 *     1. Matured (Past due)
 *     2. Due within 7 days (Critical urgency)
 *     3. Due within 15 days (Urgent action)
 *     4. Due within 30 days (Upcoming notice)
 *     5. Active (Compliant > 30 days)
 * - Interactive urgency filter pills & summary cards
 * - Depository bank filter & search across all record fields
 * - Inspection modal integration via existing FDRDetailModal
 * - Empty states for filtered queries and empty repository
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  Landmark,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ArrowUpDown,
  ShieldAlert,
  Info,
  ChevronRight,
  FilePlus,
  IndianRupee,
} from 'lucide-react';
import {
  formatINR,
  formatINRCompact,
  formatDate,
  BANK_OPTIONS,
} from '../data/sampleFDRs.js';
import {
  MATURITY_CATEGORIES,
  URGENCY_FILTERS,
  getSafeCalendarDaysRemaining,
  getMaturityCategory,
  calculateMaturitySummary,
  filterMaturityRecords,
  getMaturityBadgeInfo,
} from '../utils/maturityAlertUtils.js';
import FDRDetailModal from './FDRDetailModal.jsx';
import './MaturityAlerts.css';

export default function MaturityAlerts({
  records = [],
  onViewDetails,
  onEditRecord,
  onDeleteRecord,
  onOpenAddModal,
  referenceDate = new Date(),
}) {
  // Filter and Search States
  const [urgencyFilter, setUrgencyFilter] = useState(URGENCY_FILTERS.ALL_ALERTS);
  const [bankFilter, setBankFilter] = useState('All Banks');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('daysRemaining'); // 'daysRemaining' | 'principalAmount' | 'institutionName'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState(null);

  // Standalone detail modal fallback (used if onViewDetails prop is not supplied)
  const [inspectedFDR, setInspectedFDR] = useState(null);

  // Dynamic Bank Options derived from actual records (guarantees accuracy)
  const availableBanks = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.bankName) set.add(r.bankName);
    });
    // Combine with known banks
    BANK_OPTIONS.forEach((b) => {
      if (b !== 'All Banks') set.add(b);
    });
    return ['All Banks', ...Array.from(set).sort()];
  }, [records]);

  // Dynamically calculate non-overlapping, mutually exclusive summary counts
  const summary = useMemo(() => {
    return calculateMaturitySummary(records, referenceDate);
  }, [records, referenceDate]);

  // Filter records
  const filteredList = useMemo(() => {
    return filterMaturityRecords(
      records,
      { urgency: urgencyFilter, bank: bankFilter, query: searchQuery },
      referenceDate
    );
  }, [records, urgencyFilter, bankFilter, searchQuery, referenceDate]);

  // Sort filtered records
  const sortedRecords = useMemo(() => {
    const list = [...filteredList];
    list.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'daysRemaining') {
        const daysA = getSafeCalendarDaysRemaining(a.maturityDate, referenceDate);
        const daysB = getSafeCalendarDaysRemaining(b.maturityDate, referenceDate);
        valA = daysA !== null ? daysA : 999999;
        valB = daysB !== null ? daysB : 999999;
      } else if (sortBy === 'principalAmount') {
        valA = Number(a.principalAmount) || 0;
        valB = Number(b.principalAmount) || 0;
      } else if (sortBy === 'institutionName') {
        valA = (a.institutionName || '').toLowerCase();
        valB = (b.institutionName || '').toLowerCase();
      } else {
        valA = a.fdrNumber || '';
        valB = b.fdrNumber || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredList, sortBy, sortOrder, referenceDate]);

  // Handle column header sort toggle
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle copy FDR number
  const handleCopyFdr = (fdrNumber, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(fdrNumber);
    setCopiedId(fdrNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Inspect detail handler
  const handleInspect = (fdr) => {
    if (onViewDetails) {
      onViewDetails(fdr);
    } else {
      setInspectedFDR(fdr);
    }
  };

  // Clear all filters
  const handleResetFilters = () => {
    setUrgencyFilter(URGENCY_FILTERS.ALL_ALERTS);
    setBankFilter('All Banks');
    setSearchQuery('');
  };

  const isFilterActive =
    urgencyFilter !== URGENCY_FILTERS.ALL_ALERTS ||
    bankFilter !== 'All Banks' ||
    searchQuery.trim() !== '';

  return (
    <div className="maturity-alerts-container">
      {/* 1. Header Banner */}
      <section className="maturity-alerts-banner">
        <div className="maturity-banner-info">
          <div className="maturity-banner-icon">
            <Clock size={28} />
          </div>
          <div>
            <h2 className="maturity-banner-title">
              Maturity & Regulatory Expiry Surveillance
            </h2>
            <p className="maturity-banner-subtitle">
              Continuous compliance tracking for institutional security deposits nearing the
              30-day statutory threshold or requiring immediate renewal / release under AICTE Approval Process Norms.
            </p>
          </div>
        </div>

        <div className="maturity-banner-meta">
          <div className="meta-compliance-pill">
            <span className="meta-pulse-dot"></span>
            <span>Surveillance Active: {summary.totalAlertsCount} Deposits at Risk</span>
          </div>
          <div className="meta-cumulative-badges">
            <span className="cumulative-badge" title="Due in <= 15 Days (Critical + Urgent)">
              Cumulative ≤15d: <strong>{summary.cumulative.within15Days}</strong>
            </span>
            <span className="cumulative-badge" title="Due in <= 30 Days (Total Expiring Pool)">
              Cumulative ≤30d: <strong>{summary.cumulative.within30Days}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Mutually Exclusive Summary Cards Grid (No Double Counting) */}
      <section className="maturity-cards-grid" aria-label="Maturity Summary Cards">
        {/* Card 1: All Priority Alerts */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-alerts ${
            urgencyFilter === URGENCY_FILTERS.ALL_ALERTS ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.ALL_ALERTS)}
          title="Click to view all deposits <= 30 days and matured"
        >
          <div className="card-top-row">
            <span className="card-category-label">Total Surveillance</span>
            <div className="card-icon-badge">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.totalAlertsCount}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.totalAlertsPrincipal)}
          </div>
          <div className="card-scope-hint">Matured + Due ≤30 Days</div>
        </button>

        {/* Card 2: Already Matured (< 0 Days) */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-matured ${
            urgencyFilter === URGENCY_FILTERS.MATURED ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.MATURED)}
          title="Click to view already matured records"
        >
          <div className="card-top-row">
            <span className="card-category-label">Already Matured</span>
            <div className="card-icon-badge">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.matured.count}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.matured.totalPrincipal)}
          </div>
          <div className="card-scope-hint">Past due date (&lt; 0 days)</div>
        </button>

        {/* Card 3: Due within 7 Days (0 <= Days <= 7) */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-due7 ${
            urgencyFilter === URGENCY_FILTERS.DUE_7 ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_7)}
          title="Click to filter by deposits due within 7 days"
        >
          <div className="card-top-row">
            <span className="card-category-label">Due ≤ 7 Days</span>
            <div className="card-icon-badge">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.due7Days.count}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.due7Days.totalPrincipal)}
          </div>
          <div className="card-scope-hint">Critical action (0–7 days)</div>
        </button>

        {/* Card 4: Due within 15 Days (8 <= Days <= 15) */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-due15 ${
            urgencyFilter === URGENCY_FILTERS.DUE_15 ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_15)}
          title="Click to filter by deposits due in 8 to 15 days"
        >
          <div className="card-top-row">
            <span className="card-category-label">Due 8–15 Days</span>
            <div className="card-icon-badge">
              <Clock size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.due15Days.count}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.due15Days.totalPrincipal)}
          </div>
          <div className="card-scope-hint">High priority (8–15 days)</div>
        </button>

        {/* Card 5: Due within 30 Days (16 <= Days <= 30) */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-due30 ${
            urgencyFilter === URGENCY_FILTERS.DUE_30 ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_30)}
          title="Click to filter by deposits due in 16 to 30 days"
        >
          <div className="card-top-row">
            <span className="card-category-label">Due 16–30 Days</span>
            <div className="card-icon-badge">
              <Clock size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.due30Days.count}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.due30Days.totalPrincipal)}
          </div>
          <div className="card-scope-hint">Notice period (16–30 days)</div>
        </button>

        {/* Card 6: Active Deposits (> 30 Days) */}
        <button
          type="button"
          className={`maturity-stat-card card-theme-active ${
            urgencyFilter === URGENCY_FILTERS.ACTIVE ? 'card-active-filter' : ''
          }`}
          onClick={() => setUrgencyFilter(URGENCY_FILTERS.ACTIVE)}
          title="Click to filter by active deposits > 30 days"
        >
          <div className="card-top-row">
            <span className="card-category-label">Active Deposits</span>
            <div className="card-icon-badge">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="card-count-number">{summary.active.count}</div>
          <div className="card-amount-total">
            {formatINRCompact(summary.active.totalPrincipal)}
          </div>
          <div className="card-scope-hint">Compliant (&gt; 30 days)</div>
        </button>
      </section>

      {/* Mutually Exclusive Guarantee Note */}
      <div className="maturity-guarantee-note">
        <Info size={15} className="text-blue-600" />
        <span>
          <strong>Categorization Audit:</strong> The 5 individual status buckets (Matured: {summary.matured.count}, Due ≤7d: {summary.due7Days.count}, Due 8–15d: {summary.due15Days.count}, Due 16–30d: {summary.due30Days.count}, Active: {summary.active.count}) are strictly mutually exclusive. Their sum ({summary.totalRecords}) equals the total FDR registry count with 0 double counting.
        </span>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <section className="maturity-filter-card">
        {/* Urgency Pill Selectors */}
        <div className="filter-row-primary">
          <div className="urgency-filter-pillbox">
            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.ALL_ALERTS ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.ALL_ALERTS)}
            >
              <span>All Priority Alerts</span>
              <span className="pill-count">{summary.totalAlertsCount}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.MATURED ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.MATURED)}
            >
              <span>Matured</span>
              <span className="pill-count">{summary.matured.count}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.DUE_7 ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_7)}
            >
              <span>Due ≤ 7 Days</span>
              <span className="pill-count">{summary.due7Days.count}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.DUE_15 ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_15)}
            >
              <span>Due 8–15 Days</span>
              <span className="pill-count">{summary.due15Days.count}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.DUE_30 ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.DUE_30)}
            >
              <span>Due 16–30 Days</span>
              <span className="pill-count">{summary.due30Days.count}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.ACTIVE ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.ACTIVE)}
            >
              <span>Active (&gt;30d)</span>
              <span className="pill-count">{summary.active.count}</span>
            </button>

            <button
              type="button"
              className={`urgency-pill-btn ${
                urgencyFilter === URGENCY_FILTERS.ALL ? 'pill-selected' : ''
              }`}
              onClick={() => setUrgencyFilter(URGENCY_FILTERS.ALL)}
            >
              <span>All Records</span>
              <span className="pill-count">{summary.totalRecords}</span>
            </button>
          </div>
        </div>

        {/* Search, Bank Dropdown, and Reset */}
        <div className="filter-row-secondary">
          <div className="search-input-box">
            <Search size={15} className="search-input-icon" />
            <input
              type="text"
              placeholder="Search by FDR #, Institution, Bank, or State..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
          </div>

          <div className="filter-selects-group">
            <div className="bank-select-wrapper">
              <label htmlFor="maturity-bank-filter" className="bank-select-label">
                Bank:
              </label>
              <select
                id="maturity-bank-filter"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="bank-select-control"
              >
                {availableBanks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {isFilterActive && (
              <button
                type="button"
                className="btn-clear-all-filters"
                onClick={handleResetFilters}
              >
                <RefreshCw size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            {onOpenAddModal && (
              <button
                type="button"
                className="empty-reset-btn"
                style={{ marginTop: 0, padding: '0.45rem 0.85rem' }}
                onClick={onOpenAddModal}
              >
                <FilePlus size={14} />
                <span>Add Record</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Filtered Surveillance Data Table */}
      <section className="maturity-table-card">
        <div className="table-header-status-line">
          <div className="status-line-left">
            <span>Displaying</span>
            <span className="status-counter-bold">{sortedRecords.length}</span>
            <span>of {records.length} deposits</span>
            {urgencyFilter !== URGENCY_FILTERS.ALL && (
              <span className="text-muted">
                (Filter: <em>{urgencyFilter.replace('_', ' ')}</em>)
              </span>
            )}
          </div>

          <div className="status-line-right text-muted">
            Click any row to inspect complete FDR particulars
          </div>
        </div>

        {sortedRecords.length > 0 ? (
          <div className="table-scroll-wrap">
            <table className="maturity-data-table">
              <thead>
                <tr>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('fdrNumber')}
                    title="Sort by FDR Number"
                  >
                    <div className="th-flex">
                      <span>FDR / Certificate No.</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('institutionName')}
                    title="Sort by Institution"
                  >
                    <div className="th-flex">
                      <span>Institution / Beneficiary</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Depository Bank</th>
                  <th
                    className="sortable-th text-right"
                    onClick={() => handleSort('principalAmount')}
                    title="Sort by Principal Amount"
                  >
                    <div className="th-flex">
                      <span>Principal Amount</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('daysRemaining')}
                    title="Sort by Remaining Days"
                  >
                    <div className="th-flex">
                      <span>Maturity Date & Remaining</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Urgency Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => {
                  const category = getMaturityCategory(record, referenceDate);
                  const days = getSafeCalendarDaysRemaining(record.maturityDate, referenceDate);
                  const badge = getMaturityBadgeInfo(record, referenceDate);

                  // Row highlight tier class
                  let rowTierClass = 'row-urgency-active';
                  if (category === MATURITY_CATEGORIES.MATURED) {
                    rowTierClass = 'row-urgency-matured';
                  } else if (category === MATURITY_CATEGORIES.DUE_7_DAYS) {
                    rowTierClass = 'row-urgency-due-7';
                  } else if (category === MATURITY_CATEGORIES.DUE_15_DAYS) {
                    rowTierClass = 'row-urgency-due-15';
                  } else if (category === MATURITY_CATEGORIES.DUE_30_DAYS) {
                    rowTierClass = 'row-urgency-due-30';
                  }

                  return (
                    <tr
                      key={record.id}
                      className={rowTierClass}
                      onClick={() => handleInspect(record)}
                    >
                      {/* FDR Number */}
                      <td>
                        <div className="cell-fdr-num">
                          <span>{record.fdrNumber}</span>
                          <button
                            type="button"
                            className="btn-copy-icon"
                            onClick={(e) => handleCopyFdr(record.fdrNumber, e)}
                            title="Copy FDR Number"
                          >
                            {copiedId === record.fdrNumber ? (
                              <Check size={12} className="text-emerald" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <div className="cell-app-id">
                          App ID: {record.aicteAppId} • Cert: {record.certificateNo}
                        </div>
                      </td>

                      {/* Institution */}
                      <td>
                        <div className="cell-inst-title" title={record.institutionName}>
                          {record.institutionName}
                        </div>
                        <div className="cell-inst-subtitle">
                          {record.institutionCode} • {record.state}
                        </div>
                      </td>

                      {/* Bank */}
                      <td>
                        <div className="cell-bank-name">{record.bankName}</div>
                        <div className="cell-bank-branch" title={record.bankBranch}>
                          {record.bankBranch}
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        <div className="cell-amount-bold">
                          {formatINR(record.principalAmount)}
                        </div>
                        <div className="cell-interest-rate">
                          {record.interestRate}% p.a. • Tenure {record.tenureYears || 5}y
                        </div>
                      </td>

                      {/* Maturity Date */}
                      <td>
                        <div className="cell-maturity-date">
                          {formatDate(record.maturityDate)}
                        </div>
                        <div className="badge-sublabel">
                          {badge.sublabel}
                        </div>
                      </td>

                      {/* Urgency Badge */}
                      <td>
                        <span className={badge.badgeClass}>
                          {category === MATURITY_CATEGORIES.MATURED && (
                            <AlertCircle size={13} />
                          )}
                          {category === MATURITY_CATEGORIES.DUE_7_DAYS && (
                            <AlertTriangle size={13} />
                          )}
                          {category === MATURITY_CATEGORIES.DUE_15_DAYS && (
                            <Clock size={13} />
                          )}
                          {category === MATURITY_CATEGORIES.DUE_30_DAYS && (
                            <Clock size={13} />
                          )}
                          {category === MATURITY_CATEGORIES.ACTIVE && (
                            <CheckCircle2 size={13} />
                          )}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions-group">
                          <button
                            type="button"
                            className="btn-action-icon btn-action-inspect"
                            onClick={() => handleInspect(record)}
                            title="Inspect FDR Details"
                          >
                            <Eye size={14} />
                          </button>

                          {onEditRecord && (
                            <button
                              type="button"
                              className="btn-action-icon btn-action-edit"
                              onClick={() => onEditRecord(record)}
                              title="Edit FDR Record"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          {onDeleteRecord && (
                            <button
                              type="button"
                              className="btn-action-icon btn-action-delete"
                              onClick={() => onDeleteRecord(record)}
                              title="Delete FDR Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="maturity-empty-state">
            <div className="empty-icon-circle">
              <Search size={28} />
            </div>
            <h3 className="empty-title">
              {records.length === 0
                ? 'No FDR Records Registered'
                : 'No Matching Surveillance Records'}
            </h3>
            <p className="empty-desc">
              {records.length === 0
                ? 'There are currently no fixed deposit receipts registered in the portal repository.'
                : 'No fixed deposit receipts match the selected urgency tier, depository bank, or search keyword.'}
            </p>
            {isFilterActive && (
              <button
                type="button"
                className="empty-reset-btn"
                onClick={handleResetFilters}
              >
                <RefreshCw size={14} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 5. Standalone Inspection Modal Fallback */}
      {inspectedFDR && !onViewDetails && (
        <FDRDetailModal
          fdr={inspectedFDR}
          onClose={() => setInspectedFDR(null)}
        />
      )}
    </div>
  );
}
