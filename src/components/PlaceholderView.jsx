import React from 'react';
import {
  RotateCw,
  Unlock,
  BarChart3,
  Settings,
  Info,
  Layers,
  ArrowRight,
  Shield,
  FileCheck2,
} from 'lucide-react';

export default function PlaceholderView({ sectionId, onNavigateToDashboard }) {
  const configs = {
    renewal_requests: {
      title: 'FDR Renewal & Extension Requests',
      subtitle: 'Workflow module for technical institutions submitting FDR renewal compliance',
      icon: RotateCw,
      badge: 'Scheduled for Phase 2 / Task 2',
      badgeClass: 'badge-info',
      description:
        'When an FDR approaches its lock-in maturity (within 30 days) and the institute requires ongoing AICTE approval, this module allows institutions to upload renewed bank guarantee / joint-FDR certificates and request endorsement from the AICTE Regional Officer.',
      steps: [
        'Automated 30-day advance notice dispatched to Institute Registrar',
        'Institute uploads renewed bank FDR advice & stamp duty document',
        'Bank nodal officer confirms renewed deposit lien online',
        'AICTE FDR Cell issues revised Approval Letter endorsement',
      ],
      notice: 'Under active development for Smart India Hackathon PS 1 Prototype.',
    },
    release_requests: {
      title: 'Security Deposit Release & Encashment',
      subtitle: 'Processing NOC and refund requests upon completion of mandated lock-in period',
      icon: Unlock,
      badge: 'Scheduled for Phase 2',
      badgeClass: 'badge-purple',
      description:
        'Institutions that have successfully operated for the stipulated 5, 8, or 10 years without regulatory violations can apply for release of their security deposit. This section verifies compliance history, physical receipt return, and issues AICTE NOC for bank encashment.',
      steps: [
        'Institute submits Completion of Mandated Tenure application',
        'AICTE EVC (Expert Visit Committee) compliance check clearance',
        'Accounts division generates No-Dues Certificate',
        'Formal Release Letter and lien removal letter issued to bank branch',
      ],
      notice: 'Data structure and schema ready for release request transactions.',
    },
    reports: {
      title: 'Analytics, Audit & Reconciliation Reports',
      subtitle: 'Comprehensive financial summaries for AICTE Finance Committee & CAG Audits',
      icon: BarChart3,
      badge: 'Analytical Reporting Suite',
      badgeClass: 'badge-emerald',
      description:
        'Provides multi-dimensional financial reporting across depository banks, regional offices (SCRO, WR, ERO, NWRO, SWR, CRO), institution types (Engineering, Management, Pharmacy, Architecture), and maturity horizons.',
      steps: [
        'Bank-wise concentration risk and interest accrual audit',
        'Regional office security deposit breakdown reports',
        'Monthly maturity schedule forecast (6 months, 1 year, 3 years)',
        'CAG audit compliance log of all active and released FDRs',
      ],
      notice: 'Reporting engine will aggregate data from the Master FDR Registry.',
    },
    settings: {
      title: 'Portal Governance & Rule Parameters',
      subtitle: 'Configure AICTE maturity alert thresholds, nodal officers, and system rules',
      icon: Settings,
      badge: 'Administrative Configuration',
      badgeClass: 'badge-slate',
      description:
        'Set institutional compliance thresholds, manage regional nodal officer assignments, configure SMS/Email reminder schedules (30, 15, and 7 days prior to expiry), and maintain bank branch IFSC directories.',
      steps: [
        'Maturity Alert Threshold: Configured to 30 Days (APH 2026-27 Norm)',
        'Lien Marking Clause: Member Secretary, AICTE Joint Custody',
        'Depository Bank Integration: Scheduled Bank directory',
        'Regional FDR Officer assignments and digital signature keys',
      ],
      notice: 'Configuration parameters currently governed by default handbook standards.',
    },
  };

  const current = configs[sectionId] || {
    title: 'Section Under Development',
    subtitle: 'This feature is part of the upcoming prototype iterations',
    icon: Layers,
    badge: 'In Progress',
    badgeClass: 'badge-slate',
    description: 'This administrative section will be available in the upcoming prototype phase.',
    steps: [],
    notice: 'Focus of Task 1 is Master FDR Registry and dynamic Dashboard statistics.',
  };

  const Icon = current.icon;

  return (
    <div className="placeholder-view-card">
      <div className="placeholder-hero">
        <div className="placeholder-icon-wrap">
          <Icon size={40} className="placeholder-hero-icon" />
        </div>
        <div className="placeholder-header-text">
          <div className="placeholder-badge-row">
            <span className={`badge-pill ${current.badgeClass}`}>
              {current.badge}
            </span>
            <span className="prototype-tag">SIH Prototype PS 1</span>
          </div>
          <h2 className="placeholder-title">{current.title}</h2>
          <p className="placeholder-subtitle">{current.subtitle}</p>
        </div>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-section">
          <h4 className="section-title-small">Module Scope & Architecture</h4>
          <p className="section-body-text">{current.description}</p>
        </div>

        {current.steps && current.steps.length > 0 && (
          <div className="placeholder-section">
            <h4 className="section-title-small">Planned Process Workflow</h4>
            <div className="workflow-steps-grid">
              {current.steps.map((step, idx) => (
                <div key={idx} className="workflow-step-card">
                  <div className="step-num-pill">{idx + 1}</div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="placeholder-callout">
          <Info size={18} className="callout-icon" />
          <div className="callout-body">
            <strong>System Notice:</strong> {current.notice} Master FDR data and
            filters remain accessible anytime from the Dashboard and FDR Registry.
          </div>
        </div>

        <div className="placeholder-actions">
          <button
            type="button"
            className="btn-return-dashboard"
            onClick={onNavigateToDashboard}
          >
            <span>Return to Live Dashboard</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
