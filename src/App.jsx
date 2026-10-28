import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import StatCards from './components/StatCards';
import FDRTable from './components/FDRTable';
import FDRDetailModal from './components/FDRDetailModal';
import FDRFormModal from './components/FDRFormModal';
import FDRDeleteConfirmModal from './components/FDRDeleteConfirmModal';
import PlaceholderView from './components/PlaceholderView';
import Toast from './components/Toast';
import RequestManagement from './components/RequestManagement';
import RequestFormModal from './components/RequestFormModal';
import RequestDetailModal from './components/RequestDetailModal';
import MaturityAlerts from './components/MaturityAlerts';
import Reports from './components/Reports';
import {
  loadRequests,
  saveRequests,
  applyStatusChange,
  synchronizeFDRWithApprovedRequest,
} from './data/requestStorage';
import {
  calculateFDRStatistics,
  computeFDRStatus,
  formatINR,
  formatINRCompact,
} from './data/sampleFDRs';
import {
  loadFDRRecords,
  saveFDRRecords,
  generateFDRId,
} from './data/storage';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  ArrowRight,
  TrendingUp,
  FilePlus,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Initialize records from localStorage (persisted across reloads)
  const [records, setRecords] = useState(() => loadFDRRecords());
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedBankFilter, setSelectedBankFilter] = useState('All Banks');

  // Modal and dialog states
  const [selectedFDR, setSelectedFDR] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFDR, setEditingFDR] = useState(null);
  const [deletingFDR, setDeletingFDR] = useState(null);

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Request Management state (stored separately from FDR records)
  const [requests, setRequests] = useState(() => loadRequests());
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [requestFormType, setRequestFormType] = useState('Renewal');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  // Show toast notification helper
  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title, id: Date.now() });
  };

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

  // Quick action from stat card to set filter
  const handleStatusFilterChange = (newStatus) => {
    setSelectedStatusFilter(newStatus);
    if (activeNav !== 'dashboard' && activeNav !== 'all_fdrs') {
      setActiveNav('dashboard');
    }
  };

  // Open modal to add a new FDR
  const handleOpenAddModal = () => {
    setEditingFDR(null);
    setIsFormModalOpen(true);
  };

  // Open modal to edit an existing FDR
  const handleOpenEditModal = (fdr) => {
    setEditingFDR(fdr);
    setIsFormModalOpen(true);
  };

  // Open modal to confirm delete
  const handleOpenDeleteModal = (fdr) => {
    setDeletingFDR(fdr);
  };

  // Handle Form Submit (Add or Edit)
  const handleFormSubmit = (recordData, isEditMode) => {
    let updatedRecords;

    if (isEditMode) {
      // Edit existing record while preserving stable ID
      updatedRecords = records.map((item) =>
        item.id === recordData.id ? { ...recordData } : item
      );
      setRecords(updatedRecords);
      saveFDRRecords(updatedRecords);

      // If the currently inspected detail modal is open for this record, update it
      if (selectedFDR && selectedFDR.id === recordData.id) {
        setSelectedFDR(recordData);
      }

      showToast(
        `FDR "${recordData.fdrNumber}" updated successfully.`,
        'success',
        'Record Saved'
      );
    } else {
      // Add new record with newly generated stable ID
      const newRecord = {
        ...recordData,
        id: generateFDRId(),
      };
      updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      saveFDRRecords(updatedRecords);

      showToast(
        `New FDR "${newRecord.fdrNumber}" added to repository.`,
        'success',
        'Deposit Registered'
      );
    }

    setIsFormModalOpen(false);
    setEditingFDR(null);
  };

  // Handle Confirmed Deletion
  const handleConfirmDelete = (fdrToDelete) => {
    const updatedRecords = records.filter((r) => r.id !== fdrToDelete.id);
    setRecords(updatedRecords);
    saveFDRRecords(updatedRecords);

    // If detail modal is open for this record, close it
    if (selectedFDR && selectedFDR.id === fdrToDelete.id) {
      setSelectedFDR(null);
    }

    setDeletingFDR(null);
    showToast(
      `FDR "${fdrToDelete.fdrNumber}" was permanently deleted.`,
      'info',
      'Record Deleted'
    );
  };


  // ── Request Management Handlers ────────────────────────────────────────────

  // Called when a new request is submitted from the form modal
  const handleRequestSubmit = (newRequest) => {
    const updatedRequests = [newRequest, ...requests];
    setRequests(updatedRequests);
    saveRequests(updatedRequests);
    setIsRequestFormOpen(false);
    showToast(
      'Request ' + newRequest.requestRef + ' submitted successfully.',
      'success',
      'Request Submitted'
    );
  };

  // Called when the detail modal issues a status update
  const handleRequestStatusUpdate = (updatedRequest) => {
    const updatedRequests = requests.map((r) =>
      r.id === updatedRequest.id ? updatedRequest : r
    );
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    // If request has transitioned to Approved, safely synchronize linked FDR master record
    if (updatedRequest.status === 'Approved' && updatedRequest.fdrId) {
      const targetFDR = records.find(
        (r) => r.id === updatedRequest.fdrId || (updatedRequest.fdrNumber && r.fdrNumber === updatedRequest.fdrNumber)
      );

      if (targetFDR) {
        const synchronizedFDR = synchronizeFDRWithApprovedRequest(targetFDR, updatedRequest);
        const updatedRecords = records.map((r) =>
          r.id === targetFDR.id ? synchronizedFDR : r
        );
        setRecords(updatedRecords);
        saveFDRRecords(updatedRecords);

        // Keep inspected detail modal in sync if open on this record
        if (selectedFDR && selectedFDR.id === targetFDR.id) {
          setSelectedFDR(synchronizedFDR);
        }
      }
    }

    // Keep the detail modal open with fresh data
    setSelectedRequest(updatedRequest);
    showToast(
      'Request ' + updatedRequest.requestRef + ' status updated to ' + updatedRequest.status + '.',
      'success',
      'Status Updated'
    );
  };

  // Derive active / pending renewal requests count for sidebar badge
  const pendingRenewalCount = useMemo(() => {
    return requests.filter(
      (r) => r.requestType === 'Renewal' && (r.status === 'Requested' || r.status === 'Under Review')
    ).length;
  }, [requests]);

  return (
    <div className="portal-layout">
      {/* Toast Feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />

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
        renewalCount={pendingRenewalCount}
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
                  <button
                    type="button"
                    className="btn-banner-add-fdr"
                    onClick={handleOpenAddModal}
                  >
                    <FilePlus size={16} />
                    <span>Register New Deposit</span>
                  </button>
                  <div className="system-sync-tag">
                    <span className="dot-pulse"></span>
                    <span>Persistent Storage Active</span>
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

              {/* Main FDR Registry Table with Full CRUD Actions */}
              <section className="dashboard-section">
                <FDRTable
                  records={records}
                  onViewDetails={(fdr) => setSelectedFDR(fdr)}
                  onOpenAddModal={handleOpenAddModal}
                  onEditRecord={handleOpenEditModal}
                  onDeleteRecord={handleOpenDeleteModal}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedStatusFilter={selectedStatusFilter}
                  setSelectedStatusFilter={setSelectedStatusFilter}
                  selectedBankFilter={selectedBankFilter}
                  setSelectedBankFilter={setSelectedBankFilter}
                  title="FDR Records Master Registry"
                  subtitle="Search, filter, edit, or register institutional security deposits across depository banks"
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
                onOpenAddModal={handleOpenAddModal}
                onEditRecord={handleOpenEditModal}
                onDeleteRecord={handleOpenDeleteModal}
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
            <MaturityAlerts
              records={records}
              onViewDetails={(fdr) => setSelectedFDR(fdr)}
              onEditRecord={handleOpenEditModal}
              onDeleteRecord={handleOpenDeleteModal}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {/* VIEW: RENEWAL & RELEASE REQUEST MANAGEMENT */}
          {(activeNav === 'renewal_requests' || activeNav === 'release_requests') && (
            <RequestManagement
              requests={requests}
              fdrRecords={records}
              activeNav={activeNav}
              onNewRequest={(defaultType) => {
                setRequestFormType(
                  defaultType || (activeNav === 'release_requests' ? 'Release' : 'Renewal')
                );
                setIsRequestFormOpen(true);
              }}
              onViewRequest={(req) => setSelectedRequest(req)}
            />
          )}

          {/* VIEW: REPORTS & CAG AUDIT SUITE */}
          {activeNav === 'reports' && (
            <Reports
              records={records}
              onViewRecord={(fdr) => setSelectedFDR(fdr)}
              showToast={showToast}
            />
          )}

          {/* VIEW: SETTINGS (PLACEHOLDER) */}
          {activeNav === 'settings' && (
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

      {/* Add / Edit FDR Form Modal */}
      <FDRFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingFDR(null);
        }}
        onSubmit={handleFormSubmit}
        editingRecord={editingFDR}
        existingRecords={records}
      />

      {/* Delete Confirmation Dialog Modal */}
      <FDRDeleteConfirmModal
        fdr={deletingFDR}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingFDR(null)}
      />

      {/* Request Form Modal — New Renewal or Release Request */}
      <RequestFormModal
        isOpen={isRequestFormOpen}
        onClose={() => setIsRequestFormOpen(false)}
        onSubmit={handleRequestSubmit}
        fdrRecords={records}
        existingRequests={requests}
        defaultRequestType={requestFormType}
      />

      {/* Request Detail Modal — View and Update Request Status */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          fdrRecords={records}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={handleRequestStatusUpdate}
        />
      )}
    </div>
  );
}
