import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCw,
  Unlock,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  AlertCircle,
  Eye,
  RefreshCw,
  FilePlus,
} from 'lucide-react';
import { formatDate } from '../data/sampleFDRs';

// ─── Status Badge ─────────────────────────────────────────────────────────────
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
      <Icon size={11} />
      <span>{status}</span>
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function RequestTypeBadge({ type }) {
  if (type === 'Renewal') {
    return (
      <span className="req-type-badge req-type-renewal">
        <RotateCw size={11} />
        <span>Renewal</span>
      </span>
    );
  }
  return (
    <span className="req-type-badge req-type-release">
      <Unlock size={11} />
      <span>Release</span>
    </span>
  );
}

// ─── Format ISO timestamp ─────────────────────────────────────────────────────
function formatTimestampShort(iso) {
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

// ─── Summary Stat Card ────────────────────────────────────────────────────────
function ReqStatCard({ label, value, icon: Icon, colorClass, pillClass }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{label}</span>
        <div className={`stat-icon-wrapper ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="stat-primary-value">{value}</div>
      <div className="stat-card-footer">
        <span className={`stat-pill ${pillClass}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RequestManagement({
  requests = [],
  fdrRecords = [],
  activeNav = 'renewal_requests',
  onNewRequest,
  onViewRequest,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(() => {
    if (activeNav === 'renewal_requests') return 'Renewal';
    if (activeNav === 'release_requests') return 'Release';
    return 'all';
  });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | status string

  // Keep typeFilter in sync when user switches navigation tabs in the sidebar
  useEffect(() => {
    if (activeNav === 'renewal_requests') {
      setTypeFilter('Renewal');
    } else if (activeNav === 'release_requests') {
      setTypeFilter('Release');
    }
  }, [activeNav]);

  // Summary statistics (calculated from the full or type-filtered request set)
  const scopedRequests = useMemo(() => {
    if (typeFilter !== 'all') {
      return requests.filter((r) => r.requestType === typeFilter);
    }
    return requests;
  }, [requests, typeFilter]);

  const stats = useMemo(() => ({
    total: scopedRequests.length,
    requested: scopedRequests.filter((r) => r.status === 'Requested').length,
    underReview: scopedRequests.filter((r) => r.status === 'Under Review').length,
    approved: scopedRequests.filter((r) => r.status === 'Approved').length,
    rejected: scopedRequests.filter((r) => r.status === 'Rejected').length,
  }), [scopedRequests]);

  // Filtered list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.requestRef?.toLowerCase().includes(q) ||
        req.fdrNumber?.toLowerCase().includes(q) ||
        req.bankName?.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || req.requestType === typeFilter;
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, searchQuery, typeFilter, statusFilter]);

  const isFiltered =
    searchQuery.trim() !== '' ||
    (typeFilter !== 'all' &&
      ((activeNav === 'renewal_requests' && typeFilter !== 'Renewal') ||
        (activeNav === 'release_requests' && typeFilter !== 'Release') ||
        (activeNav !== 'renewal_requests' && activeNav !== 'release_requests'))) ||
    statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    if (activeNav === 'renewal_requests') {
      setTypeFilter('Renewal');
    } else if (activeNav === 'release_requests') {
      setTypeFilter('Release');
    } else {
      setTypeFilter('all');
    }
    setStatusFilter('all');
  };

  const handleCreateClick = () => {
    const defaultType =
      typeFilter === 'Renewal'
        ? 'Renewal'
        : typeFilter === 'Release'
        ? 'Release'
        : activeNav === 'release_requests'
        ? 'Release'
        : 'Renewal';
    if (onNewRequest) {
      onNewRequest(defaultType);
    }
  };

  const isReleaseView = activeNav === 'release_requests' && typeFilter === 'Release';
  const isRenewalView = activeNav === 'renewal_requests' && typeFilter === 'Renewal';

  return (
    <div className="view-dashboard">
      {/* ── Page Banner ─────────────────────────────────────────────────────── */}
      <div className="gov-welcome-banner">
        <div className="banner-left">
          <div className="gov-emblem-badge">
            {isReleaseView ? (
              <Unlock size={26} className="text-amber" />
            ) : (
              <RotateCw size={26} className="text-navy" />
            )}
          </div>
          <div>
            <h2 className="banner-title">
              {isReleaseView
                ? 'Security Deposit Release Requests'
                : isRenewalView
                ? 'FDR Renewal & Extension Requests'
                : 'Renewal & Release Request Management'}
            </h2>
            <p className="banner-desc">
              {isReleaseView
                ? 'Process NOC and refund requests upon completion of mandated lock-in period under AICTE Norms.'
                : isRenewalView
                ? 'Review institutional requests for tenure extension and interest revision on maturing security deposits.'
                : 'Submit and track FDR renewal and security deposit release requests under AICTE APH norms.'}
            </p>
          </div>
        </div>
        <div className="banner-actions">
          <button type="button" className="btn-banner-add-fdr" onClick={handleCreateClick}>
            <Plus size={16} />
            <span>
              {isReleaseView
                ? 'Submit Release Request'
                : isRenewalView
                ? 'Submit Renewal Request'
                : 'Submit New Request'}
            </span>
          </button>
          <div className="system-sync-tag">
            <span className="dot-pulse" />
            <span>{requests.length} Total Requests</span>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <section className="dashboard-section">
        <div className="section-header-compact">
          <h3 className="section-heading">
            {typeFilter === 'Renewal'
              ? 'Renewal Requests Overview'
              : typeFilter === 'Release'
              ? 'Release Requests Overview'
              : 'All Requests Portfolio Overview'}
          </h3>
          <span className="section-subheading">
            Aggregated metrics for {scopedRequests.length} {typeFilter === 'all' ? 'total' : typeFilter.toLowerCase()} requests
          </span>
        </div>
        <div className="stat-cards-grid">
          <ReqStatCard label="Total Requests" value={stats.total}      icon={FileText}    colorClass="bg-navy"    pillClass="pill-navy" />
          <ReqStatCard label="Requested"      value={stats.requested}  icon={AlertCircle} colorClass="bg-blue"    pillClass="pill-blue" />
          <ReqStatCard label="Under Review"   value={stats.underReview}icon={Clock}       colorClass="bg-amber"   pillClass="pill-amber" />
          <ReqStatCard label="Approved"       value={stats.approved}   icon={CheckCircle2}colorClass="bg-emerald" pillClass="pill-emerald" />
          <ReqStatCard label="Rejected"       value={stats.rejected}   icon={XCircle}     colorClass="bg-rose"    pillClass="pill-rose" />
        </div>
      </section>

      {/* ── Request Table ───────────────────────────────────────────────────── */}
      <section className="dashboard-section">
        <div className="table-container-card">
          {/* Table Toolbar */}
          <div className="table-top-bar">
            <div className="table-heading-area">
              <h2 className="table-main-title">
                {typeFilter === 'Renewal'
                  ? 'Renewal Request Register'
                  : typeFilter === 'Release'
                  ? 'Release Request Register'
                  : 'All Requests Register'}
              </h2>
              <p className="table-sub-title">
                Showing {filteredRequests.length} of {requests.length} total requests
              </p>
            </div>
            <div className="table-actions-header">
              <div className="active-count-indicator">
                <span className="count-badge">{filteredRequests.length}</span>
                <span>matching</span>
              </div>
              {isFiltered && (
                <button
                  type="button"
                  className="btn-reset-filters"
                  onClick={handleResetFilters}
                >
                  <RefreshCw size={14} />
                  <span>Reset Filters</span>
                </button>
              )}
              <button type="button" className="btn-add-fdr" onClick={handleCreateClick}>
                <FilePlus size={16} />
                <span>New Request</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="table-filter-bar">
            <div className="search-filter-group">
              <div className="table-search-input-wrap">
                <Search size={16} className="search-field-icon" />
                <input
                  type="text"
                  placeholder="Search by request ref, FDR #, or bank..."
                  className="table-search-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="dropdown-filter-group">
              <div className="filter-select-wrapper">
                <Filter size={14} className="search-field-icon" />
                <span className="filter-label">Type:</span>
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Renewal">Renewal Only</option>
                  <option value="Release">Release Only</option>
                </select>
              </div>
              <div className="filter-select-wrapper">
                <span className="filter-label">Status:</span>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Requested">Requested</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive-wrapper">
            <table className="fdr-data-table">
              <thead>
                <tr>
                  <th>Request Ref</th>
                  <th>FDR Number</th>
                  <th>Depository Bank</th>
                  <th>Type</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty-row">
                      <div className="empty-state-box">
                        <div className="empty-icon-wrapper">
                          <FileText size={28} className="text-muted" />
                        </div>
                        {requests.length === 0 ? (
                          <>
                            <div className="empty-title">No Requests Submitted Yet</div>
                            <p className="empty-description">
                              Click "Submit New Request" to create your first renewal or release
                              request linked to an existing FDR record.
                            </p>
                            <button
                              type="button"
                              className="btn-add-fdr"
                              onClick={handleCreateClick}
                            >
                              <Plus size={15} />
                              <span>Submit New Request</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="empty-title">No Requests Match Your Filters</div>
                            <p className="empty-description">
                              Try clearing your search query or switching the type / status dropdowns.
                            </p>
                            <button
                              type="button"
                              className="btn-reset-filters"
                              onClick={handleResetFilters}
                            >
                              <RefreshCw size={14} />
                              <span>Reset Filters</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <span className="fdr-code">{req.requestRef}</span>
                      </td>
                      <td>
                        <span className="fdr-code">{req.fdrNumber || '—'}</span>
                      </td>
                      <td>
                        <span className="font-medium" style={{ fontSize: '0.8125rem' }}>
                          {req.bankName || '—'}
                        </span>
                      </td>
                      <td>
                        <RequestTypeBadge type={req.requestType} />
                      </td>
                      <td>
                        <span className="date-val">{formatTimestampShort(req.submittedAt)}</span>
                      </td>
                      <td>
                        <RequestStatusBadge status={req.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-view-details"
                          onClick={() => onViewRequest(req)}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
