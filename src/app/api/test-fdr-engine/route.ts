// ============================================================================
// SAKSHYA PS 1 — FDR EVIDENCE-TO-ACTION ENGINE AUTOMATED TEST SUITE
// Rigorous verification of:
// 1. 11 Source-Grounded Regulatory Rule Fixtures (AICTE APH 2024–2027 Clause 6.46 & 1.4)
// 2. Real Document Intelligence (Classification, Field Extraction, Provenance, Masking)
// 3. Assessment A (Document Suitability) vs Assessment B (Instrument Authenticity)
// 4. Runtime Maturity & Renewal Intelligence (Auto-renewal non-proof invariant)
// 5. FDR Evidence Cross-Reconciliation (Duplicates, Mismatches, Predecessor links)
// 6. FDR Continuity Graph Traversal
// 7. Case Assessment & Deterministic Next-Action Task Planner (5 Core Questions)
// 8. Security & ASVS 5.0 Baseline Controls (RBAC, Scoping, Auditor Read-Only, Masking)
// ============================================================================

import { NextResponse } from 'next/server';
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

export async function GET() {
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

    const req1 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.1');
    const req2 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.2');
    const req3 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.3');
    const req4 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.4');
    const req5 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.5');

    if (req1?.status !== 'satisfied') throw new Error(`Rule 6.46.1 not satisfied: got ${req1?.status}`);
    if (req2?.status !== 'satisfied') throw new Error(`Rule 6.46.2 not satisfied: got ${req2?.status}`);
    if (req3?.status !== 'satisfied') throw new Error(`Rule 6.46.3 not satisfied: got ${req3?.status}`);
    if (req4?.status !== 'satisfied') throw new Error(`Rule 6.46.4 not satisfied: got ${req4?.status}`);
    if (req5?.status !== 'satisfied') throw new Error(`Rule 6.46.5 not satisfied: got ${req5?.status}`);
  });

  // Fixture 2: Missing Request Letter
  recordTest('Regulatory Rules', 'FIXTURE-02', 'Missing Request Letter triggers RULE-APH-6.46.1 missing blocker', () => {
    const docsWithoutReq = [validAffidavitDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutReq,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req1 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.1');
    if (req1?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46.1, got ${req1?.status}`);

    const hasBlocker = assessment.q2_unresolvedDependencies.some(d => d.includes('Formal Institution Release Application Letter'));
    if (!hasBlocker) throw new Error('Expected unresolved dependency for RULE-APH-6.46.1 in Q2');

    const task = assessment.q4_nextPermittedActions.find(t => t.ruleId === 'RULE-APH-6.46.1');
    if (!task) throw new Error('Expected next action task generated for missing request letter');
    if (task.responsibleRole !== 'institution') throw new Error(`Expected responsible role institution, got ${task.responsibleRole}`);
  });

  // Fixture 3: Missing Affidavit 6
  recordTest('Regulatory Rules', 'FIXTURE-03', 'Missing Affidavit 6 triggers RULE-APH-6.46.2 with statutory citation', () => {
    const docsWithoutAff = [validRequestDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutAff,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req2 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.2');
    if (req2?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46.2, got ${req2?.status}`);
    if (!req2.clauseRef.includes('6.46')) throw new Error(`Expected Clause 6.46 reference, got ${req2.clauseRef}`);

    const task = assessment.q4_nextPermittedActions.find(t => t.ruleId === 'RULE-APH-6.46.2');
    if (!task) throw new Error('Expected task for missing Affidavit 6');
    if (task.responsibleRole !== 'institution') throw new Error(`Expected institution role, got ${task.responsibleRole}`);
  });

  // Fixture 4: Missing FDR / Payment Evidence
  recordTest('Regulatory Rules', 'FIXTURE-04', 'Missing FDR/Payment Evidence triggers RULE-APH-6.46.3 blocker', () => {
    const docsWithoutFdr = [validRequestDoc, validAffidavitDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutFdr,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req3 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.3');
    if (req3?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46.3, got ${req3?.status}`);
  });

  // Fixture 5: Missing Latest LoA/EoA
  recordTest('Regulatory Rules', 'FIXTURE-05', 'Missing Latest LoA/EoA triggers RULE-APH-6.46.4 requirement check', () => {
    const docsWithoutEoa = [validRequestDoc, validAffidavitDoc, validFdrDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: docsWithoutEoa,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      currentDate: new Date('2026-05-01'),
    });

    const req4 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.4');
    if (req4?.status !== 'missing') throw new Error(`Expected status 'missing' for 6.46.4, got ${req4?.status}`);
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

    const req5 = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.5');
    if (req5?.status !== 'awaiting_confirmation') {
      throw new Error(`Expected awaiting_confirmation, got ${req5?.status}`);
    }
    // Check specific reason text ensures no presumption of guilt
    if (!req5.explanation.includes('Missing record means clearance is unrecorded, not that it was rejected')) {
      throw new Error(`Reason does not preserve presumption of administrative innocence: ${req5.explanation}`);
    }
  });

  // Fixture 7: Replacement Document Without Predecessor Link
  recordTest('Regulatory Rules', 'FIXTURE-07', 'Replacement instrument without predecessor link triggers RULE-APH-1.4.6', () => {
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

    const reqChain = assessment.requirements.find(r => r.ruleId === 'RULE-APH-1.4.6');
    if (reqChain?.status !== 'inconsistent') {
      throw new Error(`Expected 'inconsistent' status for unlinked replacement, got ${reqChain?.status}`);
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
      f => f.ruleId === 'RULE-APH-6.46.6' || f.field.includes('Renewal')
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
  recordTest('Regulatory Rules', 'FIXTURE-10', 'Progressive closure special case applies Clause 6.46.7 specific conditions', () => {
    const closureDocs = [validRequestDoc, validAffidavitDoc, validFdrDoc, validEoaDoc];
    const assessment = computeCaseAssessment({
      instrument: baseInstrument,
      documents: closureDocs,
      verifications: validClearances,
      releaseRequest: validReleaseReq,
      isProgressiveClosure: true,
      currentDate: new Date('2026-05-01'),
    });

    const closureReq = assessment.requirements.find(r => r.ruleId === 'RULE-APH-6.46.7');
    if (!closureReq) throw new Error('Expected RULE-APH-6.46.7 to be evaluated for progressive closure case');
    if (closureReq.status !== 'missing') {
      throw new Error(`Expected missing status for unattached University closure cert, got ${closureReq.status}`);
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
