'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import {
  getReleaseRequests, getInstruments, createReleaseRequest,
  updateReleaseRequest, makeReleaseDecision, formatINR, formatDate,
  formatDateTime
} from '@/lib/store';
import {
  ReleaseRequest, ReleaseRequestStatus, RELEASE_STATUS_LABELS,
  Instrument
} from '@/lib/types';
import {
  ArrowRightLeft, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  Clock, ShieldCheck, UserCheck, FileText, Eye, Check, X,
  ShieldAlert, Building2, HelpCircle
} from 'lucide-react';

export default function ReleaseRequestsPage() {
  const { session, permissions } = useAuth();
  const searchParams = useSearchParams();
  const newForId = searchParams.get('newFor');

  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Request Modal State
  const [newModalOpen, setNewModalOpen] = useState(!!newForId);
  const [selectedInstId, setSelectedInstId] = useState(newForId || '');
  const [requestReason, setRequestReason] = useState('');
  const [requestDocName, setRequestDocName] = useState('');

  // Scrutiny Modal State
  const [scrutinyModalOpen, setScrutinyModalOpen] = useState(false);
  const [activeReq, setActiveReq] = useState<ReleaseRequest | null>(null);
  const [scrutinyNote, setScrutinyNote] = useState('');

  // Senior Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'declined' | 'returned'>('approved');
  const [decisionReason, setDecisionReason] = useState('');

  useEffect(() => {
    if (newForId) {
      setSelectedInstId(newForId);
      setNewModalOpen(true);
    }
  }, [newForId]);

  const allRequests = useMemo(() => {
    if (!session) return [];
    return session.role === 'institution'
      ? getReleaseRequests({ institutionId: session.institutionId })
      : getReleaseRequests();
  }, [session, refreshKey]);

  const allInstruments = useMemo(() => getInstruments(), [refreshKey]);

  // Instruments eligible for release for this user
  const eligibleInstruments = useMemo(() => {
    return allInstruments.filter(i => {
      if (session?.role === 'institution' && session.institutionId && i.institutionId !== session.institutionId) {
        return false;
      }
      return ['active_monitoring', 'verified', 'renewal_pending'].includes(i.status);
    });
  }, [allInstruments, session]);

  const filtered = useMemo(() => {
    return allRequests.filter(req => {
      const inst = allInstruments.find(i => i.id === req.instrumentId);
      const matchSearch =
        req.id.toLowerCase().includes(search.toLowerCase()) ||
        req.instrumentId.toLowerCase().includes(search.toLowerCase()) ||
        (inst?.institutionName.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allRequests, allInstruments, search, statusFilter]);

  // Handle Create Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedInstId || !requestReason.trim()) return;
    const inst = allInstruments.find(i => i.id === selectedInstId);
    if (!inst) return;

    createReleaseRequest({
      instrumentId: selectedInstId,
      institutionId: inst.institutionId,
      requestDate: new Date().toISOString(),
      reason: requestReason.trim(),
      supportingDocuments: requestDocName ? [requestDocName.trim()] : [],
      createdBy: session.userId,
    });

    setNewModalOpen(false);
    setSelectedInstId('');
    setRequestReason('');
    setRequestDocName('');
    setRefreshKey(k => k + 1);
  };

  // Handle Scrutiny Review
  const handleScrutinySubmit = (forwardToSenior: boolean) => {
    if (!session || !activeReq || !scrutinyNote.trim()) return;
    updateReleaseRequest(activeReq.id, {
      scrutinyObservation: scrutinyNote.trim(),
      scrutinyOfficerId: session.userId,
      status: forwardToSenior ? 'pending_senior_decision' : 'under_scrutiny',
    }, session);

    setScrutinyModalOpen(false);
    setActiveReq(null);
    setScrutinyNote('');
    setRefreshKey(k => k + 1);
  };

  // Handle Senior Officer Decision
  const handleDecisionSubmit = () => {
    if (!session || !activeReq || !decisionReason.trim()) return;
    makeReleaseDecision(activeReq.id, decisionType, decisionReason.trim(), session);
    setDecisionModalOpen(false);
    setActiveReq(null);
    setDecisionReason('');
    setRefreshKey(k => k + 1);
  };

  const getStatusBadge = (status: ReleaseRequestStatus) => {
    const label = RELEASE_STATUS_LABELS[status] || status;
    const colorMap: Record<ReleaseRequestStatus, string> = {
      approved: 'status-verified',
      declined: 'status-error',
      under_scrutiny: 'status-info',
      pending_senior_decision: 'status-pending',
      additional_documents_required: 'status-error',
      submitted: 'status-pending',
      draft: 'status-neutral',
      closed: 'status-neutral',
    };
    return <span className={`status-badge ${colorMap[status] || 'status-neutral'}`}>{label}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Security Deposit Release & Refund Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Formal institutional discharge process governed by AICTE regulatory guidelines and authorized review.
          </p>
        </div>

        {session?.role === 'institution' && (
          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={15} /> Initiate Release Request
          </button>
        )}
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Total Filed</span>
          <div className="text-2xl font-serif font-bold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {allRequests.length}
          </div>
          <span className="text-[11px] text-gray-400">Release applications</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">In Scrutiny</span>
          <div className="text-2xl font-serif font-bold text-blue-800 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {allRequests.filter(r => ['submitted', 'under_scrutiny', 'additional_documents_required'].includes(r.status)).length}
          </div>
          <span className="text-[11px] text-gray-400">Officer verification</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Pending Senior Decision</span>
          <div className="text-2xl font-serif font-bold text-amber-800 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {allRequests.filter(r => r.status === 'pending_senior_decision').length}
          </div>
          <span className="text-[11px] text-gray-400">Awaiting final sign-off</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Approved & Discharged</span>
          <div className="text-2xl font-serif font-bold text-emerald-800 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {allRequests.filter(r => r.status === 'approved').length}
          </div>
          <span className="text-[11px] text-gray-400">Released instruments</span>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Request ID, Instrument, or Institution..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
            >
              <option value="all">All Release States</option>
              <option value="submitted">Submitted</option>
              <option value="under_scrutiny">Under Scrutiny</option>
              <option value="pending_senior_decision">Pending Senior Decision</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Request Records Table */}
        {filtered.length > 0 ? (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b text-gray-600">
                <tr>
                  <th className="p-3 font-semibold">Request ID</th>
                  <th className="p-3 font-semibold">Instrument & Institution</th>
                  <th className="p-3 font-semibold">Principal</th>
                  <th className="p-3 font-semibold">Reason for Release</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(req => {
                  const inst = allInstruments.find(i => i.id === req.instrumentId);
                  return (
                    <tr key={req.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-forest-800">
                        {req.id}
                        <span className="block text-[10px] text-gray-400 font-sans">
                          {formatDate(req.requestDate)}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link href={`/instruments/${req.instrumentId}`} className="font-mono font-semibold text-gray-900 hover:underline block">
                          {req.instrumentId}
                        </Link>
                        <span className="text-gray-500 truncate block max-w-[200px]">
                          {inst?.institutionName || 'Institution'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-emerald-800">
                        {inst ? formatINR(inst.depositAmount) : '—'}
                      </td>
                      <td className="p-3 text-gray-700 max-w-[250px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Scrutiny Officer Action */}
                          {permissions?.canVerify && req.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReq(req);
                                setScrutinyNote(req.scrutinyObservation || '');
                                setScrutinyModalOpen(true);
                              }}
                              className="btn-secondary text-[11px] px-2.5 py-1 text-blue-800 border-blue-200 hover:bg-blue-50"
                            >
                              Scrutinize
                            </button>
                          )}

                          {/* Senior Officer Decision */}
                          {permissions?.canMakeReleaseDecision && req.status === 'pending_senior_decision' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReq(req);
                                setDecisionType('approved');
                                setDecisionReason('');
                                setDecisionModalOpen(true);
                              }}
                              className="btn-primary text-[11px] px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1"
                            >
                              <UserCheck size={12} /> Decide
                            </button>
                          )}

                          <Link
                            href={`/instruments/${req.instrumentId}`}
                            className="btn-secondary text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> Instrument
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 bg-stone-50 rounded-xl">
            No release requests found matching your filter criteria.
          </div>
        )}
      </div>

      {/* --- Modals --- */}

      {/* 1. Initiate Request Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRequest} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-forest-600" />
              Initiate Security Deposit Release Request
            </h3>
            <p className="text-xs text-gray-500">
              Only instruments in active monitoring, verified, or completed statutory tenure are eligible for refund/discharge scrutiny.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Eligible Instrument *</label>
                <select
                  value={selectedInstId}
                  onChange={e => setSelectedInstId(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs bg-white"
                  required
                >
                  <option value="">-- Choose active FDR instrument --</option>
                  {eligibleInstruments.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.id} · FDR #{i.fdrNumber} · {formatINR(i.depositAmount)} ({i.institutionName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Regulatory Justification & Ground for Release *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Completion of mandatory 10-year security lock-in period for autonomous program approval as per Approval Process Handbook Clause 4.8..."
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Supporting Discharge Resolution / Audit Certificate (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Governing_Body_Resolution_2025_Discharge.pdf"
                  value={requestDocName}
                  onChange={e => setRequestDocName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedInstId || !requestReason.trim()}
                className="btn-primary text-xs disabled:opacity-50"
              >
                File Release Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Scrutiny Officer Observation & Forward Modal */}
      {scrutinyModalOpen && activeReq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Scrutiny Officer Review: {activeReq.id}
            </h3>
            <p className="text-xs text-gray-500">
              Review deposit release criteria, verify adherence to lock-in requirements, and provide scrutiny findings.
            </p>

            <div className="p-3 bg-stone-50 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Instrument:</span>
                <span className="font-mono font-bold text-gray-800">{activeReq.instrumentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Institution Claim:</span>
                <span className="text-gray-800 italic">&ldquo;{activeReq.reason}&rdquo;</span>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Scrutiny Officer Observations & Compliance Check *</label>
              <textarea
                rows={3}
                placeholder="e.g. Verified lock-in period complete. No pending disciplinary penalties or student complaints. Recommended for Senior Officer release sign-off..."
                value={scrutinyNote}
                onChange={e => setScrutinyNote(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setScrutinyModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!scrutinyNote.trim()}
                onClick={() => handleScrutinySubmit(false)}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Save Observations
              </button>
              <button
                type="button"
                disabled={!scrutinyNote.trim()}
                onClick={() => handleScrutinySubmit(true)}
                className="btn-primary text-xs bg-forest-700 hover:bg-forest-800 disabled:opacity-50"
              >
                Forward to Senior Officer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Senior Officer Final Decision Modal */}
      {decisionModalOpen && activeReq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <UserCheck size={18} className="text-forest-600" />
              Senior Officer Decision: {activeReq.id}
            </h3>
            <p className="text-xs text-gray-500">
              Mandatory recorded decision on releasing security deposit. If approved, the underlying FDR instrument will be marked as &apos;Released&apos;.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'approved', label: 'Approve Release', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
                    { key: 'declined', label: 'Decline / Reject', color: 'border-red-500 text-red-800 bg-red-50' },
                    { key: 'returned', label: 'Return for Scrutiny', color: 'border-amber-500 text-amber-800 bg-amber-50' }
                  ].map(d => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDecisionType(d.key as any)}
                      className={`p-2.5 rounded-lg border text-center font-semibold transition-all ${
                        decisionType === d.key ? `${d.color} ring-2 ring-forest-500` : 'border-stone-200 bg-white text-gray-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mandatory Formal Reason & Authorizing Note *</label>
                <textarea
                  rows={3}
                  placeholder="Record formal administrative justification for approval or grounds for rejection..."
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!decisionReason.trim()}
                onClick={handleDecisionSubmit}
                className="btn-primary text-xs bg-forest-700 hover:bg-forest-800 disabled:opacity-50"
              >
                Execute Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
