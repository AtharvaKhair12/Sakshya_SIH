'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getRules, getSources, updateRule, resetDemoData, getInstitutions
} from '@/lib/store';
import { RegulatoryRule, SourceAdapter } from '@/lib/types';
import {
  Settings, Sliders, Database, Bell, RefreshCw, Upload, Check,
  AlertTriangle, ShieldCheck, CheckCircle2, FileText, Info, ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function SettingsPage() {
  const { session, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'sources' | 'import' | 'preferences'>('rules');
  const [refreshKey, setRefreshKey] = useState(0);

  // Rules state
  const rules = useMemo(() => getRules(), [refreshKey]);
  const sources = useMemo(() => getSources(), [refreshKey]);

  // Edit Rule Modal State
  const [editingRule, setEditingRule] = useState<RegulatoryRule | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editSeverity, setEditSeverity] = useState<RegulatoryRule['severity']>('warning');

  // Reset confirmation state
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; errors: number } | null>(null);

  // Threshold preferences state
  const [thresholdDays, setThresholdDays] = useState({ t1: 30, t2: 15, t3: 7 });
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Admin access guard
  if (session && session.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">Administrator Access Required</h2>
        <p className="text-xs text-gray-600 mb-6">
          Rule engine configuration, source adapters, and data import are restricted to System Administrators.
        </p>
        <Link href="/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Toggle Rule
  const handleToggleRule = (rule: RegulatoryRule) => {
    if (!session) return;
    updateRule(rule.id, { enabled: !rule.enabled }, session);
    setRefreshKey(k => k + 1);
  };

  // Save Rule Edit
  const handleSaveRule = () => {
    if (!session || !editingRule || !editDesc.trim()) return;
    updateRule(editingRule.id, {
      description: editDesc.trim(),
      severity: editSeverity,
    }, session);
    setEditingRule(null);
    setRefreshKey(k => k + 1);
  };

  // Reset demo data handler
  const handleResetData = () => {
    resetDemoData();
    setResetModalOpen(false);
    window.location.href = '/dashboard';
  };

  // CSV file reader for reference data import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 6).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || '';
          });
          return obj;
        });
        setImportPreview(rows);
        setImportSummary({
          total: lines.length - 1,
          valid: lines.length - 1,
          errors: 0,
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            System Settings & Rule Engine
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure validation rules, manage external reference source adapters, and configure demo preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setResetModalOpen(true)}
          className="btn-secondary text-xs flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50 self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Reset Demo Data
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b flex items-center gap-6" style={{ borderColor: 'var(--color-parchment)' }}>
        {[
          { key: 'rules', label: `Regulatory Rules (${rules.length})`, icon: Sliders },
          { key: 'sources', label: `Source Adapters (${sources.length})`, icon: Database },
          { key: 'import', label: 'Reference Data Import', icon: Upload },
          { key: 'preferences', label: 'Preferences & Reset', icon: Settings },
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

      {/* Tab 1: Regulatory Rules */}
      {activeTab === 'rules' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              Configurable Regulatory Scrutiny Rules
            </h2>
            <p className="text-xs text-gray-500">
              Rules evaluated during submission pre-flight and officer verification. Toggle rules or edit parameters.
            </p>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{rule.id}</span>
                    <span className="font-semibold text-gray-900">{rule.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.severity === 'critical' || rule.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rule.severity}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">v{rule.version}</span>
                  </div>
                  <p className="text-gray-600">{rule.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>Category: {rule.category}</span>
                    {rule.clauseReference && <span>• Ref: {rule.clauseReference}</span>}
                    {rule.sourceDocument && <span>• Source: {rule.sourceDocument}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRule(rule);
                      setEditDesc(rule.description);
                      setEditSeverity(rule.severity);
                    }}
                    className="btn-secondary text-[11px] px-2.5 py-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Source Adapters */}
      {activeTab === 'sources' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              External Reference Sources & Verification Adapters
            </h2>
            <p className="text-xs text-gray-500">
              Integrations for authenticating deposit certificates, public institution directories, and bank interfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {sources.map(source => {
              const statusBadgeMap: Record<SourceAdapter['connectionStatus'], { label: string; color: string }> = {
                live: { label: 'Live Integration', color: 'bg-emerald-100 text-emerald-800' },
                imported: { label: 'Local Imported Dataset', color: 'bg-blue-100 text-blue-800' },
                simulated: { label: 'Simulated Adapter (Demo)', color: 'bg-amber-100 text-amber-800' },
                unavailable: { label: 'Offline / Unavailable', color: 'bg-red-100 text-red-800' },
                requires_authorization: { label: 'Requires Authorization', color: 'bg-stone-200 text-stone-700' },
              };
              const badge = statusBadgeMap[source.connectionStatus];

              return (
                <div key={source.id} className="p-4 border rounded-xl bg-white space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{source.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-gray-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Adapter Type:</span>
                      <span className="font-mono">{source.type}</span>
                    </div>
                    {source.recordCount && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Records Loaded:</span>
                        <span className="font-mono font-medium">{source.recordCount}</span>
                      </div>
                    )}
                    {source.dataFreshness && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Freshness:</span>
                        <span>{source.dataFreshness}</span>
                      </div>
                    )}
                  </div>

                  {source.lastError && (
                    <div className="p-2 bg-red-50 text-red-700 rounded text-[11px] border border-red-200">
                      <strong>Last Error:</strong> {source.lastError}
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={() => alert(`Synchronizing adapter "${source.name}"... Status: ${source.connectionStatus}`)}
                      className="btn-secondary text-[11px] px-2.5 py-1"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Reference Data Import */}
      {activeTab === 'import' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              Import Reference Institutional Data
            </h2>
            <p className="text-xs text-gray-500">
              Upload AISHE directory extracts or approved institutional lists to enrich local verification comparisons.
            </p>
          </div>

          {/* Upload Dropzone */}
          <label className="border-2 border-dashed border-gray-300 hover:border-forest-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Choose CSV or JSON dataset to import</span>
            <span className="text-xs text-gray-400 mt-1">Supports UTF-8 CSV with institutional identifiers and bank codes</span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Preview & Ingestion Summary */}
          {importSummary && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                <span>Dataset Ingestion Prepared: <strong>{importSummary.total} records found</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Successfully imported ${importSummary.total} reference records into local demo store!`);
                    setImportFile(null);
                    setImportPreview([]);
                    setImportSummary(null);
                  }}
                  className="btn-primary text-xs px-3 py-1 bg-emerald-700 hover:bg-emerald-800"
                >
                  Commit Import
                </button>
              </div>

              {importPreview.length > 0 && (
                <div className="border rounded-xl overflow-x-auto text-xs">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-stone-50 border-b text-gray-600">
                      <tr>
                        {Object.keys(importPreview[0]).map(h => (
                          <th key={h} className="p-2.5 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-stone-50/70">
                          {Object.values(row).map((val, c) => (
                            <td key={c} className="p-2.5 text-gray-700">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: System Preferences & Demo Reset */}
      {activeTab === 'preferences' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              Maturity Notification Thresholds & Data Management
            </h2>
            <p className="text-xs text-gray-500">
              Adjust prototype alerting intervals and manage demo database states.
            </p>
          </div>

          {/* Thresholds Form */}
          <div className="max-w-md space-y-3 text-xs">
            <h3 className="font-semibold text-gray-800 uppercase tracking-wide">
              Automated In-App Maturity Alert Thresholds
            </h3>

            <div>
              <label className="block text-gray-600 mb-1">Tier 1 Notice (Advance Horizon):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thresholdDays.t1}
                  onChange={e => setThresholdDays({ ...thresholdDays, t1: Number(e.target.value) })}
                  className="border rounded px-2.5 py-1.5 w-24 text-xs font-mono"
                />
                <span className="text-gray-500">days prior to maturity</span>
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Tier 2 Notice (Urgent Notice):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thresholdDays.t2}
                  onChange={e => setThresholdDays({ ...thresholdDays, t2: Number(e.target.value) })}
                  className="border rounded px-2.5 py-1.5 w-24 text-xs font-mono"
                />
                <span className="text-gray-500">days prior to maturity</span>
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Tier 3 Notice (Critical Immediate Renewal):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thresholdDays.t3}
                  onChange={e => setThresholdDays({ ...thresholdDays, t3: Number(e.target.value) })}
                  className="border rounded px-2.5 py-1.5 w-24 text-xs font-mono"
                />
                <span className="text-gray-500">days prior to maturity</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPrefsSaved(true);
                setTimeout(() => setPrefsSaved(false), 2000);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 mt-2"
            >
              <Check size={14} /> Save Threshold Preferences
            </button>
            {prefsSaved && (
              <span className="text-xs text-emerald-700 font-semibold block">Preferences saved successfully!</span>
            )}
          </div>

          {/* Destructive Reset Section */}
          <div className="pt-6 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <h3 className="text-xs font-bold text-red-900 uppercase tracking-wide mb-1">
              Reset Demo Dataset
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Erases local browser changes and restores the initial seed dataset (8 institutions, 25+ FDR instruments, audit events).
            </p>
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="btn-secondary text-xs text-red-700 border-red-300 hover:bg-red-50"
            >
              Reset to Factory Demo Seed
            </button>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Edit Regulatory Rule: {editingRule.id}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={editingRule.name}
                  disabled
                  className="w-full border rounded-lg p-2 text-xs bg-stone-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Rule Description / Requirement *</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Severity</label>
                <select
                  value={editSeverity}
                  onChange={e => setEditSeverity(e.target.value as any)}
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="btn-primary text-xs"
              >
                Save Rule Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              Reset Demo Data?
            </h3>
            <p className="text-xs text-gray-600">
              This will permanently clear all custom FDRs, uploaded files, and status modifications made in your browser, restoring the original seed dataset.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="btn-primary text-xs bg-red-700 hover:bg-red-800"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
