import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  IndianRupee,
  Percent,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  FileQuestion,
  RefreshCw,
  ExternalLink,
  MapPin,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  computeFDRStatus,
  getDaysRemaining,
  calculateFDRStatistics,
  formatINR,
  formatINRCompact,
  formatDate,
} from '../data/sampleFDRs';
import { loadFDRRecords } from '../data/storage';
import {
  exportFDRsToCSV,
  exportBankSummaryToCSV,
  exportRegionalSummaryToCSV,
} from '../utils/exportCsv';

/**
 * AICTE Security Deposit / FDR Portal - Comprehensive Reports & CAG Audit Suite
 * 
 * Provides:
 * 1. Executive financial summary & portfolio health
 * 2. Depository bank concentration risk & weighted yield
 * 3. Regional Office & State-wise deposit breakdown
 * 4. Regulatory maturity horizon forecasting (≤30d, 90d, 1y, multi-year)
 * 5. Priority scrutiny watchlist with instant search & filtering
 * 6. Multi-format RFC 4180 CSV export suite
 */
export default function Reports({
  records: propsRecords,
  onViewRecord,
  showToast,
}) {
  // Use passed records or fall back to local storage
  const records = useMemo(() => {
    if (Array.isArray(propsRecords)) {
      return propsRecords;
    }
    return loadFDRRecords();
  }, [propsRecords]);

  // Active sub-tab inside Reports view
  const [activeTab, setActiveTab] = useState('bank_concentration'); // 'bank_concentration' | 'regional' | 'maturity'

  // Filter states
  const [bankFilter, setBankFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportNotice, setExportNotice] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Overall Statistics calculated from live FDR records
  const stats = useMemo(() => {
    return calculateFDRStatistics(records);
  }, [records]);

  // Filtered records for the scrutiny table
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      // Bank filter
      if (bankFilter !== 'All' && item.bankName !== bankFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        const itemStatus = computeFDRStatus(item);
        if (itemStatus !== statusFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const fdrMatch = item.fdrNumber?.toLowerCase().includes(q);
        const instMatch = item.institutionName?.toLowerCase().includes(q);
        const bankMatch = item.bankName?.toLowerCase().includes(q);
        const stateMatch = item.state?.toLowerCase().includes(q);
        const purposeMatch = item.depositPurpose?.toLowerCase().includes(q);
        if (!fdrMatch && !instMatch && !bankMatch && !stateMatch && !purposeMatch) return false;
      }

      return true;
    });
  }, [records, bankFilter, statusFilter, searchQuery]);

  // Depository Bank Concentration Summary
  const bankSummary = useMemo(() => {
    if (!records || records.length === 0) return [];

    const map = new Map();

    records.forEach((record) => {
      const bank = record.bankName || 'Unassigned / Other';
      const principal = Number(record.principalAmount) || 0;
      const rate = Number(record.interestRate) || 0;
      const status = computeFDRStatus(record);

      if (!map.has(bank)) {
        map.set(bank, {
          bankName: bank,
          count: 0,
          totalPrincipal: 0,
          sumRateWeighted: 0,
          activeCount: 0,
          expiringSoonCount: 0,
          maturedCount: 0,
        });
      }

      const entry = map.get(bank);
      entry.count += 1;
      entry.totalPrincipal += principal;
      entry.sumRateWeighted += rate * principal;

      if (status === 'active') entry.activeCount += 1;
      else if (status === 'expiring_soon') entry.expiringSoonCount += 1;
      else if (status === 'matured') entry.maturedCount += 1;
    });

    const totalPortfolio = stats.totalPrincipal || 1;

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        percentageOfTotal: (entry.totalPrincipal / totalPortfolio) * 100,
        weightedAvgRate:
          entry.totalPrincipal > 0
            ? (entry.sumRateWeighted / entry.totalPrincipal).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => b.totalPrincipal - a.totalPrincipal);
  }, [records, stats.totalPrincipal]);

  // Regional Office & State Breakdown
  const regionalSummary = useMemo(() => {
    if (!records || records.length === 0) return [];

    const map = new Map();

    records.forEach((record) => {
      const state = record.state || 'Unassigned State';
      const principal = Number(record.principalAmount) || 0;
      const status = computeFDRStatus(record);

      // Extract regional code from institutionCode if available (e.g., AICTE-NCR-0421 -> NCR)
      let regionCode = 'Central';
      if (record.institutionCode && record.institutionCode.includes('-')) {
        const parts = record.institutionCode.split('-');
        if (parts.length >= 2) regionCode = parts[1];
      }

      if (!map.has(state)) {
        map.set(state, {
          state,
          regionCode,
          count: 0,
          totalPrincipal: 0,
          activeCount: 0,
          expiringSoonCount: 0,
          maturedCount: 0,
        });
      }

      const entry = map.get(state);
      entry.count += 1;
      entry.totalPrincipal += principal;

      if (status === 'active') entry.activeCount += 1;
      else if (status === 'expiring_soon') entry.expiringSoonCount += 1;
      else if (status === 'matured') entry.maturedCount += 1;
    });

    const totalPortfolio = stats.totalPrincipal || 1;

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        percentageOfTotal: (entry.totalPrincipal / totalPortfolio) * 100,
      }))
      .sort((a, b) => b.totalPrincipal - a.totalPrincipal);
  }, [records, stats.totalPrincipal]);

  // Unique bank options
  const uniqueBanks = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.bankName) set.add(r.bankName);
    });
    return ['All', ...Array.from(set).sort()];
  }, [records]);

  // Maturity Horizons breakdown
  const maturityHorizons = useMemo(() => {
    const horizons = {
      matured: {
        id: 'matured',
        label: 'Already Matured',
        sublabel: 'Action Overdue / Release Due',
        count: 0,
        principal: 0,
        badgeClass: 'badge-danger',
        theme: 'rose',
      },
      critical30: {
        id: 'critical30',
        label: 'Expiring ≤ 30 Days',
        sublabel: 'Mandatory 30-Day Notice',
        count: 0,
        principal: 0,
        badgeClass: 'badge-warning',
        theme: 'amber',
      },
      near90: {
        id: 'near90',
        label: '31 – 90 Days',
        sublabel: 'Upcoming Quarter Horizon',
        count: 0,
        principal: 0,
        badgeClass: 'badge-info',
        theme: 'blue',
      },
      mid365: {
        id: 'mid365',
        label: '91 – 365 Days',
        sublabel: 'Annual Lock-in Horizon',
        count: 0,
        principal: 0,
        badgeClass: 'badge-emerald',
        theme: 'emerald',
      },
      longTerm: {
        id: 'longTerm',
        label: '> 1 Year',
        sublabel: 'Multi-Year Mandatory Lock-in',
        count: 0,
        principal: 0,
        badgeClass: 'badge-slate',
        theme: 'slate',
      },
    };

    records.forEach((record) => {
      const days = getDaysRemaining(record.maturityDate);
      const principal = Number(record.principalAmount) || 0;

      if (days === null) {
        horizons.longTerm.count += 1;
        horizons.longTerm.principal += principal;
      } else if (days < 0) {
        horizons.matured.count += 1;
        horizons.matured.principal += principal;
      } else if (days <= 30) {
        horizons.critical30.count += 1;
        horizons.critical30.principal += principal;
      } else if (days <= 90) {
        horizons.near90.count += 1;
        horizons.near90.principal += principal;
      } else if (days <= 365) {
        horizons.mid365.count += 1;
        horizons.mid365.principal += principal;
      } else {
        horizons.longTerm.count += 1;
        horizons.longTerm.principal += principal;
      }
    });

    return Object.values(horizons);
  }, [records]);

  // Overall Weighted Average Rate
  const overallAvgRate = useMemo(() => {
    if (!records || records.length === 0 || stats.totalPrincipal === 0) return '0.00';
    let totalWeighted = 0;
    records.forEach((r) => {
      const p = Number(r.principalAmount) || 0;
      const rate = Number(r.interestRate) || 0;
      totalWeighted += p * rate;
    });
    return (totalWeighted / stats.totalPrincipal).toFixed(2);
  }, [records, stats.totalPrincipal]);

  // Feedback helper
  const notify = (msg, type = 'success', title = 'Report Exported') => {
    if (showToast) {
      showToast(msg, type, title);
    } else {
      setExportNotice({ type, text: msg });
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Export handlers
  const handleExportMasterCSV = () => {
    setIsExportMenuOpen(false);
    exportFDRsToCSV(records, 'aicte-master-fdr-audit.csv', {
      onSuccess: (msg) => notify(msg, 'success', 'Master CSV Exported'),
      onError: (err) => notify(err, 'error', 'Export Failed'),
    });
  };

  const handleExportFilteredCSV = () => {
    setIsExportMenuOpen(false);
    exportFDRsToCSV(filteredRecords, 'aicte-filtered-audit.csv', {
      onSuccess: (msg) => notify(msg, 'success', 'Filtered CSV Exported'),
      onError: (err) => notify(err, 'error', 'Export Failed'),
    });
  };

  const handleExportUrgentCSV = () => {
    setIsExportMenuOpen(false);
    const urgent = records.filter((r) => {
      const s = computeFDRStatus(r);
      return s === 'expiring_soon' || s === 'matured';
    });
    exportFDRsToCSV(urgent, 'aicte-urgent-maturity-watchlist.csv', {
      onSuccess: (msg) => notify(msg, 'success', 'Urgent Watchlist Exported'),
      onError: (err) => notify(err, 'error', 'Export Failed'),
    });
  };

  const handleExportBankSummaryCSV = () => {
    setIsExportMenuOpen(false);
    exportBankSummaryToCSV(bankSummary, 'aicte-bank-concentration.csv', {
      onSuccess: (msg) => notify(msg, 'success', 'Bank Summary Exported'),
      onError: (err) => notify(err, 'error', 'Export Failed'),
    });
  };

  const handleExportRegionalSummaryCSV = () => {
    setIsExportMenuOpen(false);
    exportRegionalSummaryToCSV(regionalSummary, 'aicte-regional-breakdown.csv', {
      onSuccess: (msg) => notify(msg, 'success', 'Regional Breakdown Exported'),
      onError: (err) => notify(err, 'error', 'Export Failed'),
    });
  };

  // Browser print action
  const handlePrint = () => {
    window.print();
  };

  // Empty state handling
  if (!records || records.length === 0) {
    return (
      <div className="reports-container">
        <div className="reports-empty-state-card">
          <div className="empty-state-icon-box">
            <FileQuestion size={48} className="text-muted" />
          </div>
          <h3 className="empty-state-title">No FDR Records Available for Reporting</h3>
          <p className="empty-state-text">
            There are currently no institutional security deposits registered in the system.
            Once FDRs are registered or imported, bank concentration analyses, interest rates,
            and CAG audit forecasts will automatically populate here.
          </p>
          <div className="empty-state-actions">
            <button
              type="button"
              className="btn-export-csv disabled"
              disabled
              title="No data to export"
            >
              <Download size={16} />
              <span>Export CSV (0 records)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Inline feedback notice banner */}
      {exportNotice && (
        <div className={`reports-inline-notice ${exportNotice.type}`}>
          {exportNotice.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{exportNotice.text}</span>
        </div>
      )}

      {/* Reports Header & Actions */}
      <div className="reports-header-card">
        <div className="reports-header-main">
          <div className="reports-icon-badge">
            <BarChart3 size={28} className="reports-primary-icon" />
          </div>
          <div>
            <div className="reports-title-row">
              <h2 className="reports-main-title">Financial Reports & CAG Audit Intelligence</h2>
              <span className="reports-compliance-tag">APH 2026-27 Compliant</span>
            </div>
            <p className="reports-subtitle">
              Comprehensive institutional deposit analytics, depository exposure risk,
              regional distribution, and mandatory lock-in surveillance.
            </p>
          </div>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="btn-reports-action btn-print-report"
            onClick={handlePrint}
            title="Print report summary"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="reports-export-dropdown-wrapper">
            <button
              type="button"
              className="btn-reports-action btn-export-csv"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Open CSV export menu"
            >
              <Download size={16} />
              <span>Export CSV Suite</span>
              <ChevronDown size={14} />
            </button>

            {isExportMenuOpen && (
              <div className="export-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportMasterCSV}
                >
                  <FileSpreadsheet size={15} />
                  <div>
                    <strong>Master FDR Registry CSV</strong>
                    <span>All {records.length} institutional deposits with full metadata</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportUrgentCSV}
                >
                  <AlertTriangle size={15} className="text-amber-icon" />
                  <div>
                    <strong>Urgent Watchlist CSV</strong>
                    <span>
                      {stats.expiringSoonCount + stats.maturedCount} FDRs expiring ≤30d or matured
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportBankSummaryCSV}
                >
                  <Building2 size={15} />
                  <div>
                    <strong>Depository Bank Concentration CSV</strong>
                    <span>Bank-wise exposure, principal sums, and portfolio share</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportRegionalSummaryCSV}
                >
                  <MapPin size={15} />
                  <div>
                    <strong>Regional Office Breakdown CSV</strong>
                    <span>State and AICTE regional jurisdiction distribution</span>
                  </div>
                </button>

                {filteredRecords.length !== records.length && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={handleExportFilteredCSV}
                  >
                    <Filter size={15} />
                    <div>
                      <strong>Filtered Watchlist CSV</strong>
                      <span>Export currently filtered {filteredRecords.length} records</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Financial Overview KPIs */}
      <section className="reports-section">
        <div className="reports-section-header">
          <h3 className="reports-section-title">Portfolio Financial Overview</h3>
          <span className="reports-section-subtitle">
            Calculated across all {stats.totalRecords} institutional FDR accounts in joint custody
          </span>
        </div>

        <div className="reports-stats-grid">
          {/* Total FDRs */}
          <div className="report-stat-card theme-navy">
            <div className="stat-card-top">
              <span className="stat-label">Total FDR Records</span>
              <FileSpreadsheet size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{stats.totalRecords}</div>
            <div className="stat-subtext">
              {bankSummary.length} Partner Banks • {regionalSummary.length} States / Regions
            </div>
          </div>

          {/* Total Principal */}
          <div className="report-stat-card theme-blue">
            <div className="stat-card-top">
              <span className="stat-label">Total Security Principal</span>
              <IndianRupee size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{formatINRCompact(stats.totalPrincipal)}</div>
            <div className="stat-subtext">
              Full Value: <strong>{formatINR(stats.totalPrincipal)}</strong>
            </div>
          </div>

          {/* Active Deposits */}
          <div className="report-stat-card theme-emerald">
            <div className="stat-card-top">
              <span className="stat-label">Active Lock-in FDRs</span>
              <ShieldCheck size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{stats.activeCount}</div>
            <div className="stat-subtext">
              {formatINRCompact(stats.activePrincipal)} (
              {stats.totalRecords > 0
                ? Math.round((stats.activeCount / stats.totalRecords) * 100)
                : 0}
              % of portfolio)
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="report-stat-card theme-amber">
            <div className="stat-card-top">
              <span className="stat-label">Expiring in ≤30 Days</span>
              <Clock size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{stats.expiringSoonCount}</div>
            <div className="stat-subtext">
              {formatINRCompact(stats.expiringSoonPrincipal)} • Renewal Notice Mandatory
            </div>
          </div>

          {/* Matured Deposits */}
          <div className="report-stat-card theme-rose">
            <div className="stat-card-top">
              <span className="stat-label">Matured (Action Due)</span>
              <AlertTriangle size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{stats.maturedCount}</div>
            <div className="stat-subtext">
              {formatINRCompact(stats.maturedPrincipal)} • NOC / Release Required
            </div>
          </div>

          {/* Weighted Interest Rate */}
          <div className="report-stat-card theme-purple">
            <div className="stat-card-top">
              <span className="stat-label">Weighted Avg Interest Rate</span>
              <TrendingUp size={20} className="stat-icon" />
            </div>
            <div className="stat-main-num">{overallAvgRate}% p.a.</div>
            <div className="stat-subtext">Annual Accrued Yield to Institutes</div>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="reports-subnav-bar">
        <button
          type="button"
          className={`subnav-tab-btn ${activeTab === 'bank_concentration' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank_concentration')}
        >
          <Building2 size={16} />
          <span>Depository Bank Exposure ({bankSummary.length})</span>
        </button>

        <button
          type="button"
          className={`subnav-tab-btn ${activeTab === 'regional' ? 'active' : ''}`}
          onClick={() => setActiveTab('regional')}
        >
          <MapPin size={16} />
          <span>Regional & State Breakdown ({regionalSummary.length})</span>
        </button>

        <button
          type="button"
          className={`subnav-tab-btn ${activeTab === 'maturity' ? 'active' : ''}`}
          onClick={() => setActiveTab('maturity')}
        >
          <Calendar size={16} />
          <span>Maturity Horizons & Forecast (5 Tiers)</span>
        </button>
      </div>

      {/* TAB 1: BANK CONCENTRATION */}
      {activeTab === 'bank_concentration' && (
        <section className="reports-section">
          <div className="reports-section-header">
            <div>
              <h3 className="reports-section-title">Depository Bank Concentration Risk Analysis</h3>
              <span className="reports-section-subtitle">
                Scheduled commercial bank distribution, principal concentration, and interest yields
              </span>
            </div>
            <button
              type="button"
              className="btn-quick-export"
              onClick={handleExportBankSummaryCSV}
            >
              <Download size={14} />
              <span>Export Bank Exposure CSV</span>
            </button>
          </div>

          <div className="reports-table-card">
            <div className="table-responsive">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Depository Bank</th>
                    <th className="text-right">FDR Count</th>
                    <th className="text-right">Total Principal (INR)</th>
                    <th className="text-left" style={{ minWidth: '190px' }}>Portfolio Share</th>
                    <th className="text-right">Avg Rate (%)</th>
                    <th className="text-center">Status Distribution</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bankSummary.map((bankItem) => (
                    <tr key={bankItem.bankName} className="table-row-hover">
                      <td>
                        <div className="bank-name-cell">
                          <Building2 size={16} className="text-navy" />
                          <div>
                            <strong className="bank-name-title">{bankItem.bankName}</strong>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-medium">
                        {bankItem.count} {bankItem.count === 1 ? 'deposit' : 'deposits'}
                      </td>
                      <td className="text-right">
                        <div className="bank-principal-compact">
                          {formatINRCompact(bankItem.totalPrincipal)}
                        </div>
                        <div className="bank-principal-full text-muted">
                          {formatINR(bankItem.totalPrincipal)}
                        </div>
                      </td>
                      <td>
                        <div className="portfolio-share-wrapper">
                          <div className="portfolio-share-bar-bg">
                            <div
                              className="portfolio-share-bar-fill"
                              style={{ width: `${Math.max(bankItem.percentageOfTotal, 3)}%` }}
                            />
                          </div>
                          <span className="portfolio-share-percent">
                            {bankItem.percentageOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right font-mono font-medium">
                        {bankItem.weightedAvgRate}%
                      </td>
                      <td className="text-center">
                        <div className="bank-status-pillbox">
                          <span className="mini-status-pill active" title="Active">
                            {bankItem.activeCount} Act
                          </span>
                          {bankItem.expiringSoonCount > 0 && (
                            <span className="mini-status-pill warning" title="Expiring Soon">
                              {bankItem.expiringSoonCount} Exp
                            </span>
                          )}
                          {bankItem.maturedCount > 0 && (
                            <span className="mini-status-pill danger" title="Matured">
                              {bankItem.maturedCount} Mat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn-bank-export-mini"
                          onClick={() => {
                            const bRecords = records.filter((r) => r.bankName === bankItem.bankName);
                            exportFDRsToCSV(
                              bRecords,
                              `bank-${bankItem.bankName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`
                            );
                          }}
                          title={`Download ${bankItem.bankName} FDR records`}
                        >
                          <Download size={13} />
                          <span>CSV</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-footer-total">
                    <td>
                      <strong>Grand Total ({bankSummary.length} Depository Banks)</strong>
                    </td>
                    <td className="text-right">
                      <strong>{stats.totalRecords} FDRs</strong>
                    </td>
                    <td className="text-right">
                      <strong className="text-navy">{formatINR(stats.totalPrincipal)}</strong>
                    </td>
                    <td>
                      <strong>100.0%</strong>
                    </td>
                    <td className="text-right font-mono">
                      <strong>{overallAvgRate}%</strong>
                    </td>
                    <td className="text-center">
                      <span className="font-medium text-secondary">
                        {stats.activeCount} Act • {stats.expiringSoonCount} Exp • {stats.maturedCount} Mat
                      </span>
                    </td>
                    <td className="text-center">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: REGIONAL & STATE BREAKDOWN */}
      {activeTab === 'regional' && (
        <section className="reports-section">
          <div className="reports-section-header">
            <div>
              <h3 className="reports-section-title">Regional Office & State Jurisdiction Distribution</h3>
              <span className="reports-section-subtitle">
                Security deposits segmented by AICTE regional jurisdictions and states
              </span>
            </div>
            <button
              type="button"
              className="btn-quick-export"
              onClick={handleExportRegionalSummaryCSV}
            >
              <Download size={14} />
              <span>Export Regional CSV</span>
            </button>
          </div>

          <div className="reports-table-card">
            <div className="table-responsive">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>State / Union Territory</th>
                    <th>Regional Office Code</th>
                    <th className="text-right">FDR Count</th>
                    <th className="text-right">Total Security Deposit (INR)</th>
                    <th className="text-left" style={{ minWidth: '180px' }}>Portfolio Share</th>
                    <th className="text-center">Status Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalSummary.map((reg) => (
                    <tr key={reg.state} className="table-row-hover">
                      <td>
                        <div className="bank-name-cell">
                          <MapPin size={16} className="text-primary-blue" />
                          <div>
                            <strong className="bank-name-title">{reg.state}</strong>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="region-code-badge">AICTE-{reg.regionCode}</span>
                      </td>
                      <td className="text-right font-medium">
                        {reg.count} {reg.count === 1 ? 'deposit' : 'deposits'}
                      </td>
                      <td className="text-right">
                        <div className="bank-principal-compact">
                          {formatINRCompact(reg.totalPrincipal)}
                        </div>
                        <div className="bank-principal-full text-muted">
                          {formatINR(reg.totalPrincipal)}
                        </div>
                      </td>
                      <td>
                        <div className="portfolio-share-wrapper">
                          <div className="portfolio-share-bar-bg">
                            <div
                              className="portfolio-share-bar-fill"
                              style={{ width: `${Math.max(reg.percentageOfTotal, 3)}%` }}
                            />
                          </div>
                          <span className="portfolio-share-percent">
                            {reg.percentageOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="bank-status-pillbox">
                          <span className="mini-status-pill active">{reg.activeCount} Act</span>
                          {reg.expiringSoonCount > 0 && (
                            <span className="mini-status-pill warning">{reg.expiringSoonCount} Exp</span>
                          )}
                          {reg.maturedCount > 0 && (
                            <span className="mini-status-pill danger">{reg.maturedCount} Mat</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-footer-total">
                    <td>
                      <strong>National Total ({regionalSummary.length} States / Territories)</strong>
                    </td>
                    <td>—</td>
                    <td className="text-right">
                      <strong>{stats.totalRecords} FDRs</strong>
                    </td>
                    <td className="text-right">
                      <strong className="text-navy">{formatINR(stats.totalPrincipal)}</strong>
                    </td>
                    <td>
                      <strong>100.0%</strong>
                    </td>
                    <td className="text-center">
                      <span className="font-medium text-secondary">
                        {stats.activeCount} Act • {stats.expiringSoonCount} Exp • {stats.maturedCount} Mat
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: MATURITY HORIZONS & FORECAST */}
      {activeTab === 'maturity' && (
        <section className="reports-section">
          <div className="reports-section-header">
            <div>
              <h3 className="reports-section-title">Regulatory Maturity Horizons & Forecast</h3>
              <span className="reports-section-subtitle">
                Projected expiration distributions across AICTE regulatory surveillance windows
              </span>
            </div>
            <button
              type="button"
              className="btn-quick-export"
              onClick={handleExportUrgentCSV}
            >
              <Download size={14} />
              <span>Export Urgent Watchlist</span>
            </button>
          </div>

          <div className="maturity-horizon-grid">
            {maturityHorizons.map((h) => (
              <div key={h.id} className={`horizon-card theme-${h.theme}`}>
                <div className="horizon-card-top">
                  <span className="horizon-title">{h.label}</span>
                  <span className={`badge-pill ${h.badgeClass}`}>{h.count} FDRs</span>
                </div>
                <div className="horizon-amount">{formatINRCompact(h.principal)}</div>
                <div className="horizon-sublabel">{h.sublabel}</div>
                <div className="horizon-full-amount text-muted">{formatINR(h.principal)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chronological Maturity Scrutiny Watchlist Table */}
      <section className="reports-section">
        <div className="reports-section-header">
          <div>
            <h3 className="reports-section-title">Priority Maturity Scrutiny Watchlist</h3>
            <span className="reports-section-subtitle">
              Orderly surveillance of deposits requiring renewal notices or release clearances
            </span>
          </div>

          <div className="reports-filter-bar">
            {/* Search Input */}
            <div className="reports-search-box">
              <Search size={14} className="filter-icon" />
              <input
                type="text"
                className="reports-search-input"
                placeholder="Search FDR, institute, bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search scrutiny watchlist"
              />
            </div>

            {/* Status Filter */}
            <div className="filter-select-wrapper">
              <Filter size={14} className="filter-icon" />
              <select
                className="reports-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter watchlist by status"
              >
                <option value="All">All Statuses</option>
                <option value="expiring_soon">Expiring Soon (≤30 Days)</option>
                <option value="matured">Matured (Action Due)</option>
                <option value="active">Active</option>
              </select>
            </div>

            {/* Bank Filter */}
            <div className="filter-select-wrapper">
              <Building2 size={14} className="filter-icon" />
              <select
                className="reports-select"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                aria-label="Filter watchlist by bank"
              >
                {uniqueBanks.map((b) => (
                  <option key={b} value={b}>
                    {b === 'All' ? 'All Banks' : b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="reports-table-card">
          <div className="table-responsive">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>FDR Number</th>
                  <th>Depository Bank</th>
                  <th>Institution / Beneficiary</th>
                  <th>Deposit Purpose</th>
                  <th className="text-right">Principal (INR)</th>
                  <th className="text-center">Maturity Date</th>
                  <th className="text-center">Days Remaining</th>
                  <th className="text-center">Status</th>
                  {onViewRecord && <th className="text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.slice(0, 15).map((fdr) => {
                  const status = computeFDRStatus(fdr);
                  const days = getDaysRemaining(fdr.maturityDate);

                  return (
                    <tr key={fdr.id || fdr.fdrNumber} className="table-row-hover">
                      <td className="font-mono font-medium text-navy">
                        {fdr.fdrNumber || 'N/A'}
                      </td>
                      <td>
                        <div className="bank-info-cell">
                          <strong>{fdr.bankName || 'N/A'}</strong>
                          {fdr.bankBranch && (
                            <span className="cell-subtext text-muted">{fdr.bankBranch}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="institution-info-cell">
                          <strong className="inst-title">{fdr.institutionName || 'N/A'}</strong>
                          {fdr.institutionCode && (
                            <span className="inst-code-tag">{fdr.institutionCode}</span>
                          )}
                        </div>
                      </td>
                      <td className="deposit-purpose-cell">
                        <span className="purpose-text" title={fdr.depositPurpose}>
                          {fdr.depositPurpose || 'N/A'}
                        </span>
                      </td>
                      <td className="text-right">
                        <strong>{formatINR(fdr.principalAmount)}</strong>
                      </td>
                      <td className="text-center font-mono">
                        {formatDate(fdr.maturityDate)}
                      </td>
                      <td className="text-center">
                        {days !== null ? (
                          <span
                            className={`days-pill ${
                              days < 0
                                ? 'days-matured'
                                : days <= 30
                                ? 'days-urgent'
                                : 'days-normal'
                            }`}
                          >
                            {days < 0
                              ? `${Math.abs(days)}d Overdue`
                              : days === 0
                              ? 'Due Today'
                              : `${days}d Left`}
                          </span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`status-badge-compact ${
                            status === 'matured'
                              ? 'status-matured'
                              : status === 'expiring_soon'
                              ? 'status-expiring'
                              : 'status-active'
                          }`}
                        >
                          {status === 'matured'
                            ? 'Matured'
                            : status === 'expiring_soon'
                            ? 'Expiring Soon'
                            : 'Active'}
                        </span>
                      </td>
                      {onViewRecord && (
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-inspect-link"
                            onClick={() => onViewRecord(fdr)}
                            title="Inspect FDR Details"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > 15 && (
            <div className="reports-table-pagination-note">
              <span>
                Showing 15 of {filteredRecords.length} records matching filters. Export full report
                to CSV to inspect all entries.
              </span>
              <button
                type="button"
                className="btn-quick-export-small"
                onClick={handleExportFilteredCSV}
              >
                <Download size={13} />
                <span>Download All {filteredRecords.length} Rows</span>
              </button>
            </div>
          )}

          {filteredRecords.length === 0 && (
            <div className="reports-empty-filtered">
              <p>No FDR records match the specified search and filter criteria.</p>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setBankFilter('All');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
              >
                Reset Filter Parameters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
