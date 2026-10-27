import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  AlertTriangle,
  RotateCw,
  Unlock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export default function Sidebar({
  activeNav,
  setActiveNav,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  expiringCount = 0,
  maturedCount = 0,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'all_fdrs',
      label: 'All FDR Records',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      id: 'maturity_alerts',
      label: 'Maturity Alerts',
      icon: AlertTriangle,
      badge: expiringCount + maturedCount > 0 ? expiringCount + maturedCount : null,
      badgeVariant: 'warning',
    },
    {
      id: 'renewal_requests',
      label: 'Renewal Requests',
      icon: RotateCw,
      badge: '2 New',
      badgeVariant: 'info',
    },
    {
      id: 'release_requests',
      label: 'Release Requests',
      icon: Unlock,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Reports & Audit',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Portal Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (id) => {
    setActiveNav(id);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${
          mobileOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Portal Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-logo-shield">
              <ShieldCheck className="brand-icon" size={24} />
            </div>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <div className="brand-title">AICTE FDR PORTAL</div>
              <div className="brand-subtitle">Security Deposit Cell • GoI</div>
            </div>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="sidebar-nav">
          <div className="nav-group-label">
            {!collapsed ? 'MAIN NAVIGATION' : '•••'}
          </div>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <li key={item.id} className="nav-list-item">
                  <button
                    type="button"
                    className={`nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="nav-item-icon" size={20} />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className={`nav-badge ${
                          item.badgeVariant === 'warning'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Compliance & AICTE Info */}
        {!collapsed && (
          <div className="sidebar-footer-card">
            <div className="footer-card-header">
              <Building2 size={16} className="text-amber" />
              <span>APH 2026-27 Norms</span>
            </div>
            <p className="footer-card-desc">
              Mandatory Security Deposit under AICTE Regulation 2024.
            </p>
            <div className="footer-status-pill">
              <span className="pulse-dot"></span>
              <span>All 8 Zones Connected</span>
            </div>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <div className="sidebar-collapse-wrapper">
          <button
            type="button"
            className="collapse-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
