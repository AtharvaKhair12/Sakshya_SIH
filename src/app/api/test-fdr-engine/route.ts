// ============================================================================
// SAKSHYA PS 1 — FDR EVIDENCE-TO-ACTION ENGINE AUTOMATED TEST SUITE
// Rigorous verification of:
// 1. 11 Source-Grounded Regulatory Rule Fixtures (AICTE APH 2024–2027 Clause 6.46(a)(i)–(iv), Clause 6.46(b), Clause 1.12(iv))
// 2. Real Document Intelligence (Classification, Field Extraction, Provenance, Masking)
// 3. Assessment A (Document Suitability) vs Assessment B (Instrument Authenticity)
// 4. Runtime Maturity & Renewal Intelligence (Auto-renewal non-proof invariant)
// 5. FDR Evidence Cross-Reconciliation (Duplicates, Mismatches, Predecessor links)
// 6. FDR Continuity Graph Traversal
// 7. Case Assessment & Deterministic Next-Action Task Planner (5 Core Questions)
// 8. Security & ASVS 5.0 Baseline Controls (RBAC, Scoping, Auditor Read-Only, Masking)
// ============================================================================

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';

import {
  Instrument,
  UploadedDocument,
  VerificationResult,
  ReleaseRequest,
  AuditEvent,
  LifecycleEvent,
  RequirementEvaluation,
  NextActionTask,
  ContinuityGraphNode,
  ContinuityGraphEdge,
  DocumentClassificationType,
} from '@/lib/types';
import {
  AICTE_REGULATORY_RULES,
  evaluateAllRegulatoryRules,
} from '@/lib/regulatory-rules';
import {
  classifyDocument,
  extractFieldsFromText,
  maskSensitiveIdentifier,
  assessDocumentSuitability,
  assessInstrumentAuthenticity,
  processUploadedEvidence,
} from '@/lib/document-intelligence';
import {
  reconcileInstrumentEvidence,
  ReconciliationFindingItem,
} from '@/lib/reconciliation-engine';
import { buildFDRContinuityGraph } from '@/lib/continuity-graph';
import { computeCaseAssessment } from '@/lib/case-assessment';
import { canPerformAction, canAccessInstrument } from '@/lib/permissions';
import { verifyDiagnosticAuth } from '@/lib/diagnostic-auth';

export async function GET(req: Request) {
  // Strict Server-Side Endpoint Protection:
  // Requires server-side INTERNAL_TEST_KEY. Rejects caller-controlled role headers and hardcoded fallbacks.
  const auth = verifyDiagnosticAuth(req.headers);
  if (!auth.authorized && auth.response) {
    return auth.response;
  }
  const testResults: {
    category: string;
    id: string;
    title: string;
    passed: boolean;
    details?: string;
    error?: string;
  }[] = [];

  function recordTest(
    category: string,
    id: string,
    title: string,
    assertion: () => void
  ) {
    try {
      assertion();
      testResults.push({ category, id, title, passed: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      testResults.push({ category, id, title, passed: false, error: msg });
    }
  }

  // --------------------------------------------------------------------------
  // FIXTURE DATA SETUP
  // --------------------------------------------------------------------------
  const baseInstrument: Instrument = {
    id: 'FDR-2024-9001',
    institutionId: 'inst-001',
    institutionName: 'Apex Institute of Technology',
    aisheCode: 'C-99001',
    applicationRef: 'AICTE-WR-2024-001',
    bankName: 'State Bank of India',
    branch: 'Corporate Branch Mumbai',
    fdrNumber: 'SBI-FDR-9001',
    depositAmount: 3500000,
    issueDate: '2016-04-15',
    maturityDate: '2026-04-15', // 10 years tenor
    status: 'submitted',
    verificationStatus: 'manual_confirmation_required',
    submittedBy: 'inst-officer-01',
    submittedAt: '2026-05-01T09:00:00Z',
    updatedAt: new Date().toISOString(),
    documents: ['doc-req-001', 'doc-aff-001', 'doc-fdr-001', 'doc-eoa-001'],
  };

  const validRequestDoc: UploadedDocument = {
    id: 'doc-req-001',
    instrumentId: baseInstrument.id,
    fileName: 'AICTE_Release_Request_Letter.pdf',
    fileSize: 102400,
    fileType: 'application/pdf',
    documentType: 'application_form',
    uploadedAt: '2026-05-01T10:00:00Z',
    uploadedBy: 'inst-officer-01',
  };

  const validAffidavitDoc: UploadedDocument = {
    id: 'doc-aff-001',
    instrumentId: baseInstrument.id,
    fileName: 'Affidavit_6_Notarized.pdf',
    fileSize: 204800,
    fileType: 'application/pdf',
    documentType: 'affidavit',
    uploadedAt: '2026-05-01T10:05:00Z',
    uploadedBy: 'inst-officer-01',
  };

  const validFdrDoc: UploadedDocument = {
    id: 'doc-fdr-001',
    instrumentId: baseInstrument.id,
    fileName: 'SBI_Fixed_Deposit_Receipt.pdf',
    fileSize: 184320,
    fileType: 'application/pdf',
    documentType: 'fdr_certificate',
    uploadedAt: '2026-05-01T10:10:00Z',
    uploadedBy: 'inst-officer-01',
  };

  const validEoaDoc: UploadedDocument = {
    id: 'doc-eoa-001',
    instrumentId: baseInstrument.id,
    fileName: 'AICTE_Extension_of_Approval_2025_26.pdf',
    fileSize: 512000,
    fileType: 'application/pdf',
    documentType: 'bank_letter',
    uploadedAt: '2026-05-01T10:15:00Z',
    uploadedBy: 'inst-officer-01',
  };

  const validClearancesDoc: UploadedDocument = {
    id: 'doc-clr-001',
    instrumentId: baseInstrument.id,
    fileName: 'PGRC_Vigilance_Bureau_Clearance_NOC.pdf',
    fileSize: 220000,
    fileType: 'application/pdf',
    documentType: 'bank_letter',
    uploadedAt: '2026-05-02T11:00:00Z',
    uploadedBy: 'scrutiny-officer-01',
  };

  const validClearances: VerificationResult[] = [
    {
      id: 'ver-pgrc-001',
      instrumentId: baseInstrument.id,
      fieldName: 'fdrNumber',
      submittedValue: 'SBI-FDR-9001',
      comparisonValue: 'SBI-FDR-9001',
      source: 'PGRC Clearance Portal',
      differenceDetected: false,
      verificationStatus: 'verified_by_source',
      createdAt: '2026-05-10T14:00:00Z',
    },
    {
      id: 'ver-vig-001',
      instrumentId: baseInstrument.id,
      fieldName: 'depositAmount',
      submittedValue: '3500000',
      comparisonValue: '3500000',
      source: 'AICTE Vigilance Clearance',
      differenceDetected: false,
      verificationStatus: 'verified_by_source',
      createdAt: '2026-05-10T14:05:00Z',
    },
  ];

  const validReleaseReq: ReleaseRequest = {
    id: 'rel-9001',
    instrumentId: baseInstrument.id,
    institutionId: baseInstrument.institutionId,
    requestDate: '2026-05-01',
    status: 'under_scrutiny',
    reason: 'Completion of statutory 10-year lock-in period with zero pending student or faculty dues.',
    supportingDocuments: [validRequestDoc.id, validAffidavitDoc.id, validFdrDoc.id, validEoaDoc.id],
    createdBy: 'user-001',
    createdAt: '2026-05-01T09:30:00Z',
    updatedAt: '2026-05-01T09:30:00Z',
  };

  // --------------------------------------------------------------------------
  // PART 1: 11 DETERMINISTIC REGULATORY RULE FIXTURES (AICTE APH 2024–2027)
  // --------------------------------------------------------------------------

  // Fixture 1: Complete Release Package
  recordTest('Regulatory Rules', 'FIXTURE-01', 'Complete Release Package satisfies all Clause 6.46 requirements', () => {
    const docs = [validRequestDoc, validAffidavitDoc, validFdrDoc, validEoaDoc, validClearancesDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docs,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req1 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-REQ-01' || r.legacyRuleId === 'RULE-APH-6.46.1');
    const req2 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-AFF-02' || r.legacyRuleId === 'RULE-APH-6.46.2');
    const req3 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-FDR-03' || r.legacyRuleId === 'RULE-APH-6.46.3');
    const req4 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-EOA-04' || r.legacyRuleId === 'RULE-APH-6.46.4');
    const req5 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-CLR-05' || r.legacyRuleId === 'RULE-APH-6.46.5');

    if (req1?.status !== 'satisfied') throw new Error(`Rule 6.46(a)(i) not satisfied: got ${req1?.status}`);
    if (req2?.status !== 'satisfied') throw new Error(`Rule 6.46(a)(ii) not satisfied: got ${req2?.status}`);
    if (req3?.status !== 'satisfied') throw new Error(`Rule 6.46(a)(iii) not satisfied: got ${req3?.status}`);
    if (req4?.status !== 'satisfied') throw new Error(`Rule 6.46(a)(iv) not satisfied: got ${req4?.status}`);
    if (req5?.status !== 'satisfied') throw new Error(`Rule 6.46(b) not satisfied: got ${req5?.status}`);

    if (req1.clauseRef !== 'Clause 6.46(a)(i)') throw new Error(`Expected Clause 6.46(a)(i), got ${req1.clauseRef}`);
    if (!req2.clauseRef.includes('6.46(a)(ii)')) throw new Error(`Expected Clause 6.46(a)(ii), got ${req2.clauseRef}`);
    if (req3.clauseRef !== 'Clause 6.46(a)(iii)') throw new Error(`Expected Clause 6.46(a)(iii), got ${req3.clauseRef}`);
    if (req4.clauseRef !== 'Clause 6.46(a)(iv)') throw new Error(`Expected Clause 6.46(a)(iv), got ${req4.clauseRef}`);
    if (req5.clauseRef !== 'Clause 6.46(b)') throw new Error(`Expected Clause 6.46(b), got ${req5.clauseRef}`);
  });

  // Fixture 2: Missing Request Letter
  recordTest('Regulatory Rules', 'FIXTURE-02', 'Missing Request Letter triggers RULE-REL-REQ-01 missing blocker', () => {
    const docsWithoutReq = [validAffidavitDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutReq,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req1 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-REQ-01' || r.legacyRuleId === 'RULE-APH-6.46.1');
    if (req1?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46(a)(i), got ${req1?.status}`);

    const hasBlocker = assessment.q2_unresolvedDependencies.some(d => d.includes('Formal Institution Release Application Letter'));
    if (!hasBlocker) throw new Error('Expected unresolved dependency for RULE-REL-REQ-01 in Q2');

    const task = assessment.q4_nextPermittedActions.find(t => t.ruleId === 'RULE-REL-REQ-01' || t.ruleId === 'RULE-APH-6.46.1');
    if (!task) throw new Error('Expected next action task generated for missing request letter');
    if (task.responsibleRole !== 'institution') throw new Error(`Expected responsible role institution, got ${task.responsibleRole}`);
  });

  // Fixture 3: Missing Affidavit 6
  recordTest('Regulatory Rules', 'FIXTURE-03', 'Missing Affidavit 6 triggers RULE-REL-AFF-02 with statutory citation', () => {
    const docsWithoutAff = [validRequestDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutAff,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req2 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-AFF-02' || r.legacyRuleId === 'RULE-APH-6.46.2');
    if (req2?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46(a)(ii), got ${req2?.status}`);
    if (!req2.clauseRef.includes('6.46')) throw new Error(`Expected Clause 6.46 reference, got ${req2.clauseRef}`);

    const task = assessment.q4_nextPermittedActions.find(t => t.ruleId === 'RULE-REL-AFF-02' || t.ruleId === 'RULE-APH-6.46.2');
    if (!task) throw new Error('Expected task for missing Affidavit 6');
    if (task.responsibleRole !== 'institution') throw new Error(`Expected institution role, got ${task.responsibleRole}`);
  });

  // Fixture 4: Missing FDR / Payment Evidence
  recordTest('Regulatory Rules', 'FIXTURE-04', 'Missing FDR/Payment Evidence triggers RULE-REL-FDR-03 blocker', () => {
    const docsWithoutFdr = [validRequestDoc, validAffidavitDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutFdr,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req3 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-FDR-03' || r.legacyRuleId === 'RULE-APH-6.46.3');
    if (req3?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46(a)(iii), got ${req3?.status}`);
  });

  // Fixture 5: Missing Latest LoA/EoA
  recordTest('Regulatory Rules', 'FIXTURE-05', 'Missing Latest LoA/EoA triggers RULE-REL-EOA-04 requirement check', () => {
    const docsWithoutEoa = [validRequestDoc, validAffidavitDoc, validFdrDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutEoa,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req4 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-EOA-04' || r.legacyRuleId === 'RULE-APH-6.46.4');
    if (req4?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46(a)(iv), got ${req4?.status}`);
  });

  // Fixture 6: Required Clearance Not Recorded
  recordTest('Regulatory Rules', 'FIXTURE-06', 'Unrecorded clearance shows awaiting_confirmation with non-accusatory reason', () => {
    const docs = [validRequestDoc, validAffidavitDoc, validFdrDoc, validEoaDoc];
    // No clearance docs and no verification records
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docs,
      verifications: [],
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req5 = assessment.requirements.find(r => r.ruleId === 'RULE-REL-CLR-05' || r.legacyRuleId === 'RULE-APH-6.46.5');
    if (req5?.status !== 'awaiting_confirmation') {
      throw new Error(`Expected awaiting_confirmation, got ${req5?.status}`);
    }
    // Check specific reason text ensures no presumption of guilt
    if (!req5.explanation.includes('Missing record means clearance is unrecorded, not that it was rejected')) {
      throw new Error(`Reason does not preserve presumption of administrative innocence: ${req5.explanation}`);
    }
  });

  // Fixture 7: Replacement Document Without Predecessor Link (Internal Workflow Control)
  recordTest('Regulatory Rules', 'FIXTURE-07', 'Replacement instrument without predecessor link triggers RULE-WORKFLOW-REPLACE-10', () => {
    const replacementInstrument: Instrument = {
      ...baseInstrument,
      id: 'FDR-2024-9002',
      status: 'replacement_submitted',
      linkedPredecessorId: undefined, // Missing predecessor link!
    };
    const docs = [validFdrDoc];
    const assessment = computeCaseAssessment({
      instrument: replacementInstrument,
      documents: docs,
      verifications: validClearances,
      currentDate: new Date('2026-05-01'),
    });

    const reqChain = assessment.requirements.find(r => r.ruleId === 'RULE-WORKFLOW-REPLACE-10' || r.legacyRuleId === 'RULE-APH-1.4.6');
    if (reqChain?.status !== 'inconsistent') {
      throw new Error(`Expected 'inconsistent' status for unlinked replacement, got ${reqChain?.status}`);
    }
    if (reqChain.isOfficialRule !== false) {
      throw new Error('Replacement continuity protocol must be classified as internal workflow control (isOfficialRule: false)');
    }
  });

  // Fixture 8: Matured Instrument with Auto-Renewal Non-Proof Invariant
  recordTest('Regulatory Rules', 'FIXTURE-08', 'Expired maturity with autoRenewal true does NOT prove actual renewal', () => {
    const maturedInstrument: Instrument = {
      ...baseInstrument,
      maturityDate: '2024-01-01', // Date in the past
    };

    const extractionData = processUploadedEvidence({
      fileName: 'Deposit_Advice_With_AutoRenewal.pdf',
      textContent: `
        STATE BANK OF INDIA
        DEPOSIT ADVICE
        Account No: 38291048592
        Principal Amount: INR 3,500,000.00
        Maturity Date: 01/01/2024
        Maturity Instruction: Auto-renew on maturity for 1 year
      `,
    });

    const reconciliation = reconcileInstrumentEvidence(
      maturedInstrument,
      extractionData,
      [maturedInstrument],
      [validFdrDoc]
    );

    const autoRenewalFinding = reconciliation.findings.find(
      f => f.ruleId === 'RULE-REL-TENOR-06' || f.ruleId === 'RULE-APH-6.46.6' || f.field.includes('Renewal')
    );
    if (!autoRenewalFinding) {
      throw new Error('Expected reconciliation finding for unverified auto-renewal');
    }
    if (autoRenewalFinding.severity !== 'warning' && autoRenewalFinding.severity !== 'critical') {
      throw new Error(`Expected warning or critical severity, got ${autoRenewalFinding.severity}`);
    }
    if (!autoRenewalFinding.whyItMatters.includes('Auto-renewal instruction does NOT prove') &&
        !autoRenewalFinding.whyItMatters.includes('auto-renewal instruction in a historical Deposit Advice does NOT prove')) {
      throw new Error('Auto-renewal invariant message missing');
    }
  });

  // Fixture 9: Cross-Record Discrepancy (Amount Mismatch)
  recordTest('Regulatory Rules', 'FIXTURE-09', 'Discrepancy between document amount and instrument record is flagged with provenance', () => {
    const extractionData = processUploadedEvidence({
      fileName: 'SBI_FDR_Mismatch.pdf',
      textContent: `
        STATE BANK OF INDIA
        FIXED DEPOSIT RECEIPT
        Receipt No: SBI-FDR-9001
        Account No: 38291048592
        Principal Amount: INR 2,500,000.00
        Deposit Date: 15/04/2016
        Maturity Date: 15/04/2026
      `,
    });

    const reconciliation = reconcileInstrumentEvidence(
      baseInstrument, // recorded amount 35,00,000
      extractionData, // extracted amount 25,00,000
      [baseInstrument],
      [validFdrDoc]
    );

    const amountFinding = reconciliation.findings.find(
      f => f.field === 'Deposit Principal Amount' || f.ruleId === 'RULE-APH-01'
    );
    if (!amountFinding) throw new Error('Expected discrepancy finding for conflicting amount');
    if (!amountFinding.submittedValue.includes('35,00,000') && !amountFinding.submittedValue.includes('3500000')) {
      throw new Error(`Submitted value mismatch: ${amountFinding.submittedValue}`);
    }
    if (!amountFinding.comparisonValue.includes('25,00,000') && !amountFinding.comparisonValue.includes('2500000')) {
      throw new Error(`Comparison value mismatch: ${amountFinding.comparisonValue}`);
    }
  });

  // Fixture 10: Special-Case Conditions (Progressive Closure)
  recordTest('Regulatory Rules', 'FIXTURE-10', 'Progressive closure special case applies Chapter III closure conditions', () => {
    const closureDocs = [validRequestDoc, validAffidavitDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: closureDocs,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      isProgressiveClosure: true,
      currentDate: new Date('2026-05-01'),
    });

    const closureReq = assessment.requirements.find(r => r.ruleId === 'RULE-REL-CLOSE-07' || r.legacyRuleId === 'RULE-APH-6.46.7');
    if (!closureReq) throw new Error('Expected RULE-REL-CLOSE-07 to be evaluated for progressive closure case');
    if (closureReq.status !== 'missing') {
      throw new Error(`Expected missing status for unattached University closure cert, got ${closureReq.status}`);
    }
    if (!closureReq.clauseRef.includes('Chapter III')) {
      throw new Error(`Expected Chapter III citation, got ${closureReq.clauseRef}`);
    }
  });

  // Fixture 11: Rule Engine Versioning and Active Status
  recordTest('Regulatory Rules', 'FIXTURE-11', 'Regulatory Rule catalog is versioned (2024–2027) with official source citations', () => {
    for (const rule of AICTE_REGULATORY_RULES) {
      if (rule.handbookVersion !== '2024–2027') throw new Error(`Rule ${rule.id} has incorrect version: ${rule.handbookVersion}`);
      if (!rule.officialSourceUrl.includes('aicte.gov.in')) throw new Error(`Rule ${rule.id} lacks official AICTE URL`);
      if (rule.version < 1) throw new Error(`Rule ${rule.id} lacks positive version number`);
    }
  });

  // --------------------------------------------------------------------------
  // PART 1B: TARGETED REGULATORY CITATION REGRESSION SUITE
  // --------------------------------------------------------------------------

  // REG-01: Clause 1.4.5 is NOT misrepresented as FDR joint-pledge or duplicate rule
  recordTest('Regulatory Regression', 'REG-01', 'Clause 1.4.5 is NOT misrepresented as FDR joint-pledge or duplicate rule', () => {
    // 1. No rule in AICTE_REGULATORY_RULES can cite Clause 1.4.5 for joint FDR pledge
    for (const rule of AICTE_REGULATORY_RULES) {
      if (rule.clauseReference.includes('1.4.5')) {
        throw new Error(`CRITICAL CITATION DEFECT: Rule ${rule.id} improperly cites Clause 1.4.5. Official Clause 1.4.5 is strictly for application copy submission to State/UT and Board.`);
      }
    }

    // 2. Deposit creation proof rule (RULE-REL-FDR-03) must strictly cite Clause 6.46(a)(iii)
    const fdrRule = AICTE_REGULATORY_RULES.find(r => r.id === 'RULE-REL-FDR-03');
    if (!fdrRule || fdrRule.clauseReference !== 'Clause 6.46(a)(iii)') {
      throw new Error(`RULE-REL-FDR-03 must cite Clause 6.46(a)(iii), got ${fdrRule?.clauseReference}`);
    }

    // 3. Uniqueness reconciliation check must NOT cite Clause 1.4.5
    const duplicateRec = reconcileInstrumentEvidence(
      baseInstrument,
      processUploadedEvidence({ fileName: 'test.pdf', textContent: 'SBI-FDR-9001' }),
      [baseInstrument, { ...baseInstrument, id: 'FDR-OTHER' }],
      []
    );
    const dupFinding = duplicateRec.findings.find(f => f.id.includes('rec-dup'));
    if (dupFinding && dupFinding.whyItMatters.includes('Clause 1.4.5')) {
      throw new Error('Reconciliation duplicate finding improperly cited Clause 1.4.5');
    }
  });

  // REG-02: Clause 1.4.6 is NOT misrepresented as replacement continuity rule
  recordTest('Regulatory Regression', 'REG-02', 'Clause 1.4.6 is NOT misrepresented as replacement continuity rule', () => {
    const replaceRule = AICTE_REGULATORY_RULES.find(r => r.id === 'RULE-WORKFLOW-REPLACE-10');
    if (!replaceRule) throw new Error('Missing RULE-WORKFLOW-REPLACE-10 in regulatory catalog');

    // Replacement continuity must be recorded as an internal workflow control
    if (replaceRule.reviewStatus !== 'workflow_control') {
      throw new Error(`RULE-WORKFLOW-REPLACE-10 must have reviewStatus 'workflow_control', got ${replaceRule.reviewStatus}`);
    }

    // Must NOT claim statutory basis in APH Clause 1.4.6 (which is DSC digital signature upload)
    if (replaceRule.clauseReference.includes('Clause 1.4.6') && !replaceRule.clauseReference.includes('Workflow')) {
      throw new Error(`RULE-WORKFLOW-REPLACE-10 improperly cites statutory Clause 1.4.6: ${replaceRule.clauseReference}`);
    }

    // Evaluation must flag isOfficialRule as false
    const evalResult = replaceRule.evaluate({
      instrument: { ...baseInstrument, status: 'replacement_submitted', linkedPredecessorId: 'FDR-PREV' },
      documents: [],
    });
    if (evalResult.isOfficialRule !== false) {
      throw new Error('Replacement continuity evaluation must set isOfficialRule: false');
    }
  });

  // REG-03: Actual release-procedure references match official handbook hierarchy
  recordTest('Regulatory Regression', 'REG-03', 'Release procedure references match official APH 2024-2027 hierarchy (Clause 6.46(a)(i)-(iv), Clause 6.46(b), Clause 1.12(iv))', () => {
    const expectedHierarchy: Record<string, string> = {
      'RULE-REL-REQ-01': 'Clause 6.46(a)(i)',
      'RULE-REL-AFF-02': 'Clause 6.46(a)(ii) & Appendix 8 (Affidavit 6)',
      'RULE-REL-FDR-03': 'Clause 6.46(a)(iii)',
      'RULE-REL-EOA-04': 'Clause 6.46(a)(iv)',
      'RULE-REL-CLR-05': 'Clause 6.46(b)',
      'RULE-REL-TENOR-06': 'AICTE Approval Process Handbook 2024–2027, Chapter I, Clause 1.12(iv)',
      'RULE-REL-CLOSE-07': 'Chapter III (Closure Guidelines) & Clause 6.46',
    };

    for (const [id, expectedClause] of Object.entries(expectedHierarchy)) {
      const rule = AICTE_REGULATORY_RULES.find(r => r.id === id);
      if (!rule) throw new Error(`Missing expected rule ${id}`);
      if (rule.clauseReference !== expectedClause) {
        throw new Error(`Rule ${id} citation mismatch: expected "${expectedClause}", got "${rule.clauseReference}"`);
      }
    }
  });

  // REG-04: Conditional rules apply only when their recorded conditions are satisfied
  recordTest('Regulatory Regression', 'REG-04', 'Conditional rules apply only when their recorded conditions are satisfied', () => {
    // 1. Standard Case without Progressive Closure: RULE-REL-CLOSE-07 must be not_applicable
    const stdAssessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: [validRequestDoc, validAffidavitDoc, validFdrDoc, validEoaDoc],
      verifications: validClearances,
      isProgressiveClosure: false,
      hasEmbezzlementInquiry: false,
      currentDate: new Date('2026-05-01'),
    });
    const closeReq = stdAssessment.requirements.find(r => r.ruleId === 'RULE-REL-CLOSE-07');
    if (closeReq?.status !== 'not_applicable') {
      throw new Error(`Progressive closure rule should be not_applicable on standard case, got ${closeReq?.status}`);
    }

    // 2. Case without Embezzlement Inquiry: RULE-REL-VIG-08 must be not_applicable
    const vigReq = stdAssessment.requirements.find(r => r.ruleId === 'RULE-REL-VIG-08');
    if (vigReq?.status !== 'not_applicable') {
      throw new Error(`Anti-embezzlement rule should be not_applicable when no inquiry exists, got ${vigReq?.status}`);
    }

    // 3. Case not marked as replacement: RULE-WORKFLOW-REPLACE-10 must be not_applicable
    const replaceReq = stdAssessment.requirements.find(r => r.ruleId === 'RULE-WORKFLOW-REPLACE-10');
    if (replaceReq?.status !== 'not_applicable') {
      throw new Error(`Replacement continuity rule should be not_applicable for non-replacement instrument, got ${replaceReq?.status}`);
    }

    // 4. Case without release request: RULE-WORKFLOW-DECISION-09 must be not_applicable
    const noRelAssessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: [validFdrDoc],
      verifications: [],
      releaseRequest: null,
      currentDate: new Date('2026-05-01'),
    });
    const decReq = noRelAssessment.requirements.find(r => r.ruleId === 'RULE-WORKFLOW-DECISION-09');
    if (decReq?.status !== 'not_applicable') {
      throw new Error(`Senior officer decision rule should be not_applicable without release request, got ${decReq?.status}`);
    }
  });

  // REG-05: Unsupported legal claims are flagged for review rather than enforced as confirmed regulations
  recordTest('Regulatory Regression', 'REG-05', 'Unsupported legal claims are flagged for review rather than enforced as regulations', () => {
    // Anti-embezzlement circular has no confirmed subclause number; must be draft_awaiting_review and isOfficialRule: false
    const vigRule = AICTE_REGULATORY_RULES.find(r => r.id === 'RULE-REL-VIG-08');
    if (!vigRule) throw new Error('Missing RULE-REL-VIG-08');
    if (vigRule.reviewStatus !== 'draft_awaiting_review') {
      throw new Error(`Expected draft_awaiting_review for anti-embezzlement administrative rule, got ${vigRule.reviewStatus}`);
    }

    // Internal workflow controls must be classified with reviewStatus 'workflow_control'
    const decisionRule = AICTE_REGULATORY_RULES.find(r => r.id === 'RULE-WORKFLOW-DECISION-09');
    if (decisionRule?.reviewStatus !== 'workflow_control') {
      throw new Error(`Expected workflow_control for senior officer decision control, got ${decisionRule?.reviewStatus}`);
    }
  });

  // REG-06: Uploaded Axis Bank Deposit Advice with Joint Holder Not Applicable is an operational check, not a statutory violation
  recordTest('Regulatory Regression', 'REG-06', 'Deposit Advice with Joint Holder "Not Applicable" is an operational manual-review check, not a statutory violation', () => {
    const adviceSuitability = assessDocumentSuitability('deposit_advice', {
      depositAmount: { value: 10000000, confidence: 0.95, extractionMethod: 'structured_regex' },
      maturityDate: { value: '2026-06-15', confidence: 0.95, extractionMethod: 'structured_regex' },
      jointHolder: { value: 'Not Applicable', confidence: 0.92, extractionMethod: 'structured_regex' },
    });

    if (adviceSuitability.status !== 'conditionally_suitable') {
      throw new Error(`Expected conditionally_suitable, got ${adviceSuitability.status}`);
    }
    if (!adviceSuitability.rationale.includes('candidate supporting document')) {
      throw new Error(`Expected candidate supporting document classification: ${adviceSuitability.rationale}`);
    }
    if (!adviceSuitability.rationale.includes('operational manual-review check')) {
      throw new Error(`Expected rationale to designate Joint Holder NA as an operational check: ${adviceSuitability.rationale}`);
    }
    if (!adviceSuitability.rationale.includes('Appendix 8 / Affidavit 6')) {
      throw new Error(`Expected Appendix 8 / Affidavit 6 reference: ${adviceSuitability.rationale}`);
    }
    if (!adviceSuitability.rationale.includes('not as an automated fraud determination or conclusive violation') &&
        !adviceSuitability.rationale.includes('not as a confirmed regulatory violation')) {
      throw new Error(`Must explicitly affirm that this is not an automated fraud determination or conclusive violation: ${adviceSuitability.rationale}`);
    }
  });

  // REG-07: Bank authenticity remains unconfirmed until an authorized verification is recorded
  recordTest('Regulatory Regression', 'REG-07', 'Bank authenticity remains manual_confirmation_pending until an authorized verification is recorded', () => {
    // Unverified baseline from extracted PDF
    const unverified = assessInstrumentAuthenticity();
    if (unverified.status !== 'manual_confirmation_pending') {
      throw new Error(`Expected manual_confirmation_pending, got ${unverified.status}`);
    }
    if (unverified.method !== 'unverified_pending') {
      throw new Error(`Expected unverified_pending method, got ${unverified.method}`);
    }

    // Authenticity is ONLY satisfied when verified by source
    const verified = assessInstrumentAuthenticity({
      verifiedBySource: true,
      officerName: 'Branch Manager, Axis Bank Fort Mumbai',
    });
    if (verified.status !== 'authorized_source_verified') {
      throw new Error(`Expected authorized_source_verified, got ${verified.status}`);
    }
  });

  // --------------------------------------------------------------------------
  // PART 2: REAL DOCUMENT UNDERSTANDING & ADAPTER TESTS
  // --------------------------------------------------------------------------
  recordTest('Document Intelligence', 'DOC-01', 'Bank Deposit Advice is classified accurately without auto-rejection', () => {
    const depositAdviceText = `
      STATE BANK OF INDIA
      BRANCH: BANDRA KURLA COMPLEX, MUMBAI
      DEPOSIT ADVICE / TERM DEPOSIT CONFIRMATION
      Receipt / Account No: 38291048592
      FDR Reference: SBI-FDR-9001
      Depositor: Apex Institute of Technology
      Joint Holder: Regional Officer, AICTE Western Region
      Deposit Amount: INR 35,00,000.00
      Interest Rate: 6.75% p.a.
      Effective Date: 15/04/2016
      Maturity Date: 15/04/2026
      Maturity Instruction: Auto-renew for 1 year
    `;

    const classification = classifyDocument(depositAdviceText, 'Deposit_Advice_2016.pdf');
    if (classification.type !== 'deposit_advice') {
      throw new Error(`Expected 'deposit_advice' classification, got ${classification.type}`);
    }
    if (classification.confidence < 0.7) {
      throw new Error(`Confidence too low: ${classification.confidence}`);
    }
  });

  recordTest('Document Intelligence', 'DOC-02', 'Structured field extraction extracts bank, amount, tenor, and joint holder with provenance', () => {
    const depositAdviceText = `
      STATE BANK OF INDIA
      BRANCH: BANDRA KURLA COMPLEX, MUMBAI
      DEPOSIT ADVICE / TERM DEPOSIT CONFIRMATION
      Account No: 38291048592
      FDR No: SBI-FDR-9001
      Depositor: Apex Institute of Technology
      Joint Holder: Regional Officer, AICTE Western Region
      Principal Amount: INR 3,500,000.00
      Interest Rate: 6.75%
      Deposit Date: 15/04/2016
      Maturity Date: 15/04/2026
      Maturity Instruction: Auto-renew for 1 year
    `;

    const fields = extractFieldsFromText(depositAdviceText);

    if (!fields.bankName || fields.bankName.value !== 'State Bank of India') {
      throw new Error(`Bank extraction failed: ${fields.bankName?.value}`);
    }
    if (!fields.depositAmount || fields.depositAmount.value !== 3500000) {
      throw new Error(`Amount extraction failed: ${fields.depositAmount?.value}`);
    }
    if (!fields.maturityDate || !fields.maturityDate.value) {
      throw new Error('Maturity date extraction failed');
    }
    if (!fields.jointHolder || !String(fields.jointHolder.value).includes('AICTE')) {
      throw new Error(`Joint holder extraction failed: ${fields.jointHolder?.value}`);
    }
    if (!fields.depositAmount.sourceSnippet) {
      throw new Error('Field provenance snippet missing');
    }
  });

  recordTest('Document Intelligence', 'DOC-03', 'Real Axis Bank Deposit Advice PDF extraction, classification, and provenance', () => {
    const userHome = process.env.USERPROFILE || 'C:\\Users\\Atharva';
    const realPdfPath = path.join(userHome, 'Downloads', 'ad_xxxx-xxxx-xxx-3323_FD_ADVICE - Rs. 1 Crore.pdf');
    if (!fs.existsSync(realPdfPath)) {
      // In remote environments without the local download file, note availability requirement
      return;
    }
    const realBuf = fs.readFileSync(realPdfPath);
    const extraction = processUploadedEvidence({
      fileName: 'FD_ADVICE - Rs. 1 Crore.pdf',
      fileBuffer: realBuf,
    });

    if (extraction.classification !== 'deposit_advice') {
      throw new Error(`Expected 'deposit_advice' classification, got ${extraction.classification}`);
    }
    const fields = extraction.fields;
    if (!fields.bankName || fields.bankName.value !== 'Axis Bank') {
      throw new Error(`Expected Axis Bank, got ${fields.bankName?.value}`);
    }
    if (!fields.depositAmount || fields.depositAmount.value !== 10000000) {
      throw new Error(`Expected depositAmount 10000000 (Rs. 1 Crore), got ${fields.depositAmount?.value}`);
    }
    if (!fields.issueDate || fields.issueDate.value !== '2025-01-14') {
      throw new Error(`Expected issueDate 2025-01-14, got ${fields.issueDate?.value}`);
    }
    if (!fields.maturityDate || fields.maturityDate.value !== '2026-06-15') {
      throw new Error(`Expected maturityDate 2026-06-15, got ${fields.maturityDate?.value}`);
    }
    if (!fields.maturityInstruction || !String(fields.maturityInstruction.value).includes('Auto Renewal')) {
      throw new Error(`Expected Auto Renewal instruction, got ${fields.maturityInstruction?.value}`);
    }
    if (!fields.fdrNumber || !fields.fdrNumber.maskedValue || !fields.fdrNumber.maskedValue.includes('3323')) {
      throw new Error(`Expected masked account number ending in 3323, got ${fields.fdrNumber?.maskedValue}`);
    }
    if (!fields.jointHolder || fields.jointHolder.value !== 'Not Applicable') {
      throw new Error(`Expected jointHolder 'Not Applicable', got ${fields.jointHolder?.value}`);
    }
    if (extraction.suitabilityAssessment.status !== 'conditionally_suitable') {
      throw new Error(`Expected conditionally_suitable suitability, got ${extraction.suitabilityAssessment.status}`);
    }
    if (!extraction.suitabilityAssessment.rationale.includes('operational manual-review check')) {
      throw new Error(`Expected operational manual-review check in rationale, got: ${extraction.suitabilityAssessment.rationale}`);
    }
  });

  // --------------------------------------------------------------------------
  // PART 3: ASSESSMENT A (SUITABILITY) VS ASSESSMENT B (AUTHENTICITY)
  // --------------------------------------------------------------------------
  recordTest('Suitability vs Authenticity', 'ASSESS-01', 'Deposit Advice evaluates as conditionally suitable but NEVER as bank verified', () => {
    // Assessment A: Document Suitability
    const suitability = assessDocumentSuitability('deposit_advice', {
      depositAmount: { value: 3500000, confidence: 0.95, extractionMethod: 'structured_regex' },
      maturityDate: { value: '2026-04-15', confidence: 0.95, extractionMethod: 'structured_regex' },
      jointHolder: { value: 'Regional Officer, AICTE', confidence: 0.90, extractionMethod: 'structured_regex' },
    });

    if (suitability.status !== 'conditionally_suitable') {
      throw new Error(`Expected conditionally_suitable status, got ${suitability.status}`);
    }

    // Assessment B: Financial Instrument Authenticity
    const authenticity = assessInstrumentAuthenticity();
    if (authenticity.status === 'authorized_source_verified') {
      throw new Error('CRITICAL FLAW: Instrument was marked verified without an authorized bank confirmation');
    }
    if (authenticity.status !== 'manual_confirmation_pending') {
      throw new Error(`Expected manual_confirmation_pending, got ${authenticity.status}`);
    }
  });

  // --------------------------------------------------------------------------
  // PART 4: FDR CONTINUITY GRAPH TRAVERSAL
  // --------------------------------------------------------------------------
  recordTest('Continuity Graph', 'GRAPH-01', 'Builds explicit, traceable nodes: Inst -> Instrument -> Evidence -> Verifications', () => {
    const graph = buildFDRContinuityGraph({
      instrument: baseInstrument,
      documents: [validFdrDoc, validAffidavitDoc],
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      auditEvents: [],
      lifecycleEvents: [],
    });

    const instNode = graph.nodes.find(n => n.type === 'institution');
    const fdrNode = graph.nodes.find(n => n.type === 'instrument');
    const docNodes = graph.nodes.filter(n => n.type === 'evidence_document');
    const verNodes = graph.nodes.filter(n => n.type === 'verification');

    if (!instNode) throw new Error('Missing institution node in continuity graph');
    if (!fdrNode) throw new Error('Missing instrument node in continuity graph');
    if (docNodes.length !== 2) throw new Error(`Expected 2 document nodes, got ${docNodes.length}`);
    if (verNodes.length !== 1) throw new Error(`Expected 1 verification milestone node, got ${verNodes.length}`);
    if (verNodes[0].metadata.checkCount !== 2) throw new Error(`Expected checkCount 2, got ${verNodes[0].metadata.checkCount}`);

    // Verify edge continuity: Institution -> Instrument
    const instToFdrEdge = graph.edges.find(e => e.source === instNode.id && e.target === fdrNode.id);
    if (!instToFdrEdge) throw new Error('Missing edge between Institution and Instrument');
  });

  // --------------------------------------------------------------------------
  // PART 5: 5 CORE QUESTIONS CASE ASSESSMENT
  // --------------------------------------------------------------------------
  recordTest('Case Assessment', 'CORE-5-Q', 'Engine answers all 5 core regulatory questions for the case', () => {
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: [validRequestDoc, validFdrDoc], // Missing Affidavit 6, Missing EoA
      verifications: [],
      currentDate: new Date('2026-05-01'),
    });

    // Q1: What has been established from the submitted evidence?
    if (!assessment.q1_establishedEvidence || assessment.q1_establishedEvidence.length === 0) {
      throw new Error('Q1 (Established Evidence) is empty');
    }

    // Q2: What remains missing, inconsistent, stale or unverified?
    if (!assessment.q2_unresolvedDependencies || assessment.q2_unresolvedDependencies.length === 0) {
      throw new Error('Q2 (Unresolved Evidence) is empty');
    }

    // Q3: Which applicable configured requirement explains the issue?
    if (!assessment.q3_applicablePolicyClauses || assessment.q3_applicablePolicyClauses.length === 0) {
      throw new Error('Q3 (Applicable Rules) is empty');
    }

    // Q4: What is the next permitted administrative action, and who is responsible?
    if (!assessment.q4_nextPermittedActions || assessment.q4_nextPermittedActions.length === 0) {
      throw new Error('Q4 (Next Permitted Actions) is empty');
    }

    // Q5: What must happen before the case can move to its next authorized state?
    if (!assessment.q5_stateProgressionGates || assessment.q5_stateProgressionGates.length === 0) {
      throw new Error('Q5 (Prerequisites for Next Authorized State) is empty');
    }
  });

  // --------------------------------------------------------------------------
  // PART 6: SECURITY & ASVS 5.0 BASELINE CONTROLS
  // --------------------------------------------------------------------------
  recordTest('Security & ASVS Controls', 'SEC-01', 'Sensitive Account and Receipt Identifiers are masked in presentation', () => {
    const maskedAcc = maskSensitiveIdentifier('38291048592');
    if (maskedAcc !== 'XXXX8592') {
      throw new Error(`Masking failed: expected 'XXXX8592', got '${maskedAcc}'`);
    }

    const prefixedMasked = maskSensitiveIdentifier('SBI-FDR-90001234');
    if (prefixedMasked !== 'SBI-FDR-XXXX1234') {
      throw new Error(`Prefixed masking failed: expected 'SBI-FDR-XXXX1234', got '${prefixedMasked}'`);
    }
  });

  recordTest('Security & ASVS Controls', 'SEC-02', 'Cross-institution instrument access denial enforced', () => {
    const inst1Session = { userId: 'user-001', role: 'institution' as const, institutionId: 'inst-001', loginAt: '' };
    const inst2Instrument = { ...baseInstrument, institutionId: 'inst-002' };

    const allowed = canAccessInstrument(inst1Session, inst2Instrument);
    if (allowed) {
      throw new Error('CRITICAL SECURITY FLAW: Institution 1 was granted access to Institution 2 instrument');
    }
  });

  recordTest('Security & ASVS Controls', 'SEC-03', 'Auditor role is strictly read-only and cannot mutate records', () => {
    const auditorSession = { userId: 'user-auditor', role: 'auditor' as const, loginAt: '' };

    if (canPerformAction(auditorSession, 'create_instrument')) {
      throw new Error('Auditor unexpectedly permitted to create instrument');
    }
    if (canPerformAction(auditorSession, 'make_release_decision')) {
      throw new Error('Auditor unexpectedly permitted to make release decision');
    }
    if (canPerformAction(auditorSession, 'verify_source')) {
      throw new Error('Auditor unexpectedly permitted to verify source');
    }
    if (canPerformAction(auditorSession, 'escalate_case')) {
      throw new Error('Auditor unexpectedly permitted to escalate case');
    }
  });

  recordTest('Security & ASVS Controls', 'SEC-04', 'Institution role cannot make release decisions or record bank verifications', () => {
    const instSession = { userId: 'user-inst', role: 'institution' as const, institutionId: 'inst-001', loginAt: '' };

    if (canPerformAction(instSession, 'make_release_decision')) {
      throw new Error('Institution permitted to make release decision');
    }
    if (canPerformAction(instSession, 'verify_source')) {
      throw new Error('Institution permitted to verify source');
    }
  });

  // --------------------------------------------------------------------------
  // PART 7: DIAGNOSTIC ENDPOINT SECURITY REGRESSION SUITE
  // Strict proof that:
  // - Forged role headers (x-user-role: admin / auditor) are strictly rejected
  // - Missing client keys when key configured in production return 401
  // - Missing server-side INTERNAL_TEST_KEY in production disables the endpoint (401)
  // - Incorrect client keys are strictly rejected (401)
  // - Compromised old hardcoded secret ('sakshya-verified-audit-2026') is rejected
  // - Configured key via x-sakshya-test-key is authorized
  // - Configured key via Authorization: Bearer is authorized
  // - Local development preserves testing access
  // - Rejection responses never expose replacement keys
  // --------------------------------------------------------------------------
  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-01', 'Forged x-user-role: admin header is strictly rejected in production', () => {
    const mockHeaders = new Headers({ 'x-user-role': 'admin' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secure-test-key-999' });
    if (auth.authorized) {
      throw new Error('VULNERABILITY DETECTED: Forged x-user-role: admin was granted access without valid test key');
    }
    if (auth.status !== 401) {
      throw new Error(`Expected status 401, got ${auth.status}`);
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-02', 'Forged x-user-role: auditor header is strictly rejected in production', () => {
    const mockHeaders = new Headers({ 'x-user-role': 'auditor' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secure-test-key-999' });
    if (auth.authorized) {
      throw new Error('VULNERABILITY DETECTED: Forged x-user-role: auditor was granted access without valid test key');
    }
    if (auth.status !== 401) {
      throw new Error(`Expected status 401, got ${auth.status}`);
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-03', 'Missing client test key in production is strictly rejected', () => {
    const mockHeaders = new Headers();
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secure-test-key-999' });
    if (auth.authorized) {
      throw new Error('Request without key was unexpectedly authorized in production');
    }
    if (auth.status !== 401) {
      throw new Error(`Expected status 401, got ${auth.status}`);
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-04', 'Missing server-side INTERNAL_TEST_KEY disables endpoint in production', () => {
    const mockHeaders = new Headers({ 'x-sakshya-test-key': 'some-client-key' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: undefined });
    if (auth.authorized) {
      throw new Error('Endpoint permitted access when server-side INTERNAL_TEST_KEY was unconfigured');
    }
    if (auth.status !== 401) {
      throw new Error(`Expected status 401, got ${auth.status}`);
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-05', 'Compromised legacy secret is strictly rejected in production', () => {
    const mockHeaders = new Headers({ 'x-sakshya-test-key': 'sakshya-verified-audit-2026' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secret-alpha-99' });
    if (auth.authorized) {
      throw new Error('Compromised legacy secret sakshya-verified-audit-2026 was accepted');
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-06', 'Incorrect key is strictly rejected in production', () => {
    const mockHeaders = new Headers({ 'x-sakshya-test-key': 'wrong-key-1234' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secret-alpha-99' });
    if (auth.authorized) {
      throw new Error('Incorrect key was unexpectedly authorized');
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-07', 'Configured key via x-sakshya-test-key is authorized', () => {
    const mockHeaders = new Headers({ 'x-sakshya-test-key': 'prod-secret-alpha-99' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secret-alpha-99' });
    if (!auth.authorized) {
      throw new Error('Valid x-sakshya-test-key was unexpectedly rejected');
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-08', 'Configured key via Authorization Bearer token is authorized', () => {
    const mockHeaders = new Headers({ 'authorization': 'Bearer prod-secret-alpha-99' });
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: 'prod-secret-alpha-99' });
    if (!auth.authorized) {
      throw new Error('Valid Bearer token was unexpectedly rejected');
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-09', 'Local development preserves testing access without unnecessary friction', () => {
    const mockHeaders = new Headers();
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'development', internalTestKey: undefined });
    if (!auth.authorized) {
      throw new Error('Local development access was blocked when no key configured');
    }
  });

  recordTest('Diagnostic Endpoint Security', 'SEC-DIAG-10', 'Rejection responses never leak secret keys in payload or hint', () => {
    const mockHeaders = new Headers({ 'x-sakshya-test-key': 'attempt' });
    const secretKey = 'super-secret-high-entropy-token-xyz';
    const auth = verifyDiagnosticAuth(mockHeaders, { nodeEnv: 'production', internalTestKey: secretKey });
    const responseBody = JSON.stringify(auth.response);
    if (responseBody.includes(secretKey)) {
      throw new Error('SECURITY LEAK: Response body contained the configured internal key');
    }
  });

  // Calculate Summary
  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = testResults.filter(t => !t.passed).length;
  const allPassed = failedCount === 0;

  return NextResponse.json({
    success: allPassed,
    summary: {
      total: testResults.length,
      passed: passedCount,
      failed: failedCount,
      passRate: `${((passedCount / testResults.length) * 100).toFixed(1)}%`,
    },
    results: testResults,
  });
}
