import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  X,
  User,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function Navbar({
  pageTitle = 'Dashboard Overview',
  searchQuery,
  setSearchQuery,
  onToggleSidebar,
  expiringRecords = [],
  maturedRecords = [],
  onSelectFDR,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalUrgent = expiringRecords.length + maturedRecords.length;

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-heading">
          <h1 className="navbar-title">{pageTitle}</h1>
          <div className="navbar-breadcrumbs">
            <span>AICTE Approval & Affiliation Cell</span>
            <span className="crumb-divider">/</span>
            <span className="crumb-active">Security Deposit / FDR Portal</span>
          </div>
        </div>
      </div>

      <div className="navbar-center">
        {/* Quick Search */}
        <div className="nav-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search FDR number, bank name, institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Status indicator */}
        <div className="portal-badge" title="AICTE Central FDR Database">
          <span className="status-dot-green"></span>
          <span className="badge-text">GoI Live System</span>
        </div>

        {/* Notifications Popover */}
        <div className="notification-wrapper" ref={notificationRef}>
          <button
            type="button"
            className={`notification-btn ${totalUrgent > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
          >
            <Bell size={20} />
            {totalUrgent > 0 && (
              <span className="notification-badge">{totalUrgent}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-title">
                  <AlertTriangle size={16} className="text-amber" />
                  <span>Maturity Alerts ({totalUrgent})</span>
                </div>
                <span className="dropdown-meta">APH 30-Day Window</span>
              </div>

              <div className="dropdown-body">
                {totalUrgent === 0 ? (
                  <div className="dropdown-empty">
                    <CheckCircle size={28} className="text-emerald" />
                    <p>No critical maturity alerts at this time.</p>
                  </div>
                ) : (
                  <div className="notification-list">
                    {expiringRecords.map((fdr) => (
                      <div
                        key={fdr.id}
                        className="notification-item warning"
                        onClick={() => {
                          onSelectFDR?.(fdr);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="item-icon-box warning">
                          <Clock size={16} />
                        </div>
                        <div className="item-content">
                          <div className="item-row">
                            <span className="item-fdr">{fdr.fdrNumber}</span>
                            <span className="item-badge-pill warning">Expiring Soon</span>
                          </div>
                          <p className="item-institution">{fdr.institutionName}</p>
                          <span className="item-bank">{fdr.bankName} • Maturity: {fdr.maturityDate}</span>
                        </div>
                      </div>
                    ))}

                    {maturedRecords.map((fdr) => (
                      <div
                        key={fdr.id}
                        className="notification-item danger"
                        onClick={() => {
                          onSelectFDR?.(fdr);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="item-icon-box danger">
                          <AlertTriangle size={16} />
                        </div>
                        <div className="item-content">
                          <div className="item-row">
                            <span className="item-fdr">{fdr.fdrNumber}</span>
                            <span className="item-badge-pill danger">Matured</span>
                          </div>
                          <p className="item-institution">{fdr.institutionName}</p>
                          <span className="item-bank">{fdr.bankName} • Action Overdue</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dropdown-footer">
                <span className="footer-notice">
                  Institutions are alerted 30, 15, and 7 days prior to expiry.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="user-profile-section">
          <div className="user-avatar-circle">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">V. Sharma</span>
            <span className="user-role">FDR Cell Incharge • AICTE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
