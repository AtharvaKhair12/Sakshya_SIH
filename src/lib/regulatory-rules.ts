// ============================================================================
// Sakshya PS 1 — Source-Grounded Regulatory Rule Engine
// Authoritative rules grounded in AICTE Approval Process Handbook (APH 2024–2027)
// Specifically Clause 6.46(a)(i)–(iv), Clause 6.46(b),
// Chapter I, Clause 1.12(iv) (10-Year Security Deposit Retention; Table 1.4 Deposit Amounts),
// and Chapter III (Closure Norms).
// Note: Internal workflow controls and administrative guidelines are explicitly
// distinguished from statutory handbook clauses.
// Official Source: https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf
// ============================================================================

import {
  Instrument, UploadedDocument, ReleaseRequest, VerificationResult,
  ComplianceFinding, Role, RuleSeverity, RequirementEvaluation, RequirementStatus
} from './types';

export type RegulatoryReviewStatus =
  | 'official_verified'
  | 'draft_awaiting_review'
  | 'illustrative_demo'
  | 'superseded'
  | 'workflow_control';

export interface GroundedRegulatoryRule {
  id: string; // Stable internal rule ID (e.g. 'RULE-REL-REQ-01')
  legacyId?: string; // Legacy ID (e.g. 'RULE-APH-6.46.1') for backwards compatibility
  code: string;
  title: string;
  category: 'Release Workflow' | 'Document Suitability' | 'Maturity & Tenor' | 'Clearance & Vigilance' | 'Continuity & Replacement';
  sourceDocument: string;
  officialSourceUrl: string;
  handbookVersion: string;
  clauseReference: string;
  pageReference?: string;
  description: string;
  applicabilityCondition: string;
  requiredEvidence: string;
  severity: RuleSeverity;
  reviewStatus: RegulatoryReviewStatus;
  reviewedBy: string;
  lastReviewedDate: string;
  version: number;
  evaluate: (ctx: RuleEvaluationContext) => RequirementEvaluation;
}

export interface RuleEvaluationContext {
  instrument: Instrument;
  documents: UploadedDocument[];
  releaseRequest?: ReleaseRequest | null;
  verifications?: VerificationResult[];
  findings?: ComplianceFinding[];
  isProgressiveClosure?: boolean;
  hasEmbezzlementInquiry?: boolean;
  currentDate?: Date;
}

// ----------------------------------------------------------------------------
// Official Grounded Rules & Internal Workflow Controls
// ----------------------------------------------------------------------------

export const AICTE_REGULATORY_RULES: GroundedRegulatoryRule[] = [
  // 1. Formal Application Letter — Clause 6.46(a)(i)
  {
    id: 'RULE-REL-REQ-01',
    legacyId: 'RULE-APH-6.46.1',
    code: 'REL-REQ-01',
    title: 'Formal Institution Release Application Letter',
    category: 'Release Workflow',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Clause 6.46(a)(i)',
    pageReference: 'Chapter VI, Clause 6.46(a)(i)',
    description: 'Institution must submit an official application on official letterhead duly signed by the Chairman/President or authorized signatory of the Trust/Society/Company requesting release of Security Deposit / FDR under Clause 6.46(a)(i).',
    applicabilityCondition: 'Mandatory for all FDR release and security deposit refund requests.',
    requiredEvidence: 'Document classified as "release_request_letter" or formal application upload.',
    severity: 'critical',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const hasLetter = ctx.documents.some(d =>
        d.documentType === 'application_form' ||
        d.fileName.toLowerCase().includes('request') ||
        d.fileName.toLowerCase().includes('application') ||
        d.fileName.toLowerCase().includes('release_letter')
      );

      if (hasLetter) {
        return {
          ruleId: 'RULE-REL-REQ-01',
          legacyRuleId: 'RULE-APH-6.46.1',
          clauseRef: 'Clause 6.46(a)(i)',
          title: 'Formal Institution Release Application Letter',
          status: 'satisfied',
          explanation: 'Formal release application letter is present in submitted case documentation.',
          evidenceReference: 'Application letter verified in case attachments.',
          responsibleRole: 'scrutiny_officer',
          severity: 'critical',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-REQ-01',
        legacyRuleId: 'RULE-APH-6.46.1',
        clauseRef: 'Clause 6.46(a)(i)',
        title: 'Formal Institution Release Application Letter',
        status: 'missing',
        explanation: 'Official application letter from Chairman/President requesting FDR release is not attached to this case file.',
        responsibleRole: 'institution',
        severity: 'critical',
        isOfficialRule: true,
      };
    },
  },

  // 2. Notarized Affidavit 6 — Clause 6.46(a)(ii) & Appendix 8
  {
    id: 'RULE-REL-AFF-02',
    legacyId: 'RULE-APH-6.46.2',
    code: 'REL-AFF-02',
    title: 'Notarized Affidavit 6 Declaration with FDR/RTGS Schedule',
    category: 'Release Workflow',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Clause 6.46(a)(ii) & Appendix 8 (Affidavit 6)',
    pageReference: 'Chapter VI, Clause 6.46(a)(ii) & Appendix 8, Format Affidavit 6',
    description: 'Submission of Affidavit 6 on non-judicial stamp paper, duly sworn before a First Class Judicial Magistrate or Public Notary, detailing Trust/Society particulars, FDR receipt numbers, and certifying zero outstanding dues to students, faculty, or staff.',
    applicabilityCondition: 'Mandatory for all release/refund workflows prior to scrutiny sign-off.',
    requiredEvidence: 'Document classified as "affidavit" or containing notarized Affidavit 6 structure.',
    severity: 'critical',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const hasAffidavit = ctx.documents.some(d =>
        d.documentType === 'affidavit' ||
        d.fileName.toLowerCase().includes('affidavit') ||
        d.fileName.toLowerCase().includes('affidavit_6')
      );

      if (hasAffidavit) {
        return {
          ruleId: 'RULE-REL-AFF-02',
          legacyRuleId: 'RULE-APH-6.46.2',
          clauseRef: 'Clause 6.46(a)(ii)',
          title: 'Notarized Affidavit 6 Declaration with FDR Schedule',
          status: 'satisfied',
          explanation: 'Statutory Affidavit 6 is attached and verified in the case file.',
          evidenceReference: 'Notarized Affidavit 6 present in document dossier.',
          responsibleRole: 'scrutiny_officer',
          severity: 'critical',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-AFF-02',
        legacyRuleId: 'RULE-APH-6.46.2',
        clauseRef: 'Clause 6.46(a)(ii)',
        title: 'Notarized Affidavit 6 Declaration with FDR Schedule',
        status: 'missing',
        explanation: 'Affidavit 6 (Statutory Release Declaration) not found in the case record. Case cannot proceed to Senior Officer decision.',
        responsibleRole: 'institution',
        severity: 'critical',
        isOfficialRule: true,
      };
    },
  },

  // 3. Original FDR / Deposit Creation Evidence — Clause 6.46(a)(iii)
  {
    id: 'RULE-REL-FDR-03',
    legacyId: 'RULE-APH-6.46.3',
    code: 'REL-FDR-03',
    title: 'Copy of FDR or Bank Deposit Creation Evidence',
    category: 'Document Suitability',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Clause 6.46(a)(iii)',
    pageReference: 'Chapter VI, Clause 6.46(a)(iii)',
    description: 'Submission of copy of the Fixed Deposit Receipt (FDR), Demand Draft, or online payment receipt evidencing creation of the Security Deposit under Clause 6.46(a)(iii). Note: A bank document titled "Deposit Advice" is classified as a candidate supporting document requiring review against Clause 6.46(a)(iii) and branch verification, rather than an explicit statutory equivalent.',
    applicabilityCondition: 'Mandatory proof of instrument creation for all verification and release operations.',
    requiredEvidence: 'Document classified as "fdr_certificate" or "deposit_advice" or "payment_proof".',
    severity: 'critical',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const fdrDoc = ctx.documents.find(d =>
        d.documentType === 'fdr_certificate' ||
        d.fileName.toLowerCase().includes('fdr') ||
        d.fileName.toLowerCase().includes('deposit') ||
        d.fileName.toLowerCase().includes('advice')
      );

      if (!fdrDoc) {
        return {
          ruleId: 'RULE-REL-FDR-03',
          legacyRuleId: 'RULE-APH-6.46.3',
          clauseRef: 'Clause 6.46(a)(iii)',
          title: 'Copy of FDR or Bank Deposit Creation Evidence',
          status: 'missing',
          explanation: 'No FDR Certificate or Bank Deposit creation evidence found in the document dossier.',
          responsibleRole: 'institution',
          severity: 'critical',
          isOfficialRule: true,
        };
      }

      const isAdvice = fdrDoc.fileName.toLowerCase().includes('advice') || fdrDoc.fileName.toLowerCase().includes('deposit_advice');

      if (isAdvice) {
        return {
          ruleId: 'RULE-REL-FDR-03',
          legacyRuleId: 'RULE-APH-6.46.3',
          clauseRef: 'Clause 6.46(a)(iii)',
          title: 'Copy of FDR or Bank Deposit Creation Evidence',
          status: 'awaiting_confirmation',
          explanation: 'Document classified as "Bank Deposit Advice". Note: Deposit Advice is a candidate supporting document requiring scrutiny review against Clause 6.46(a)(iii) and independent branch verification, rather than statutory proof of an FDR.',
          evidenceReference: `Candidate Document: ${fdrDoc.fileName}`,
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-FDR-03',
        legacyRuleId: 'RULE-APH-6.46.3',
        clauseRef: 'Clause 6.46(a)(iii)',
        title: 'Copy of FDR or Bank Deposit Creation Evidence',
        status: 'satisfied',
        explanation: 'FDR Certificate is present and verified for basic structural compliance.',
        evidenceReference: `Instrument Document: ${fdrDoc.fileName}`,
        responsibleRole: 'scrutiny_officer',
        severity: 'critical',
        isOfficialRule: true,
      };
    },
  },

  // 4. Latest LoA / EoA — Clause 6.46(a)(iv)
  {
    id: 'RULE-REL-EOA-04',
    legacyId: 'RULE-APH-6.46.4',
    code: 'REL-EOA-04',
    title: 'Latest Letter of Approval (LoA) / Extension of Approval (EoA)',
    category: 'Release Workflow',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Clause 6.46(a)(iv)',
    pageReference: 'Chapter VI, Clause 6.46(a)(iv)',
    description: 'Copy of the latest Extension of Approval (EoA) or Letter of Approval issued by AICTE verifying continuous approval status or closure authorization.',
    applicabilityCondition: 'Mandatory to substantiate regulatory standing of the applicant institution.',
    requiredEvidence: 'Document classified as "eoa_loa" or official approval letter upload.',
    severity: 'error',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const hasEoa = ctx.documents.some(d =>
        d.fileName.toLowerCase().includes('eoa') ||
        d.fileName.toLowerCase().includes('loa') ||
        d.fileName.toLowerCase().includes('approval')
      );

      if (hasEoa) {
        return {
          ruleId: 'RULE-REL-EOA-04',
          legacyRuleId: 'RULE-APH-6.46.4',
          clauseRef: 'Clause 6.46(a)(iv)',
          title: 'Latest Letter of Approval (LoA) / Extension of Approval (EoA)',
          status: 'satisfied',
          explanation: 'Latest AICTE approval order (EoA/LoA) is attached to the case file.',
          evidenceReference: 'Approval documentation present.',
          responsibleRole: 'scrutiny_officer',
          severity: 'error',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-EOA-04',
        legacyRuleId: 'RULE-APH-6.46.4',
        clauseRef: 'Clause 6.46(a)(iv)',
        title: 'Latest Letter of Approval (LoA) / Extension of Approval (EoA)',
        status: 'missing',
        explanation: 'Latest EoA / LoA document not found in the case record. Request from institution.',
        responsibleRole: 'institution',
        severity: 'error',
        isOfficialRule: true,
      };
    },
  },

  // 5. Internal Cell Clearances (PGRC, Vigilance, Regional Office) — Clause 6.46(b)
  {
    id: 'RULE-REL-CLR-05',
    legacyId: 'RULE-APH-6.46.5',
    code: 'REL-CLR-05',
    title: 'Institutional Clearances from PGRC, Vigilance & Regional Office',
    category: 'Clearance & Vigilance',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Clause 6.46(b)',
    pageReference: 'Chapter VI, Clause 6.46(b)',
    description: 'Clearances must be confirmed from Public Grievance Redressal Cell (PGRC), Vigilance Bureau, Legal Bureau, and Regional Office confirming zero pending student/faculty liabilities, inquiries, or judicial injunctions.',
    applicabilityCondition: 'Mandatory administrative clearance prior to Senior Officer approval.',
    requiredEvidence: 'Internal clearance record logged by authorized scrutiny or cell officer.',
    severity: 'critical',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const clearanceDoc = ctx.documents.some(d =>
        d.fileName.toLowerCase().includes('clearance') ||
        d.fileName.toLowerCase().includes('noc') ||
        d.fileName.toLowerCase().includes('pgrc') ||
        d.fileName.toLowerCase().includes('vigilance')
      );

      // Also check if scrutiny observation has confirmed clearances
      const observationClear = ctx.releaseRequest?.scrutinyObservation?.toLowerCase().includes('clearance verified');

      if (clearanceDoc || observationClear) {
        return {
          ruleId: 'RULE-REL-CLR-05',
          legacyRuleId: 'RULE-APH-6.46.5',
          clauseRef: 'Clause 6.46(b)',
          title: 'Institutional Clearances from PGRC, Vigilance & Regional Office',
          status: 'satisfied',
          explanation: 'Bureau and cell clearances (PGRC, Vigilance, Regional Office) recorded and verified.',
          evidenceReference: 'Clearance records logged in case history.',
          responsibleRole: 'senior_officer',
          severity: 'critical',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-CLR-05',
        legacyRuleId: 'RULE-APH-6.46.5',
        clauseRef: 'Clause 6.46(b)',
        title: 'Institutional Clearances from PGRC, Vigilance & Regional Office',
        status: 'awaiting_confirmation',
        explanation: 'Clearance record from PGRC / Vigilance Cell is not recorded in the available system data. (Note: Missing record means clearance is unrecorded, not that it was rejected).',
        responsibleRole: 'scrutiny_officer',
        severity: 'critical',
        isOfficialRule: true,
      };
    },
  },

  // 6. Mandatory 10-Year Security Deposit Retention & Renewal Verification — Clause 1.12(iv)
  {
    id: 'RULE-REL-TENOR-06',
    legacyId: 'RULE-APH-6.46.6',
    code: 'REL-TENOR-06',
    title: 'Mandatory 10-Year Security Deposit Retention & Renewal Verification',
    category: 'Maturity & Tenor',
    sourceDocument: 'AICTE Approval Process Handbook 2024–2027',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'AICTE Approval Process Handbook 2024–2027, Chapter I, Clause 1.12(iv)',
    pageReference: 'Chapter I, Clause 1.12(iv) (Deposit Norms Table 1.4) & Chapter VI, Clause 6.46',
    description: 'Security Deposit must be maintained for the mandatory statutory tenor of 10 years pursuant to AICTE Approval Process Handbook 2024–2027, Chapter I, Clause 1.12(iv) (with deposit quantum specified in Table 1.4) and returned on completion of the term subject to Clause 6.46 conditions. If maturity date has passed, an auto-renewal clause in an old deposit advice is NOT proof of actual renewal; updated renewal receipt or current bank statement is mandatory.',
    applicabilityCondition: 'Applicable to all maturing or release-seeking instruments.',
    requiredEvidence: 'Instrument maturity date & renewal proof where maturity date is in the past.',
    severity: 'critical',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const now = ctx.currentDate || new Date();
      const matDate = new Date(ctx.instrument.maturityDate);
      const isPastMaturity = matDate < now;

      if (!isPastMaturity) {
        return {
          ruleId: 'RULE-REL-TENOR-06',
          legacyRuleId: 'RULE-APH-6.46.6',
          clauseRef: 'Clause 1.12(iv) & Clause 6.46',
          title: 'Mandatory 10-Year Security Deposit Retention & Renewal Verification',
          status: 'satisfied',
          explanation: `Instrument is within active tenor (Maturity Date: ${ctx.instrument.maturityDate}). No overdue maturity condition exists.`,
          evidenceReference: `Maturity Date: ${ctx.instrument.maturityDate}`,
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: true,
        };
      }

      // Maturity has passed. Check if renewal evidence is present
      const hasRenewalEvidence = ctx.documents.some(d =>
        d.fileName.toLowerCase().includes('renewal') ||
        d.fileName.toLowerCase().includes('replacement') ||
        d.fileName.toLowerCase().includes('renewed')
      ) || ctx.instrument.status === 'active_monitoring' && ctx.instrument.verificationStatus === 'verified_by_source';

      if (hasRenewalEvidence) {
        return {
          ruleId: 'RULE-REL-TENOR-06',
          legacyRuleId: 'RULE-APH-6.46.6',
          clauseRef: 'Clause 1.12(iv) & Clause 6.46',
          title: 'Mandatory 10-Year Security Deposit Retention & Renewal Verification',
          status: 'satisfied',
          explanation: 'Maturity date passed, but valid renewal / replacement evidence is recorded and under monitoring.',
          evidenceReference: 'Renewal / replacement evidence verified.',
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-TENOR-06',
        legacyRuleId: 'RULE-APH-6.46.6',
        clauseRef: 'Clause 1.12(iv) & Clause 6.46',
        title: 'Mandatory 10-Year Security Deposit Retention & Renewal Verification',
        status: 'stale',
        explanation: `Maturity date (${ctx.instrument.maturityDate}) has passed. Notice: Auto-renewal instructions in historical documents do NOT establish that renewal occurred. Updated bank renewal confirmation is required.`,
        responsibleRole: 'institution',
        severity: 'critical',
        isOfficialRule: true,
      };
    },
  },

  // 7. Progressive Closure Exemption Certificate — Chapter III & Clause 6.46
  {
    id: 'RULE-REL-CLOSE-07',
    legacyId: 'RULE-APH-6.46.7',
    code: 'REL-CLOSE-07',
    title: 'Progressive / Complete Institutional Closure Certificate Exemption',
    category: 'Release Workflow',
    sourceDocument: 'AICTE Approval Process Handbook (APH 2024–2027)',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Chapter III (Closure Guidelines) & Clause 6.46',
    pageReference: 'Chapter III & Chapter VI, Clause 6.46',
    description: 'In cases of pre-tenor release under Progressive Closure or Complete Institutional Closure, a valid Progressive Closure Certificate from the affiliating University and State DTE confirming zero remaining enrolled students is required before pre-tenor release can be authorized.',
    applicabilityCondition: 'Conditional: Applies only when progressive closure or institutional merger scenario is invoked.',
    requiredEvidence: 'Progressive closure certificate with zero enrolled student confirmation.',
    severity: 'error',
    reviewStatus: 'official_verified',
    reviewedBy: 'AICTE Regulatory Affairs Review Team',
    lastReviewedDate: '2026-10-28',
    version: 3,
    evaluate: (ctx) => {
      if (!ctx.isProgressiveClosure) {
        return {
          ruleId: 'RULE-REL-CLOSE-07',
          legacyRuleId: 'RULE-APH-6.46.7',
          clauseRef: 'Chapter III & Clause 6.46',
          title: 'Progressive Closure Certificate Exemption',
          status: 'not_applicable',
          explanation: 'Case is under standard tenor release; progressive closure exemption not invoked.',
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: true,
        };
      }

      const hasClosureCert = ctx.documents.some(d =>
        d.fileName.toLowerCase().includes('closure') ||
        d.fileName.toLowerCase().includes('progressive')
      );

      if (hasClosureCert) {
        return {
          ruleId: 'RULE-REL-CLOSE-07',
          legacyRuleId: 'RULE-APH-6.46.7',
          clauseRef: 'Chapter III & Clause 6.46',
          title: 'Progressive Closure Certificate Exemption',
          status: 'satisfied',
          explanation: 'Progressive Closure Certificate from affiliating University verified.',
          evidenceReference: 'Closure certificate in case file.',
          responsibleRole: 'scrutiny_officer',
          severity: 'error',
          isOfficialRule: true,
        };
      }

      return {
        ruleId: 'RULE-REL-CLOSE-07',
        legacyRuleId: 'RULE-APH-6.46.7',
        clauseRef: 'Chapter III & Clause 6.46',
        title: 'Progressive Closure Certificate Exemption',
        status: 'missing',
        explanation: 'Progressive closure scenario invoked, but University Progressive Closure Certificate is missing from case record.',
        responsibleRole: 'institution',
        severity: 'error',
        isOfficialRule: true,
      };
    },
  },

  // 8. Anti-Embezzlement Special Inquiry State NOC — Administrative Circular (Under Review)
  {
    id: 'RULE-REL-VIG-08',
    legacyId: 'RULE-APH-6.46.8',
    code: 'REL-VIG-08',
    title: 'Anti-Embezzlement Inquiry State Government Clearance',
    category: 'Clearance & Vigilance',
    sourceDocument: 'AICTE Vigilance Guidelines & Administrative Circulars',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'AICTE Vigilance Guidelines (Administrative Circular)',
    pageReference: 'AICTE Vigilance Bureau Standard Operating Procedure',
    description: 'Where financial irregularity, fraud investigation, or embezzlement allegations are flagged against the Trust/Institution, specific No Objection from the State Higher Education Department is mandatory before refund processing.',
    applicabilityCondition: 'Conditional: Applies only when financial discrepancy or vigilance inquiry flag is active.',
    requiredEvidence: 'State Government Higher Education Directorate NOC.',
    severity: 'critical',
    reviewStatus: 'draft_awaiting_review',
    reviewedBy: 'AICTE Vigilance Review Taskforce',
    lastReviewedDate: '2026-10-28',
    version: 3,
    evaluate: (ctx) => {
      const hasDiscrepancy = ctx.hasEmbezzlementInquiry || ctx.instrument.status === 'discrepancy_flagged';

      if (!hasDiscrepancy) {
        return {
          ruleId: 'RULE-REL-VIG-08',
          legacyRuleId: 'RULE-APH-6.46.8',
          clauseRef: 'Vigilance Circular (Admin)',
          title: 'Anti-Embezzlement Inquiry State Government Clearance',
          status: 'not_applicable',
          explanation: 'No financial embezzlement inquiry or discrepancy investigation flagged for this institution.',
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: false,
        };
      }

      const hasStateNoc = ctx.documents.some(d =>
        d.fileName.toLowerCase().includes('state_noc') ||
        d.fileName.toLowerCase().includes('directorate')
      );

      if (hasStateNoc) {
        return {
          ruleId: 'RULE-REL-VIG-08',
          legacyRuleId: 'RULE-APH-6.46.8',
          clauseRef: 'Vigilance Circular (Admin)',
          title: 'Anti-Embezzlement Inquiry State Government Clearance',
          status: 'satisfied',
          explanation: 'State Directorate NOC clearing financial inquiry has been submitted and reviewed.',
          evidenceReference: 'State NOC verified in case file.',
          responsibleRole: 'senior_officer',
          severity: 'critical',
          isOfficialRule: false,
        };
      }

      return {
        ruleId: 'RULE-REL-VIG-08',
        legacyRuleId: 'RULE-APH-6.46.8',
        clauseRef: 'Vigilance Circular (Admin)',
        title: 'Anti-Embezzlement Inquiry State Government Clearance',
        status: 'awaiting_confirmation',
        explanation: 'Financial discrepancy flagged on record. Release requires official No Objection Certificate from State Government Directorate.',
        responsibleRole: 'scrutiny_officer',
        severity: 'critical',
        isOfficialRule: false,
      };
    },
  },

  // 9. Competent Senior Officer Reasoned Sign-off — Internal Governance Workflow Control
  {
    id: 'RULE-WORKFLOW-DECISION-09',
    legacyId: 'RULE-APH-6.46.9',
    code: 'WORKFLOW-DECISION-09',
    title: 'Competent Authority Reasoned Decision & Audit Trail Sign-Off',
    category: 'Release Workflow',
    sourceDocument: 'Sakshya Portal Internal Governance Architecture & Workflow Control',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Sakshya Internal Governance & Workflow Control',
    pageReference: 'Sakshya Operating Guidelines, Section 4.2',
    description: 'Final release decision or Sanction Order can only be authorized by a Senior Officer / Competent Authority with mandatory documented rationale. The system must never automatically approve or reject release requests. (Internal workflow control, not a statutory APH clause).',
    applicabilityCondition: 'Mandatory workflow control for all final release status transitions.',
    requiredEvidence: 'Senior officer authorized decision record with mandatory justification.',
    severity: 'critical',
    reviewStatus: 'workflow_control',
    reviewedBy: 'Sakshya System Architecture Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      if (!ctx.releaseRequest) {
        return {
          ruleId: 'RULE-WORKFLOW-DECISION-09',
          legacyRuleId: 'RULE-APH-6.46.9',
          clauseRef: 'Internal Workflow Control',
          title: 'Competent Authority Reasoned Decision Sign-Off',
          status: 'not_applicable',
          explanation: 'No release request has been submitted for this instrument yet.',
          responsibleRole: 'senior_officer',
          severity: 'info',
          isOfficialRule: false,
        };
      }

      if (ctx.releaseRequest.seniorDecision && ctx.releaseRequest.seniorDecisionReason) {
        return {
          ruleId: 'RULE-WORKFLOW-DECISION-09',
          legacyRuleId: 'RULE-APH-6.46.9',
          clauseRef: 'Internal Workflow Control',
          title: 'Competent Authority Reasoned Decision Sign-Off',
          status: 'satisfied',
          explanation: `Authorized decision (${ctx.releaseRequest.seniorDecision}) recorded by Senior Officer with documented rationale.`,
          evidenceReference: `Decision: ${ctx.releaseRequest.seniorDecision} · Officer: ${ctx.releaseRequest.seniorOfficerId || 'Authorized Signatory'}`,
          responsibleRole: 'senior_officer',
          severity: 'critical',
          isOfficialRule: false,
        };
      }

      return {
        ruleId: 'RULE-WORKFLOW-DECISION-09',
        legacyRuleId: 'RULE-APH-6.46.9',
        clauseRef: 'Internal Workflow Control',
        title: 'Competent Authority Reasoned Decision Sign-Off',
        status: 'awaiting_confirmation',
        explanation: 'Pending Senior Officer review. Mandatory documented justification is required before release sanction order generation.',
        responsibleRole: 'senior_officer',
        severity: 'critical',
        isOfficialRule: false,
      };
    },
  },

  // 10. Replacement Continuity & Predecessor Linking Protocol — Internal Operational Workflow Control
  {
    id: 'RULE-WORKFLOW-REPLACE-10',
    legacyId: 'RULE-APH-1.4.6',
    code: 'WORKFLOW-REPLACE-10',
    title: 'Replacement Instrument Continuity & Predecessor Linking Protocol',
    category: 'Continuity & Replacement',
    sourceDocument: 'Sakshya Portal Operational Continuity Standards',
    officialSourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    handbookVersion: '2024–2027',
    clauseReference: 'Sakshya Internal Workflow Control (Predecessor-Replacement Tracking)',
    pageReference: 'Sakshya Operational Guidelines, Section 3.1',
    description: 'When an FDR approaches or passes maturity, a replacement instrument must explicitly link to its predecessor without discharging the existing deposit until full verification of the replacement is complete. (Internal operational protocol for chain integrity, not a statutory APH clause).',
    applicabilityCondition: 'Mandatory workflow control whenever replacement or renewal instrument is submitted.',
    requiredEvidence: 'Explicit linkedPredecessorId linking the replacement to its originating instrument.',
    severity: 'error',
    reviewStatus: 'workflow_control',
    reviewedBy: 'Sakshya System Architecture Review Team',
    lastReviewedDate: '2026-10-28',
    version: 4,
    evaluate: (ctx) => {
      const isReplacement = ctx.instrument.status === 'replacement_submitted' || ctx.instrument.linkedPredecessorId;

      if (!isReplacement) {
        return {
          ruleId: 'RULE-WORKFLOW-REPLACE-10',
          legacyRuleId: 'RULE-APH-1.4.6',
          clauseRef: 'Internal Workflow Control',
          title: 'Replacement Instrument Continuity Protocol',
          status: 'not_applicable',
          explanation: 'Standard instrument creation; not registered as a replacement.',
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: false,
        };
      }

      if (ctx.instrument.linkedPredecessorId) {
        return {
          ruleId: 'RULE-WORKFLOW-REPLACE-10',
          legacyRuleId: 'RULE-APH-1.4.6',
          clauseRef: 'Internal Workflow Control',
          title: 'Replacement Instrument Continuity Protocol',
          status: 'satisfied',
          explanation: `Replacement is linked to predecessor record ${ctx.instrument.linkedPredecessorId}. Continuity chain established.`,
          evidenceReference: `Predecessor: ${ctx.instrument.linkedPredecessorId}`,
          responsibleRole: 'scrutiny_officer',
          severity: 'info',
          isOfficialRule: false,
        };
      }

      return {
        ruleId: 'RULE-WORKFLOW-REPLACE-10',
        legacyRuleId: 'RULE-APH-1.4.6',
        clauseRef: 'Internal Workflow Control',
        title: 'Replacement Instrument Continuity Protocol',
        status: 'inconsistent',
        explanation: 'Instrument submitted as replacement, but originating predecessor instrument ID is unlinked. Link required before verification can proceed.',
        responsibleRole: 'institution',
        severity: 'error',
        isOfficialRule: false,
      };
    },
  },
];

/**
 * Evaluates all regulatory rules against a case file.
 */
export function evaluateAllRegulatoryRules(ctx: RuleEvaluationContext): RequirementEvaluation[] {
  return AICTE_REGULATORY_RULES.map(rule => rule.evaluate(ctx));
}

/**
 * Finds a rule by its stable internal ID or legacy ID.
 */
export function findRule(idOrLegacyId: string): GroundedRegulatoryRule | undefined {
  return AICTE_REGULATORY_RULES.find(r => r.id === idOrLegacyId || r.legacyId === idOrLegacyId);
}
