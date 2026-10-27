'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getInstruments, daysUntilMaturity, formatINR, formatDate,
  addNotification, addObservation, escalateInstrument
} from '@/lib/store';
import { Instrument, INSTRUMENT_STATUS_LABELS } from '@/lib/types';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Bell, ArrowRight,
  Filter, Eye, ArrowRightLeft, ShieldAlert, List, CalendarDays,
  Check, Plus, Sparkles, Building
} from 'lucide-react';

export default function MaturityWorkspacePage() {
  const { session, permissions } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [thresholdFilter, setThresholdFilter] = useState<'all' | 'expired' | '30' | '60' | '90'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [refreshKey, setRefreshKey] = useState(0);

  // Reminder Modal State
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Instrument | null>(null);
  const [reminderNote, setReminderNote] = useState('');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Record<string, boolean>>({});

  const instruments = useMemo(() => {
    if (!session) return [];
    return session.role === 'institution'
      ? getInstruments({ institutionId: session.institutionId })
      : getInstruments();
  }, [session, refreshKey]);

  // Calculations
  const categorized = useMemo(() => {
    const expired: Instrument[] = [];
    const urgent30: Instrument[] = [];
    const upcoming60: Instrument[] = [];
    const upcoming90: Instrument[] = [];
    const safe: Instrument[] = [];

    instruments.forEach(inst => {
      const days = daysUntilMaturity(inst.maturityDate);
      if (days < 0) {
        expired.push(inst);
      } else if (days <= 30) {
        urgent30.push(inst);
      } else if (days <= 60) {
        upcoming60.push(inst);
      } else if (days <= 90) {
        upcoming90.push(inst);
      } else {
        safe.push(inst);
      }
    });

    return { expired, urgent30, upcoming60, upcoming90, safe };
  }, [instruments]);

  const filteredList = useMemo(() => {
    if (thresholdFilter === 'expired') return categorized.expired;
    if (thresholdFilter === '30') return categorized.urgent30;
    if (thresholdFilter === '60') return [...categorized.urgent30, ...categorized.upcoming60];
    if (thresholdFilter === '90') return [...categorized.urgent30, ...categorized.upcoming60, ...categorized.upcoming90];
    return instruments.sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime());
  }, [categorized, instruments, thresholdFilter]);

  const handleSendReminder = () => {
    if (!selectedInst || !reminderNote.trim() || !session) return;
    addNotification({
      userId: selectedInst.submittedBy,
      type: 'maturity_approaching',
      title: `Maturity Notice: ${selectedInst.id}`,
      message: `FDR #${selectedInst.fdrNumber} matures on ${formatDate(selectedInst.maturityDate)}. ${reminderNote.trim()}`,
      entityType: 'instrument',
      entityId: selectedInst.id,
      read: false,
    });
    addObservation(selectedInst.id, `In-app maturity reminder issued: ${reminderNote.trim()}`, session);
    setAcknowledgedIds(prev => ({ ...prev, [selectedInst.id]: true }));
    setReminderModalOpen(false);
    setReminderNote('');
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Maturity & Renewal Monitoring
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track deposit expiration horizons, manage proactive renewal alerts, and ensure non-lapsing security coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border rounded-lg p-0.5 flex text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-forest-600 text-white font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={14} /> Register View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'timeline' ? 'bg-forest-600 text-white font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays size={14} /> Horizon Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setThresholdFilter(thresholdFilter === 'expired' ? 'all' : 'expired')}
          className={`p-4 rounded-xl border text-left transition-all ${
            thresholdFilter === 'expired'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
              : 'bg-white border-stone-200 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Expired / Lapsed</span>
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-red-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {categorized.expired.length}
          </div>
          <span className="text-[11px] text-gray-400">Past maturity date</span>
        </button>

        <button
          type="button"
          onClick={() => setThresholdFilter(thresholdFilter === '30' ? 'all' : '30')}
          className={`p-4 rounded-xl border text-left transition-all ${
            thresholdFilter === '30'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-stone-200 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">&le; 30 Days (Critical)</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {categorized.urgent30.length}
          </div>
          <span className="text-[11px] text-gray-400">Requires renewal action</span>
        </button>

        <button
          type="button"
          onClick={() => setThresholdFilter(thresholdFilter === '60' ? 'all' : '60')}
          className={`p-4 rounded-xl border text-left transition-all ${
            thresholdFilter === '60'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
              : 'bg-white border-stone-200 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">31 &ndash; 60 Days</span>
            <Calendar size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-blue-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {categorized.upcoming60.length}
          </div>
          <span className="text-[11px] text-gray-400">Approaching window</span>
        </button>

        <button
          type="button"
          onClick={() => setThresholdFilter(thresholdFilter === '90' ? 'all' : '90')}
          className={`p-4 rounded-xl border text-left transition-all ${
            thresholdFilter === '90'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-stone-200 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">61 &ndash; 90 Days</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-800 mt-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {categorized.upcoming90.length}
          </div>
          <span className="text-[11px] text-gray-400">Stable monitoring</span>
        </button>
      </div>

      {/* Main View Container */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              {thresholdFilter === 'all'
                ? 'All Tracked Deposit Maturities'
                : `Filtered View: ${thresholdFilter === 'expired' ? 'Lapsed Instruments' : `Within ${thresholdFilter} Days`}`}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
              {filteredList.length} items
            </span>
          </div>

          {thresholdFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setThresholdFilter('all')}
              className="text-xs text-forest-700 hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* View Mode: List */}
        {viewMode === 'list' && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b text-gray-600">
                <tr>
                  <th className="p-3 font-semibold">Instrument ID</th>
                  <th className="p-3 font-semibold">Institution</th>
                  <th className="p-3 font-semibold">Bank / Receipt #</th>
                  <th className="p-3 font-semibold">Deposit Principal</th>
                  <th className="p-3 font-semibold">Maturity Date</th>
                  <th className="p-3 font-semibold">Horizon</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredList.map(inst => {
                  const days = daysUntilMaturity(inst.maturityDate);
                  const isAck = acknowledgedIds[inst.id];
                  return (
                    <tr key={inst.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-forest-800">
                        <Link href={`/instruments/${inst.id}`} className="hover:underline">
                          {inst.id}
                        </Link>
                      </td>
                      <td className="p-3 font-medium text-gray-900 truncate max-w-[200px]">
                        {inst.institutionName}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-gray-800 block">{inst.fdrNumber}</span>
                        <span className="text-[11px] text-gray-400">{inst.bankName}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-emerald-800">
                        {formatINR(inst.depositAmount)}
                      </td>
                      <td className="p-3 font-medium text-gray-900">
                        {formatDate(inst.maturityDate)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            days < 0
                              ? 'bg-red-100 text-red-800'
                              : days <= 30
                              ? 'bg-amber-100 text-amber-800'
                              : days <= 60
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {days < 0 ? `${Math.abs(days)}d Overdue` : `${days} days left`}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {session?.role !== 'auditor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInst(inst);
                                setReminderModalOpen(true);
                              }}
                              className={`btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 ${
                                isAck ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''
                              }`}
                              title="Schedule demo in-app alert"
                            >
                              <Bell size={12} />
                              {isAck ? 'Alerted' : 'Notify'}
                            </button>
                          )}
                          <Link
                            href={`/instruments/${inst.id}`}
                            className="btn-secondary text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode: Timeline */}
        {viewMode === 'timeline' && (
          <div className="space-y-6 pt-2">
            {[
              { label: 'Expired / Action Required Immediately', items: categorized.expired, color: 'border-red-500 bg-red-50/20' },
              { label: 'Maturity within 30 Days (Critical Renewal Window)', items: categorized.urgent30, color: 'border-amber-500 bg-amber-50/20' },
              { label: 'Maturity within 31 - 60 Days (Advance Notice)', items: categorized.upcoming60, color: 'border-blue-500 bg-blue-50/20' },
              { label: 'Maturity within 61 - 90 Days (Normal Horizon)', items: categorized.upcoming90, color: 'border-emerald-500 bg-emerald-50/20' },
            ].map(bucket => (
              <div key={bucket.label} className={`border-l-4 rounded-xl p-4 border bg-white ${bucket.color}`} style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    {bucket.label}
                  </h4>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    {bucket.items.length} records
                  </span>
                </div>

                {bucket.items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {bucket.items.map(inst => (
                      <div key={inst.id} className="p-3 bg-white border rounded-lg text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <Link href={`/instruments/${inst.id}`} className="font-mono font-bold text-forest-800 hover:underline">
                            {inst.id}
                          </Link>
                          <span className="text-[10px] font-mono text-gray-500">
                            {formatDate(inst.maturityDate)}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800 truncate">{inst.institutionName}</p>
                        <div className="flex items-center justify-between text-gray-500 text-[11px] pt-1 border-t">
                          <span>{inst.bankName}</span>
                          <span className="font-bold text-emerald-800">{formatINR(inst.depositAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No instruments currently in this horizon window.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reminder Notification Modal */}
      {reminderModalOpen && selectedInst && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <Bell size={18} className="text-forest-600" />
              Schedule In-App Maturity Reminder
            </h3>
            <p className="text-xs text-gray-500">
              Dispatches an in-app notification to the authorized institution representative regarding FDR #{selectedInst.fdrNumber} (Matures {formatDate(selectedInst.maturityDate)}).
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Reminder Instructions / Action Required *</label>
              <textarea
                rows={3}
                placeholder="e.g. Please submit fresh FDR renewal receipt or initiate formal release request within 15 calendar days..."
                value={reminderNote}
                onChange={e => setReminderNote(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reminderNote.trim()}
                onClick={handleSendReminder}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Dispatch In-App Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
