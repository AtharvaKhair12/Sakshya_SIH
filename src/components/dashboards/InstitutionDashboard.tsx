'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { DemoSession, getInstruments, getReleaseRequests, getFindings, getInstitution, formatINR, formatDate, daysUntilMaturity } from '@/lib/store';
import { User, INSTRUMENT_STATUS_LABELS } from '@/lib/types';
import {
  FileText, PlusCircle, AlertCircle, Clock, CheckCircle2, ArrowRightLeft,
  ChevronRight, Calendar, Building2, UploadCloud, ShieldCheck, ExternalLink, AlertTriangle
} from 'lucide-react';

interface Props {
  session: DemoSession;
  user: User;
}

export default function InstitutionDashboard({ session, user }: Props) {
  const institution = useMemo(() => {
    return session.institutionId ? getInstitution(session.institutionId) : undefined;
  }, [session.institutionId]);

  const {
    myInstruments,
    activeInstruments,
    maturingSoon,
    pendingScrutiny,
    actionRequiredCount,
    releasePending,
    pendingActionItems,
    upcomingDeadlines,
    recentSubmissions,
  } = useMemo(() => {
    // Scoped strictly to logged in institution
    const all = getInstruments(undefined, session);
    const releases = getReleaseRequests(undefined, session);
    const findings = getFindings(undefined, session).filter(f => !f.resolved);

    const active = all.filter(i => ['active_monitoring', 'verified', 'verification_in_progress'].includes(i.status));
    const matSoon = all.filter(i => {
      const d = daysUntilMaturity(i.maturityDate);
      return d >= 0 && d <= 30 && !['released', 'closed'].includes(i.status);
    });
    const pendingScrut = all.filter(i => ['submitted', 'pending_scrutiny', 'preliminary_validation'].includes(i.status));
    const discrepancies = all.filter(i => i.status === 'discrepancy_flagged');
    const relPending = releases.filter(r => ['submitted', 'under_scrutiny', 'pending_senior_decision'].includes(r.status));

    // Pending action items requiring institution attention
    const actions: { id: string; title: string; subtitle: string; tag: string; href: string; severity: 'error' | 'warning' | 'info' }[] = [];

    discrepancies.forEach(inst => {
      actions.push({
        id: `disc-${inst.id}`,
        title: `Observation flagged on ${inst.id}`,
        subtitle: `Discrepancy detected during scrutiny. Please submit clarification or corrected documents.`,
        tag: 'Scrutiny Query',
        href: `/instruments/${inst.id}`,
        severity: 'error',
      });
    });

    matSoon.forEach(inst => {
      const days = daysUntilMaturity(inst.maturityDate);
      actions.push({
        id: `mat-${inst.id}`,
        title: `Maturity approaching for ${inst.id}`,
        subtitle: `Maturing in ${days} days (${formatDate(inst.maturityDate)}). Submit renewal or release application.`,
        tag: days <= 7 ? 'Urgent Renewal' : 'Upcoming Horizon',
        href: `/maturity`,
        severity: days <= 7 ? 'error' : 'warning',
      });
    });

    findings.forEach(f => {
      if (!actions.some(a => a.id.includes(f.instrumentId))) {
        actions.push({
          id: `find-${f.id}`,
          title: `Compliance requirement on ${f.instrumentId}`,
          subtitle: f.description,
          tag: 'Verification Notice',
          href: `/instruments/${f.instrumentId}`,
          severity: 'warning',
        });
      }
    });

    // Upcoming deadlines sorted by maturity
    const deadlines = [...all]
      .filter(i => !['released', 'closed'].includes(i.status))
      .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
      .slice(0, 5);

    // Recent submissions sorted by update
    const recents = [...all]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);

    return {
      myInstruments: all,
      activeInstruments: active.length,
      maturingSoon: matSoon.length,
      pendingScrutiny: pendingScrut.length,
      actionRequiredCount: actions.length,
      releasePending: relPending.length,
      pendingActionItems: actions.slice(0, 5),
      upcomingDeadlines: deadlines,
      recentSubmissions: recents,
    };
  }, [session]);

  return (
    <div className="space-y-6 fade-in">
      {/* Institutional Header Banner */}
      <div className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-700)', border: '1px solid var(--color-forest-200)' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                  {institution ? institution.name : user.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{ background: 'var(--color-forest-100)', color: 'var(--color-forest-700)' }}>
                  Institutional Portal
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                AICTE Permanent ID: <strong className="font-mono text-gray-700">{institution?.aisheCode || 'AICTE-INST-8821'}</strong> · State: {institution?.state || 'Maharashtra'} · Authorized User: {user.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/instruments/new" className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5">
              <PlusCircle size={15} />
              Submit New FDR
            </Link>
            <Link href="/instruments" className="btn-secondary text-xs flex items-center gap-1 py-2 px-3">
              View All Instruments
            </Link>
          </div>
        </div>
      </div>

      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Link href="/instruments" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>Total FDRs</span>
            <FileText size={16} style={{ color: 'var(--color-forest-600)' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--color-charcoal)' }}>
            {myInstruments.length}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Submitted instruments</div>
        </Link>

        <Link href="/instruments?status=active_monitoring" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>Active & Safe</span>
            <CheckCircle2 size={16} style={{ color: 'var(--color-status-success)' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--color-status-success)' }}>
            {activeInstruments}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Compliant active FDRs</div>
        </Link>

        <Link href="/maturity" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>Maturing ≤ 30d</span>
            <Clock size={16} style={{ color: maturingSoon > 0 ? 'var(--color-status-warning)' : 'gray' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: maturingSoon > 0 ? 'var(--color-status-warning)' : 'inherit' }}>
            {maturingSoon}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Renewal required</div>
        </Link>

        <Link href="/submissions" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>In Scrutiny</span>
            <ShieldCheck size={16} style={{ color: 'var(--color-status-info)' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--color-status-info)' }}>
            {pendingScrutiny}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Under officer review</div>
        </Link>

        <Link href="/instruments?status=discrepancy_flagged" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>Queries Due</span>
            <AlertCircle size={16} style={{ color: actionRequiredCount > 0 ? 'var(--color-status-error)' : 'gray' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: actionRequiredCount > 0 ? 'var(--color-status-error)' : 'inherit' }}>
            {actionRequiredCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Action requested</div>
        </Link>

        <Link href="/release-requests" className="card card-sm hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
            <span>Release Req.</span>
            <ArrowRightLeft size={16} style={{ color: 'var(--color-brass-600)' }} />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--color-brass-600)' }}>
            {releasePending}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Discharge applications</div>
        </Link>
      </div>

      {/* Main Grid: Pending Action Items + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Pending Action Items & Submissions Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Required Banner */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: 'var(--color-brass-600)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Action Required by Institution ({pendingActionItems.length})
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">Requires institutional response</span>
            </div>

            {pendingActionItems.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--color-charcoal-muted)' }}>
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600 opacity-60" />
                <p className="font-medium text-gray-800">No pending queries or overdue actions</p>
                <p className="text-xs text-gray-500 mt-1">All your FDR submissions are currently compliant and in order.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
                {pendingActionItems.map(item => (
                  <Link key={item.id} href={item.href}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors block">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                          item.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.tag}
                        </span>
                        <span className="text-xs font-semibold text-gray-900">{item.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.subtitle}</p>
                    </div>
                    <span className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 flex-shrink-0">
                      Respond <ChevronRight size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submissions Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  My Recent Submissions
                </h3>
                <p className="text-[11px] text-gray-500">Tracking FDR evidence submitted by your institution</p>
              </div>
              <Link href="/instruments" className="text-xs font-medium text-forest-600 hover:underline flex items-center gap-1">
                View all instruments <ExternalLink size={12} />
              </Link>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                No FDR submissions recorded yet.
                <div className="mt-3">
                  <Link href="/instruments/new" className="btn-primary text-xs">Submit First FDR</Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Instrument ID</th>
                      <th>Bank & Branch</th>
                      <th>Amount (₹)</th>
                      <th>Maturity</th>
                      <th>Scrutiny Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map(inst => (
                      <tr key={inst.id}>
                        <td className="font-mono text-xs font-semibold text-forest-700">
                          {inst.id}
                        </td>
                        <td className="text-xs">
                          <div className="font-medium text-gray-800">{inst.bankName}</div>
                          <div className="text-[11px] text-gray-500">{inst.branch}</div>
                        </td>
                        <td className="font-mono text-xs font-semibold text-gray-900">
                          {formatINR(inst.depositAmount)}
                        </td>
                        <td className="text-xs text-gray-600">
                          {formatDate(inst.maturityDate)}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            inst.status === 'active_monitoring' || inst.status === 'verified' ? 'status-verified' :
                            inst.status === 'discrepancy_flagged' ? 'status-error' : 'status-pending'
                          }`}>
                            {INSTRUMENT_STATUS_LABELS[inst.status] || inst.status}
                          </span>
                        </td>
                        <td>
                          <Link href={`/instruments/${inst.id}`} className="btn-ghost btn-xs text-forest-700">
                            Details
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

        {/* Right Column (1 Col): Upcoming Deadlines + Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-charcoal)' }}>
              Institutional Actions
            </h3>
            <div className="space-y-2">
              <Link href="/instruments/new"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed hover:border-forest-600 hover:bg-forest-50 transition-all text-xs font-medium text-forest-800">
                <span className="flex items-center gap-2.5">
                  <PlusCircle size={16} className="text-forest-600" />
                  Submit New FDR Registration
                </span>
                <ChevronRight size={14} />
              </Link>

              <Link href="/submissions"
                className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-all text-xs font-medium text-gray-700"
                style={{ borderColor: 'var(--color-parchment)' }}>
                <span className="flex items-center gap-2.5">
                  <UploadCloud size={16} className="text-gray-500" />
                  Upload Requested Evidence / Query Reply
                </span>
                <ChevronRight size={14} />
              </Link>

              <Link href="/maturity"
                className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-all text-xs font-medium text-gray-700"
                style={{ borderColor: 'var(--color-parchment)' }}>
                <span className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-gray-500" />
                  Submit Renewal / Replacement FDR
                </span>
                <ChevronRight size={14} />
              </Link>

              <Link href="/release-requests"
                className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-all text-xs font-medium text-gray-700"
                style={{ borderColor: 'var(--color-parchment)' }}>
                <span className="flex items-center gap-2.5">
                  <ArrowRightLeft size={16} className="text-gray-500" />
                  Apply for FDR Release / Refund
                </span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Upcoming Maturity Deadlines */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex items-center gap-2">
                <Calendar size={16} style={{ color: 'var(--color-forest-600)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Upcoming Maturity Schedule
                </h3>
              </div>
              <Link href="/maturity" className="text-xs text-forest-600 hover:underline">
                Calendar
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No active maturity deadlines scheduled.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
                {upcomingDeadlines.map(inst => {
                  const days = daysUntilMaturity(inst.maturityDate);
                  const isOverdue = days < 0;
                  const isUrgent = days >= 0 && days <= 30;
                  return (
                    <div key={inst.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-medium text-forest-700">{inst.id}</div>
                        <div className="text-[11px] text-gray-500">{inst.bankName} · {formatINR(inst.depositAmount)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Maturity: {formatDate(inst.maturityDate)}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isOverdue ? 'bg-red-100 text-red-700' :
                          isUrgent ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isOverdue ? `${Math.abs(days)}d Overdue` : `${days}d Remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Regulatory Guidance Note */}
          <div className="p-4 rounded-xl text-xs space-y-1.5"
            style={{ background: 'var(--color-brass-50)', border: '1px solid var(--color-brass-200)', color: 'var(--color-charcoal)' }}>
            <div className="font-semibold text-brass-800 flex items-center gap-1.5">
              <ShieldCheck size={14} /> AICTE Regulation Clause 4.2
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Fixed Deposit Receipts submitted for security deposit must be created jointly in the name of the Institution and the Regional Officer AICTE for a mandatory tenure of 10 years, unless otherwise permitted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
