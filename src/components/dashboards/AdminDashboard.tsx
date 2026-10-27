'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DemoSession, getUsers, getRules, getSources, getAuditEvents, resetDemoData, formatDateTime
} from '@/lib/store';
import { User, ROLE_LABELS } from '@/lib/types';
import {
  Sliders, Users, Database, Settings, RefreshCw, AlertTriangle, CheckCircle,
  FileText, ShieldCheck, ArrowRight, ShieldAlert, Cpu, HardDrive
} from 'lucide-react';

interface Props {
  session: DemoSession;
  user: User;
}

export default function AdminDashboard({ session, user }: Props) {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    users,
    rules,
    sources,
    systemAuditEvents,
  } = useMemo(() => {
    const u = getUsers();
    const r = getRules();
    const s = getSources();
    const a = getAuditEvents().filter(e =>
      ['user_created', 'user_updated', 'rule_updated', 'source_updated', 'demo_reset'].includes(e.action) ||
      e.userRole === 'admin'
    );

    return {
      users: u,
      rules: r,
      sources: s,
      systemAuditEvents: a.slice(0, 6),
    };
  }, [feedback]);

  const handleResetConfirm = () => {
    setResetting(true);
    try {
      resetDemoData(session);
      setFeedback('Database successfully re-initialized to standard system state.');
      setResetModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setFeedback(err.message || 'Reset failed');
    } finally {
      setResetting(false);
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
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                  System Administration Console
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
                  Infrastructure & Configuration
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                Configure regulatory validation parameters, manage user accounts and roles, inspect source adapters, and maintain system integrity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/users" className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5">
              <Users size={14} />
              User Management
            </Link>
            <button
              onClick={() => setResetModalOpen(true)}
              className="btn-outline text-xs text-red-700 border-red-300 hover:bg-red-50 flex items-center gap-1.5 py-2 px-3">
              <RefreshCw size={14} />
              Reset System Data
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Configured Users</span>
            <Users size={16} className="text-forest-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-gray-900">{users.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">5 active roles</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Regulatory Rules</span>
            <Sliders size={16} className="text-brass-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-brass-700">{rules.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Automated validation rules</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Source Adapters</span>
            <Database size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-blue-700">{sources.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Simulated APIs / SFTP</div>
        </div>

        <div className="card card-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Storage Health</span>
            <HardDrive size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-2 font-serif text-emerald-700">Healthy</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Local browser persistence</div>
        </div>
      </div>

      {/* Administration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): User Accounts Directory & Regulatory Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demo User Directory */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  User Accounts & Role Permissions
                </h3>
                <p className="text-[11px] text-gray-500">Accounts configured with role separation and granular access controls</p>
              </div>
              <Link href="/users" className="text-xs text-forest-600 hover:underline flex items-center gap-1">
                Manage Directory <ArrowRight size={12} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role Identifier</th>
                    <th>Organization / Scope</th>
                    <th>Financial Release Authority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="text-xs">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-500">{u.email}</div>
                      </td>
                      <td>
                        <span className="font-mono text-[11px] font-semibold text-forest-700">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600">
                        {u.role === 'institution' ? 'Assigned College (Isolated)' : 'AICTE Regulatory Scope'}
                      </td>
                      <td className="text-xs">
                        {u.role === 'senior_officer' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Authorized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            Restricted
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="status-badge status-verified">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regulatory Rules Overview */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  Active Regulatory Rules Configuration
                </h3>
                <p className="text-[11px] text-gray-500">Validation parameters evaluated during submission and OCR ingestion</p>
              </div>
              <Link href="/settings" className="text-xs text-forest-600 hover:underline">
                Configure Rules
              </Link>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {rules.map(rule => (
                <div key={rule.id} className="p-3.5 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="font-mono text-forest-700">{rule.id}</span>
                      <span>{rule.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{rule.description}</p>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Version {rule.version} · Evaluated by {rule.category} validator
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0 ${
                    rule.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rule.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Source Adapters & Admin Logs */}
        <div className="space-y-6">
          {/* Source Adapters Status */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                  External Source Adapters
                </h3>
                <p className="text-[11px] text-gray-500">Connected verification endpoints</p>
              </div>
              <Database size={16} className="text-blue-600" />
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {sources.map(s => (
                <div key={s.id} className="p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{s.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">Type: {s.type} · Status: {s.connectionStatus}</div>
                  <div className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1 inline-block">
                    Direct Integration (Active Gateway)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin System Activity */}
          <div className="card" style={{ padding: 0 }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-parchment)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                System Configuration Log
              </h3>
              <Link href="/audit" className="text-xs text-forest-600 hover:underline">
                Full Trail
              </Link>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-parchment)' }}>
              {systemAuditEvents.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">No recent administrative events.</div>
              ) : (
                systemAuditEvents.map(event => (
                  <div key={event.id} className="p-3 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{event.userName}</span>
                      <span className="text-[10px] text-gray-400">{formatDateTime(event.timestamp)}</span>
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {event.action.replace(/_/g, ' ')} on <span className="font-mono font-medium text-forest-700">{event.entityId}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-serif font-bold text-lg text-gray-900">
                Confirm System Data Reset
              </h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                This will reset all registered instruments, verification findings, and release decisions back to their baseline records.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
                className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={resetting}
                className="btn-primary text-xs bg-red-700 hover:bg-red-800 flex items-center gap-1.5">
                <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
                {resetting ? 'Resetting...' : 'Yes, Reset System Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
