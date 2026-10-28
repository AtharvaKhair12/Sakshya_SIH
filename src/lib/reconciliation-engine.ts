// ============================================================================
// Sakshya PS 1 — FDR Evidence Reconciliation Engine
// Cross-document, cross-record and lifecycle verification.
// Detects duplicates, contradictory terms, missing predecessor links and renewal gaps.
// ============================================================================

import {
  Instrument, UploadedDocument, DocumentExtractionData, VerificationResult
} from './types';
import { maskSensitiveIdentifier } from './document-intelligence';

export interface ReconciliationFindingItem {
  id: string;
  field: string;
  submittedValue: string;
  comparisonValue: string;
  submittedSource: string;
  comparisonSource: string;
  differenceDetected: boolean;
  whyItMatters: string;
  ruleId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  suggestedAction: string;
  responsibleRole: 'institution' | 'scrutiny_officer' | 'senior_officer';
  status: 'pending' | 'resolved' | 'investigating';
}

export interface ReconciliationResult {
  instrumentId: string;
  evaluatedAt: string;
  totalChecks: number;
  discrepanciesCount: number;
  findings: ReconciliationFindingItem[];
  duplicateDetected: boolean;
  duplicateDetails?: { duplicateWithId: string; duplicateField: string };
  isReconciled: boolean;
}

/**
 * Reconciles an instrument record with extracted document evidence and cross-institutional records.
 */
export function reconcileInstrumentEvidence(
  instrument: Instrument,
  extractionData: DocumentExtractionData | null,
  allInstruments: Instrument[],
  documents: UploadedDocument[] = []
): ReconciliationResult {
  const findings: ReconciliationFindingItem[] = [];
  const fields = extractionData?.fields || {};

  // 1. Cross-Institutional Duplicate Identifier Detection
  const cleanFdrNumber = instrument.fdrNumber.trim().toUpperCase();
  const duplicateInstrument = allInstruments.find(other =>
    other.id !== instrument.id &&
    other.fdrNumber.trim().toUpperCase() === cleanFdrNumber &&
    other.bankName.toLowerCase() === instrument.bankName.toLowerCase()
  );

  if (duplicateInstrument) {
    findings.push({
      id: `rec-dup-${instrument.id}`,
      field: 'FDR Receipt Identifier (Uniqueness Check)',
      submittedValue: maskSensitiveIdentifier(instrument.fdrNumber),
      comparisonValue: `Identical in ${duplicateInstrument.id} (${duplicateInstrument.institutionName})`,
      submittedSource: `Current Application (${instrument.id})`,
      comparisonSource: `Existing Institutional Register (${duplicateInstrument.institutionName})`,
      differenceDetected: true,
      whyItMatters: 'AICTE institutional security deposit policy strictly prohibits sharing or duplicate registration of the same FDR receipt number across institutions.',
      ruleId: 'RULE-APH-05',
      severity: 'critical',
      suggestedAction: 'Escalate immediately to Scrutiny Team. Request verified bank branch certificate confirming distinct deposit account.',
      responsibleRole: 'scrutiny_officer',
      status: 'investigating',
    });
  }

  // 2. Extracted FDR Number vs. Stored Record
  if (fields.fdrNumber?.value) {
    const extractedFdr = String(fields.fdrNumber.value).trim().toUpperCase();
    const storedFdr = instrument.fdrNumber.trim().toUpperCase();
    const match = extractedFdr.includes(storedFdr) || storedFdr.includes(extractedFdr);

    if (!match) {
      findings.push({
        id: `rec-fdr-${instrument.id}`,
        field: 'FDR / Account Reference Number',
        submittedValue: maskSensitiveIdentifier(storedFdr),
        comparisonValue: maskSensitiveIdentifier(extractedFdr),
        submittedSource: 'Instrument Registration Form',
        comparisonSource: `${extractionData?.fileName || 'Uploaded Evidence'} (Extracted: ${fields.fdrNumber.extractionMethod})`,
        differenceDetected: true,
        whyItMatters: 'Identifier mismatch between registered metadata and bank document prevents automated linking.',
        ruleId: 'RULE-APH-05',
        severity: 'critical',
        suggestedAction: 'Scrutiny Officer must review document text and correct the recorded receipt number if typographical.',
        responsibleRole: 'scrutiny_officer',
        status: 'pending',
      });
    }
  }

  // 3. Deposit Principal Amount Comparison
  if (fields.depositAmount?.value) {
    const extractedAmt = Number(fields.depositAmount.value);
    const storedAmt = Number(instrument.depositAmount);
    const difference = Math.abs(extractedAmt - storedAmt);

    if (difference > 100) {
      findings.push({
        id: `rec-amt-${instrument.id}`,
        field: 'Deposit Principal Amount',
        submittedValue: `₹${storedAmt.toLocaleString('en-IN')}`,
        comparisonValue: `₹${extractedAmt.toLocaleString('en-IN')}`,
        submittedSource: 'Instrument Record',
        comparisonSource: `${extractionData?.fileName || 'Uploaded Evidence'}`,
        differenceDetected: true,
        whyItMatters: 'Statutory security deposit amounts must strictly match the Approval Process Handbook prescribed minimums (Chapter I, Table 1.4).',
        ruleId: 'RULE-APH-01',
        severity: 'critical',
        suggestedAction: 'Flag for financial discrepancy review. Verify whether part payment was made or wrong document was attached.',
        responsibleRole: 'scrutiny_officer',
        status: 'pending',
      });
    }
  }

  // 4. Maturity Date Comparison
  if (fields.maturityDate?.value) {
    const extractedMat = String(fields.maturityDate.value).trim();
    const storedMat = String(instrument.maturityDate).trim();

    if (extractedMat !== storedMat) {
      findings.push({
        id: `rec-mat-${instrument.id}`,
        field: 'Maturity Date',
        submittedValue: storedMat,
        comparisonValue: extractedMat,
        submittedSource: 'Instrument Record',
        comparisonSource: `${extractionData?.fileName || 'Uploaded Evidence'}`,
        differenceDetected: true,
        whyItMatters: 'Discrepancy in recorded maturity date impairs automated maturity tracking and renewal alerts.',
        ruleId: 'RULE-APH-06',
        severity: 'warning',
        suggestedAction: 'Confirm maturity date against bank advice and update the operational schedule.',
        responsibleRole: 'scrutiny_officer',
        status: 'pending',
      });
    }
  }

  // 5. Post-Maturity Renewal Audit (The Core Auto-Renewal Logic)
  const now = new Date();
  const matDate = new Date(instrument.maturityDate);
  const isPastMaturity = matDate < now;

  if (isPastMaturity) {
    const hasAutoRenewalClause = fields.maturityInstruction?.value
      ? String(fields.maturityInstruction.value).toLowerCase().includes('auto')
      : false;

    const hasRenewedEvidence = documents.some(d =>
      d.fileName.toLowerCase().includes('renewal') ||
      d.fileName.toLowerCase().includes('renewed') ||
      d.fileName.toLowerCase().includes('replacement')
    );

    if (!hasRenewedEvidence) {
      findings.push({
        id: `rec-renew-${instrument.id}`,
        field: 'Post-Maturity Renewal Confirmation',
        submittedValue: `Maturity passed on ${instrument.maturityDate}`,
        comparisonValue: hasAutoRenewalClause
          ? 'Historical Auto-Renewal Clause noted in old document'
          : 'No renewal instruction recorded',
        submittedSource: 'Maturity Schedule Audit',
        comparisonSource: 'Case Document Dossier',
        differenceDetected: true,
        whyItMatters: 'CRITICAL AUDIT NOTICE: An auto-renewal instruction in a historical Deposit Advice does NOT prove that renewal was executed by the bank. Actual renewal receipt or current bank confirmation is mandatory.',
        ruleId: 'RULE-REL-TENOR-06',
        severity: 'critical',
        suggestedAction: 'Issue formal notice to institution requesting current bank renewal advice or bank branch ledger statement.',
        responsibleRole: 'institution',
        status: 'pending',
      });
    }
  }

  // 6. Replacement Continuity Audit (Internal Workflow Control)
  if (instrument.status === 'replacement_submitted' || instrument.linkedPredecessorId) {
    if (!instrument.linkedPredecessorId) {
      findings.push({
        id: `rec-chain-${instrument.id}`,
        field: 'Replacement Continuity Chain',
        submittedValue: 'Replacement Instrument Submitted',
        comparisonValue: 'Predecessor Instrument Link Missing',
        submittedSource: 'Instrument Status',
        comparisonSource: 'Continuity Graph Database',
        differenceDetected: true,
        whyItMatters: 'Internal workflow continuity control: Replacement instruments must link to predecessor to prevent duplicate claims and maintain deposit timeline continuity.',
        ruleId: 'RULE-WORKFLOW-REPLACE-10',
        severity: 'error',
        suggestedAction: 'Link the originating predecessor FDR record to this replacement instrument.',
        responsibleRole: 'scrutiny_officer',
        status: 'pending',
      });
    }
  }

  const discrepancies = findings.filter(f => f.differenceDetected);

  return {
    instrumentId: instrument.id,
    evaluatedAt: new Date().toISOString(),
    totalChecks: 6,
    discrepanciesCount: discrepancies.length,
    findings,
    duplicateDetected: Boolean(duplicateInstrument),
    duplicateDetails: duplicateInstrument
      ? { duplicateWithId: duplicateInstrument.id, duplicateField: 'fdrNumber' }
      : undefined,
    isReconciled: discrepancies.length === 0,
  };
}
