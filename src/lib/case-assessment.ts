// ============================================================================
// Sakshya PS 1 — Case Assessment & Next-Action Planner
// The central intelligence engine answering the 5 Core Case Questions:
// 1. What has been established from the submitted evidence?
// 2. What remains missing, inconsistent, stale, or unverified?
// 3. Which applicable configured requirement or prior record explains the issue?
// 4. What is the next permitted administrative action, and who is responsible?
// 5. What must happen before the case can move to its next authorized state?
// ============================================================================

import {
  Instrument, UploadedDocument, ReleaseRequest, VerificationResult,
  LifecycleEvent, AuditEvent, CaseAssessment, NextActionTask, RequirementEvaluation
} from './types';
import { evaluateAllRegulatoryRules } from './regulatory-rules';
import {
  processUploadedEvidence, assessDocumentSuitability, assessInstrumentAuthenticity,
  maskSensitiveIdentifier
} from './document-intelligence';
import { reconcileInstrumentEvidence } from './reconciliation-engine';
import { buildFDRContinuityGraph } from './continuity-graph';

export interface CaseAssessmentContext {
  instrument: Instrument;
  documents: UploadedDocument[];
  predecessor?: Instrument | null;
  replacement?: Instrument | null;
  releaseRequest?: ReleaseRequest | null;
  verifications?: VerificationResult[];
  lifecycleEvents?: LifecycleEvent[];
  auditEvents?: AuditEvent[];
  allInstruments?: Instrument[];
  isProgressiveClosure?: boolean;
  hasEmbezzlementInquiry?: boolean;
  currentDate?: Date;
}

/**
 * Computes the complete, explainable 5-question Case Assessment for an FDR instrument.
 */
export function computeCaseAssessment(ctx: CaseAssessmentContext): CaseAssessment {
  const {
    instrument, documents, predecessor, replacement,
    releaseRequest, verifications = [], lifecycleEvents = [],
    auditEvents = [], allInstruments = [], isProgressiveClosure = false,
    hasEmbezzlementInquiry = false, currentDate = new Date()
  } = ctx;

  // 1. Process / Classify primary uploaded evidence
  const primaryDoc = documents[0];
  const extraction = primaryDoc
    ? processUploadedEvidence({
        fileName: primaryDoc.fileName,
        documentId: primaryDoc.id,
        instrumentId: instrument.id,
        fileSize: primaryDoc.fileSize,
      })
    : null;

  // 2. Evaluate All Source-Grounded AICTE Regulations (APH Clause 6.46)
  const requirements = evaluateAllRegulatoryRules({
    instrument,
    documents,
    releaseRequest,
    verifications,
    isProgressiveClosure,
    hasEmbezzlementInquiry,
    currentDate,
  });

  // 3. Reconcile Cross-Record Evidence
  const reconciliation = reconcileInstrumentEvidence(
    instrument,
    extraction,
    allInstruments,
    documents
  );

  // 4. Runtime Maturity Calculation
  const now = currentDate;
  const matDate = new Date(instrument.maturityDate);
  const diffTime = matDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isMatured = daysLeft < 0;

  const hasAutoRenewalClause = extraction?.fields.maturityInstruction?.value
    ? String(extraction.fields.maturityInstruction.value).toLowerCase().includes('auto')
    : false;

  const renewalConfirmed = documents.some(d =>
    d.fileName.toLowerCase().includes('renewal') ||
    d.fileName.toLowerCase().includes('renewed')
  ) || (instrument.status === 'active_monitoring' && instrument.verificationStatus === 'verified_by_source');

  let horizon: 'active_healthy' | 'impending_maturity' | 'critical_maturity_approaching' | 'matured_date_passed' = 'active_healthy';
  if (isMatured) horizon = 'matured_date_passed';
  else if (daysLeft <= 30) horizon = 'critical_maturity_approaching';
  else if (daysLeft <= 90) horizon = 'impending_maturity';

  // 5. Suitability vs. Authenticity Dual Assessments
  const suitability = extraction
    ? extraction.suitabilityAssessment
    : assessDocumentSuitability('other', {});

  const isVerifiedBySource = instrument.verificationStatus === 'verified_by_source';
  const authenticity = assessInstrumentAuthenticity({
    verifiedBySource: isVerifiedBySource,
    officerName: instrument.assignedReviewer,
  });

  // 6. Generate Answers to the 5 Core Questions

  // Q1: What has been established from the submitted evidence?
  const q1: string[] = [];
  q1.push(`Deposit principal of ₹${Number(instrument.depositAmount).toLocaleString('en-IN')} pledged under reference ${maskSensitiveIdentifier(instrument.fdrNumber)}.`);
  q1.push(`Issuing institution registered with AISHE code ${instrument.aisheCode} (${instrument.institutionName}).`);
  q1.push(`Bank institution confirmed as ${instrument.bankName} (${instrument.branch}).`);

  if (extraction?.classification) {
    q1.push(`Document classified as "${extraction.classification.replace(/_/g, ' ')}" (Confidence: ${Math.round(extraction.classificationConfidence * 100)}%).`);
  }
  if (predecessor) {
    q1.push(`Originating predecessor FDR established as ${maskSensitiveIdentifier(predecessor.fdrNumber)}.`);
  }
  if (isVerifiedBySource) {
    q1.push('Financial instrument verified by authorized banking source reference.');
  }

  // Q2: What remains missing, inconsistent, stale, or unverified?
  const q2: string[] = [];
  const missingReqs = requirements.filter(r => r.status === 'missing');
  const inconsistentReqs = requirements.filter(r => r.status === 'inconsistent');
  const awaitingReqs = requirements.filter(r => r.status === 'awaiting_confirmation');
  const staleReqs = requirements.filter(r => r.status === 'stale');

  missingReqs.forEach(r => q2.push(`[Missing Document] ${r.title} (${r.clauseRef})`));
  inconsistentReqs.forEach(r => q2.push(`[Inconsistency Detected] ${r.title}: ${r.explanation}`));
  awaitingReqs.forEach(r => q2.push(`[Awaiting Confirmation] ${r.title}: ${r.explanation}`));
  staleReqs.forEach(r => q2.push(`[Stale / Overdue] ${r.title}: ${r.explanation}`));

  if (!isVerifiedBySource) {
    q2.push('Instrument authenticity is unconfirmed; independent bank verification or branch letter pending.');
  }
  if (isMatured && !renewalConfirmed) {
    q2.push(`Maturity date (${instrument.maturityDate}) has elapsed. Auto-renewal clause in historical document does NOT constitute proof of renewal.`);
  }
  if (reconciliation.duplicateDetected) {
    q2.push(`CRITICAL: Duplicate receipt identifier detected in ${reconciliation.duplicateDetails?.duplicateWithId}.`);
  }

  // Q3: Which applicable configured requirement or prior record explains the issue?
  const q3: string[] = [];
  requirements.forEach(r => {
    if (r.status !== 'satisfied' && r.status !== 'not_applicable') {
      q3.push(`${r.clauseRef}: ${r.title} — ${r.explanation}`);
    }
  });
  if (q3.length === 0) {
    q3.push('All applicable clauses under AICTE APH 2024–2027 Clause 6.46 are satisfied.');
  }

  // Q4: What is the next permitted administrative action, and who is responsible?
  const q4: NextActionTask[] = [];

  // Tasks generated deterministically:
  if (reconciliation.duplicateDetected) {
    q4.push({
      id: `task-dup-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-APH-05',
      title: 'Investigate Duplicate Instrument Receipt Identifier',
      description: `Investigate match with ${reconciliation.duplicateDetails?.duplicateWithId}. Request branch bank confirmation certificate.`,
      evidenceRef: instrument.fdrNumber,
      responsibleRole: 'scrutiny_officer',
      priority: 'critical',
      status: 'pending',
      prerequisiteForNextState: 'Resolve duplicate identification before advancing past scrutiny.',
      createdAt: new Date().toISOString(),
    });
  }

  if (isMatured && !renewalConfirmed) {
    q4.push({
      id: `task-mat-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-REL-TENOR-06',
      title: 'Request Current Bank Renewal Receipt or Statement',
      description: 'Maturity date has passed. Request institution to submit current bank renewal advice or branch ledger statement.',
      evidenceRef: instrument.maturityDate,
      responsibleRole: 'institution',
      priority: 'critical',
      status: 'pending',
      prerequisiteForNextState: 'Active renewal must be recorded before active monitoring or release.',
      createdAt: new Date().toISOString(),
    });
  }

  const missingAffidavit = requirements.find(r => (r.ruleId === 'RULE-REL-AFF-02' || r.legacyRuleId === 'RULE-APH-6.46.2' || r.ruleId === 'RULE-APH-6.46.2') && r.status === 'missing');
  if (missingAffidavit && (instrument.status === 'release_requested' || releaseRequest)) {
    q4.push({
      id: `task-aff-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-REL-AFF-02',
      title: 'Upload Notarized Affidavit 6',
      description: 'Submit Affidavit 6 sworn before First Class Magistrate/Public Notary declaring no student dues and FDR particulars.',
      evidenceRef: 'Clause 6.46(a)(ii) & Appendix 8 (Affidavit 6)',
      responsibleRole: 'institution',
      priority: 'high',
      status: 'pending',
      prerequisiteForNextState: 'Required before Senior Officer can review release request.',
      createdAt: new Date().toISOString(),
    });
  }

  const missingLetter = requirements.find(r => (r.ruleId === 'RULE-REL-REQ-01' || r.legacyRuleId === 'RULE-APH-6.46.1' || r.ruleId === 'RULE-APH-6.46.1') && r.status === 'missing');
  if (missingLetter && (instrument.status === 'release_requested' || releaseRequest)) {
    q4.push({
      id: `task-letter-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-REL-REQ-01',
      title: 'Submit Formal Release Application Letter',
      description: 'Submit formal application on official letterhead signed by Chairman/President of the Trust/Society.',
      evidenceRef: 'Clause 6.46(a)(i)',
      responsibleRole: 'institution',
      priority: 'high',
      status: 'pending',
      prerequisiteForNextState: 'Formal application required to substantiate release request.',
      createdAt: new Date().toISOString(),
    });
  }

  const pendingClearance = requirements.find(r => (r.ruleId === 'RULE-REL-CLR-05' || r.legacyRuleId === 'RULE-APH-6.46.5' || r.ruleId === 'RULE-APH-6.46.5') && r.status === 'awaiting_confirmation');
  if (pendingClearance && (instrument.status === 'release_requested' || releaseRequest)) {
    q4.push({
      id: `task-clear-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-REL-CLR-05',
      title: 'Verify Bureau Clearances (PGRC, Vigilance & Regional Office)',
      description: 'Confirm clearance records from Public Grievances Redressal Cell and Vigilance Bureau verifying zero pending student/faculty claims.',
      evidenceRef: 'Internal Registry',
      responsibleRole: 'scrutiny_officer',
      priority: 'high',
      status: 'pending',
      prerequisiteForNextState: 'Senior Officer sign-off cannot proceed without clearance records.',
      createdAt: new Date().toISOString(),
    });
  }

  if (releaseRequest && releaseRequest.status === 'under_scrutiny') {
    q4.push({
      id: `task-scrutiny-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-REL-CLR-05',
      title: 'Scrutiny Officer Recommendation & Dossier Assembly',
      description: 'Scrutiny Officer must review document suitability, record findings, and escalate dossier to Senior Officer.',
      evidenceRef: 'Case Dossier',
      responsibleRole: 'scrutiny_officer',
      priority: 'medium',
      status: 'pending',
      prerequisiteForNextState: 'Senior Officer review requires Scrutiny Officer observations.',
      createdAt: new Date().toISOString(),
    });
  }

  if (releaseRequest && releaseRequest.status === 'pending_senior_decision') {
    q4.push({
      id: `task-senior-${instrument.id}`,
      instrumentId: instrument.id,
      ruleId: 'RULE-WORKFLOW-DECISION-09',
      title: 'Senior Officer Authorized Release Decision',
      description: 'Review complete checklist and record authorized decision (Approved/Declined) with mandatory documented rationale.',
      evidenceRef: 'Sanction Order Workflow',
      responsibleRole: 'senior_officer',
      priority: 'critical',
      status: 'pending',
      prerequisiteForNextState: 'Mandatory sign-off before status advances to Released.',
      createdAt: new Date().toISOString(),
    });
  }

  if (q4.length === 0) {
    q4.push({
      id: `task-monitor-${instrument.id}`,
      instrumentId: instrument.id,
      title: 'Active Compliance Monitoring',
      description: 'All current requirements satisfied. Continue automated monitoring until next renewal horizon.',
      responsibleRole: 'scrutiny_officer',
      priority: 'low',
      status: 'resolved',
      prerequisiteForNextState: 'Maintain active monitoring.',
      createdAt: new Date().toISOString(),
    });
  }

  // Q5: What must happen before the case can move to its next authorized state?
  const q5: string[] = [];
  if (instrument.status === 'submitted') {
    q5.push('Scrutiny Officer must conduct preliminary validation of uploaded evidence.');
  } else if (instrument.status === 'pending_scrutiny') {
    q5.push('Document suitability must be validated against APH Appendix 8.');
    q5.push('Cross-institutional duplicate check must pass with zero matches.');
  } else if (instrument.status === 'verification_in_progress') {
    q5.push('Bank branch reference or authorized verification response must be confirmed.');
  } else if (instrument.status === 'renewal_pending') {
    q5.push('Institution must submit replacement/renewal instrument with explicit predecessor link.');
  } else if (instrument.status === 'release_requested') {
    q5.push('All Clause 6.46 checklist items must be satisfied.');
    q5.push('PGRC and Vigilance clearance records must be logged.');
    q5.push('Senior Officer must record authorized decision with mandatory justification.');
  } else if (instrument.status === 'verified' || instrument.status === 'active_monitoring') {
    q5.push('Maintain active monitoring until maturity horizon (90-day alert window).');
  } else {
    q5.push('Case is at terminal state or requires officer administrative review.');
  }

  // 7. FDR Continuity Graph
  const continuityGraph = buildFDRContinuityGraph({
    instrument,
    predecessor,
    replacement,
    documents,
    verifications,
    releaseRequest,
    lifecycleEvents,
    auditEvents,
  });

  return {
    instrumentId: instrument.id,
    evaluatedAt: new Date().toISOString(),
    q1_establishedEvidence: q1,
    q2_unresolvedDependencies: q2,
    q3_applicablePolicyClauses: q3,
    q4_nextPermittedActions: q4,
    q5_stateProgressionGates: q5,
    requirements,
    suitability,
    authenticity,
    maturityStatus: {
      daysLeft,
      horizon,
      isMatured,
      hasAutoRenewalClause,
      renewalConfirmed,
      warning: isMatured && !renewalConfirmed
        ? 'Maturity date passed. Notice: Historical auto-renewal clause does not substitute for actual renewal verification.'
        : undefined,
    },
    continuityGraph,
  };
}
