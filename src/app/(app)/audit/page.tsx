'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { getAuditEvents, formatDateTime, exportToCSV } from '@/lib/store';
import { AuditEvent, AuditAction, Role } from '@/lib/types';
import {
  History, Search, Filter, Download, Eye, ShieldCheck,
  User, ArrowRight, Clock, FileText, CheckCircle2, AlertTriangle,
  X
} from 'lucide-react';

export default function AuditLogPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const allEvents = useMemo(() => getAuditEvents(), []);

  const filtered = useMemo(() => {
    return allEvents.filter(e => {
      const matchSearch =
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.entityId.toLowerCase().includes(search.toLowerCase()) ||
        e.userName.toLowerCase().includes(search.toLowerCase()) ||
        (e.reason && e.reason.toLowerCase().includes(search.toLowerCase()));

      const matchAction = actionFilter === 'all' || e.action === actionFilter;
      const matchRole = roleFilter === 'all' || e.userRole === roleFilter;
      return matchSearch && matchAction && matchRole;
    });
  }, [allEvents, search, actionFilter, roleFilter]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map(e => ({
      'Event ID': e.id,
      'Timestamp': formatDateTime(e.timestamp),
      'User': e.userName,
      'Role': e.userRole,
      'Entity Type': e.entityType,
      'Entity ID': e.entityId,
      'Action': e.action,
      'Previous Value': e.previousValue || '',
      'New Value': e.newValue || '',
      'Reason': e.reason || '',
    }));
    exportToCSV(exportData, `Sakshya_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Traceable Regulatory Audit Trail
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Append-only chronological log documenting all instrument submissions, officer scrutiny decisions, and regulatory exceptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={14} /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* Notice Callout */}
      <div className="p-3 bg-stone-100/70 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2">
        <ShieldCheck size={16} className="text-forest-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Traceable Audit Log:</strong> All user actions, validations, and status overrides are recorded chronologically with actor identities and recorded justifications.
        </div>
      </div>

      {/* Filter and Event Log Table */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by event ID, entity ID, actor, or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter size={13} className="text-gray-400" />
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
              >
                <option value="all">All Actions</option>
                <option value="status_changed">Status Changed</option>
                <option value="instrument_created">Instrument Created</option>
                <option value="verification_completed">Verification Completed</option>
                <option value="finding_resolved">Finding Resolved</option>
                <option value="observation_added">Observation Added</option>
                <option value="escalation">Escalation</option>
                <option value="release_decision">Release Decision</option>
                <option value="rule_updated">Rule Updated</option>
              </select>
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="institution">Institution</option>
              <option value="scrutiny_officer">Scrutiny Officer</option>
              <option value="senior_officer">Senior Officer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b text-gray-600">
                <tr>
                  <th className="p-3 font-semibold">Event ID & Time</th>
                  <th className="p-3 font-semibold">Acting User</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Entity</th>
                  <th className="p-3 font-semibold">Justification / Reason</th>
                  <th className="p-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(evt => (
                  <tr key={evt.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3 font-mono">
                      <span className="font-bold text-gray-800 block">{evt.id}</span>
                      <span className="text-[11px] text-gray-400 font-sans">
                        {formatDateTime(evt.timestamp)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-gray-900 block">{evt.userName}</span>
                      <span className="text-[11px] text-gray-500 capitalize">{evt.userRole.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-stone-100 text-stone-700">
                        {evt.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-forest-800">
                      {evt.entityId.startsWith('FDR-') ? (
                        <Link href={`/instruments/${evt.entityId}`} className="hover:underline">
                          {evt.entityId}
                        </Link>
                      ) : (
                        <span>{evt.entityId}</span>
                      )}
                      <span className="block text-[10px] text-gray-400 font-sans capitalize">{evt.entityType}</span>
                    </td>
                    <td className="p-3 text-gray-600 max-w-[280px] truncate" title={evt.reason}>
                      {evt.reason || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="btn-secondary text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 bg-stone-50 rounded-xl">
            No audit events found matching the current filter.
          </div>
        )}
      </div>

      {/* Event Details Drawer / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900">
                  Audit Event Details
                </h3>
                <span className="font-mono text-xs text-gray-500">{selectedEvent.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Timestamp:</span>
                <span className="font-mono text-gray-800">{formatDateTime(selectedEvent.timestamp)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Actor:</span>
                <span className="font-semibold text-gray-800">{selectedEvent.userName} ({selectedEvent.userRole})</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Action:</span>
                <span className="font-mono font-bold text-forest-800">{selectedEvent.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Target Entity:</span>
                <span className="font-mono text-gray-800">{selectedEvent.entityType} · {selectedEvent.entityId}</span>
              </div>

              {(selectedEvent.previousValue || selectedEvent.newValue) && (
                <div className="p-2.5 bg-stone-50 rounded-lg border space-y-1">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">State Modification:</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-red-700">{selectedEvent.previousValue || '(None)'}</span>
                    <span>&rarr;</span>
                    <span className="text-emerald-700 font-bold">{selectedEvent.newValue || '(None)'}</span>
                  </div>
                </div>
              )}

              {selectedEvent.reason && (
                <div className="pt-1">
                  <span className="text-gray-500 block mb-1">Recorded Justification:</span>
                  <p className="bg-stone-50 p-2.5 rounded border text-gray-800 italic">
                    &ldquo;{selectedEvent.reason}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
