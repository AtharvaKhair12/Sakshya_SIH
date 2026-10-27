'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getInstrument, getInstruments, getDocuments, getVerifications,
  getFindings, getLifecycleEvents, getAuditEvents, getReleaseRequests,
  updateInstrumentStatus, updateVerificationStatus, resolveFinding,
  assignReviewer, addObservation, escalateInstrument, addDocument,
  formatINR, formatDate, formatDateTime, daysUntilMaturity
} from '@/lib/store';
import {
  InstrumentStatus, VerificationStatus, INSTRUMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS, ALLOWED_TRANSITIONS, UploadedDocument
} from '@/lib/types';
import {
  ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck,
  Clock, ArrowRightLeft, User, Building, Calendar, ExternalLink,
  ChevronRight, Upload, AlertCircle, FileCheck, ShieldAlert,
  History, Info, Download, Check, X, Shield, Plus
} from 'lucide-react';

const LIFECYCLE_STEPS: { key: InstrumentStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'preliminary_validation', label: 'Preliminary Check' },
  { key: 'pending_scrutiny', label: 'In Scrutiny' },
  { key: 'verification_in_progress', label: 'Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'active_monitoring', label: 'Active Monitoring' },
  { key: 'release_requested', label: 'Release Requested' },
  { key: 'released', label: 'Released' },
];

export default function InstrumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { session, permissions } = useAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'verification' | 'audit'>('overview');

  // Action Modals State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<InstrumentStatus>('pending_scrutiny');
  const [statusReason, setStatusReason] = useState('');

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [observationText, setObservationText] = useState('');

  const [resolveFindingId, setResolveFindingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDocType, setUploadDocType] = useState<UploadedDocument['documentType']>('bank_letter');

  const instrument = useMemo(() => getInstrument(id), [id, refreshKey]);
  const documents = useMemo(() => getDocuments(id), [id, refreshKey]);
  const verifications = useMemo(() => getVerifications(id), [id, refreshKey]);
  const findings = useMemo(() => getFindings(id), [id, refreshKey]);
  const lifecycleEvents = useMemo(() => getLifecycleEvents(id), [id, refreshKey]);
  const auditEvents = useMemo(() => getAuditEvents({ entityId: id }), [id, refreshKey]);
  const releaseRequests = useMemo(() => getReleaseRequests({ instrumentId: id }), [id, refreshKey]);

  if (!instrument) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">Instrument Not Found</h2>
        <p className="text-xs text-gray-600 mb-6">
          The requested FDR instrument identifier <code className="font-mono">{id}</code> was not found in the demo registry.
        </p>
        <Link href="/instruments" className="btn-secondary">
          Return to Instruments Register
        </Link>
      </div>
    );
  }

  // Institutional ownership check
  if (session?.role === 'institution' && session.institutionId && instrument.institutionId !== session.institutionId) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">Access Unauthorized</h2>
        <p className="text-xs text-gray-600 mb-6">
          You are authenticated as an institutional user and are strictly restricted to your institution&apos;s own FDR records.
        </p>
        <Link href="/instruments" className="btn-secondary">
          Return to My Submissions
        </Link>
      </div>
    );
  }

  const daysLeft = daysUntilMaturity(instrument.maturityDate);
  const allowedTransitions = ALLOWED_TRANSITIONS[instrument.status] || [];

  // Status transitions
  const handleStatusChange = () => {
    if (!session || !statusReason.trim()) return;
    updateInstrumentStatus(instrument.id, targetStatus, statusReason.trim(), session);
    setStatusModalOpen(false);
    setStatusReason('');
    setRefreshKey(k => k + 1);
  };

  const handleEscalate = () => {
    if (!session || !escalateReason.trim()) return;
    escalateInstrument(instrument.id, escalateReason.trim(), session);
    setEscalateModalOpen(false);
    setEscalateReason('');
    setRefreshKey(k => k + 1);
  };

  const handleAddObservation = () => {
    if (!session || !observationText.trim()) return;
    addObservation(instrument.id, observationText.trim(), session);
    setObservationModalOpen(false);
    setObservationText('');
    setRefreshKey(k => k + 1);
  };

  const handleResolveFinding = () => {
    if (!session || !resolveFindingId || !resolutionText.trim()) return;
    resolveFinding(resolveFindingId, resolutionText.trim(), session);
    setResolveFindingId(null);
    setResolutionText('');
    setRefreshKey(k => k + 1);
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !uploadFileName.trim()) return;
    addDocument({
      instrumentId: instrument.id,
      fileName: uploadFileName.trim(),
      fileSize: 420000,
      fileType: 'application/pdf',
      documentType: uploadDocType,
      uploadedBy: session.userId,
      uploadedAt: new Date().toISOString(),
    });
    setUploadModalOpen(false);
    setUploadFileName('');
    setRefreshKey(k => k + 1);
  };

  // Status Badge Helper
  const getStatusBadge = (status: InstrumentStatus) => {
    const label = INSTRUMENT_STATUS_LABELS[status] || status;
    const colorMap: Record<string, string> = {
      verified: 'status-verified', active_monitoring: 'status-verified', released: 'status-verified',
      submitted: 'status-pending', preliminary_validation: 'status-pending', pending_scrutiny: 'status-pending',
      verification_in_progress: 'status-info', renewal_pending: 'status-info', release_requested: 'status-info',
      discrepancy_flagged: 'status-error', closed: 'status-neutral',
    };
    return <span className={`status-badge ${colorMap[status] || 'status-neutral'}`}>{label}</span>;
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
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/instruments" className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to Instruments Register
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              {instrument.id}
            </h1>
            {getStatusBadge(instrument.status)}
            {getVerificationBadge(instrument.verificationStatus)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            FDR #{instrument.fdrNumber} · {instrument.institutionName} ({instrument.aisheCode})
          </p>
        </div>

        {/* Action Controls for Authorized Roles */}
        <div className="flex items-center gap-2 flex-wrap">
          {session?.role !== 'auditor' && (
            <>
              {/* Status Change Transition */}
              {allowedTransitions.length > 0 && permissions?.canVerify && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetStatus(allowedTransitions[0]);
                    setStatusModalOpen(true);
                  }}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <FileCheck size={14} /> Advance Status
                </button>
              )}

              {/* Escalate button for scrutiny officers */}
              {permissions?.canEscalate && (
                <button
                  type="button"
                  onClick={() => setEscalateModalOpen(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <AlertTriangle size={14} /> Escalate Case
                </button>
              )}

              {/* Add observation */}
              {(permissions?.canVerify || session?.role === 'scrutiny_officer') && (
                <button
                  type="button"
                  onClick={() => setObservationModalOpen(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Info size={14} /> Add Observation
                </button>
              )}

              {/* Upload Document */}
              {permissions?.canUploadDocuments && (
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Upload size={14} /> Upload Evidence
                </button>
              )}

              {/* Request Release (Institution) */}
              {session?.role === 'institution' && ['active_monitoring', 'verified'].includes(instrument.status) && (
                <Link
                  href={`/release-requests?newFor=${instrument.id}`}
                  className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800"
                >
                  <ArrowRightLeft size={14} /> Request Release / Refund
                </Link>
              )}
            </>
          )}

          {session?.role === 'auditor' && (
            <span className="text-xs px-3 py-1 bg-stone-100 text-stone-600 rounded-full font-medium">
              Auditor Read-Only Mode
            </span>
          )}
        </div>
      </div>

      {/* Lifecycle Stage Timeline Visualizer */}
      <div className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Lifecycle Progression
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-2 text-xs">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const stepOrder: Record<InstrumentStatus, number> = {
              draft: 0, submitted: 1, preliminary_validation: 2, pending_scrutiny: 3,
              verification_in_progress: 4, verified: 5, discrepancy_flagged: 4,
              active_monitoring: 6, renewal_pending: 6, replacement_submitted: 4,
              release_requested: 7, released: 8, closed: 9,
            };
            const currentIdx = stepOrder[instrument.status] || 1;
            const thisStepIdx = stepOrder[step.key] || 1;
            const isCompleted = currentIdx > thisStepIdx || (instrument.status === step.key);
            const isCurrent = instrument.status === step.key;

            return (
              <div key={step.key} className="flex items-center min-w-[100px] flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                      isCurrent
                        ? 'bg-forest-600 text-white ring-4 ring-forest-100'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-400 border'
                    }`}
                  >
                    {isCompleted && !isCurrent ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={`text-[11px] mt-1.5 text-center truncate max-w-[85px] ${isCurrent ? 'font-bold text-forest-900' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${isCompleted && currentIdx > thisStepIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Deposit Principal</span>
          <div className="text-xl font-serif font-bold text-emerald-800" style={{ fontFamily: 'var(--font-serif)' }}>
            {formatINR(instrument.depositAmount)}
          </div>
          <span className="text-[11px] text-gray-400">Pledged to AICTE</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Maturity Horizon</span>
          <div className={`text-xl font-serif font-bold ${daysLeft < 0 ? 'text-red-700' : daysLeft <= 30 ? 'text-amber-700' : 'text-gray-900'}`} style={{ fontFamily: 'var(--font-serif)' }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d Expired` : `${daysLeft} days`}
          </div>
          <span className="text-[11px] text-gray-400">{formatDate(instrument.maturityDate)}</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Issuing Bank</span>
          <div className="text-sm font-bold text-gray-900 truncate">
            {instrument.bankName}
          </div>
          <span className="text-[11px] text-gray-400 truncate block">{instrument.branch}</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Open Discrepancies</span>
          <div className={`text-xl font-serif font-bold ${findings.filter(f => !f.resolved).length > 0 ? 'text-red-700' : 'text-emerald-700'}`} style={{ fontFamily: 'var(--font-serif)' }}>
            {findings.filter(f => !f.resolved).length}
          </div>
          <span className="text-[11px] text-gray-400">
            {findings.filter(f => !f.resolved).length > 0 ? 'Action required' : 'Clear compliance'}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b flex items-center gap-6" style={{ borderColor: 'var(--color-parchment)' }}>
        {[
          { key: 'overview', label: 'Instrument Overview', icon: FileText },
          { key: 'evidence', label: `Supporting Evidence (${documents.length})`, icon: Upload },
          { key: 'verification', label: `Scrutiny & Findings (${findings.length + verifications.length})`, icon: ShieldCheck },
          { key: 'audit', label: `Traceable Audit Log (${auditEvents.length})`, icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                isActive
                  ? 'border-forest-600 text-forest-900 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Details (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-sm font-serif font-bold text-gray-900 border-b pb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Deposit Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">FDR Receipt Number:</span>
                  <span className="font-mono font-bold text-gray-900">{instrument.fdrNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Deposit Amount:</span>
                  <span className="font-mono font-bold text-emerald-800">{formatINR(instrument.depositAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Issue Date:</span>
                  <span className="font-medium text-gray-900">{formatDate(instrument.issueDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Maturity Date:</span>
                  <span className="font-medium text-gray-900">{formatDate(instrument.maturityDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Tenure:</span>
                  <span className="font-medium text-gray-900">
                    {Math.round((new Date(instrument.maturityDate).getTime() - new Date(instrument.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} Years
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Assigned Reviewer:</span>
                  <span className="font-medium text-gray-900">{instrument.assignedReviewer || 'Unassigned'}</span>
                </div>
              </div>

              {instrument.remarks && (
                <div className="pt-3 border-t text-xs">
                  <span className="text-gray-500 block mb-1">Pledging Remarks & Terms:</span>
                  <p className="bg-stone-50 p-2.5 rounded border text-gray-700">{instrument.remarks}</p>
                </div>
              )}
            </div>

            {/* Institution Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-sm font-serif font-bold text-gray-900 border-b pb-2 flex items-center justify-between" style={{ fontFamily: 'var(--font-serif)' }}>
                <span>Institution Information</span>
                <span className="text-xs font-mono font-normal text-gray-500">{instrument.aisheCode}</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Institution Name:</span>
                  <span className="font-semibold text-gray-900">{instrument.institutionName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">AICTE Application Ref:</span>
                  <span className="font-mono text-gray-800">{instrument.applicationRef || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Submission Date:</span>
                  <span className="text-gray-700">{formatDateTime(instrument.submittedAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Last Record Update:</span>
                  <span className="text-gray-700">{formatDateTime(instrument.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Renewal / Replacement Linkage Chain */}
            {(instrument.linkedPredecessorId || instrument.linkedReplacementId) && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <ArrowRightLeft size={15} /> Replacement & Renewal Traceability Chain
                </h4>
                {instrument.linkedPredecessorId && (
                  <p className="text-blue-800">
                    This instrument replaces prior FDR record:{' '}
                    <Link href={`/instruments/${instrument.linkedPredecessorId}`} className="font-mono font-bold underline hover:text-blue-950">
                      {instrument.linkedPredecessorId}
                    </Link>
                  </p>
                )}
                {instrument.linkedReplacementId && (
                  <p className="text-blue-800">
                    This instrument was succeeded by renewal record:{' '}
                    <Link href={`/instruments/${instrument.linkedReplacementId}`} className="font-mono font-bold underline hover:text-blue-950">
                      {instrument.linkedReplacementId}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Release Requests & Quick Summary */}
          <div className="space-y-6">
            {/* Release Requests Box */}
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide border-b pb-2 flex items-center justify-between">
                <span>Release / Refund Requests</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                  {releaseRequests.length}
                </span>
              </h3>

              {releaseRequests.length > 0 ? (
                <div className="space-y-3">
                  {releaseRequests.map(req => (
                    <div key={req.id} className="p-3 bg-stone-50 border rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-gray-800">{req.id}</span>
                        <span className="status-badge status-info text-[10px]">{req.status}</span>
                      </div>
                      <p className="text-gray-600 line-clamp-2">{req.reason}</p>
                      <div className="text-[10px] text-gray-400 pt-1 border-t flex justify-between">
                        <span>{formatDate(req.requestDate)}</span>
                        <Link href="/release-requests" className="text-forest-700 hover:underline">
                          View details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">No release or refund requests initiated for this instrument.</p>
              )}
            </div>

            {/* Regulatory Compliance Quick Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
                Compliance Summary
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Document Completeness:</span>
                  <span className="font-medium text-gray-800">{documents.length >= 2 ? 'Complete' : 'Incomplete'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Maturity Compliance:</span>
                  <span className={`font-medium ${daysLeft < 0 ? 'text-red-600 font-bold' : 'text-emerald-700'}`}>
                    {daysLeft < 0 ? 'Matured / Expired' : 'Within Tenure'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Bank Verification:</span>
                  <span className="font-medium text-gray-800">{VERIFICATION_STATUS_LABELS[instrument.verificationStatus]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Supporting Evidence */}
      {activeTab === 'evidence' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <div>
              <h3 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                Uploaded Evidence Documents
              </h3>
              <p className="text-xs text-gray-500">
                Official certificates, lien confirmation letters, and sworn affidavits pledged to AICTE.
              </p>
            </div>
            {permissions?.canUploadDocuments && (
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Document
              </button>
            )}
          </div>

          {documents.length > 0 ? (
            <div className="divide-y border rounded-xl overflow-hidden">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-forest-700 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{doc.fileName}</p>
                      <div className="flex items-center gap-3 text-gray-500 text-[11px] mt-0.5">
                        <span className="capitalize">{doc.documentType.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>Uploaded {formatDateTime(doc.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Simulated preview for document "${doc.fileName}". In full deployment, this opens the verified PDF evidence viewer.`)}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <FileText size={13} /> View Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-400 bg-stone-50 rounded-xl">
              No evidence documents attached to this instrument yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Verification & Compliance Findings */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Findings Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
                <AlertTriangle size={18} className="text-amber-600" />
                Compliance Observations & Discrepancy Findings
              </h3>
              <p className="text-xs text-gray-500">
                Automated rule evaluations and scrutiny officer discrepancy notes.
              </p>
            </div>

            {findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map(f => (
                  <div
                    key={f.id}
                    className={`p-4 border rounded-xl text-xs space-y-2 ${
                      f.resolved ? 'bg-stone-50 border-gray-200' : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          f.severity === 'critical' || f.severity === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {f.severity}
                        </span>
                        <span className="font-semibold text-gray-900">{f.ruleName}</span>
                      </div>
                      {f.resolved ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 size={14} /> Resolved
                        </span>
                      ) : (
                        <span className="text-red-700 font-semibold text-[11px]">Active Discrepancy</span>
                      )}
                    </div>

                    <p className="text-gray-700">{f.description}</p>

                    {(f.expectedValue || f.actualValue) && (
                      <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border text-[11px]">
                        <div>
                          <span className="text-gray-400 block">Expected:</span>
                          <span className="font-mono text-gray-800">{f.expectedValue || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Actual Submitted:</span>
                          <span className="font-mono text-red-700 font-bold">{f.actualValue || '—'}</span>
                        </div>
                      </div>
                    )}

                    {f.resolved && f.resolution && (
                      <div className="text-[11px] text-gray-600 bg-stone-100 p-2 rounded">
                        <span className="font-semibold">Resolution:</span> {f.resolution}
                      </div>
                    )}

                    {!f.resolved && permissions?.canVerify && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setResolveFindingId(f.id);
                            setResolutionText('');
                          }}
                          className="btn-secondary text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                        >
                          Mark as Resolved
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-emerald-800 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-600" />
                No active regulatory discrepancies or scrutiny findings recorded for this FDR.
              </div>
            )}
          </div>

          {/* Verification Results Comparison Grid */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                Field-Level Source Comparison Evidence
              </h3>
              <p className="text-xs text-gray-500">
                Comparison between institution-submitted values and external reference data or document extractions.
              </p>
            </div>

            {verifications.length > 0 ? (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b text-gray-600">
                    <tr>
                      <th className="p-3 font-semibold">Field Name</th>
                      <th className="p-3 font-semibold">Submitted Value</th>
                      <th className="p-3 font-semibold">Reference Source</th>
                      <th className="p-3 font-semibold">Compared Value</th>
                      <th className="p-3 font-semibold">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {verifications.map(v => (
                      <tr key={v.id} className={v.differenceDetected ? 'bg-red-50/40' : undefined}>
                        <td className="p-3 font-medium text-gray-900">{v.fieldName}</td>
                        <td className="p-3 font-mono">{v.submittedValue}</td>
                        <td className="p-3 text-gray-600">{v.source}</td>
                        <td className="p-3 font-mono">{v.comparisonValue}</td>
                        <td className="p-3">
                          {v.differenceDetected ? (
                            <span className="status-badge status-error">Mismatch</span>
                          ) : (
                            <span className="status-badge status-verified">Match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No field-level comparisons currently logged.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Audit History */}
      {activeTab === 'audit' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <History size={18} className="text-forest-600" />
              Traceable Audit Timeline
            </h3>
            <p className="text-xs text-gray-500">
              Chronological immutable log of all actions, status transitions, and observations for this instrument.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {auditEvents.map(evt => (
              <div key={evt.id} className="relative text-xs">
                <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-forest-600" />
                <div className="bg-stone-50 border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-gray-500 text-[11px]">
                    <span className="font-semibold text-gray-800">
                      {evt.userName} ({evt.userRole})
                    </span>
                    <span className="font-mono">{formatDateTime(evt.timestamp)}</span>
                  </div>
                  <div className="font-medium text-forest-900">
                    {evt.action.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  {evt.reason && <p className="text-gray-700 mt-1 italic">&ldquo;{evt.reason}&rdquo;</p>}
                  {(evt.previousValue || evt.newValue) && (
                    <div className="text-[11px] text-gray-500 flex gap-2 pt-1 font-mono">
                      {evt.previousValue && <span>Old: {evt.previousValue}</span>}
                      {evt.previousValue && evt.newValue && <span>→</span>}
                      {evt.newValue && <span className="font-bold text-gray-800">New: {evt.newValue}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Action Modals --- */}

      {/* Advance Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Advance Instrument Status
            </h3>
            <p className="text-xs text-gray-500">
              Select the validated lifecycle transition. Regulatory governance mandates an explicit justification for status changes.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Status *</label>
                <select
                  value={targetStatus}
                  onChange={e => setTargetStatus(e.target.value as InstrumentStatus)}
                  className="w-full border rounded-lg p-2.5 bg-white text-sm"
                >
                  {allowedTransitions.map(s => (
                    <option key={s} value={s}>{INSTRUMENT_STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mandatory Regulatory Reason / Note *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified with issuing bank branch confirmation letter and lien endorsed to Member Secretary AICTE..."
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!statusReason.trim()}
                onClick={handleStatusChange}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Confirm Status Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Escalate Instrument to Senior Officer
            </h3>
            <p className="text-xs text-gray-500">
              Provide findings requiring higher authorization, legal review, or special approval exceptions.
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Escalation Reason *</label>
              <textarea
                rows={3}
                placeholder="State specific discrepancy or policy exception requiring Senior Officer review..."
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
                Submit Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Observation Modal */}
      {observationModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Add Scrutiny Observation
            </h3>
            <p className="text-xs text-gray-500">
              Notes recorded here become part of the traceable audit history of this FDR.
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Observation Note *</label>
              <textarea
                rows={3}
                placeholder="e.g. FDR original physically inspected during regional inspection on 12-Oct-2025..."
                value={observationText}
                onChange={e => setObservationText(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setObservationModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!observationText.trim()}
                onClick={handleAddObservation}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Save Observation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Finding Modal */}
      {resolveFindingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Resolve Discrepancy Finding
            </h3>
            <p className="text-xs text-gray-500">
              Document how this discrepancy was clarified, verified, or rectified.
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Resolution Summary *</label>
              <textarea
                rows={3}
                placeholder="e.g. Corrected bank certificate uploaded; IFSC code confirmed with branch manager..."
                value={resolutionText}
                onChange={e => setResolutionText(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setResolveFindingId(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!resolutionText.trim()}
                onClick={handleResolveFinding}
                className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Additional Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUploadDocument} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Upload Supporting Evidence
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Document Description / File Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bank_Lien_Confirmation_Letter.pdf"
                  value={uploadFileName}
                  onChange={e => setUploadFileName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Document Category</label>
                <select
                  value={uploadDocType}
                  onChange={e => setUploadDocType(e.target.value as UploadedDocument['documentType'])}
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                >
                  <option value="bank_letter">Bank Lien Confirmation Letter</option>
                  <option value="fdr_certificate">FDR Certificate</option>
                  <option value="affidavit">Trustee Affidavit</option>
                  <option value="identity_proof">Signatory ID Proof</option>
                  <option value="other">Other Regulatory Document</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Save Evidence Document
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
