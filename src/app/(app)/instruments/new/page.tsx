'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import {
  getInstitutions, getInstruments, createInstrument, addDocument,
  formatINR, formatDate
} from '@/lib/store';
import { Instrument, UploadedDocument } from '@/lib/types';
import {
  FileText, Upload, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
  Trash2, Eye, ShieldCheck, Sparkles, Building, FileCheck, Check
} from 'lucide-react';

const COMMON_BANKS = [
  'State Bank of India',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Indian Bank'
];

interface UploadItem {
  id: string;
  file: File;
  documentType: UploadedDocument['documentType'];
  previewUrl?: string;
}

export default function NewInstrumentPage() {
  const router = useRouter();
  const { session, permissions } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const institutions = getInstitutions();
  const existingInstruments = getInstruments();

  // Form State
  const [institutionId, setInstitutionId] = useState('');
  const [applicationRef, setApplicationRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [customBank, setCustomBank] = useState('');
  const [branch, setBranch] = useState('');
  const [fdrNumber, setFdrNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [isReplacement, setIsReplacement] = useState(false);
  const [linkedPredecessorId, setLinkedPredecessorId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Documents State
  const [uploadedFiles, setUploadedFiles] = useState<UploadItem[]>([]);
  const [extractedData, setExtractedData] = useState<{
    fdrNumber?: string;
    bankName?: string;
    amount?: number;
    issueDate?: string;
    maturityDate?: string;
    confidence: number;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Errors & Result State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submittedInstrument, setSubmittedInstrument] = useState<Instrument | null>(null);

  // Initialize institution from session if institution role
  useEffect(() => {
    if (session?.role === 'institution' && session.institutionId) {
      setInstitutionId(session.institutionId);
    } else if (institutions.length > 0 && !institutionId) {
      setInstitutionId(institutions[0].id);
    }
  }, [session, institutions, institutionId]);

  // Permission check
  if (session && !permissions?.canCreateInstruments && session.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-600 mb-6">
          Only Institution representatives or Administrators are authorized to register new FDR instruments.
        </p>
        <Link href="/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const selectedInst = institutions.find(i => i.id === institutionId);

  // Step 1 Validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!institutionId) errs.institutionId = 'Institution is required';
    const effectiveBank = bankName === 'Other' ? customBank : bankName;
    if (!effectiveBank) errs.bankName = 'Bank name is required';
    if (!branch.trim()) errs.branch = 'Branch is required';
    if (!fdrNumber.trim()) errs.fdrNumber = 'FDR number is required';
    if (!depositAmount || Number(depositAmount) <= 0) errs.depositAmount = 'Enter a valid positive deposit amount';
    if (!issueDate) errs.issueDate = 'Issue date is required';
    if (!maturityDate) errs.maturityDate = 'Maturity date is required';
    if (issueDate && maturityDate && new Date(issueDate) >= new Date(maturityDate)) {
      errs.maturityDate = 'Maturity date must be after issue date';
    }
    if (isReplacement && !linkedPredecessorId) {
      errs.linkedPredecessorId = 'Please select the prior FDR instrument being replaced';
    }

    // Duplicate check
    const duplicate = existingInstruments.find(
      i => i.fdrNumber.toLowerCase() === fdrNumber.trim().toLowerCase()
    );
    if (duplicate) {
      setDuplicateWarning(`Warning: FDR #${fdrNumber.trim()} already exists in the system for "${duplicate.institutionName}" (${duplicate.id}). Submitting this will trigger a duplicate discrepancy review.`);
    } else {
      setDuplicateWarning(null);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Upload handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newItems: UploadItem[] = [];
    Array.from(e.target.files).forEach(file => {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
        alert(`Unsupported file format for ${file.name}. Only PDF, JPG, and PNG are accepted.`);
        return;
      }
      let docType: UploadedDocument['documentType'] = 'fdr_certificate';
      if (file.name.toLowerCase().includes('bank') || file.name.toLowerCase().includes('letter')) {
        docType = 'bank_letter';
      } else if (file.name.toLowerCase().includes('affidavit')) {
        docType = 'affidavit';
      }
      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        documentType: docType,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    });
    setUploadedFiles(prev => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileType = (id: string, type: UploadedDocument['documentType']) => {
    setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, documentType: type } : f));
  };

  // Simulated OCR Extraction
  const runSimulatedExtraction = () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload an FDR certificate first to test document extraction.');
      return;
    }
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      // Simulated extracted fields based on current inputs or realistic defaults
      const sim = {
        fdrNumber: fdrNumber || 'FDR-' + Math.floor(10000000 + Math.random() * 90000000),
        bankName: (bankName === 'Other' ? customBank : bankName) || 'State Bank of India',
        amount: Number(depositAmount) || 2500000,
        issueDate: issueDate || '2024-04-15',
        maturityDate: maturityDate || '2029-04-15',
        confidence: 94.8,
      };
      setExtractedData(sim);
    }, 1200);
  };

  const applyExtractedData = () => {
    if (!extractedData) return;
    if (extractedData.fdrNumber) setFdrNumber(extractedData.fdrNumber);
    if (extractedData.bankName) {
      if (COMMON_BANKS.includes(extractedData.bankName)) {
        setBankName(extractedData.bankName);
      } else {
        setBankName('Other');
        setCustomBank(extractedData.bankName);
      }
    }
    if (extractedData.amount) setDepositAmount(extractedData.amount);
    if (extractedData.issueDate) setIssueDate(extractedData.issueDate);
    if (extractedData.maturityDate) setMaturityDate(extractedData.maturityDate);
  };

  // Final Submission
  const handleSubmit = () => {
    if (!session) return;
    const effectiveBank = bankName === 'Other' ? customBank : bankName;
    const inst = institutions.find(i => i.id === institutionId);

    const newInst = createInstrument({
      institutionId,
      institutionName: inst?.name || 'Institution',
      aisheCode: inst?.aisheCode || 'C-1001',
      applicationRef: applicationRef || undefined,
      bankName: effectiveBank,
      branch,
      fdrNumber: fdrNumber.trim(),
      depositAmount: Number(depositAmount),
      issueDate,
      maturityDate,
      linkedPredecessorId: isReplacement ? linkedPredecessorId : undefined,
      remarks: remarks || undefined,
      submittedBy: session.userId,
      submittedAt: new Date().toISOString(),
    }, session);

    // Save uploaded files to store
    uploadedFiles.forEach(item => {
      addDocument({
        instrumentId: newInst.id,
        fileName: item.file.name,
        fileSize: item.file.size,
        fileType: item.file.type || 'application/octet-stream',
        documentType: item.documentType,
        uploadedBy: session.userId,
        uploadedAt: new Date().toISOString(),
        dataUrl: item.previewUrl,
      });
    });

    setSubmittedInstrument(newInst);
    setStep(4);
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/instruments" className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
              <ArrowLeft size={14} /> Back to Register
            </Link>
          </div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            New FDR Registration
          </h1>
          <p className="text-sm text-gray-500">
            Submit a security deposit or Fixed Deposit Receipt instrument for AICTE verification & monitoring.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 font-mono">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* Stepper Wizard Progress */}
      <div className="mb-8 bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 z-0" />
          {[
            { s: 1, label: 'Instrument Details' },
            { s: 2, label: 'Supporting Evidence' },
            { s: 3, label: 'Validation & Review' },
            { s: 4, label: 'Receipt & Confirmation' }
          ].map(({ s, label }) => {
            const isCompleted = step > s || (step === 4 && s === 4);
            const isCurrent = step === s;
            return (
              <div key={s} className="relative z-10 flex flex-col items-center bg-white px-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-forest-600 text-white ring-4 ring-forest-100'
                      : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}
                  style={{
                    backgroundColor: isCompleted ? 'var(--color-status-success)' : isCurrent ? 'var(--color-forest-600)' : undefined
                  }}
                >
                  {isCompleted && step !== s ? <Check size={16} /> : s}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${isCurrent ? 'text-forest-900 font-semibold' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Deposit Details */}
      {step === 1 && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <Building size={18} className="text-forest-600" /> Institution & Deposit Information
            </h2>
            <p className="text-xs text-gray-500">Provide accurate details matching your official bank deposit receipt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Institution */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Institution Name *
              </label>
              {session?.role === 'institution' ? (
                <div className="p-2.5 rounded-lg border bg-stone-50 text-sm font-medium text-gray-800">
                  {selectedInst?.name} <span className="text-xs text-gray-500">({selectedInst?.aisheCode})</span>
                </div>
              ) : (
                <select
                  value={institutionId}
                  onChange={e => setInstitutionId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.aisheCode})
                    </option>
                  ))}
                </select>
              )}
              {errors.institutionId && <p className="text-xs text-red-600 mt-1">{errors.institutionId}</p>}
            </div>

            {/* Application / Approval Ref */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                AICTE Application / Reference Ref (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 1-9318274612 / 2024-25"
                value={applicationRef}
                onChange={e => setApplicationRef(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Issuing Bank *
              </label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                <option value="">-- Select Bank --</option>
                {COMMON_BANKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="Other">Other Scheduled Bank</option>
              </select>
              {bankName === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter full bank name"
                  value={customBank}
                  onChange={e => setCustomBank(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              )}
              {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>}
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Bank Branch & IFSC *
              </label>
              <input
                type="text"
                placeholder="e.g. Connaught Place Branch, SBIN0000691"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              {errors.branch && <p className="text-xs text-red-600 mt-1">{errors.branch}</p>}
            </div>

            {/* FDR Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                FDR / Receipt Number *
              </label>
              <input
                type="text"
                placeholder="e.g. FDR-993821734"
                value={fdrNumber}
                onChange={e => setFdrNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              {errors.fdrNumber && <p className="text-xs text-red-600 mt-1">{errors.fdrNumber}</p>}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Deposit Principal Amount (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  placeholder="2500000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              {depositAmount && Number(depositAmount) > 0 && (
                <p className="text-[11px] text-gray-500 mt-1">{formatINR(Number(depositAmount))}</p>
              )}
              {errors.depositAmount && <p className="text-xs text-red-600 mt-1">{errors.depositAmount}</p>}
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date of Issue *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              {errors.issueDate && <p className="text-xs text-red-600 mt-1">{errors.issueDate}</p>}
            </div>

            {/* Maturity Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date of Maturity *
              </label>
              <input
                type="date"
                value={maturityDate}
                onChange={e => setMaturityDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              {errors.maturityDate && <p className="text-xs text-red-600 mt-1">{errors.maturityDate}</p>}
            </div>
          </div>

          {/* Replacement / Renewal checkbox */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isReplacement}
                onChange={e => setIsReplacement(e.target.checked)}
                className="mt-1 rounded text-forest-600 focus:ring-forest-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">
                  This instrument is a renewal or replacement for a prior FDR
                </span>
                <p className="text-xs text-gray-500">
                  Enables linked lifecycle traceability and retains history from previous security deposit periods.
                </p>
              </div>
            </label>

            {isReplacement && (
              <div className="mt-3 pl-6">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Predecessor Instrument *
                </label>
                <select
                  value={linkedPredecessorId}
                  onChange={e => setLinkedPredecessorId(e.target.value)}
                  className="w-full md:w-2/3 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  <option value="">-- Select prior FDR instrument --</option>
                  {existingInstruments
                    .filter(i => !institutionId || i.institutionId === institutionId)
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {i.id} · {i.fdrNumber} · {formatINR(i.depositAmount)} ({i.status})
                      </option>
                    ))}
                </select>
                {errors.linkedPredecessorId && (
                  <p className="text-xs text-red-600 mt-1">{errors.linkedPredecessorId}</p>
                )}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Remarks or Special Conditions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Joint account pledged to Member Secretary AICTE New Delhi as per approval terms..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {/* Duplicate warning callout if detected */}
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>{duplicateWarning}</div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="btn-primary flex items-center gap-2"
            >
              Continue to Supporting Evidence <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Supporting Documents & Demo Extraction */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Extraction Assistant Callout */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  Automated Document Field Extraction
                </h3>
                <p className="text-xs text-emerald-700">
                  Automated extraction: The system reads certificate values and populates field entries for verification.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isExtracting}
              onClick={runSimulatedExtraction}
              className="btn-secondary whitespace-nowrap text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              <Sparkles size={14} />
              {isExtracting ? 'Analyzing Document...' : 'Run Automated OCR Extraction'}
            </button>
          </div>

          {/* Extraction Results Preview */}
          {extractedData && (
            <div className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                    Simulated OCR Findings (Confidence: {extractedData.confidence}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyExtractedData}
                  className="text-xs font-semibold text-forest-700 hover:text-forest-900 underline"
                >
                  Apply Extracted Values to Form
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2 bg-stone-50 rounded">
                  <span className="text-gray-500 block">Extracted FDR:</span>
                  <span className="font-mono font-medium text-gray-800">{extractedData.fdrNumber}</span>
                </div>
                <div className="p-2 bg-stone-50 rounded">
                  <span className="text-gray-500 block">Bank Detected:</span>
                  <span className="font-medium text-gray-800">{extractedData.bankName}</span>
                </div>
                <div className="p-2 bg-stone-50 rounded">
                  <span className="text-gray-500 block">Amount Extracted:</span>
                  <span className="font-mono font-medium text-gray-800">{formatINR(extractedData.amount || 0)}</span>
                </div>
                <div className="p-2 bg-stone-50 rounded">
                  <span className="text-gray-500 block">Tenure:</span>
                  <span className="font-medium text-gray-800">{extractedData.issueDate} → {extractedData.maturityDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Zone */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5" style={{ borderColor: 'var(--color-parchment)' }}>
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
              <h2 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                <Upload size={18} className="text-forest-600" /> Upload Supporting Documents
              </h2>
              <p className="text-xs text-gray-500">
                AICTE regulatory scrutiny requires the bank FDR certificate, lien letter, and authorized trustee affidavit.
              </p>
            </div>

            {/* Dropzone */}
            <label className="border-2 border-dashed border-gray-300 hover:border-forest-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">Click to upload files or drag & drop</span>
              <span className="text-xs text-gray-500 mt-1">Accepted formats: PDF, JPG, PNG (Max 15MB each)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Uploaded Files Table */}
            {uploadedFiles.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Attached Files ({uploadedFiles.length})
                </h4>
                <div className="divide-y border rounded-lg overflow-hidden bg-white">
                  {uploadedFiles.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={20} className="text-forest-600 flex-shrink-0" />
                        <div className="truncate">
                          <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                          <p className="text-[11px] text-gray-500">{(item.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={item.documentType}
                          onChange={e => updateFileType(item.id, e.target.value as UploadedDocument['documentType'])}
                          className="text-xs border rounded px-2 py-1 bg-white text-gray-700"
                        >
                          <option value="fdr_certificate">FDR Certificate</option>
                          <option value="bank_letter">Bank Lien / Confirmation Letter</option>
                          <option value="affidavit">Trustee Affidavit</option>
                          <option value="identity_proof">Authorized Signatory Proof</option>
                          <option value="application_form">Approval Application Form</option>
                          <option value="other">Other Document</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 border rounded-lg text-xs text-gray-500 text-center">
                No files uploaded yet. At least one FDR certificate copy is highly recommended for preliminary validation.
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back to Details
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary flex items-center gap-2"
              >
                Proceed to Review & Validation <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Automated Validation & Pre-Submission Review */}
      {step === 3 && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-parchment)' }}>
            <h2 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <FileCheck size={18} className="text-forest-600" /> Automated Scrutiny Check & Submission Review
            </h2>
            <p className="text-xs text-gray-500">
              Our pre-flight validation rules review completeness, potential duplicate risks, and document requirements.
            </p>
          </div>

          {/* Validation Checklist Card */}
          <div className="p-4 rounded-xl border bg-stone-50 space-y-3">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
              Pre-flight Checks
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Mandatory institutional identifier and applicant verified</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Deposit maturity ordering check satisfied (Maturity after Issue Date)</span>
              </div>

              {/* Duplicate check */}
              {duplicateWarning ? (
                <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Uniqueness check passed: No identical FDR number currently registered</span>
                </div>
              )}

              {/* Document attachment check */}
              {uploadedFiles.length === 0 ? (
                <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>No supporting documents attached. Submission will be accepted into Scrutiny Queue, but observation will be flagged.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{uploadedFiles.length} supporting document(s) prepared for ingestion</span>
                </div>
              )}

              {/* Renewal predecessor check */}
              {isReplacement && linkedPredecessorId && (
                <div className="flex items-center gap-2 text-blue-800">
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <span>Linked to predecessor record {linkedPredecessorId} for replacement audit trail</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Details Table */}
          <div className="border rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
              Submission Record Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Institution:</span>
                <span className="font-semibold text-gray-900">{selectedInst?.name}</span>
                <span className="text-gray-400 block font-mono text-[10px]">{selectedInst?.aisheCode}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Bank & Branch:</span>
                <span className="font-semibold text-gray-900">{bankName === 'Other' ? customBank : bankName}</span>
                <span className="text-gray-500 block text-[11px]">{branch}</span>
              </div>
              <div>
                <span className="text-gray-500 block">FDR / Receipt No:</span>
                <span className="font-mono font-semibold text-gray-900">{fdrNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Deposit Principal:</span>
                <span className="font-mono font-semibold text-emerald-800 text-sm">
                  {formatINR(Number(depositAmount) || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Issue Date:</span>
                <span className="font-medium text-gray-900">{formatDate(issueDate)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Maturity Date:</span>
                <span className="font-medium text-gray-900">{formatDate(maturityDate)}</span>
              </div>
              {applicationRef && (
                <div>
                  <span className="text-gray-500 block">Application Ref:</span>
                  <span className="font-mono text-gray-900">{applicationRef}</span>
                </div>
              )}
              {isReplacement && (
                <div>
                  <span className="text-gray-500 block">Predecessor FDR:</span>
                  <span className="font-mono text-blue-700 font-semibold">{linkedPredecessorId}</span>
                </div>
              )}
            </div>

            {remarks && (
              <div className="pt-2 border-t text-xs">
                <span className="text-gray-500 block mb-0.5">Remarks / Pledging Notes:</span>
                <p className="text-gray-700 bg-stone-50 p-2 rounded">{remarks}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-parchment)' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Documents
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white px-5 py-2.5"
            >
              <CheckCircle2 size={16} /> Finalize & Submit Record
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Submission Confirmation & Receipt */}
      {step === 4 && submittedInstrument && (
        <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6 text-center max-w-2xl mx-auto" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full mb-2">
              Submission Recorded in Sakshya Ledger
            </span>
            <h2 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              FDR Registration Acknowledged
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Your security deposit record has been assigned an official reference ID and routed to the Scrutiny Officer queue.
            </p>
          </div>

          {/* Receipt Box */}
          <div className="bg-stone-50 border rounded-xl p-4 text-left font-mono text-xs space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">System Instrument ID:</span>
              <span className="font-bold text-forest-800">{submittedInstrument.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Institution:</span>
              <span className="text-gray-800 font-sans">{submittedInstrument.institutionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">FDR Number:</span>
              <span className="text-gray-800">{submittedInstrument.fdrNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deposit Amount:</span>
              <span className="text-emerald-700 font-bold">{formatINR(submittedInstrument.depositAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Maturity Date:</span>
              <span className="text-gray-800">{formatDate(submittedInstrument.maturityDate)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-[11px]">
              <span className="text-gray-400">Timestamp:</span>
              <span className="text-gray-500">{new Date(submittedInstrument.submittedAt).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href={`/instruments/${submittedInstrument.id}`}
              className="btn-primary w-full sm:w-auto text-xs px-5 py-2.5 flex items-center justify-center gap-2"
            >
              <Eye size={15} /> View Instrument Details
            </Link>
            <Link
              href="/instruments"
              className="btn-secondary w-full sm:w-auto text-xs px-5 py-2.5"
            >
              Return to Register
            </Link>
            <button
              onClick={() => window.print()}
              className="btn-secondary w-full sm:w-auto text-xs px-5 py-2.5"
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
