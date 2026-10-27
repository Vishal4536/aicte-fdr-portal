import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building,
  Landmark,
  Calendar,
  Percent,
  RefreshCw,
  Clock,
  ArrowUpDown,
  FilePlus,
} from 'lucide-react';
import {
  formatINR,
  formatDate,
  computeFDRStatus,
  getDaysRemaining,
  BANK_OPTIONS,
  STATUS_OPTIONS,
} from '../data/sampleFDRs';

export default function FDRTable({
  records,
  onViewDetails,
  onOpenAddModal,
  onEditRecord,
  onDeleteRecord,
  searchQuery,
  setSearchQuery,
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedBankFilter,
  setSelectedBankFilter,
  title = 'Security Deposit / FDR Master Registry',
  subtitle = 'Centralized view of AICTE joint-account fixed deposit receipts',
  hideFilters = false,
  hideAddButton = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState(null);
  const [sortBy, setSortBy] = useState('maturityDate'); // 'maturityDate' | 'principalAmount' | 'institutionName'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Copy FDR Number helper
  const handleCopyFdr = (fdrNumber, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(fdrNumber);
    setCopiedId(fdrNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter records based on search, status, and bank
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const status = computeFDRStatus(record);

      // Status filter
      if (selectedStatusFilter && selectedStatusFilter !== 'all') {
        if (status !== selectedStatusFilter) return false;
      }

      // Bank filter
      if (selectedBankFilter && selectedBankFilter !== 'All Banks') {
        if (record.bankName !== selectedBankFilter) return false;
      }

      // Search query (case-insensitive across FDR number, certificate, bank, institution, purpose, state)
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const fdrMatch = record.fdrNumber?.toLowerCase().includes(query);
        const certMatch = record.certificateNo?.toLowerCase().includes(query);
        const bankMatch = record.bankName?.toLowerCase().includes(query);
        const instMatch = record.institutionName?.toLowerCase().includes(query);
        const codeMatch = record.institutionCode?.toLowerCase().includes(query);
        const purposeMatch = record.depositPurpose?.toLowerCase().includes(query);
        const stateMatch = record.state?.toLowerCase().includes(query);

        if (!fdrMatch && !certMatch && !bankMatch && !instMatch && !codeMatch && !purposeMatch && !stateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, selectedStatusFilter, selectedBankFilter]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'principalAmount') {
        valA = Number(a.principalAmount) || 0;
        valB = Number(b.principalAmount) || 0;
      } else if (sortBy === 'institutionName') {
        valA = (a.institutionName || '').toLowerCase();
        valB = (b.institutionName || '').toLowerCase();
      } else {
        // maturityDate default
        valA = new Date(a.maturityDate).getTime() || 0;
        valB = new Date(b.maturityDate).getTime() || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortBy, sortOrder]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, selectedBankFilter, pageSize]);

  // Pagination calculation
  const totalItems = sortedRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + pageSize);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatusFilter('all');
    setSelectedBankFilter('All Banks');
    setCurrentPage(1);
  };

  const isFiltered =
    (searchQuery && searchQuery.trim() !== '') ||
    selectedStatusFilter !== 'all' ||
    selectedBankFilter !== 'All Banks';

  return (
    <div className="table-container-card">
      {/* Header and Filter Controls */}
      <div className="table-top-bar">
        <div className="table-heading-area">
          <h2 className="table-main-title">{title}</h2>
          <p className="table-sub-title">{subtitle}</p>
        </div>

        <div className="table-actions-header">
          <div className="active-count-indicator">
            <span className="count-badge">{totalItems}</span>
            <span>of {records.length} records</span>
          </div>

          {isFiltered && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}

          {!hideAddButton && onOpenAddModal && (
            <button
              type="button"
              className="btn-add-fdr"
              onClick={onOpenAddModal}
            >
              <FilePlus size={16} />
              <span>Add FDR Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      {!hideFilters && (
        <div className="table-filter-bar">
          <div className="search-filter-group">
            <div className="table-search-input-wrap">
              <Search size={16} className="search-field-icon" />
              <input
                type="text"
                placeholder="Search by FDR #, Bank, Institution, or State..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="table-search-field"
              />
            </div>
          </div>

          <div className="dropdown-filter-group">
            {/* Status Filter */}
            <div className="filter-select-wrapper">
              <label htmlFor="status-filter" className="filter-label">
                Status:
              </label>
              <select
                id="status-filter"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="filter-select"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Filter */}
            <div className="filter-select-wrapper">
              <label htmlFor="bank-filter" className="filter-label">
                Bank:
              </label>
              <select
                id="bank-filter"
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="filter-select"
              >
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="table-responsive-wrapper">
        <table className="fdr-data-table">
          <thead>
            <tr>
              <th className="col-fdr">FDR / Ref No.</th>
              <th className="col-bank">Bank Name</th>
              <th
                className="col-institution sortable"
                onClick={() => handleSort('institutionName')}
              >
                <div className="th-content">
                  <span>Institution / Beneficiary</span>
                  <ArrowUpDown size={13} className="sort-icon" />
                </div>
              </th>
              <th className="col-purpose">Deposit Purpose</th>
              <th
                className="col-amount sortable text-right"
                onClick={() => handleSort('principalAmount')}
              >
                <div className="th-content text-right">
                  <span>Principal Amount</span>
                  <ArrowUpDown size={13} className="sort-icon" />
                </div>
              </th>
              <th className="col-rate text-center">Interest</th>
              <th className="col-issue">Issue Date</th>
              <th
                className="col-maturity sortable"
                onClick={() => handleSort('maturityDate')}
              >
                <div className="th-content">
                  <span>Maturity Date</span>
                  <ArrowUpDown size={13} className="sort-icon" />
                </div>
              </th>
              <th className="col-status">Status</th>
              <th className="col-actions text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((record) => {
                const status = computeFDRStatus(record);
                const daysRemaining = getDaysRemaining(record.maturityDate);

                return (
                  <tr
                    key={record.id}
                    className={`fdr-row row-status-${status}`}
                    onClick={() => onViewDetails && onViewDetails(record)}
                  >
                    {/* FDR Reference */}
                    <td className="col-fdr">
                      <div className="fdr-number-cell">
                        <span className="fdr-code">{record.fdrNumber}</span>
                        <button
                          type="button"
                          className="btn-copy-icon"
                          onClick={(e) => handleCopyFdr(record.fdrNumber, e)}
                          title="Copy FDR Number"
                        >
                          {copiedId === record.fdrNumber ? (
                            <Check size={13} className="text-emerald" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                      <span className="app-id-pill">
                        App ID: {record.aicteAppId}
                      </span>
                    </td>

                    {/* Bank Name */}
                    <td className="col-bank">
                      <div className="bank-cell">
                        <span className="bank-name-text">{record.bankName}</span>
                        <span className="branch-text" title={record.bankBranch}>
                          {record.bankBranch}
                        </span>
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="col-institution">
                      <div className="institution-cell">
                        <span
                          className="inst-name-text"
                          title={record.institutionName}
                        >
                          {record.institutionName}
                        </span>
                        <div className="inst-meta">
                          <span className="inst-code-pill">
                            {record.institutionCode}
                          </span>
                          <span className="inst-state">{record.state}</span>
                        </div>
                      </div>
                    </td>

                    {/* Purpose */}
                    <td className="col-purpose">
                      <div
                        className="purpose-text"
                        title={record.depositPurpose}
                      >
                        {record.depositPurpose}
                      </div>
                    </td>

                    {/* Principal Amount */}
                    <td className="col-amount text-right">
                      <span className="amount-val">
                        {formatINR(record.principalAmount)}
                      </span>
                      <span className="tenure-val">
                        {record.tenureYears || 5} Yr Lock-in
                      </span>
                    </td>

                    {/* Interest Rate */}
                    <td className="col-rate text-center">
                      <span className="interest-pill">
                        {record.interestRate}% p.a.
                      </span>
                    </td>

                    {/* Issue Date */}
                    <td className="col-issue">
                      <span className="date-val">
                        {formatDate(record.issueDate)}
                      </span>
                    </td>

                    {/* Maturity Date */}
                    <td className="col-maturity">
                      <div className="maturity-cell">
                        <span className="date-val font-semibold">
                          {formatDate(record.maturityDate)}
                        </span>
                        {daysRemaining !== null && (
                          <span
                            className={`days-pill ${
                              daysRemaining < 0
                                ? 'days-overdue'
                                : daysRemaining <= 30
                                ? 'days-warning'
                                : 'days-normal'
                            }`}
                          >
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)}d overdue`
                              : daysRemaining === 0
                              ? 'Due today'
                              : `In ${daysRemaining}d`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="col-status">
                      {status === 'active' && (
                        <span className="status-badge status-active">
                          <span className="status-dot"></span>
                          <span>Active</span>
                        </span>
                      )}
                      {status === 'expiring_soon' && (
                        <span className="status-badge status-expiring">
                          <Clock size={12} className="status-icon" />
                          <span>Expiring Soon</span>
                        </span>
                      )}
                      {status === 'matured' && (
                        <span className="status-badge status-matured">
                          <AlertCircle size={12} className="status-icon" />
                          <span>Matured</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Group: Inspect, Edit, Delete */}
                    <td
                      className="col-actions text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="row-actions-group">
                        <button
                          type="button"
                          className="btn-action-icon btn-action-inspect"
                          onClick={() => onViewDetails && onViewDetails(record)}
                          title="Inspect FDR Particulars"
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
              })
            ) : (
              /* Empty State */
              <tr>
                <td colSpan="10" className="table-empty-row">
                  <div className="empty-state-box">
                    <div className="empty-icon-wrapper">
                      <AlertCircle size={36} className="text-muted" />
                    </div>
                    <h3 className="empty-title">No matching FDR records found</h3>
                    <p className="empty-description">
                      No fixed deposit records match your current search query or
                      filter criteria. Try adjusting your parameters or clear all filters.
                    </p>
                    <div className="empty-state-actions">
                      <button
                        type="button"
                        className="btn-clear-empty"
                        onClick={handleResetFilters}
                      >
                        <RefreshCw size={15} />
                        <span>Clear All Filters</span>
                      </button>
                      {!hideAddButton && onOpenAddModal && (
                        <button
                          type="button"
                          className="btn-add-from-empty"
                          onClick={onOpenAddModal}
                        >
                          <FilePlus size={15} />
                          <span>Add New FDR Record</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      <div className="table-pagination-bar">
        <div className="pagination-info">
          {totalItems > 0 ? (
            <span>
              Showing <strong>{startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of{' '}
              <strong>{totalItems}</strong> records
            </span>
          ) : (
            <span>0 records found</span>
          )}
        </div>

        <div className="pagination-controls">
          <div className="page-size-selector">
            <label htmlFor="page-size" className="page-size-label">
              Rows:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="page-size-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="page-nav-btns">
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            <span className="current-page-badge">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
