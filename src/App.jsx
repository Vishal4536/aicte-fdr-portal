import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import StatCards from './components/StatCards';
import FDRTable from './components/FDRTable';
import FDRDetailModal from './components/FDRDetailModal';
import PlaceholderView from './components/PlaceholderView';
import {
  initialFDRRecords,
  calculateFDRStatistics,
  computeFDRStatus,
  formatINR,
  formatINRCompact,
} from './data/sampleFDRs';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  ArrowRight,
  TrendingUp,
  Download,
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState(initialFDRRecords);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedBankFilter, setSelectedBankFilter] = useState('All Banks');
  const [selectedFDR, setSelectedFDR] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dynamically calculate statistics from current records
  const stats = useMemo(() => {
    return calculateFDRStatistics(records);
  }, [records]);

  // Extract critical records
  const expiringRecords = useMemo(() => {
    return records.filter((r) => computeFDRStatus(r) === 'expiring_soon');
  }, [records]);

  const maturedRecords = useMemo(() => {
    return records.filter((r) => computeFDRStatus(r) === 'matured');
  }, [records]);

  // Compute Page Title for Top Navbar
  const pageTitleMap = {
    dashboard: 'Executive Dashboard',
    all_fdrs: 'Master FDR Records Registry',
    maturity_alerts: 'Urgent Maturity & Expiry Alerts',
    renewal_requests: 'FDR Renewal Requests',
    release_requests: 'Security Deposit Release Requests',
    reports: 'Financial Reports & CAG Audit',
    settings: 'Portal Settings & Parameters',
  };

  // Quick action from stat card or maturity tab to set filter
  const handleStatusFilterChange = (newStatus) => {
    setSelectedStatusFilter(newStatus);
    if (activeNav !== 'dashboard' && activeNav !== 'all_fdrs') {
      setActiveNav('dashboard');
    }
  };

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        expiringCount={stats.expiringSoonCount}
        maturedCount={stats.maturedCount}
      />

      {/* Main Content Area */}
      <div className={`portal-main ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
        {/* Top Navbar */}
        <Navbar
          pageTitle={pageTitleMap[activeNav] || 'FDR Portal'}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          expiringRecords={expiringRecords}
          maturedRecords={maturedRecords}
          onSelectFDR={(fdr) => setSelectedFDR(fdr)}
        />

        {/* Content Body */}
        <main className="content-container">
          {/* VIEW: DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="view-dashboard">
              {/* Executive Welcome & Notice Banner */}
              <div className="gov-welcome-banner">
                <div className="banner-left">
                  <div className="gov-emblem-badge">
                    <ShieldCheck size={28} className="text-navy" />
                  </div>
                  <div>
                    <h2 className="banner-title">
                      AICTE Security Deposit & Fixed Deposit Receipts Cell
                    </h2>
                    <p className="banner-desc">
                      Live monitoring of joint-holding institutional security deposits under
                      the AICTE Approval Process Handbook (APH) regulations.
                    </p>
                  </div>
                </div>
                <div className="banner-actions">
                  <div className="system-sync-tag">
                    <span className="dot-pulse"></span>
                    <span>Direct Bank Reconciliation Active</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Summary Cards */}
              <section className="dashboard-section">
                <div className="section-header-compact">
                  <h3 className="section-heading">Financial Overview & Portfolio Health</h3>
                  <span className="section-subheading">
                    Dynamically aggregated from {stats.totalRecords} institutional FDRs
                  </span>
                </div>
                <StatCards
                  stats={stats}
                  selectedStatusFilter={selectedStatusFilter}
                  onStatusFilterChange={handleStatusFilterChange}
                />
              </section>

              {/* Critical Alert Ribbon if there are expiring or matured FDRs */}
              {(stats.expiringSoonCount > 0 || stats.maturedCount > 0) && (
                <div className="critical-alert-ribbon">
                  <div className="alert-ribbon-content">
                    <AlertTriangle size={20} className="text-amber-icon" />
                    <div>
                      <strong>Action Required:</strong>{' '}
                      <span>
                        {stats.expiringSoonCount} FDRs maturing within 30 days (
                        {formatINRCompact(stats.expiringSoonPrincipal)}) and{' '}
                        {stats.maturedCount} matured FDRs (
                        {formatINRCompact(stats.maturedPrincipal)}) require immediate regulatory scrutiny.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-view-urgent"
                    onClick={() => setActiveNav('maturity_alerts')}
                  >
                    <span>View Urgent Alerts</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* Main FDR Registry Table */}
              <section className="dashboard-section">
                <FDRTable
                  records={records}
                  onViewDetails={(fdr) => setSelectedFDR(fdr)}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedStatusFilter={selectedStatusFilter}
                  setSelectedStatusFilter={setSelectedStatusFilter}
                  selectedBankFilter={selectedBankFilter}
                  setSelectedBankFilter={setSelectedBankFilter}
                  title="FDR Records Master Registry"
                  subtitle="Search, filter, and inspect institutional security deposits across depository banks"
                />
              </section>
            </div>
          )}

          {/* VIEW: ALL FDRs */}
          {activeNav === 'all_fdrs' && (
            <div className="view-all-fdrs">
              <div className="page-intro-header">
                <div>
                  <h2 className="page-main-heading">All Institutional Security Deposits</h2>
                  <p className="page-sub-heading">
                    Complete registry of active, expiring, and matured fixed deposit receipts
                    under joint custody of Member Secretary, AICTE.
                  </p>
                </div>
              </div>

              <FDRTable
                records={records}
                onViewDetails={(fdr) => setSelectedFDR(fdr)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedStatusFilter={selectedStatusFilter}
                setSelectedStatusFilter={setSelectedStatusFilter}
                selectedBankFilter={selectedBankFilter}
                setSelectedBankFilter={setSelectedBankFilter}
                title="Master FDR Database"
                subtitle="Filterable list with instant search across all bank branches and technical institutions"
              />
            </div>
          )}

          {/* VIEW: MATURITY ALERTS */}
          {activeNav === 'maturity_alerts' && (
            <div className="view-maturity-alerts">
              <div className="maturity-header-card">
                <div className="maturity-header-content">
                  <div className="alert-big-icon">
                    <Clock size={32} className="text-amber" />
                  </div>
                  <div>
                    <h2 className="maturity-view-title">
                      Maturity & Regulatory Expiry Surveillance
                    </h2>
                    <p className="maturity-view-desc">
                      Mandatory tracking for FDRs within the 30-day expiry threshold and
                      matured deposits requiring renewal or release under APH Norms.
                    </p>
                  </div>
                </div>

                <div className="maturity-stats-pillbox">
                  <div className="maturity-stat-pill warning">
                    <span className="pill-number">{stats.expiringSoonCount}</span>
                    <span className="pill-label">Expiring ≤30 Days</span>
                  </div>
                  <div className="maturity-stat-pill danger">
                    <span className="pill-number">{stats.maturedCount}</span>
                    <span className="pill-label">Already Matured</span>
                  </div>
                </div>
              </div>

              {/* Table filtered specifically to Expiring Soon & Matured */}
              <FDRTable
                records={records.filter((r) => {
                  const s = computeFDRStatus(r);
                  return s === 'expiring_soon' || s === 'matured';
                })}
                onViewDetails={(fdr) => setSelectedFDR(fdr)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedStatusFilter={selectedStatusFilter}
                setSelectedStatusFilter={setSelectedStatusFilter}
                selectedBankFilter={selectedBankFilter}
                setSelectedBankFilter={setSelectedBankFilter}
                title="High-Priority Expiry Watchlist"
                subtitle="Showing all deposits where remaining days ≤ 30 or maturity date has passed"
              />
            </div>
          )}

          {/* VIEW: SECONDARY SECTIONS (PLACEHOLDERS) */}
          {(activeNav === 'renewal_requests' ||
            activeNav === 'release_requests' ||
            activeNav === 'reports' ||
            activeNav === 'settings') && (
            <PlaceholderView
              sectionId={activeNav}
              onNavigateToDashboard={() => setActiveNav('dashboard')}
            />
          )}
        </main>
      </div>

      {/* FDR Details Inspection Modal */}
      {selectedFDR && (
        <FDRDetailModal
          fdr={selectedFDR}
          onClose={() => setSelectedFDR(null)}
        />
      )}
    </div>
  );
}
