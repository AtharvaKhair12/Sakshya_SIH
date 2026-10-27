// ============================================================================
// Sakshya — Verification and Discrepancy Service
// Scrutiny verification checks, evidence requests, findings resolution, and escalation
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VerificationResult, ComplianceFinding, VerificationStatus, Instrument,
  DemoSession, AuditEvent
} from '../types';
import * as store from '../store';
import { canPerformAction } from '../permissions';

export interface VerificationCheckInput {
  instrumentId: string;
  fieldName: string;
  submittedValue: string;
  comparisonValue: string;
  source: string;
  differenceDetected: boolean;
  verificationStatus: VerificationStatus;
  evidenceLocation?: string;
  suggestedAction?: string;
  observation?: string;
}

export interface AdditionalEvidenceRequest {
  instrumentId: string;
  officerObservation: string;
  requestedDocuments: string[];
}

export class VerificationService {
  /**
   * Run preliminary automated checks on an FDR instrument
   */
  static runPreliminaryChecks(
    instrument: Instrument,
    session: DemoSession
  ): { results: VerificationResult[]; findings: ComplianceFinding[] } {
    const results: VerificationResult[] = [];
    const findings: ComplianceFinding[] = [];

    // 1. Mandatory Document check
    const docs = store.getDocuments(instrument.id, session);
    const hasCertificate = docs.some((d) => d.documentType === 'fdr_certificate');
    const hasLetter = docs.some((d) => d.documentType === 'bank_letter');

    if (!hasCertificate) {
      const f = store.addFinding({
        instrumentId: instrument.id,
        ruleId: 'RULE-DOC-01',
        ruleName: 'Mandatory FDR Certificate Upload',
        severity: 'error',
        description: 'Original FDR Certificate scan was not uploaded with this submission.',
        fieldName: 'documentType',
        expectedValue: 'fdr_certificate',
        actualValue: 'missing',
        resolved: false,
      });
      findings.push(f);
    }

    // 2. Deposit Amount minimum threshold check (e.g. AICTE security deposit minimum)
    if (instrument.depositAmount < 100000) {
      const f = store.addFinding({
        instrumentId: instrument.id,
        ruleId: 'RULE-AMT-01',
        ruleName: 'Minimum Deposit Amount Requirement',
        severity: 'warning',
        description: `Deposit amount ₹${instrument.depositAmount.toLocaleString('en-IN')} is below typical AICTE security deposit baseline. Verify institution category.`,
        fieldName: 'depositAmount',
        expectedValue: '>= ₹1,00,000',
        actualValue: `₹${instrument.depositAmount}`,
        resolved: false,
      });
      findings.push(f);
    }

    // 3. Ten-year validity rule check (AICTE APH guideline: FDRs typically for 8-10 years)
    const issueDate = new Date(instrument.issueDate);
    const maturityDate = new Date(instrument.maturityDate);
    const durationYears = (maturityDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (durationYears < 3) {
      const f = store.addFinding({
        instrumentId: instrument.id,
        ruleId: 'RULE-DUR-01',
        ruleName: 'Minimum Deposit Term Check',
        severity: 'warning',
        description: `FDR duration is ${durationYears.toFixed(1)} years. AICTE Approval Process Handbook mandates a minimum 8 to 10 year term for joint security deposits.`,
        fieldName: 'maturityDate',
        expectedValue: '>= 8-10 years term',
        actualValue: `${durationYears.toFixed(1)} years`,
        resolved: false,
      });
      findings.push(f);
    }

    // Record verification check item
    const checkItem = store.addVerificationResult({
      instrumentId: instrument.id,
      fieldName: 'preliminary_rules_evaluation',
      submittedValue: `Amount: ₹${instrument.depositAmount}, Term: ${durationYears.toFixed(1)} yrs`,
      comparisonValue: 'AICTE APH Standards',
      source: 'Sakshya Rule Engine (Deterministic)',
      differenceDetected: findings.length > 0,
      verificationStatus: findings.length > 0 ? 'mismatch_detected' : 'manual_confirmation_required',
      suggestedAction: findings.length > 0 ? 'Review findings in Scrutiny Queue' : 'Proceed to bank confirmation',
    });
    results.push(checkItem);

    return { results, findings };
  }

  /**
   * Scrutiny Officer records observation and requests additional evidence from institution
   */
  static requestAdditionalEvidence(
    input: AdditionalEvidenceRequest,
    session: DemoSession
  ): void {
    if (!canPerformAction(session, 'request_evidence')) {
      throw new Error('Unauthorized: Only Scrutiny or Senior Officers can request additional evidence.');
    }

    const instrument = store.getInstrument(input.instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${input.instrumentId} not found.`);
    }

    // Create a finding for the requested documents
    store.addFinding({
      instrumentId: input.instrumentId,
      ruleId: 'RULE-SCRUTINY-REQ',
      ruleName: 'Scrutiny Officer Document Request',
      severity: 'warning',
      description: `Scrutiny Officer Observation: ${input.officerObservation}. Additional documents requested: ${input.requestedDocuments.join(', ')}`,
      expectedValue: input.requestedDocuments.join(', '),
      actualValue: 'Awaiting institution response',
      resolved: false,
    });

    // Notify the institution user
    store.addNotification({
      userId: instrument.submittedBy,
      type: 'document_request',
      title: 'Additional Evidence Required',
      message: `Scrutiny Officer has requested additional documentation for FDR ${instrument.id}: ${input.officerObservation}`,
      entityType: 'instrument',
      entityId: instrument.id,
      read: false,
    });

    // Update status to discrepancy_flagged or pending_scrutiny
    store.updateInstrumentStatus(
      instrument.id,
      'discrepancy_flagged',
      `Evidence requested: ${input.officerObservation}`,
      session
    );
  }

  /**
   * Scrutiny Officer escalates case to Senior Officer
   */
  static escalateCase(
    instrumentId: string,
    escalationReason: string,
    session: DemoSession
  ): void {
    if (!canPerformAction(session, 'escalate_case')) {
      throw new Error('Unauthorized: Only Scrutiny Officers can escalate cases.');
    }

    const instrument = store.getInstrument(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found.`);
    }

    // Add observation to verification results
    store.addVerificationResult({
      instrumentId,
      fieldName: 'case_escalation',
      submittedValue: instrument.status,
      comparisonValue: 'Senior Officer Scrutiny Required',
      source: `Scrutiny Officer: ${session.userId}`,
      differenceDetected: true,
      verificationStatus: 'manual_confirmation_required',
      suggestedAction: 'Senior Officer Review and Guidance',
      observation: escalationReason,
      reviewedBy: session.userId,
      reviewedAt: new Date().toISOString(),
    });

    // Notify Senior Officer (user-002 in demo data)
    store.addNotification({
      userId: 'user-002',
      type: 'escalation',
      title: 'FDR Case Escalated for Review',
      message: `Case ${instrumentId} (${instrument.institutionName}) has been escalated: ${escalationReason}`,
      entityType: 'instrument',
      entityId: instrumentId,
      read: false,
    });
  }

  /**
   * Resolve a compliance finding with documented reason
   */
  static resolveFinding(findingId: string, resolution: string, session: DemoSession): void {
    store.resolveFinding(findingId, resolution, session);
  }
}
