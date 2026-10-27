'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DemoSession, getAuditEvents, getInstruments, getReleaseRequests, getVerifications,
  getInstitution, formatINR, formatDate, formatDateTime, exportToCSV
} from '@/lib/store';
import { User, AuditEvent, AuditAction } from '@/lib/types';
import {
  History, Download, Search, Filter, ShieldCheck, CheckCircle, FileText,
  Eye, Lock, Database, UserCheck, AlertTriangle, ExternalLink
} from 'lucide-react';

interface Props {
  session: DemoSession;
  user: User;
}

export default function AuditorDashboard({ session, user }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const {
    totalAuditedCases,
    completeHistories,
    unresolvedOutcomes,
    statutoryDecisions,
    adminChanges,
    auditTrail,
    verifications,
    recentDecisions,
  } = useMemo(() => {
    const instruments = getInstruments();
    const releaseReqs = getReleaseRequests();
    const audit = getAuditEvents();
    const verifs = getVerifications();

    const unresolved = instruments.filter(i => ['discrepancy_flagged', 'mismatch_detected'].includes(i.status) || ['mismatch_detected', 'in_progress'].includes(i.verificationStatus));
    const decisions = releaseReqs.filter(r => ['approved', 'declined'].includes(r.status) || r.seniorDecision);
    const configs = audit.filter(e => ['rule_updated', 'user_updated', 'user_created'].includes(e.action));

    return {
      totalAuditedCases: instruments.length,
      completeHistories: instruments.filter(i => audit.some(a => a.entityId === i.id)).length,
      unresolvedOutcomes: unresolved.length,
      statutoryDecisions: decisions.length,
      adminChanges: configs.length,
      auditTrail: audit,
      verifications: verifs.slice(0, 8),
      recentDecisions: decisions.slice(0, 6),
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return auditTrail.filter(event => {
      if (selectedAction !== 'all' && event.action !== selectedAction) return false;
      if (selectedRole !== 'all' && event.userRole !== selectedRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          event.entityId?.toLowerCase().includes(q) ||
          event.userName?.toLowerCase().includes(q) ||
          event.reason?.toLowerCase().includes(q) ||
          event.action?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [auditTrail, selectedAction, selectedRole, searchQuery]);

  const handleExportCSV = () => {
    const rows = filteredEvents.map(e => ({
      Event_ID: e.id,
      Timestamp: e.timestamp,
      Actor_Name: e.userName,
      Actor_Role: e.userRole,
      Entity_Type: e.entityType,
      Entity_ID: e.entityId,
      Action_Performed: e.action,
      Previous_Value: e.previousValue || '',
      New_Value: e.newValue || '',
      Recorded_Reason: e.reason || '',
    }));
    exportToCSV(rows, `sakshya_audit_extract_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-700)', border: '1px solid var(--color-forest-200)' }}>
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                  Statutory Audit & Integrity Workspace
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Lock size={12} /> Strictly Read-Only Inspection
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                Independent supervisory oversight: Verify chronological action sequences, inspect source verification proof, and validate authorized officer decrees.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5">
              <Download size={14} />
              Export Filtered Audit Log (CSV)
            </button>
            <Link href="/reports" className="btn-secondary text-xs flex items-center gap-1 py-2 px-3">
              <FileText size={14} />
              Statutory Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Audit Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Audit Scope</span>
            <FileText size={16} className="text-forest-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-gray-900">{totalAuditedCases}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Total registered FDRs</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Complete Trails</span>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-emerald-700">{completeHistories}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Full lifecycle logged</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Unresolved Cases</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-amber-700">{unresolvedOutcomes}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Pending discrepancies</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Official Decrees</span>
            <UserCheck size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-purple-700">{statutoryDecisions}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Senior officer decrees</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Config Events</span>
            <Database size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-blue-700">{adminChanges}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Admin rule/user updates</div>
        </div>
      </div>

      {/* Main Grid: Comprehensive Audit Timeline (Left 2 Cols) + Traceability & Decrees (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Searchable Filterable Audit Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card" style={{ padding: 0 }}>
            {/* Filter & Search Bar */}
            <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                    Regulatory Event Timeline ({filteredEvents.length})
                  </h3>
                  <p className="text-[11px] text-gray-500">Immutable ledger of all system actions, reviews, and decisions</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  SHA-256 Ledger Simulation
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, officer, reason..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-forest-600"
                  />
                </div>

                {/* Filter Action */}
                <select
                  value={selectedAction}
                  onChange={e => setSelectedAction(e.target.value)}
                  className="text-xs py-1.5 px-2.5 border rounded-lg bg-white text-gray-700">
                  <option value="all">All Actions</option>
                  <option value="instrument_created">Instrument Created</option>
                  <option value="verification_completed">Verification Completed</option>
                  <option value="observation_added">Observation Added</option>
                  <option value="escalation">Escalation</option>
                  <option value="release_decision">Release Decision</option>
                  <option value="status_changed">Status Changed</option>
                  <option value="rule_updated">Rule Updated</option>
                </select>

                {/* Filter Role */}
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="text-xs py-1.5 px-2.5 border rounded-lg bg-white text-gray-700">
                  <option value="all">All Roles</option>
                  <option value="institution">Institution</option>
                  <option value="scrutiny_officer">Scrutiny Officer</option>
                  <option value="senior_officer">Senior Officer</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            {/* Timeline Stream */}
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No audit events found matching the specified search criteria.
              </div>
            ) : (
              <div className="divide-y max-h-[560px] overflow-y-auto" style={{ borderColor: 'var(--color-parchment)' }}>
                {filteredEvents.map(event => (
                  <div key={event.id} className="p-3.5 space-y-1.5 text-xs hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{event.userName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-gray-100 text-gray-700 uppercase">
                          {event.userRole}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 text-gray-700">
                      <span className="font-mono text-[11px] font-semibold text-forest-700">
                        {event.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-gray-400">on</span>
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {event.entityId}
                      </span>
                      {event.previousValue && event.newValue && (
                        <span className="text-[11px] text-gray-500">
                          ({event.previousValue} → <strong className="text-gray-800">{event.newValue}</strong>)
                        </span>
                      )}
                    </div>

                    {event.reason && (
                      <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        <strong>Recorded Reason:</strong> &quot;{event.reason}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Verification Traceability + Decision Inspection */}
        <div className="space-y-6">
          {/* Verification Traceability Matrix */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Source Verification Traceability
                </h3>
                <p className="text-[11px] text-gray-500">Recorded evidence verification methods</p>
              </div>
              <ShieldCheck size={16} className="text-forest-600" />
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {verifications.map(v => (
                <div key={v.id} className="p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-forest-700">{v.instrumentId}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      !v.differenceDetected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {!v.differenceDetected ? 'Verified' : 'Mismatch'}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-700">
                    Source: <strong className="font-medium text-gray-900">{v.source}</strong> · Field: {v.fieldName}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Status: {v.verificationStatus}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Simulated Source
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Decision Review */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Senior Decision Decrees
                </h3>
                <p className="text-[11px] text-gray-500">Inspection of finalized release orders</p>
              </div>
              <UserCheck size={16} className="text-purple-600" />
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {recentDecisions.map(req => (
                <div key={req.id} className="p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-forest-700">{req.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      req.seniorDecision === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {req.seniorDecision || req.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600">{getInstitution(req.institutionId)?.name || req.institutionId}</div>
                  <div className="text-[11px] text-gray-500 italic bg-gray-50 p-1.5 rounded">
                    &quot;{req.seniorDecisionReason || 'Release verified and authorized under statutory norms.'}&quot;
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Officer: {req.seniorOfficerId || 'Senior Officer'} · {formatDateTime(req.decisionDate || req.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
