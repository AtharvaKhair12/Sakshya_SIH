'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getInstruments, getFindings, getReleaseRequests, getAuditEvents,
  daysUntilMaturity, formatINR, formatDate, formatDateTime,
} from '@/lib/store';
import { INSTRUMENT_STATUS_LABELS, VERIFICATION_STATUS_LABELS, ROLE_LABELS } from '@/lib/types';
import {
  FileText, AlertTriangle, Clock, CheckCircle, ShieldAlert, ArrowRightLeft,
  TrendingUp, Calendar, ChevronRight, ExternalLink
} from 'lucide-react';

function StatusBadge({ status, type }: { status: string; type: 'instrument' | 'verification' }) {
  const labels = type === 'instrument' ? INSTRUMENT_STATUS_LABELS : VERIFICATION_STATUS_LABELS;
  const label = (labels as Record<string, string>)[status] || status;
  const colorMap: Record<string, string> = {
    verified: 'status-verified', verified_by_source: 'status-verified', active_monitoring: 'status-verified', released: 'status-verified',
    pending: 'status-pending', pending_scrutiny: 'status-pending', submitted: 'status-pending', preliminary_validation: 'status-pending', not_started: 'status-pending',
    verification_in_progress: 'status-info', renewal_pending: 'status-info', release_requested: 'status-info',
    discrepancy_flagged: 'status-error', mismatch_detected: 'status-error', expired: 'status-error',
  };
  return <span className={`status-badge ${colorMap[status] || 'status-neutral'}`}>{label}</span>;
}

export default function DashboardPage() {
  const { user, session, permissions } = useAuth();

  const data = useMemo(() => {
    if (!session) return null;

    const allInstruments = session.role === 'institution'
      ? getInstruments({ institutionId: session.institutionId })
      : getInstruments();

    const now = new Date();
    const total = allInstruments.length;
    const active = allInstruments.filter(i => ['active_monitoring', 'verified', 'verification_in_progress', 'pending_scrutiny'].includes(i.status)).length;
    const maturingIn30 = allInstruments.filter(i => {
      const d = daysUntilMaturity(i.maturityDate);
      return d >= 0 && d <= 30;
    }).length;
    const overdueRenewals = allInstruments.filter(i => i.status === 'renewal_pending' || (daysUntilMaturity(i.maturityDate) < 0 && !['released', 'closed'].includes(i.status))).length;
    const pendingVerification = allInstruments.filter(i => ['pending_scrutiny', 'verification_in_progress'].includes(i.status)).length;
    const discrepancies = allInstruments.filter(i => i.status === 'discrepancy_flagged').length;

    const releaseRequests = session.role === 'institution'
      ? getReleaseRequests({ institutionId: session.institutionId })
      : getReleaseRequests();
    const pendingReleases = releaseRequests.filter(r => !['approved', 'declined', 'closed'].includes(r.status)).length;
    const recentlyResolved = allInstruments.filter(i => ['released', 'closed', 'verified'].includes(i.status)).length;

    const findings = getFindings().filter(f => !f.resolved);
    const recentAudit = getAuditEvents().slice(0, 8);

    // Action items
    const actionItems = allInstruments
      .filter(i => !['released', 'closed'].includes(i.status))
      .map(i => {
        const days = daysUntilMaturity(i.maturityDate);
        let issueType = '';
        let priority = 0;
        if (i.status === 'discrepancy_flagged') { issueType = 'Discrepancy'; priority = 3; }
        else if (days < 0) { issueType = 'Overdue Maturity'; priority = 4; }
        else if (days <= 7) { issueType = 'Maturing Soon'; priority = 2; }
        else if (i.status === 'pending_scrutiny') { issueType = 'Pending Scrutiny'; priority = 1; }
        else if (i.status === 'verification_in_progress') { issueType = 'Under Verification'; priority = 1; }
        else if (i.status === 'release_requested') { issueType = 'Release Requested'; priority = 2; }
        else return null;
        return { ...i, issueType, priority, daysToMaturity: days };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.priority || 0) - (a?.priority || 0))
      .slice(0, 10);

    // Status distribution for chart
    const statusCounts: Record<string, number> = {};
    allInstruments.forEach(i => {
      const label = INSTRUMENT_STATUS_LABELS[i.status] || i.status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    return {
      total, active, maturingIn30, overdueRenewals, pendingVerification,
      discrepancies, pendingReleases, recentlyResolved, actionItems,
      statusCounts, recentAudit, findings,
    };
  }, [session]);

  if (!data || !user || !session) return null;

  const kpis = [
    { label: 'Total Instruments', value: data.total, icon: <FileText size={20} />, color: 'var(--color-forest-600)', bg: 'var(--color-forest-50)', href: '/instruments' },
    { label: 'Active', value: data.active, icon: <CheckCircle size={20} />, color: 'var(--color-status-success)', bg: '#e8f5e9', href: '/instruments?status=active_monitoring' },
    { label: 'Maturing ≤ 30 Days', value: data.maturingIn30, icon: <Clock size={20} />, color: 'var(--color-status-warning)', bg: '#fff8e1', href: '/maturity' },
    { label: 'Overdue Renewals', value: data.overdueRenewals, icon: <AlertTriangle size={20} />, color: 'var(--color-status-error)', bg: '#ffebee', href: '/maturity' },
    { label: 'Pending Verification', value: data.pendingVerification, icon: <ShieldAlert size={20} />, color: 'var(--color-status-info)', bg: '#e3f2fd', href: '/verification' },
    { label: 'Discrepancies', value: data.discrepancies, icon: <AlertTriangle size={20} />, color: 'var(--color-status-error)', bg: '#ffebee', href: '/instruments?status=discrepancy_flagged' },
    { label: 'Pending Releases', value: data.pendingReleases, icon: <ArrowRightLeft size={20} />, color: 'var(--color-brass-600)', bg: 'var(--color-brass-50)', href: '/release-requests' },
    { label: 'Recently Resolved', value: data.recentlyResolved, icon: <TrendingUp size={20} />, color: 'var(--color-forest-500)', bg: 'var(--color-forest-50)', href: '/instruments' },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
          {session.role === 'institution' ? 'My Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
          Welcome back, {user.name}. {session.role === 'institution' ? 'Here\'s an overview of your institution\'s instruments.' : 'Here\'s a summary of pending work and recent activity.'}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href} className="card card-sm group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg" style={{ background: kpi.bg, color: kpi.color }}>{kpi.icon}</div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-charcoal-muted)' }} />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{kpi.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-charcoal-muted)' }}>{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-charcoal)' }}>Instruments by Status</h3>
          <div className="space-y-3">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-charcoal-light)' }}>{status}</span>
                    <span className="font-medium" style={{ color: 'var(--color-charcoal)' }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-parchment)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(4, (count / data.total) * 100)}%`, background: 'var(--color-forest-400)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required Table */}
        <div className="lg:col-span-2 card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-parchment)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
              Action Required ({data.actionItems.length})
            </h3>
            <Link href="/instruments" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-forest-600)' }}>
              View all <ExternalLink size={12} />
            </Link>
          </div>
          {data.actionItems.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-charcoal-muted)' }}>
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              No immediate actions required.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th className="hide-mobile">Institution</th>
                    <th>Issue</th>
                    <th className="hide-mobile">Maturity</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.actionItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="font-medium text-xs" style={{ color: 'var(--color-forest-700)' }}>{item.id}</td>
                      <td className="text-xs hide-mobile" style={{ color: 'var(--color-charcoal-muted)' }}>{item.institutionName?.slice(0, 25)}</td>
                      <td>
                        <span className={`status-badge ${item.priority >= 3 ? 'status-error' : item.priority >= 2 ? 'status-pending' : 'status-info'}`}>
                          {item.issueType}
                        </span>
                      </td>
                      <td className="text-xs hide-mobile" style={{ color: item.daysToMaturity < 0 ? 'var(--color-status-error)' : 'var(--color-charcoal-muted)' }}>
                        {item.daysToMaturity < 0 ? `${Math.abs(item.daysToMaturity)}d overdue` : `${item.daysToMaturity}d`}
                      </td>
                      <td><StatusBadge status={item.status} type="instrument" /></td>
                      <td>
                        <Link href={`/instruments/${item.id}`} className="btn btn-ghost btn-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Open Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-parchment)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>Recent Activity</h3>
            {(session.role !== 'institution') && (
              <Link href="/audit" className="text-xs font-medium" style={{ color: 'var(--color-forest-600)' }}>View audit log</Link>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
            {data.recentAudit.map(event => (
              <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-600)' }}>
                  {event.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium" style={{ color: 'var(--color-charcoal)' }}>{event.userName}</span>{' '}
                    <span style={{ color: 'var(--color-charcoal-muted)' }}>{event.action.replace(/_/g, ' ')}</span>{' '}
                    <span className="font-medium" style={{ color: 'var(--color-forest-700)' }}>{event.entityId}</span>
                  </div>
                  {event.reason && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-charcoal-muted)' }}>{event.reason}</div>
                  )}
                  <div className="text-[10px] mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>{formatDateTime(event.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Findings */}
        <div className="card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-parchment)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
              Open Findings ({data.findings.length})
            </h3>
          </div>
          {data.findings.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-charcoal-muted)' }}>
              No open findings.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {data.findings.slice(0, 6).map(finding => (
                <Link key={finding.id} href={`/instruments/${finding.instrumentId}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`status-badge ${finding.severity === 'critical' ? 'status-error' : finding.severity === 'error' ? 'status-error' : finding.severity === 'warning' ? 'status-pending' : 'status-info'}`}>
                      {finding.severity}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>{finding.ruleName}</span>
                  </div>
                  <div className="text-xs mt-1 truncate" style={{ color: 'var(--color-charcoal-muted)' }}>
                    {finding.instrumentId} — {finding.description}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
