import React from 'react';
import {
  FileText,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { formatINR, formatINRCompact } from '../data/sampleFDRs';

export default function StatCards({
  stats,
  selectedStatusFilter,
  onStatusFilterChange,
}) {
  const {
    totalRecords,
    totalPrincipal,
    activeCount,
    activePrincipal,
    expiringSoonCount,
    expiringSoonPrincipal,
    maturedCount,
    maturedPrincipal,
  } = stats;

  const cards = [
    {
      id: 'total',
      filterValue: 'all',
      title: 'Total FDR Records',
      value: totalRecords,
      amount: totalPrincipal,
      subtext: `${totalRecords} registered deposits`,
      icon: FileText,
      theme: 'navy',
      tag: 'Across 8 AICTE Regions',
    },
    {
      id: 'total_principal',
      filterValue: 'all',
      title: 'Total Security Deposit',
      value: formatINRCompact(totalPrincipal),
      isPrimaryAmount: true,
      amount: totalPrincipal,
      subtext: `Full Amount: ${formatINR(totalPrincipal)}`,
      icon: IndianRupee,
      theme: 'blue',
      tag: 'Joint Custody with AICTE',
    },
    {
      id: 'active',
      filterValue: 'active',
      title: 'Active FDRs',
      value: activeCount,
      amount: activePrincipal,
      subtext: `${formatINRCompact(activePrincipal)} in active lock-in`,
      icon: ShieldCheck,
      theme: 'emerald',
      tag: `${totalRecords > 0 ? Math.round((activeCount / totalRecords) * 100) : 0}% of portfolio`,
    },
    {
      id: 'expiring',
      filterValue: 'expiring_soon',
      title: 'Expiring in ≤ 30 Days',
      value: expiringSoonCount,
      amount: expiringSoonPrincipal,
      subtext: `${formatINRCompact(expiringSoonPrincipal)} requires renewal notice`,
      icon: Clock,
      theme: 'amber',
      tag: 'Urgent Action Required',
      isWarning: true,
    },
    {
      id: 'matured',
      filterValue: 'matured',
      title: 'Matured FDRs',
      value: maturedCount,
      amount: maturedPrincipal,
      subtext: `${formatINRCompact(maturedPrincipal)} pending release/extension`,
      icon: AlertTriangle,
      theme: 'rose',
      tag: 'Action Overdue',
      isDanger: true,
    },
  ];

  return (
    <div className="stat-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected =
          card.filterValue !== undefined &&
          selectedStatusFilter === card.filterValue &&
          card.id !== 'total_principal';

        return (
          <div
            key={card.id}
            className={`stat-card theme-${card.theme} ${
              isSelected ? 'selected-card' : ''
            }`}
            onClick={() => {
              if (onStatusFilterChange && card.filterValue) {
                onStatusFilterChange(card.filterValue);
              }
            }}
            role="button"
            tabIndex={0}
            title={`Click to filter table by ${card.title}`}
          >
            <div className="stat-card-header">
              <span className="stat-card-title">{card.title}</span>
              <div className={`stat-icon-wrapper bg-${card.theme}`}>
                <Icon size={20} />
              </div>
            </div>

            <div className="stat-card-body">
              <div className="stat-primary-value">
                {card.value}
              </div>
              <div className="stat-secondary-text">
                {card.subtext}
              </div>
            </div>

            <div className="stat-card-footer">
              <span className={`stat-pill pill-${card.theme}`}>
                {card.tag}
              </span>
              <span className="stat-filter-hint">
                Filter <ArrowUpRight size={13} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
