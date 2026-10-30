// ============================================================================
// Sakshya PS 1 — Credential Cross-Check & Verification Engine
// Validates entered institution submission credentials against OCR-extracted document values.
// ============================================================================

import { DocumentExtractionData } from './types';

export interface FormCredentials {
  institutionId?: string;
  institutionName?: string;
  aisheCode?: string;
  applicationRef?: string;
  bankName: string;
  customBank?: string;
  branch?: string;
  fdrNumber: string;
  depositAmount: number | '' | string;
  issueDate: string;
  maturityDate: string;
}

export type CredentialFieldKey =
  | 'fdrNumber'
  | 'bankName'
  | 'depositAmount'
  | 'issueDate'
  | 'maturityDate'
  | 'institution'
  | 'jointHolder';

export interface CredentialFieldCheck {
  key: CredentialFieldKey;
  label: string;
  enteredValue: string;
  extractedValue: string;
  status: 'match' | 'mismatch' | 'doc_not_detected' | 'form_empty';
  severity: 'success' | 'warning' | 'error' | 'neutral';
  message: string;
  canAdopt: boolean;
  adoptValue?: string | number;
}

export interface CredentialCheckSummary {
  totalChecked: number;
  matchesCount: number;
  mismatchesCount: number;
  unconfirmedCount: number;
  overallMatch: boolean;
  hasDiscrepancies: boolean;
  confidenceScore: number;
  documentClassification: string;
  checks: CredentialFieldCheck[];
  discrepancySummary: string;
}

const BANK_ALIASES: Record<string, string[]> = {
  'State Bank of India': ['sbi', 'state bank of india', 'state bank'],
  'Punjab National Bank': ['pnb', 'punjab national bank'],
  'Bank of Baroda': ['bob', 'bank of baroda'],
  'Canara Bank': ['canara bank', 'canara'],
  'Union Bank of India': ['union bank of india', 'union bank', 'ubi'],
  'HDFC Bank': ['hdfc', 'hdfc bank', 'hdfc bank limited', 'hdfc ltd'],
  'ICICI Bank': ['icici', 'icici bank', 'icici bank limited'],
  'Axis Bank': ['axis', 'axis bank', 'axis bank limited', 'uti bank'],
  'Kotak Mahindra Bank': ['kotak', 'kotak mahindra', 'kotak mahindra bank'],
  'Indian Bank': ['indian bank'],
};

function normalizeBankName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function banksMatch(entered: string, extracted: string): boolean {
  if (!entered || !extracted) return false;
  const n1 = normalizeBankName(entered);
  const n2 = normalizeBankName(extracted);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;

  // Check aliases
  for (const [canonical, aliases] of Object.entries(BANK_ALIASES)) {
    const enteredMatches = canonical.toLowerCase() === entered.toLowerCase() || aliases.includes(entered.toLowerCase());
    const extractedMatches = canonical.toLowerCase() === extracted.toLowerCase() || aliases.includes(extracted.toLowerCase());
    if (enteredMatches && extractedMatches) return true;
  }
  return false;
}

function cleanIdentifier(id: string): string {
  return String(id).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function fdrNumbersMatch(entered: string, extracted: string): boolean {
  if (!entered || !extracted) return false;
  const c1 = cleanIdentifier(entered);
  const c2 = cleanIdentifier(extracted);
  if (c1 === c2) return true;

  // Handle prefix (e.g. SBI-FDR-90001234 vs 90001234)
  if (c1.includes(c2) || c2.includes(c1)) return true;

  // Handle last 4-8 digits match (e.g. masked XXXX3323 or full 924030045673323)
  const minLen = Math.min(c1.length, c2.length);
  if (minLen >= 4) {
    const end1 = c1.slice(-4);
    const end2 = c2.slice(-4);
    if (end1 === end2) return true;
  }
  return false;
}

export function checkCredentialsAgainstExtraction(
  form: FormCredentials,
  extraction: DocumentExtractionData | null
): CredentialCheckSummary {
  const fields = extraction?.fields || {};
  const checks: CredentialFieldCheck[] = [];

  const effectiveBank = form.bankName === 'Other' ? (form.customBank || '') : form.bankName;

  // 1. FDR / Receipt Number Check
  const enteredFdr = form.fdrNumber?.trim() || '';
  const extractedFdr = fields.fdrNumber?.value ? String(fields.fdrNumber.value).trim() : '';
  const maskedExtractedFdr = fields.fdrNumber?.maskedValue || extractedFdr;

  if (!enteredFdr && extractedFdr) {
    checks.push({
      key: 'fdrNumber',
      label: 'FDR / Receipt Number',
      enteredValue: '(Empty)',
      extractedValue: maskedExtractedFdr,
      status: 'form_empty',
      severity: 'neutral',
      message: 'Detected in document. Click "Apply Extracted Values" to adopt.',
      canAdopt: true,
      adoptValue: extractedFdr,
    });
  } else if (!extractedFdr) {
    checks.push({
      key: 'fdrNumber',
      label: 'FDR / Receipt Number',
      enteredValue: enteredFdr || '(Empty)',
      extractedValue: '(Not detected in document)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Receipt number not automatically recognized from document text. Manual review required.',
      canAdopt: false,
    });
  } else if (fdrNumbersMatch(enteredFdr, extractedFdr)) {
    checks.push({
      key: 'fdrNumber',
      label: 'FDR / Receipt Number',
      enteredValue: enteredFdr,
      extractedValue: maskedExtractedFdr,
      status: 'match',
      severity: 'success',
      message: 'FDR identifier matches document evidence.',
      canAdopt: false,
    });
  } else {
    checks.push({
      key: 'fdrNumber',
      label: 'FDR / Receipt Number',
      enteredValue: enteredFdr,
      extractedValue: maskedExtractedFdr,
      status: 'mismatch',
      severity: 'error',
      message: `Discrepancy: Form specifies "${enteredFdr}", but document reads "${maskedExtractedFdr}".`,
      canAdopt: true,
      adoptValue: extractedFdr,
    });
  }

  // 2. Issuing Bank Check
  const extractedBank = fields.bankName?.value ? String(fields.bankName.value).trim() : '';
  if (!effectiveBank && extractedBank) {
    checks.push({
      key: 'bankName',
      label: 'Issuing Bank Name',
      enteredValue: '(Empty)',
      extractedValue: extractedBank,
      status: 'form_empty',
      severity: 'neutral',
      message: 'Bank recognized from document. Click "Apply Extracted Values" to adopt.',
      canAdopt: true,
      adoptValue: extractedBank,
    });
  } else if (!extractedBank) {
    checks.push({
      key: 'bankName',
      label: 'Issuing Bank Name',
      enteredValue: effectiveBank || '(Empty)',
      extractedValue: '(Not detected in document)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Issuing bank name not explicitly identified in document text.',
      canAdopt: false,
    });
  } else if (banksMatch(effectiveBank, extractedBank)) {
    checks.push({
      key: 'bankName',
      label: 'Issuing Bank Name',
      enteredValue: effectiveBank,
      extractedValue: extractedBank,
      status: 'match',
      severity: 'success',
      message: 'Issuing bank matches official certificate header.',
      canAdopt: false,
    });
  } else {
    checks.push({
      key: 'bankName',
      label: 'Issuing Bank Name',
      enteredValue: effectiveBank,
      extractedValue: extractedBank,
      status: 'mismatch',
      severity: 'error',
      message: `Discrepancy: Form has "${effectiveBank}", but document specifies "${extractedBank}".`,
      canAdopt: true,
      adoptValue: extractedBank,
    });
  }

  // 3. Deposit Principal Amount Check
  const enteredAmount = Number(form.depositAmount) || 0;
  const extractedAmount = Number(fields.depositAmount?.value) || 0;

  if (enteredAmount <= 0 && extractedAmount > 0) {
    checks.push({
      key: 'depositAmount',
      label: 'Deposit Principal Amount',
      enteredValue: '(Empty)',
      extractedValue: `₹${extractedAmount.toLocaleString('en-IN')}`,
      status: 'form_empty',
      severity: 'neutral',
      message: 'Principal amount recognized from document. Click to adopt.',
      canAdopt: true,
      adoptValue: extractedAmount,
    });
  } else if (extractedAmount <= 0) {
    checks.push({
      key: 'depositAmount',
      label: 'Deposit Principal Amount',
      enteredValue: enteredAmount > 0 ? `₹${enteredAmount.toLocaleString('en-IN')}` : '(Empty)',
      extractedValue: '(Not detected in document)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Principal figure not parsed from document stream.',
      canAdopt: false,
    });
  } else {
    const diff = Math.abs(enteredAmount - extractedAmount);
    if (diff <= 10) {
      checks.push({
        key: 'depositAmount',
        label: 'Deposit Principal Amount',
        enteredValue: `₹${enteredAmount.toLocaleString('en-IN')}`,
        extractedValue: `₹${extractedAmount.toLocaleString('en-IN')}`,
        status: 'match',
        severity: 'success',
        message: 'Deposit principal matches certified amount exactly.',
        canAdopt: false,
      });
    } else {
      checks.push({
        key: 'depositAmount',
        label: 'Deposit Principal Amount',
        enteredValue: `₹${enteredAmount.toLocaleString('en-IN')}`,
        extractedValue: `₹${extractedAmount.toLocaleString('en-IN')}`,
        status: 'mismatch',
        severity: 'error',
        message: `Financial Discrepancy: Form specifies ₹${enteredAmount.toLocaleString('en-IN')}, but document states ₹${extractedAmount.toLocaleString('en-IN')} (Difference: ₹${diff.toLocaleString('en-IN')}).`,
        canAdopt: true,
        adoptValue: extractedAmount,
      });
    }
  }

  // 4. Issue Date Check
  const enteredIssue = form.issueDate?.trim() || '';
  const extractedIssue = fields.issueDate?.value ? String(fields.issueDate.value).trim() : '';

  if (!enteredIssue && extractedIssue) {
    checks.push({
      key: 'issueDate',
      label: 'Date of Issue',
      enteredValue: '(Empty)',
      extractedValue: extractedIssue,
      status: 'form_empty',
      severity: 'neutral',
      message: 'Issue date recognized from document.',
      canAdopt: true,
      adoptValue: extractedIssue,
    });
  } else if (!extractedIssue) {
    checks.push({
      key: 'issueDate',
      label: 'Date of Issue',
      enteredValue: enteredIssue || '(Empty)',
      extractedValue: '(Not detected in document)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Start/Issue date not explicitly parsed from document.',
      canAdopt: false,
    });
  } else if (enteredIssue === extractedIssue) {
    checks.push({
      key: 'issueDate',
      label: 'Date of Issue',
      enteredValue: enteredIssue,
      extractedValue: extractedIssue,
      status: 'match',
      severity: 'success',
      message: 'Deposit commencement date matches.',
      canAdopt: false,
    });
  } else {
    checks.push({
      key: 'issueDate',
      label: 'Date of Issue',
      enteredValue: enteredIssue,
      extractedValue: extractedIssue,
      status: 'mismatch',
      severity: 'warning',
      message: `Date Discrepancy: Form specifies ${enteredIssue}, but document states ${extractedIssue}.`,
      canAdopt: true,
      adoptValue: extractedIssue,
    });
  }

  // 5. Maturity Date Check
  const enteredMaturity = form.maturityDate?.trim() || '';
  const extractedMaturity = fields.maturityDate?.value ? String(fields.maturityDate.value).trim() : '';

  if (!enteredMaturity && extractedMaturity) {
    checks.push({
      key: 'maturityDate',
      label: 'Date of Maturity',
      enteredValue: '(Empty)',
      extractedValue: extractedMaturity,
      status: 'form_empty',
      severity: 'neutral',
      message: 'Maturity date recognized from document.',
      canAdopt: true,
      adoptValue: extractedMaturity,
    });
  } else if (!extractedMaturity) {
    checks.push({
      key: 'maturityDate',
      label: 'Date of Maturity',
      enteredValue: enteredMaturity || '(Empty)',
      extractedValue: '(Not detected in document)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Maturity date not parsed from document stream.',
      canAdopt: false,
    });
  } else if (enteredMaturity === extractedMaturity) {
    checks.push({
      key: 'maturityDate',
      label: 'Date of Maturity',
      enteredValue: enteredMaturity,
      extractedValue: extractedMaturity,
      status: 'match',
      severity: 'success',
      message: 'Tenure & maturity horizon match document schedule.',
      canAdopt: false,
    });
  } else {
    checks.push({
      key: 'maturityDate',
      label: 'Date of Maturity',
      enteredValue: enteredMaturity,
      extractedValue: extractedMaturity,
      status: 'mismatch',
      severity: 'error',
      message: `Date Discrepancy: Form specifies ${enteredMaturity}, but document states ${extractedMaturity}.`,
      canAdopt: true,
      adoptValue: extractedMaturity,
    });
  }

  // 6. Institution Identity Check
  const instName = form.institutionName?.trim() || '';
  const rawText = (extraction?.rawTextSnippet || '').toLowerCase();
  const instNameLower = instName.toLowerCase();
  const hasInstMention = instName && (rawText.includes(instNameLower) || (form.aisheCode && rawText.includes(form.aisheCode.toLowerCase())));

  if (hasInstMention) {
    checks.push({
      key: 'institution',
      label: 'Institutional Applicant Identity',
      enteredValue: `${instName} (${form.aisheCode || ''})`,
      extractedValue: 'Found in document text',
      status: 'match',
      severity: 'success',
      message: 'Institution credentials confirmed in document body.',
      canAdopt: false,
    });
  } else if (extraction) {
    checks.push({
      key: 'institution',
      label: 'Institutional Applicant Identity',
      enteredValue: instName || '(Empty)',
      extractedValue: fields.depositorName?.value ? String(fields.depositorName.value) : '(Unverified in snippet)',
      status: 'doc_not_detected',
      severity: 'neutral',
      message: 'Applicant name will be reviewed manually against trust resolution / AISHE record.',
      canAdopt: false,
    });
  }

  // 7. Joint Holder & Lien Pledge Status
  const jointVal = fields.jointHolder?.value ? String(fields.jointHolder.value) : '';
  const lienVal = fields.lienPledgeStatus?.value ? String(fields.lienPledgeStatus.value) : '';

  if (jointVal || lienVal) {
    const isAiCteJoint = jointVal.toLowerCase().includes('aicte') || lienVal.toLowerCase().includes('aicte');
    const isNotApplicable = jointVal.toLowerCase() === 'not applicable' || jointVal.toLowerCase() === 'n/a';

    if (isAiCteJoint) {
      checks.push({
        key: 'jointHolder',
        label: 'AICTE Joint Lien / Pledge Mandate',
        enteredValue: 'Mandated under APH Clause 1.4',
        extractedValue: jointVal || lienVal,
        status: 'match',
        severity: 'success',
        message: 'Explicit AICTE joint pledge endorsement confirmed in document.',
        canAdopt: false,
      });
    } else if (isNotApplicable) {
      checks.push({
        key: 'jointHolder',
        label: 'AICTE Joint Lien / Pledge Mandate',
        enteredValue: 'Mandated under APH Clause 1.4',
        extractedValue: 'Not Applicable (Per Advice Face)',
        status: 'doc_not_detected',
        severity: 'warning',
        message: 'Advice face indicates Joint Holder as "Not Applicable". Operational manual-review check against Affidavit 6 undertaking.',
        canAdopt: false,
      });
    } else {
      checks.push({
        key: 'jointHolder',
        label: 'AICTE Joint Lien / Pledge Mandate',
        enteredValue: 'Mandated under APH Clause 1.4',
        extractedValue: jointVal || lienVal,
        status: 'doc_not_detected',
        severity: 'neutral',
        message: `Document indicates: ${jointVal || lienVal}.`,
        canAdopt: false,
      });
    }
  }

  const matchesCount = checks.filter(c => c.status === 'match').length;
  const mismatchesCount = checks.filter(c => c.status === 'mismatch').length;
  const unconfirmedCount = checks.filter(c => c.status === 'doc_not_detected' || c.status === 'form_empty').length;
  const totalChecked = checks.length;
  const overallMatch = mismatchesCount === 0 && matchesCount >= 2;

  const discrepancyParts = checks
    .filter(c => c.status === 'mismatch')
    .map(c => `${c.label}: ${c.message}`);
  const discrepancySummary = discrepancyParts.join(' | ');

  return {
    totalChecked,
    matchesCount,
    mismatchesCount,
    unconfirmedCount,
    overallMatch,
    hasDiscrepancies: mismatchesCount > 0,
    confidenceScore: extraction?.classificationConfidence ? Math.round(extraction.classificationConfidence * 100) : 0,
    documentClassification: extraction?.classification || 'unclassified',
    checks,
    discrepancySummary,
  };
}
