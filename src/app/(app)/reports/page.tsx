'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-context';
import {
  getInstruments, getInstitutions, getFindings, getReleaseRequests,
  getAuditEvents, formatINR, formatDate, daysUntilMaturity, exportToCSV
} from '@/lib/store';
import {
  BarChart3, Download, Printer, Filter, Calendar, Building,
  FileText, AlertTriangle, ShieldCheck, CheckCircle2, Search
} from 'lucide-react';

type ReportType =
  | 'fdr_register'
  | 'upcoming_maturity'
  | 'overdue_renewals'
  | 'pending_verification'
  | 'discrepancies'
  | 'release_summary'
  | 'institution_summary';

export default function ReportsPage() {
  const { session, permissions } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('fdr_register');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '30' | '90' | '365'>('all');

  const institutions = useMemo(() => getInstitutions(), []);
  const allInstruments = useMemo(() => {
    if (!session) return [];
    return session.role === 'institution'
      ? getInstruments({ institutionId: session.institutionId })
      : getInstruments();
  }, [session]);

  const findings = useMemo(() => getFindings(), []);
  const releaseRequests = useMemo(() => getReleaseRequests(), []);

  // Filter instruments by institution if set
  const filteredInstruments = useMemo(() => {
    return allInstruments.filter(inst => {
      if (institutionFilter !== 'all' && inst.institutionId !== institutionFilter) return false;
      return true;
    });
  }, [allInstruments, institutionFilter]);

  // Report Specific Datasets & Columns
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'fdr_register':
        return filteredInstruments.map(i => ({
          'Instrument ID': i.id,
          'Institution': i.institutionName,
          'AISHE Code': i.aisheCode,
          'FDR Number': i.fdrNumber,
          'Bank': i.bankName,
          'Deposit Amount (INR)': i.depositAmount,
          'Formatted Amount': formatINR(i.depositAmount),
          'Issue Date': formatDate(i.issueDate),
          'Maturity Date': formatDate(i.maturityDate),
          'Status': i.status,
          'Verification': i.verificationStatus,
        }));

      case 'upcoming_maturity':
        return filteredInstruments
          .filter(i => {
            const days = daysUntilMaturity(i.maturityDate);
            return days >= 0 && days <= 60;
          })
          .map(i => ({
            'Instrument ID': i.id,
            'Institution': i.institutionName,
            'FDR Number': i.fdrNumber,
            'Bank': i.bankName,
            'Deposit Amount': formatINR(i.depositAmount),
            'Maturity Date': formatDate(i.maturityDate),
            'Days Remaining': daysUntilMaturity(i.maturityDate),
            'Status': i.status,
          }));

      case 'overdue_renewals':
        return filteredInstruments
          .filter(i => daysUntilMaturity(i.maturityDate) < 0 || i.status === 'renewal_pending')
          .map(i => ({
            'Instrument ID': i.id,
            'Institution': i.institutionName,
            'FDR Number': i.fdrNumber,
            'Bank': i.bankName,
            'Deposit Amount': formatINR(i.depositAmount),
            'Maturity Date': formatDate(i.maturityDate),
            'Days Lapsed': Math.abs(daysUntilMaturity(i.maturityDate)),
            'Status': i.status,
          }));

      case 'pending_verification':
        return filteredInstruments
          .filter(i => ['not_started', 'pending', 'manual_confirmation_required', 'source_unavailable'].includes(i.verificationStatus))
          .map(i => ({
            'Instrument ID': i.id,
            'Institution': i.institutionName,
            'FDR Number': i.fdrNumber,
            'Bank': i.bankName,
            'Deposit Amount': formatINR(i.depositAmount),
            'Verification State': i.verificationStatus,
            'Assigned Officer': i.assignedReviewer || 'Unassigned',
          }));

      case 'discrepancies':
        return findings.map(f => {
          const inst = allInstruments.find(i => i.id === f.instrumentId);
          return {
            'Finding ID': f.id,
            'Instrument ID': f.instrumentId,
            'Institution': inst?.institutionName || 'Unknown',
            'Rule / Clause': f.ruleName,
            'Severity': f.severity,
            'Description': f.description,
            'Expected': f.expectedValue || '—',
            'Actual Submitted': f.actualValue || '—',
            'Resolved': f.resolved ? 'Yes' : 'No',
          };
        });

      case 'release_summary':
        return releaseRequests.map(r => {
          const inst = allInstruments.find(i => i.id === r.instrumentId);
          return {
            'Request ID': r.id,
            'Instrument ID': r.instrumentId,
            'Institution': inst?.institutionName || 'Unknown',
            'Deposit Principal': inst ? formatINR(inst.depositAmount) : '—',
            'Request Date': formatDate(r.requestDate),
            'Status': r.status,
            'Grounds for Release': r.reason,
            'Decision': r.seniorDecision || 'Pending',
          };
        });

      case 'institution_summary':
        return institutions.map(inst => {
          const instFdrs = allInstruments.filter(i => i.institutionId === inst.id);
          const totalAmount = instFdrs.reduce((sum, i) => sum + i.depositAmount, 0);
          return {
            'Institution Name': inst.name,
            'AISHE Code': inst.aisheCode,
            'State': inst.state,
            'Total FDRs': instFdrs.length,
            'Total Deposit Pledged (INR)': totalAmount,
            'Formatted Deposit': formatINR(totalAmount),
            'Active Monitoring': instFdrs.filter(i => i.status === 'active_monitoring' || i.status === 'verified').length,
            'Discrepant': instFdrs.filter(i => i.status === 'discrepancy_flagged').length,
          };
        });

      default:
        return [];
    }
  }, [selectedReport, filteredInstruments, findings, releaseRequests, institutions, allInstruments]);

  // Export handler
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert('No data available to export for this report.');
      return;
    }
    exportToCSV(reportData, `Sakshya_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const REPORT_TITLES: Record<ReportType, string> = {
    fdr_register: 'Master FDR & Security Deposit Register',
    upcoming_maturity: 'Upcoming Maturity Schedule (Next 60 Days)',
    overdue_renewals: 'Overdue & Lapsed Instrument Report',
    pending_verification: 'Pending Officer Scrutiny & Verification Queue',
    discrepancies: 'Regulatory Compliance Observations & Discrepancies',
    release_summary: 'Security Deposit Release & Refund Report',
    institution_summary: 'Institution-Wise Aggregate Deposit Summary',
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Administrative Reports & Statutory Exports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit-grade summaries, scheduled maturity forecasting, and institutional compliance registers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white border rounded-xl p-3 shadow-sm flex items-center gap-2 overflow-x-auto text-xs" style={{ borderColor: 'var(--color-parchment)' }}>
        {[
          { key: 'fdr_register', label: 'Master Register' },
          { key: 'upcoming_maturity', label: 'Upcoming Maturities' },
          { key: 'overdue_renewals', label: 'Overdue Renewals' },
          { key: 'pending_verification', label: 'Pending Scrutiny' },
          { key: 'discrepancies', label: 'Discrepancies' },
          { key: 'release_summary', label: 'Release Requests' },
          { key: 'institution_summary', label: 'Institution Summary' },
        ].map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSelectedReport(r.key as ReportType)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedReport === r.key
                ? 'bg-forest-600 text-white font-medium shadow-xs'
                : 'text-gray-600 hover:bg-stone-100 hover:text-gray-900'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Main Report Table Card */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-parchment)' }}>
          <div>
            <h2 className="text-lg font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              {REPORT_TITLES[selectedReport]}
            </h2>
            <p className="text-xs text-gray-500">
              Live audit extract as on {formatDate(new Date().toISOString())} · {reportData.length} total records
            </p>
          </div>

          {/* Institution Filter for multi-institution reports */}
          {selectedReport !== 'institution_summary' && session?.role !== 'institution' && (
            <div className="flex items-center gap-2 text-xs">
              <Building size={14} className="text-gray-400" />
              <select
                value={institutionFilter}
                onChange={e => setInstitutionFilter(e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
              >
                <option value="all">All Institutions</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Table from Report Data */}
        {reportData.length > 0 ? (
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-50 border-b text-gray-600">
                <tr>
                  {Object.keys(reportData[0]).map(header => (
                    <th key={header} className="p-3 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/70">
                    {Object.entries(row).map(([key, val], cIdx) => (
                      <td key={cIdx} className="p-3 text-gray-800">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 bg-stone-50 rounded-xl">
            No records matched this report filter.
          </div>
        )}
      </div>
    </div>
  );
}
