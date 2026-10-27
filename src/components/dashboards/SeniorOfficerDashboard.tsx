'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DemoSession, getInstruments, getReleaseRequests, getFindings, getAuditEvents,
  getInstitution, makeReleaseDecision, formatINR, formatDate, formatDateTime, daysUntilMaturity
} from '@/lib/store';
import { User, ReleaseRequest } from '@/lib/types';
import {
  CheckCircle, XCircle, RotateCcw, AlertTriangle, ArrowRightLeft,
  ShieldAlert, Clock, UserCheck, MessageSquare, ExternalLink, ShieldCheck
} from 'lucide-react';

interface Props {
  session: DemoSession;
  user: User;
}

export default function SeniorOfficerDashboard({ session, user }: Props) {
  // Decision modal state
  const [decisionModal, setDecisionModal] = useState<{
    request: ReleaseRequest;
    type: 'approved' | 'declined' | 'returned';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const {
    pendingSeniorDecisions,
    escalatedCases,
    highDiscrepancies,
    decisionsRecorded,
    decisionQueue,
    decisionHistory,
  } = useMemo(() => {
    const instruments = getInstruments();
    const releaseReqs = getReleaseRequests();
    const findings = getFindings().filter(f => !f.resolved);
    const audit = getAuditEvents();

    // Release requests requiring senior decision
    const pendingRelease = releaseReqs.filter(r => ['pending_senior_decision', 'under_scrutiny', 'submitted'].includes(r.status));

    // Escalated instruments
    const escalations = instruments.filter(i => {
      const relatedAudit = audit.filter(e => e.entityId === i.id && e.action === 'escalation');
      return relatedAudit.length > 0 || i.status === 'discrepancy_flagged';
    });

    const highDiscrep = findings.filter(f => f.severity === 'critical' || f.severity === 'error');

    // Decisions recorded
    const recordedDecisions = releaseReqs.filter(r => ['approved', 'declined'].includes(r.status) || r.seniorDecision);

    // Decision queue items
    const queue = pendingRelease.map(req => {
      const inst = instruments.find(i => i.id === req.instrumentId);
      const instFindings = findings.filter(f => f.instrumentId === req.instrumentId);
      return {
        ...req,
        instrument: inst,
        findingsCount: instFindings.length,
        isMatured: inst ? daysUntilMaturity(inst.maturityDate) <= 0 : false,
      };
    });

    // Decision history sorted by update date
    const history = recordedDecisions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);

    return {
      pendingSeniorDecisions: pendingRelease.length,
      escalatedCases: escalations.length,
      highDiscrepancies: highDiscrep.length,
      decisionsRecorded: recordedDecisions.length,
      decisionQueue: queue,
      decisionHistory: history,
    };
  }, [actionFeedback]);

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal || !decisionReason.trim()) return;

    try {
      makeReleaseDecision(decisionModal.request.id, decisionModal.type, decisionReason.trim(), session);
      setActionFeedback({
        text: `Official decision (${decisionModal.type.toUpperCase()}) recorded for Release Request ${decisionModal.request.id}. Audit decree logged.`,
        type: 'success',
      });
      setDecisionModal(null);
      setDecisionReason('');
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Decision failed';
      setActionFeedback({ text: message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-700)', border: '1px solid var(--color-forest-200)' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                  Senior Officer Executive Desk
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{ background: 'var(--color-brass-100)', color: 'var(--color-brass-800)' }}>
                  Competent Authority: FDR Release & Exceptions
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                Review escalated officer findings, evaluate release applications against statutory norms, and record legally binding determinations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/release-requests" className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5">
              <ArrowRightLeft size={15} />
              All Release Applications
            </Link>
            <Link href="/audit?action=release_decision" className="btn-secondary text-xs flex items-center gap-1 py-2 px-3">
              <Clock size={14} />
              Decree Audit Log
            </Link>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
          actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{actionFeedback.text}</span>
          <button onClick={() => setActionFeedback(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Decision Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Pending Authorization</span>
            <ArrowRightLeft size={16} className="text-brass-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-brass-700">{pendingSeniorDecisions}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Awaiting release decree</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Escalated Exceptions</span>
            <ShieldAlert size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-red-700">{escalatedCases}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Scrutiny officer referrals</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Unresolved Discrepancies</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-amber-700">{highDiscrepancies}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Critical/high findings</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Decisions Executed</span>
            <CheckCircle size={16} className="text-forest-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-forest-700">{decisionsRecorded}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Determinations on record</div>
        </div>
      </div>

      {/* Decision Workplace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Pending Decision Queue with Interactive Decision Buttons */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Pending Decisions Queue ({decisionQueue.length})
                </h3>
                <p className="text-[11px] text-gray-500">Release/refund applications requiring Senior Officer determination</p>
              </div>
              <span className="text-[11px] text-brass-700 bg-brass-50 border border-brass-200 px-2 py-0.5 rounded font-medium">
                Mandatory justification enforced
              </span>
            </div>

            {decisionQueue.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600 opacity-50" />
                No release applications currently awaiting Senior Officer authorization.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
                {decisionQueue.map(req => (
                  <div key={req.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-forest-700">{req.id}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="font-mono text-xs font-medium text-gray-800">{req.instrumentId}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold uppercase">
                            {req.reason}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-900 mt-1">{getInstitution(req.institutionId)?.name || req.institutionId}</div>
                      </div>

                      <div className="text-right">
                        {req.instrument && (
                          <div className="font-mono text-xs font-bold text-gray-900">
                            {formatINR(req.instrument.depositAmount)}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500">
                          Applied {formatDate(req.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Scrutiny Observation & Completeness */}
                    <div className="p-3 rounded-lg bg-gray-50 border text-xs space-y-1.5" style={{ borderColor: 'var(--color-parchment)' }}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-gray-700 flex items-center gap-1">
                          <MessageSquare size={13} className="text-forest-600" />
                          Scrutiny Officer Observation:
                        </span>
                        <span className={`font-semibold ${req.findingsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {req.findingsCount > 0 ? `${req.findingsCount} Open Discrepancies` : 'Documents Verified'}
                        </span>
                      </div>
                      <p className="text-gray-600 italic leading-relaxed text-[11px]">
                        &quot;{req.scrutinyObservation || 'Primary scrutiny completed. Instrument verified against master bank statements. Submitted for final competent authority decision.'}&quot;
                      </p>
                    </div>

                    {/* Interactive Senior Officer Decision Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
                      <Link href={`/instruments/${req.instrumentId}`} className="text-xs text-forest-700 hover:underline flex items-center gap-1">
                        Inspect Case Evidence <ExternalLink size={12} />
                      </Link>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDecisionModal({ request: req, type: 'returned' })}
                          className="btn-outline btn-xs text-amber-800 border-amber-300 hover:bg-amber-50 flex items-center gap-1">
                          <RotateCcw size={12} />
                          Return for Scrutiny
                        </button>
                        <button
                          onClick={() => setDecisionModal({ request: req, type: 'declined' })}
                          className="btn-outline btn-xs text-red-700 border-red-300 hover:bg-red-50 flex items-center gap-1">
                          <XCircle size={12} />
                          Decline Request
                        </button>
                        <button
                          onClick={() => setDecisionModal({ request: req, type: 'approved' })}
                          className="btn-primary btn-xs flex items-center gap-1">
                          <CheckCircle size={12} />
                          Approve Release
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Decision History & Statutory Policy */}
        <div className="space-y-6">
          {/* Recent Decision History */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                Decision History ({decisionHistory.length})
              </h3>
              <Link href="/audit?action=release_decision" className="text-xs text-forest-600 hover:underline">
                Audit Trail
              </Link>
            </div>

            {decisionHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No past determinations recorded in this period.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
                {decisionHistory.map(req => {
                  const isApproved = req.seniorDecision === 'approved' || req.status === 'approved';
                  return (
                    <div key={req.id} className="p-3.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-forest-700">{req.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {req.seniorDecision || req.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 truncate">{getInstitution(req.institutionId)?.name || req.institutionId}</div>
                      {req.seniorDecisionReason && (
                        <div className="text-[11px] text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                          &quot;{req.seniorDecisionReason}&quot;
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        Determined {formatDateTime(req.decisionDate || req.updatedAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statutory Decision Policy Notice */}
          <div className="p-4 rounded-xl text-xs space-y-2"
            style={{ background: 'var(--color-brass-50)', border: '1px solid var(--color-brass-200)', color: 'var(--color-charcoal)' }}>
            <div className="font-semibold text-brass-800 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Regulatory Safeguard Notice
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              FDR instruments never automatically discharge upon calendar maturity. Approval requires verified no-objection status, institutional clearance, and mandatory recorded reasoning.
            </p>
          </div>
        </div>
      </div>

      {/* Decision Execution Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 border" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Execute Decision: {decisionModal.type.toUpperCase()}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Release Request <strong className="font-mono text-forest-700">{decisionModal.request.id}</strong> ({decisionModal.request.instrumentId})
                </p>
              </div>
              <button onClick={() => setDecisionModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-50 border text-xs space-y-1" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="text-gray-500">Institution:</div>
                <div className="font-medium text-gray-900">{getInstitution(decisionModal.request.institutionId)?.name || decisionModal.request.institutionId}</div>
                <div className="text-gray-500 mt-1">Application Purpose:</div>
                <div className="font-medium text-gray-900">{decisionModal.request.reason}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mandatory Decision Rationale & Order <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                  placeholder={
                    decisionModal.type === 'approved'
                      ? 'e.g., Institutional compliance verified. 10-year lock-in period satisfied without outstanding penalties. Release approved for transfer back to institution.'
                      : decisionModal.type === 'declined'
                      ? 'e.g., Application declined due to active regulatory query regarding student intake discrepancies.'
                      : 'e.g., Returned to Scrutiny Officer for verification of updated bank endorsement letter.'
                  }
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-1 focus:ring-forest-600"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  This determination will be permanently immutably stamped in the regulatory audit trail with your digital officer identifier.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
                <button type="button" onClick={() => setDecisionModal(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-xs flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs text-white ${
                    decisionModal.type === 'approved' ? 'bg-forest-700 hover:bg-forest-800' :
                    decisionModal.type === 'declined' ? 'bg-red-700 hover:bg-red-800' :
                    'bg-amber-700 hover:bg-amber-800'
                  }`}>
                  Record Official Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
