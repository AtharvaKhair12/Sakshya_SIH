'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getInstrument, getInstruments, getVerifications, getFindings, getDocuments,
  updateVerificationStatus, updateInstrumentStatus, addObservation,
  escalateInstrument, formatINR, formatDate, formatDateTime
} from '@/lib/store';
import {
  VerificationStatus, Instrument, VerificationResult, ComplianceFinding,
  UploadedDocument, VERIFICATION_STATUS_LABELS, INSTRUMENT_STATUS_LABELS
} from '@/lib/types';
import {
  ShieldCheck, Search, Filter, AlertTriangle, CheckCircle2, Clock,
  FileText, ExternalLink, ArrowRight, Eye, ShieldAlert, Sparkles,
  UserCheck, AlertCircle, Check, Info, FileCheck, Building2
} from 'lucide-react';
import FDRCaseAssessmentPanel from '@/components/case-assessment/FDRCaseAssessmentPanel';

export default function VerificationWorkspacePage() {
  const { session, permissions } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');

  // Modals / Action State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [targetVerStatus, setTargetVerStatus] = useState<VerificationStatus>('verified_by_source');
  const [decisionReason, setDecisionReason] = useState('');

  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsText, setObsText] = useState('');

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const instruments = useMemo(() => getInstruments(), [refreshKey]);
  const verifications = useMemo(() => getVerifications(), [refreshKey]);
  const findings = useMemo(() => getFindings(), [refreshKey]);
  const documents = useMemo(() => getDocuments(), [refreshKey]);

  // Filter instruments that require scrutiny / verification
  const queueItems = useMemo(() => {
    return instruments.filter(i => {
      const matchSearch =
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.institutionName.toLowerCase().includes(search.toLowerCase()) ||
        i.fdrNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.bankName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || i.verificationStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [instruments, search, statusFilter]);

  // Set default selected instrument if none selected or invalid
  const selectedInstrument = useMemo(() => {
    if (!selectedInstrumentId && queueItems.length > 0) {
      return queueItems[0];
    }
    return instruments.find(i => i.id === selectedInstrumentId) || queueItems[0] || null;
  }, [instruments, queueItems, selectedInstrumentId]);

  const selectedVerifications = useMemo(() => {
    if (!selectedInstrument) return [];
    return verifications.filter(v => v.instrumentId === selectedInstrument.id);
  }, [verifications, selectedInstrument]);

  const selectedFindings = useMemo(() => {
    if (!selectedInstrument) return [];
    return findings.filter(f => f.instrumentId === selectedInstrument.id);
  }, [findings, selectedInstrument]);

  const selectedDocs = useMemo(() => {
    if (!selectedInstrument) return [];
    return documents.filter(d => d.instrumentId === selectedInstrument.id);
  }, [documents, selectedInstrument]);

  // Actions
  const handleRecordVerificationDecision = () => {
    if (!session || !selectedInstrument || !decisionReason.trim()) return;
    updateVerificationStatus(selectedInstrument.id, targetVerStatus, session);
    addObservation(selectedInstrument.id, `Verification outcome recorded as "${VERIFICATION_STATUS_LABELS[targetVerStatus]}": ${decisionReason.trim()}`, session);

    // If verified by source, also advance lifecycle if appropriate
    if (targetVerStatus === 'verified_by_source' && selectedInstrument.status === 'verification_in_progress') {
      updateInstrumentStatus(selectedInstrument.id, 'verified', 'Automated/Authorized source verification match confirmed', session);
    } else if (targetVerStatus === 'mismatch_detected') {
      updateInstrumentStatus(selectedInstrument.id, 'discrepancy_flagged', `Record mismatch detected: ${decisionReason.trim()}`, session);
    }

    setDecisionModalOpen(false);
    setDecisionReason('');
    setRefreshKey(k => k + 1);
  };

  const handleAddObservation = () => {
    if (!session || !selectedInstrument || !obsText.trim()) return;
    addObservation(selectedInstrument.id, obsText.trim(), session);
    setObsModalOpen(false);
    setObsText('');
    setRefreshKey(k => k + 1);
  };

  const handleEscalate = () => {
    if (!session || !selectedInstrument || !escalateReason.trim()) return;
    escalateInstrument(selectedInstrument.id, escalateReason.trim(), session);
    setEscalateModalOpen(false);
    setEscalateReason('');
    setRefreshKey(k => k + 1);
  };

  const getVerificationBadge = (vStatus: VerificationStatus) => {
    const label = VERIFICATION_STATUS_LABELS[vStatus] || vStatus;
    const colorMap: Record<string, string> = {
      verified_by_source: 'status-verified', public_reference_match: 'status-verified',
      mismatch_detected: 'status-error', expired: 'status-error',
      source_unavailable: 'status-pending', manual_confirmation_required: 'status-info',
      pending: 'status-pending', not_started: 'status-neutral', simulated_response: 'status-info',
    };
    return <span className={`status-badge ${colorMap[vStatus] || 'status-neutral'}`}>{label}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Verification & Scrutiny Workspace
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cross-reference submitted FDR instruments against institutional reference datasets, bank letters, and regulatory rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 bg-stone-100 text-stone-700 rounded-full font-medium">
            Queue: {queueItems.length} Cases Active
          </span>
        </div>
      </div>

      {/* Master-Detail Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
        {/* Left Column: Queue List (5 cols) */}
        <div className="lg:col-span-5 bg-white border rounded-xl p-4 shadow-sm flex flex-col space-y-3" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="space-y-2 border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FDR, institution, or bank..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white text-gray-700"
              >
                <option value="all">All Verification Outcomes</option>
                <option value="mismatch_detected">Mismatch Detected (Priority)</option>
                <option value="manual_confirmation_required">Manual Confirmation Required</option>
                <option value="pending">Pending</option>
                <option value="not_started">Not Started</option>
                <option value="verified_by_source">Verified by Source</option>
                <option value="public_reference_match">Public Reference Match</option>
                <option value="simulated_response">Direct Reference Match</option>
              </select>
            </div>
          </div>

          {/* Queue Items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {queueItems.length > 0 ? (
              queueItems.map(inst => {
                const isSelected = selectedInstrument?.id === inst.id;
                const instFindings = findings.filter(f => f.instrumentId === inst.id && !f.resolved);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => setSelectedInstrumentId(inst.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'border-forest-600 bg-forest-50/50 shadow-sm ring-1 ring-forest-500'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-gray-900">{inst.id}</span>
                      {getVerificationBadge(inst.verificationStatus)}
                    </div>
                    <p className="font-semibold text-gray-800 truncate">{inst.institutionName}</p>
                    <div className="flex items-center justify-between text-gray-500 text-[11px] mt-1.5">
                      <span className="font-mono">{inst.fdrNumber}</span>
                      <span className="font-bold text-emerald-800">{formatINR(inst.depositAmount)}</span>
                    </div>

                    {instFindings.length > 0 && (
                      <div className="mt-2 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                        <AlertTriangle size={12} /> {instFindings.length} open discrepancy finding(s)
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">
                No instruments found in the verification queue matching your criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case Details & Investigation Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedInstrument ? (
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6" style={{ borderColor: 'var(--color-parchment)' }}>
              {/* Top Case Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-parchment)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                      Case #{selectedInstrument.id}
                    </span>
                    {getVerificationBadge(selectedInstrument.verificationStatus)}
                  </div>
                  <h2 className="text-lg font-serif font-bold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
                    {selectedInstrument.institutionName}
                  </h2>
                  <p className="text-xs text-gray-500">
                    AISHE: {selectedInstrument.aisheCode} · FDR #{selectedInstrument.fdrNumber}
                  </p>
                </div>

                <Link
                  href={`/instruments/${selectedInstrument.id}`}
                  className="btn-secondary text-xs flex items-center gap-1 self-start sm:self-auto"
                >
                  <Eye size={13} /> Full Instrument Record
                </Link>
              </div>

              {/* Action Buttons for Scrutiny / Senior Officer */}
              {permissions?.canVerify && (
                <div className="p-3 bg-stone-50 border rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
                  <span className="font-semibold text-gray-700">Scrutiny Actions:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDecisionModalOpen(true)}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <UserCheck size={14} /> Record Verification Outcome
                    </button>
                    <button
                      type="button"
                      onClick={() => setObsModalOpen(true)}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <Info size={14} /> Note Observation
                    </button>
                    {permissions?.canEscalate && (
                      <button
                        type="button"
                        onClick={() => setEscalateModalOpen(true)}
                        className="btn-secondary text-xs border-amber-300 text-amber-800 hover:bg-amber-50 flex items-center gap-1"
                      >
                        <AlertTriangle size={14} /> Escalate
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FDR Evidence-to-Action Engine Case Assessment Panel */}
              <div className="pt-2">
                <FDRCaseAssessmentPanel
                  instrument={selectedInstrument}
                  documents={selectedDocs}
                  predecessor={selectedInstrument.linkedPredecessorId ? getInstrument(selectedInstrument.linkedPredecessorId) : null}
                  verifications={selectedVerifications}
                  onRefresh={() => setRefreshKey(k => k + 1)}
                />
              </div>

              {/* Submitted vs Source Evidence Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck size={15} className="text-forest-600" />
                  Source Comparison Ledger
                </h3>

                {selectedVerifications.length > 0 ? (
                  <div className="divide-y border rounded-xl overflow-hidden bg-white text-xs">
                    {selectedVerifications.map(v => (
                      <div key={v.id} className={`p-4 space-y-2 ${v.differenceDetected ? 'bg-red-50/50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 text-sm">{v.fieldName}</span>
                          {v.differenceDetected ? (
                            <span className="status-badge status-error">Mismatch Detected</span>
                          ) : (
                            <span className="status-badge status-verified">Source Match</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-2.5 bg-stone-50 rounded-lg border">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Submitted by Institution</span>
                            <span className="font-mono font-medium text-gray-800 text-xs">{v.submittedValue}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Comparison Source: {v.source}</span>
                            <span className={`font-mono font-bold text-xs ${v.differenceDetected ? 'text-red-700' : 'text-emerald-800'}`}>
                              {v.comparisonValue}
                            </span>
                          </div>
                        </div>

                        {v.suggestedAction && (
                          <div className="text-[11px] text-gray-600 flex items-center gap-1.5 pt-1">
                            <Info size={13} className="text-blue-600 flex-shrink-0" />
                            <span><strong>Recommended Next Step:</strong> {v.suggestedAction}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 rounded-xl text-xs text-gray-400 text-center">
                    No field comparison entries logged for this instrument yet.
                  </div>
                )}
              </div>

              {/* Supporting Document Proofs */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText size={15} className="text-forest-600" />
                  Attached Document Evidence ({selectedDocs.length})
                </h3>

                {selectedDocs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedDocs.map(doc => (
                      <div key={doc.id} className="p-3 border rounded-xl bg-stone-50/60 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                          <span className="text-[11px] text-gray-400 capitalize">{doc.documentType.replace(/_/g, ' ')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert(`Simulated preview for document "${doc.fileName}". In full production, this loads the secure PDF viewer.`)}
                          className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1 flex-shrink-0"
                        >
                          <FileText size={12} /> Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 rounded-xl text-xs text-gray-400 text-center">
                    No documents uploaded.
                  </div>
                )}
              </div>

              {/* Open Findings Callout */}
              {selectedFindings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-600" />
                    Regulatory Observations
                  </h3>
                  <div className="space-y-2">
                    {selectedFindings.map(f => (
                      <div key={f.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-900">{f.ruleName}</span>
                          <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            {f.severity}
                          </span>
                        </div>
                        <p className="text-amber-800">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-12 text-center text-xs text-gray-400 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
              Select an instrument from the verification queue on the left to inspect evidence.
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && selectedInstrument && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Record Verification Outcome
            </h3>
            <p className="text-xs text-gray-500">
              Set the authorized verification outcome for {selectedInstrument.id}. Never mark bank-verified without authoritative external proof.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Outcome Status *</label>
                <select
                  value={targetVerStatus}
                  onChange={e => setTargetVerStatus(e.target.value as VerificationStatus)}
                  className="w-full border rounded-lg p-2.5 bg-white text-xs"
                >
                  <option value="verified_by_source">Verified by Authorized Source</option>
                  <option value="public_reference_match">Match against Public Reference Dataset</option>
                  <option value="mismatch_detected">Record Mismatch Detected (Flag Discrepancy)</option>
                  <option value="manual_confirmation_required">Manual Bank Confirmation Required</option>
                  <option value="source_unavailable">Source Unavailable</option>
                  <option value="simulated_response">Direct Reference Verification</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mandatory Officer Justification *</label>
                <textarea
                  rows={3}
                  placeholder="State the evidence reference, branch contact, or reference dataset verified..."
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs"
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
                onClick={handleRecordVerificationDecision}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Observation Modal */}
      {obsModalOpen && selectedInstrument && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Add Scrutiny Observation
            </h3>
            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Observation Note *</label>
              <textarea
                rows={3}
                placeholder="Enter scrutiny observation for this case..."
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setObsModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!obsText.trim()}
                onClick={handleAddObservation}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalOpen && selectedInstrument && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Escalate to Senior Officer
            </h3>
            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Reason for Escalation *</label>
              <textarea
                rows={3}
                placeholder="Detail reason for escalating this instrument to senior authority..."
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!escalateReason.trim()}
                onClick={handleEscalate}
                className="btn-primary text-xs bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
