'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { getInstruments, getFindings, formatINR, formatDate, daysUntilMaturity } from '@/lib/store';
import { INSTRUMENT_STATUS_LABELS, VERIFICATION_STATUS_LABELS, InstrumentStatus } from '@/lib/types';
import {
  Send, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  Clock, FileText, ArrowRight, Eye, ShieldCheck, Building2
} from 'lucide-react';

export default function SubmissionsPage() {
  const { session, permissions } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const instruments = useMemo(() => {
    if (!session) return [];
    return session.role === 'institution'
      ? getInstruments({ institutionId: session.institutionId })
      : getInstruments();
  }, [session]);

  const findings = useMemo(() => getFindings(), []);

  const stats = useMemo(() => {
    return {
      total: instruments.length,
      underReview: instruments.filter(i => ['submitted', 'preliminary_validation', 'pending_scrutiny', 'verification_in_progress'].includes(i.status)).length,
      discrepant: instruments.filter(i => i.status === 'discrepancy_flagged').length,
      verified: instruments.filter(i => ['verified', 'active_monitoring', 'released'].includes(i.status)).length,
    };
  }, [instruments]);

  const filtered = useMemo(() => {
    return instruments.filter(inst => {
      const matchSearch =
        inst.id.toLowerCase().includes(search.toLowerCase()) ||
        inst.fdrNumber.toLowerCase().includes(search.toLowerCase()) ||
        inst.bankName.toLowerCase().includes(search.toLowerCase()) ||
        inst.institutionName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || inst.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [instruments, search, statusFilter]);

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

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Institutional Submissions
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track FDR submissions, review compliance observations, and monitor scrutiny status.
          </p>
        </div>

        {permissions?.canCreateInstruments && (
          <Link href="/instruments/new" className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto">
            <Plus size={15} /> New FDR Registration
          </Link>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Filed</span>
            <Send size={16} className="text-forest-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-gray-900 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {stats.total}
          </div>
          <span className="text-[11px] text-gray-400">Security deposit records</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">In Scrutiny</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-blue-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {stats.underReview}
          </div>
          <span className="text-[11px] text-gray-400">Awaiting officer action</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Discrepancies</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {stats.discrepant}
          </div>
          <span className="text-[11px] text-gray-400">Observations to clarify</span>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Verified / Active</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {stats.verified}
          </div>
          <span className="text-[11px] text-gray-400">Compliant instruments</span>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by FDR #, institution, bank, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
            >
              <option value="all">All Submission States</option>
              <option value="submitted">Submitted</option>
              <option value="preliminary_validation">Preliminary Validation</option>
              <option value="pending_scrutiny">Pending Scrutiny</option>
              <option value="verification_in_progress">Verification In Progress</option>
              <option value="discrepancy_flagged">Discrepancy Flagged</option>
              <option value="verified">Verified</option>
              <option value="active_monitoring">Active Monitoring</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b text-gray-600">
                <tr>
                  <th className="p-3 font-semibold">Instrument ID</th>
                  <th className="p-3 font-semibold">Institution / AISHE</th>
                  <th className="p-3 font-semibold">FDR Details</th>
                  <th className="p-3 font-semibold">Principal</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Observations</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(inst => {
                  const instFindings = findings.filter(f => f.instrumentId === inst.id && !f.resolved);
                  return (
                    <tr key={inst.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 font-mono font-semibold text-forest-800">
                        <Link href={`/instruments/${inst.id}`} className="hover:underline">
                          {inst.id}
                        </Link>
                        <span className="block text-[10px] text-gray-400 font-sans">
                          {formatDate(inst.submittedAt)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-900 block truncate max-w-[200px]">
                          {inst.institutionName}
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">{inst.aisheCode}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-medium text-gray-800 block">{inst.fdrNumber}</span>
                        <span className="text-[11px] text-gray-500">{inst.bankName}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-emerald-800">
                        {formatINR(inst.depositAmount)}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(inst.status)}
                      </td>
                      <td className="p-3">
                        {instFindings.length > 0 ? (
                          <span className="text-red-700 font-medium flex items-center gap-1 text-[11px]">
                            <AlertTriangle size={13} /> {instFindings.length} observation(s)
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={13} /> None
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/instruments/${inst.id}`}
                          className="btn-secondary text-[11px] inline-flex items-center gap-1 px-2.5 py-1"
                        >
                          <Eye size={13} /> Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 bg-stone-50 rounded-xl">
            No submissions found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
