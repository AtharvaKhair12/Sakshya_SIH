'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { getInstruments, getInstitutions, formatINR, formatDate, daysUntilMaturity, exportToCSV } from '@/lib/store';
import { INSTRUMENT_STATUS_LABELS, VERIFICATION_STATUS_LABELS, InstrumentStatus, VerificationStatus } from '@/lib/types';
import { Search, Filter, Download, Plus, ChevronUp, ChevronDown, X, SlidersHorizontal } from 'lucide-react';

export default function InstrumentsPage() {
  const { session, permissions } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || '';

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [verificationFilter, setVerificationFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 15;

  const institutions = getInstitutions();

  const allInstruments = useMemo(() => {
    if (!session) return [];
    return session.role === 'institution'
      ? getInstruments({ institutionId: session.institutionId })
      : getInstruments();
  }, [session]);

  const banks = useMemo(() => [...new Set(allInstruments.map(i => i.bankName))].sort(), [allInstruments]);

  const filtered = useMemo(() => {
    let items = [...allInstruments];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.institutionName.toLowerCase().includes(q) ||
        i.fdrNumber.toLowerCase().includes(q) ||
        i.bankName.toLowerCase().includes(q) ||
        i.aisheCode.toLowerCase().includes(q)
      );
    }
    if (statusFilter) items = items.filter(i => i.status === statusFilter);
    if (verificationFilter) items = items.filter(i => i.verificationStatus === verificationFilter);
    if (institutionFilter) items = items.filter(i => i.institutionId === institutionFilter);
    if (bankFilter) items = items.filter(i => i.bankName === bankFilter);

    items.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal || '').localeCompare(String(bVal || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [allInstruments, search, statusFilter, verificationFilter, institutionFilter, bankFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setVerificationFilter(''); setInstitutionFilter(''); setBankFilter('');
    setPage(1);
  };

  const hasFilters = search || statusFilter || verificationFilter || institutionFilter || bankFilter;

  const handleExport = () => {
    exportToCSV(filtered.map(i => ({
      'Instrument ID': i.id,
      'Institution': i.institutionName,
      'AISHE Code': i.aisheCode,
      'Bank': i.bankName,
      'Branch': i.branch,
      'FDR Number': i.fdrNumber,
      'Amount (INR)': i.depositAmount,
      'Issue Date': i.issueDate,
      'Maturity Date': i.maturityDate,
      'Status': INSTRUMENT_STATUS_LABELS[i.status],
      'Verification': VERIFICATION_STATUS_LABELS[i.verificationStatus],
      'Last Updated': i.updatedAt,
    })), `sakshya_instruments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
            Instrument Register
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-charcoal-muted)' }}>
            {filtered.length} instrument{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions?.canCreateInstruments && (
            <Link href="/instruments/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> New Submission
            </Link>
          )}
          <button onClick={handleExport} className="btn btn-secondary btn-sm" disabled={filtered.length === 0}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-charcoal-muted)' }} />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, institution, FDR number, bank..." className="form-input pl-9 text-sm" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}>
            <SlidersHorizontal size={16} /> Filters
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-ghost btn-sm">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <div>
              <label className="form-label">Status</label>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="form-input form-select text-sm">
                <option value="">All Statuses</option>
                {Object.entries(INSTRUMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Verification</label>
              <select value={verificationFilter} onChange={e => { setVerificationFilter(e.target.value); setPage(1); }} className="form-input form-select text-sm">
                <option value="">All</option>
                {Object.entries(VERIFICATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {session?.role !== 'institution' && (
              <div>
                <label className="form-label">Institution</label>
                <select value={institutionFilter} onChange={e => { setInstitutionFilter(e.target.value); setPage(1); }} className="form-input form-select text-sm">
                  <option value="">All Institutions</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="form-label">Bank</label>
              <select value={bankFilter} onChange={e => { setBankFilter(e.target.value); setPage(1); }} className="form-input form-select text-sm">
                <option value="">All Banks</option>
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium" style={{ color: 'var(--color-charcoal)' }}>No instruments found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
              {hasFilters ? 'Try adjusting your filters.' : 'No instruments have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('id')}>ID <SortIcon field="id" /></th>
                  <th className="sortable hide-mobile" onClick={() => handleSort('institutionName')}>Institution <SortIcon field="institutionName" /></th>
                  <th className="sortable hide-mobile" onClick={() => handleSort('bankName')}>Bank <SortIcon field="bankName" /></th>
                  <th className="hide-mobile">FDR Number</th>
                  <th className="sortable" onClick={() => handleSort('depositAmount')}>Amount <SortIcon field="depositAmount" /></th>
                  <th className="sortable hide-mobile" onClick={() => handleSort('maturityDate')}>Maturity <SortIcon field="maturityDate" /></th>
                  <th>Status</th>
                  <th className="hide-mobile">Verification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(inst => {
                  const days = daysUntilMaturity(inst.maturityDate);
                  return (
                    <tr key={inst.id}>
                      <td>
                        <Link href={`/instruments/${inst.id}`} className="font-medium text-sm hover:underline" style={{ color: 'var(--color-forest-700)' }}>
                          {inst.id}
                        </Link>
                      </td>
                      <td className="hide-mobile">
                        <div className="text-sm" style={{ color: 'var(--color-charcoal)' }}>{inst.institutionName.slice(0, 30)}</div>
                        <div className="text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>{inst.aisheCode}</div>
                      </td>
                      <td className="text-sm hide-mobile" style={{ color: 'var(--color-charcoal)' }}>{inst.bankName}</td>
                      <td className="text-xs font-mono hide-mobile" style={{ color: 'var(--color-charcoal-muted)' }}>{inst.fdrNumber}</td>
                      <td className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>{formatINR(inst.depositAmount)}</td>
                      <td className="hide-mobile">
                        <div className="text-sm">{formatDate(inst.maturityDate)}</div>
                        <div className="text-xs" style={{ color: days < 0 ? 'var(--color-status-error)' : days <= 30 ? 'var(--color-status-warning)' : 'var(--color-charcoal-muted)' }}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          ['verified', 'active_monitoring', 'released'].includes(inst.status) ? 'status-verified' :
                          ['discrepancy_flagged'].includes(inst.status) ? 'status-error' :
                          ['pending_scrutiny', 'submitted', 'preliminary_validation'].includes(inst.status) ? 'status-pending' :
                          'status-info'
                        }`}>
                          {INSTRUMENT_STATUS_LABELS[inst.status]}
                        </span>
                      </td>
                      <td className="hide-mobile">
                        <span className={`status-badge ${
                          inst.verificationStatus === 'verified_by_source' || inst.verificationStatus === 'public_reference_match' ? 'status-verified' :
                          inst.verificationStatus === 'mismatch_detected' ? 'status-error' :
                          inst.verificationStatus === 'pending' || inst.verificationStatus === 'not_started' ? 'status-pending' :
                          'status-neutral'
                        }`}>
                          {VERIFICATION_STATUS_LABELS[inst.verificationStatus]}
                        </span>
                      </td>
                      <td>
                        <Link href={`/instruments/${inst.id}`} className="btn btn-ghost btn-xs">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="text-xs" style={{ color: 'var(--color-charcoal-muted)' }}>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost btn-xs">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`btn btn-xs ${p === page ? 'btn-primary' : 'btn-ghost'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-ghost btn-xs">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileText({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </svg>
  );
}
