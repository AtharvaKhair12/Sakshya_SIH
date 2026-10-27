'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DemoSession, getInstruments, getFindings, getReleaseRequests, getAuditEvents,
  formatINR, formatDateTime, escalateInstrument
} from '@/lib/store';
import { User, VERIFICATION_STATUS_LABELS } from '@/lib/types';
import {
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, Clock, ArrowRightLeft,
  ChevronRight, ShieldAlert, ArrowUpRight, Filter, AlertCircle
} from 'lucide-react';

interface Props {
  session: DemoSession;
  user: User;
}

export default function ScrutinyDashboard({ session, user }: Props) {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'critical'>('all');
  const [escalateModalCase, setEscalateModalCase] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const {
    awaitingReview,
    assignedToMe,
    discrepancyCases,
    externalPending,
    releaseInScrutiny,
    prioritizedQueue,
    verificationFindings,
    scrutinyAuditEvents,
  } = useMemo(() => {
    const instruments = getInstruments();
    const findings = getFindings().filter(f => !f.resolved);
    const releaseReqs = getReleaseRequests();
    const audit = getAuditEvents();

    const firstReview = instruments.filter(i => ['submitted', 'pending_scrutiny', 'preliminary_validation'].includes(i.status));
    const myCases = instruments.filter(i => i.assignedReviewer === user.id || i.status === 'verification_in_progress');
    const flagged = instruments.filter(i => i.status === 'discrepancy_flagged');
    const extPend = instruments.filter(i => ['not_started', 'in_progress', 'mismatch_detected'].includes(i.verificationStatus));
    const relScrut = releaseReqs.filter(r => ['submitted', 'under_scrutiny'].includes(r.status));

    // Construct prioritized scrutiny queue
    const queue = instruments
      .filter(i => ['submitted', 'pending_scrutiny', 'verification_in_progress', 'discrepancy_flagged'].includes(i.status))
      .map(inst => {
        const relatedFindings = findings.filter(f => f.instrumentId === inst.id);
        const hasCritical = relatedFindings.some(f => f.severity === 'critical');
        const hasError = relatedFindings.some(f => f.severity === 'error') || inst.status === 'discrepancy_flagged';
        const priority = hasCritical ? 'critical' : hasError ? 'high' : 'normal';

        const issue = relatedFindings.length > 0
          ? relatedFindings[0].ruleName
          : inst.status === 'discrepancy_flagged'
          ? 'Discrepancy in FDR details'
          : inst.verificationStatus === 'not_started'
          ? 'Source verification pending'
          : 'First documentary review';

        return {
          ...inst,
          priority,
          issue,
          findingsCount: relatedFindings.length,
        };
      })
      .sort((a, b) => {
        const score: Record<string, number> = { critical: 3, high: 2, normal: 1 };
        return (score[b.priority] || 0) - (score[a.priority] || 0);
      });

    // Recent scrutiny-specific audit logs
    const scrutinyAudit = audit
      .filter(e => ['verification_completed', 'observation_added', 'escalation', 'finding_resolved', 'status_changed'].includes(e.action))
      .slice(0, 8);

    return {
      awaitingReview: firstReview.length,
      assignedToMe: myCases.length,
      discrepancyCases: flagged.length,
      externalPending: extPend.length,
      releaseInScrutiny: relScrut.length,
      prioritizedQueue: queue,
      verificationFindings: findings.slice(0, 6),
      scrutinyAuditEvents: scrutinyAudit,
    };
  }, [user.id]);

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateModalCase || !escalateReason.trim()) return;
    try {
      escalateInstrument(escalateModalCase, escalateReason.trim(), session);
      setFeedbackMsg({ text: `Case ${escalateModalCase} successfully escalated to Senior Officer.`, type: 'success' });
      setEscalateModalCase(null);
      setEscalateReason('');
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Escalation failed';
      setFeedbackMsg({ text: message, type: 'error' });
    }
  };

  const filteredQueue = useMemo(() => {
    if (filterSeverity === 'all') return prioritizedQueue;
    return prioritizedQueue.filter(item => item.priority === filterSeverity);
  }, [prioritizedQueue, filterSeverity]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-700)', border: '1px solid var(--color-forest-200)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                  Scrutiny Operations Desk
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{ background: 'var(--color-brass-100)', color: 'var(--color-brass-800)' }}>
                  Level-1 Evidence Verification
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                Investigate FDR submissions, verify extracted OCR attributes against bank sources, and escalate unresolved discrepancies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/verification" className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5">
              <ShieldCheck size={15} />
              Open Verification Workspace
            </Link>
            <Link href="/release-requests" className="btn-secondary text-xs flex items-center gap-1 py-2 px-3">
              <ArrowRightLeft size={14} />
              Release Scrutiny ({releaseInScrutiny})
            </Link>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Scrutiny Workload KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Awaiting Review</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-gray-900">{awaitingReview}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">New submissions queue</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Assigned Cases</span>
            <FileText size={16} className="text-forest-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-forest-700">{assignedToMe}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">In active review</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Flagged Discrepancies</span>
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-red-700">{discrepancyCases}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Requires inquiry/escalation</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>External Verification</span>
            <ShieldAlert size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-blue-700">{externalPending}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Pending bank response</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Release Scrutiny</span>
            <ArrowRightLeft size={16} className="text-brass-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-brass-700">{releaseInScrutiny}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Awaiting recommendation</div>
        </div>
      </div>

      {/* Main Grid: Prioritized Review Queue (Left 2 Cols) + Findings & Audit (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Prioritized Workload Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Prioritized Scrutiny Review Queue ({filteredQueue.length})
                </h3>
                <p className="text-[11px] text-gray-500">Ranked by discrepancy severity and compliance urgency</p>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter size={13} className="text-gray-400" />
                <span className="text-gray-500">Filter:</span>
                <button onClick={() => setFilterSeverity('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${filterSeverity === 'all' ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  All
                </button>
                <button onClick={() => setFilterSeverity('critical')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${filterSeverity === 'critical' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Critical
                </button>
                <button onClick={() => setFilterSeverity('high')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${filterSeverity === 'high' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  High
                </button>
              </div>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600 opacity-50" />
                No cases matching selected scrutiny priority filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Instrument & Inst.</th>
                      <th>Issue / Finding</th>
                      <th>Priority</th>
                      <th>Amount & Bank</th>
                      <th>Source Verification</th>
                      <th>Scrutiny Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map(item => (
                      <tr key={item.id}>
                        <td className="text-xs">
                          <Link href={`/instruments/${item.id}`} className="font-mono font-semibold text-forest-700 hover:underline">
                            {item.id}
                          </Link>
                          <div className="text-[11px] text-gray-500 truncate max-w-[150px]">{item.institutionName}</div>
                        </td>
                        <td className="text-xs">
                          <div className="font-medium text-gray-800">{item.issue}</div>
                          {item.findingsCount > 1 && (
                            <div className="text-[10px] text-red-600 font-medium">+{item.findingsCount - 1} additional findings</div>
                          )}
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            item.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="text-xs">
                          <div className="font-mono font-semibold text-gray-800">{formatINR(item.depositAmount)}</div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{item.bankName}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${
                            item.verificationStatus === 'verified_by_source' ? 'status-verified' :
                            item.verificationStatus === 'mismatch_detected' ? 'status-error' :
                            'status-pending'
                          }`}>
                            {VERIFICATION_STATUS_LABELS[item.verificationStatus] || item.verificationStatus}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/instruments/${item.id}`} className="btn-ghost btn-xs text-forest-700" title="Inspect records">
                              Inspect
                            </Link>
                            <button onClick={() => setEscalateModalCase(item.id)}
                              className="btn-outline btn-xs text-amber-800 border-amber-300 hover:bg-amber-50" title="Escalate to Senior Officer">
                              Escalate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Verification Findings & Scrutiny Activity */}
        <div className="space-y-6">
          {/* Active Discrepancy Findings Card */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Active Discrepancy Findings
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">{verificationFindings.length} open</span>
            </div>

            {verificationFindings.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No unresolved compliance findings recorded.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
                {verificationFindings.map(finding => (
                  <Link key={finding.id} href={`/instruments/${finding.instrumentId}`}
                    className="p-3.5 block hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-forest-700">{finding.instrumentId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        finding.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {finding.severity}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-800 mt-1">{finding.ruleName}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{finding.description}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Scrutiny Activity */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                Recent Scrutiny Actions
              </h3>
              <Link href="/audit" className="text-xs text-forest-600 hover:underline">
                Full Audit Trail
              </Link>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {scrutinyAuditEvents.map(event => (
                <div key={event.id} className="p-3 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{event.userName}</span>
                    <span className="text-[10px] text-gray-400">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-mono text-forest-700 font-medium">{event.entityId}</span>: {event.action.replace(/_/g, ' ')}
                  </div>
                  {event.reason && (
                    <div className="text-[11px] text-gray-500 italic mt-0.5">
                      &quot;{event.reason}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Modal */}
      {escalateModalCase && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-gray-900">
                Escalate Case to Senior Officer
              </h3>
              <button onClick={() => setEscalateModalCase(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <p className="text-xs text-gray-600">
              Escalating <strong className="font-mono text-forest-700">{escalateModalCase}</strong> will place it on the Senior Officer Decision Dashboard with your recorded rationale.
            </p>
            <form onSubmit={handleEscalateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Escalation / Specific Discrepancy <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={e => setEscalateReason(e.target.value)}
                  placeholder="e.g., Unresolved bank mismatch: FDR receipt amount differs from bank confirmation statement by ₹5,00,000."
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-1 focus:ring-forest-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEscalateModalCase(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs flex items-center gap-1.5">
                  <ArrowUpRight size={14} /> Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
