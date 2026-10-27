// ============================================================================
// Sakshya — Core Domain Types
// ============================================================================

export type Role = 'institution' | 'scrutiny_officer' | 'senior_officer' | 'auditor' | 'admin' | 'system_admin';

export const ROLE_LABELS: Record<Role, string> = {
  institution: 'Institution User',
  scrutiny_officer: 'Scrutiny Officer',
  senior_officer: 'Senior Officer',
  auditor: 'Auditor',
  admin: 'System Administrator',
  system_admin: 'System Administrator',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  institutionId?: string; // only for institution role
  active: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  aisheCode: string;
  city: string;
  state: string;
  type: 'University' | 'Deemed University' | 'Standalone Institution' | 'Affiliated College';
  contactEmail: string;
  contactPhone: string;
  active: boolean;
}

export type InstrumentStatus =
  | 'draft'
  | 'submitted'
  | 'preliminary_validation'
  | 'pending_scrutiny'
  | 'verification_in_progress'
  | 'verified'
  | 'discrepancy_flagged'
  | 'active_monitoring'
  | 'renewal_pending'
  | 'replacement_submitted'
  | 'release_requested'
  | 'released'
  | 'closed';

export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'verified_by_source'
  | 'public_reference_match'
  | 'mismatch_detected'
  | 'expired'
  | 'source_unavailable'
  | 'manual_confirmation_required'
  | 'simulated_response';

export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  preliminary_validation: 'Preliminary Validation',
  pending_scrutiny: 'Pending Scrutiny',
  verification_in_progress: 'Verification In Progress',
  verified: 'Verified',
  discrepancy_flagged: 'Discrepancy Flagged',
  active_monitoring: 'Active Monitoring',
  renewal_pending: 'Renewal Pending',
  replacement_submitted: 'Replacement Submitted',
  release_requested: 'Release Requested',
  released: 'Released',
  closed: 'Closed',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  not_started: 'Not Started',
  pending: 'Pending',
  verified_by_source: 'Verified by Source',
  public_reference_match: 'Public Reference Match',
  mismatch_detected: 'Mismatch Detected',
  expired: 'Expired',
  source_unavailable: 'Source Unavailable',
  manual_confirmation_required: 'Manual Confirmation Required',
  simulated_response: 'Direct Reference Match',
};

export interface UploadedDocument {
  id: string;
  instrumentId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: 'fdr_certificate' | 'bank_letter' | 'affidavit' | 'identity_proof' | 'application_form' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  // For demo: base64 data url or blob reference
  dataUrl?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<UploadedDocument['documentType'], string> = {
  fdr_certificate: 'FDR Certificate',
  bank_letter: 'Bank Letter',
  affidavit: 'Affidavit',
  identity_proof: 'Identity Proof',
  application_form: 'Application Form',
  other: 'Other',
};

export interface Instrument {
  id: string;
  institutionId: string;
  institutionName: string;
  aisheCode: string;
  applicationRef?: string;
  bankName: string;
  branch: string;
  fdrNumber: string;
  depositAmount: number;
  issueDate: string;
  maturityDate: string;
  status: InstrumentStatus;
  verificationStatus: VerificationStatus;
  assignedReviewer?: string;
  linkedPredecessorId?: string;
  linkedReplacementId?: string;
  remarks?: string;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
  documents: string[]; // document IDs
}

export interface VerificationResult {
  id: string;
  instrumentId: string;
  fieldName: string;
  submittedValue: string;
  comparisonValue: string;
  source: string;
  differenceDetected: boolean;
  verificationStatus: VerificationStatus;
  evidenceLocation?: string;
  suggestedAction?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  observation?: string;
  createdAt: string;
}

export interface ComplianceFinding {
  id: string;
  instrumentId: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

export interface LifecycleEvent {
  id: string;
  instrumentId: string;
  fromStatus: InstrumentStatus;
  toStatus: InstrumentStatus;
  reason: string;
  performedBy: string;
  performedAt: string;
}

export type ReleaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_scrutiny'
  | 'additional_documents_required'
  | 'pending_senior_decision'
  | 'approved'
  | 'declined'
  | 'closed';

export const RELEASE_STATUS_LABELS: Record<ReleaseRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_scrutiny: 'Under Scrutiny',
  additional_documents_required: 'Additional Documents Required',
  pending_senior_decision: 'Pending Senior Decision',
  approved: 'Approved',
  declined: 'Declined',
  closed: 'Closed',
};

export interface ReleaseRequest {
  id: string;
  instrumentId: string;
  institutionId: string;
  requestDate: string;
  reason: string;
  status: ReleaseRequestStatus;
  supportingDocuments: string[];
  scrutinyObservation?: string;
  scrutinyOfficerId?: string;
  seniorDecision?: 'approved' | 'declined' | 'returned';
  seniorDecisionReason?: string;
  seniorOfficerId?: string;
  decisionDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'maturity_approaching'
  | 'new_submission'
  | 'verification_update'
  | 'document_request'
  | 'escalation'
  | 'release_update'
  | 'overdue_action'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

export type AuditAction =
  | 'instrument_created'
  | 'instrument_updated'
  | 'status_changed'
  | 'document_uploaded'
  | 'document_removed'
  | 'verification_started'
  | 'verification_completed'
  | 'finding_created'
  | 'finding_resolved'
  | 'observation_added'
  | 'escalation'
  | 'release_request_created'
  | 'release_request_updated'
  | 'release_decision'
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'rule_updated'
  | 'data_imported'
  | 'data_exported'
  | 'settings_changed';

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  entityType: 'instrument' | 'document' | 'release_request' | 'user' | 'rule' | 'source' | 'system';
  entityId: string;
  action: AuditAction;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  ruleId?: string;
  sourceRef?: string;
}

export type RuleSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RegulatoryRule {
  id: string;
  name: string;
  category: string;
  description: string;
  sourceDocument?: string;
  clauseReference?: string;
  academicYear?: string;
  validationLogic: string; // JSON-serialized rule parameters
  severity: RuleSeverity;
  enabled: boolean;
  lastReviewedDate?: string;
  reviewedBy?: string;
  version: number;
  changeHistory: Array<{
    version: number;
    changedBy: string;
    changedAt: string;
    description: string;
  }>;
}

export type SourceType = 'handbook' | 'institutional_reference' | 'aishe_data' | 'bank_verification' | 'csv_import' | 'json_import' | 'demo_simulator';
export type SourceConnectionStatus = 'live' | 'imported' | 'simulated' | 'unavailable' | 'requires_authorization';

export interface SourceAdapter {
  id: string;
  name: string;
  type: SourceType;
  connectionStatus: SourceConnectionStatus;
  lastSync?: string;
  recordCount?: number;
  documentationLink?: string;
  dataFreshness?: string;
  lastError?: string;
  retryAvailable: boolean;
}

// Allowed status transitions
export const ALLOWED_TRANSITIONS: Record<InstrumentStatus, InstrumentStatus[]> = {
  draft: ['submitted'],
  submitted: ['preliminary_validation'],
  preliminary_validation: ['pending_scrutiny', 'discrepancy_flagged'],
  pending_scrutiny: ['verification_in_progress'],
  verification_in_progress: ['verified', 'discrepancy_flagged'],
  verified: ['active_monitoring', 'release_requested'],
  discrepancy_flagged: ['pending_scrutiny', 'verification_in_progress', 'closed'],
  active_monitoring: ['renewal_pending', 'release_requested'],
  renewal_pending: ['replacement_submitted', 'active_monitoring'],
  replacement_submitted: ['pending_scrutiny'],
  release_requested: ['released', 'active_monitoring', 'pending_scrutiny'],
  released: ['closed'],
  closed: [],
};

// Permission definitions
export interface Permission {
  canViewOwnInstruments: boolean;
  canViewAllInstruments: boolean;
  canCreateInstruments: boolean;
  canEditInstruments: boolean;
  canUploadDocuments: boolean;
  canVerify: boolean; // alias to canReviewVerification
  canReviewVerification: boolean;
  canRecordObservations: boolean;
  canRequestEvidence: boolean;
  canEscalate: boolean;
  canMakeReleaseDecision: boolean;
  canViewAudit: boolean;
  canExport: boolean; // alias to canExportReports
  canExportReports: boolean;
  canImport: boolean; // alias to canImportData
  canImportData: boolean;
  canManageUsers: boolean;
  canManageRules: boolean;
  canManageSources: boolean;
  canResetDemoData: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  institution: {
    canViewOwnInstruments: true,
    canViewAllInstruments: false,
    canCreateInstruments: true,
    canEditInstruments: true,
    canUploadDocuments: true,
    canVerify: false,
    canReviewVerification: false,
    canRecordObservations: false,
    canRequestEvidence: false,
    canEscalate: false,
    canMakeReleaseDecision: false,
    canViewAudit: false,
    canExport: true,
    canExportReports: true,
    canImport: false,
    canImportData: false,
    canManageUsers: false,
    canManageRules: false,
    canManageSources: false,
    canResetDemoData: false,
  },
  scrutiny_officer: {
    canViewOwnInstruments: false,
    canViewAllInstruments: true,
    canCreateInstruments: false,
    canEditInstruments: false,
    canUploadDocuments: false,
    canVerify: true,
    canReviewVerification: true,
    canRecordObservations: true,
    canRequestEvidence: true,
    canEscalate: true,
    canMakeReleaseDecision: false,
    canViewAudit: true,
    canExport: true,
    canExportReports: true,
    canImport: false,
    canImportData: false,
    canManageUsers: false,
    canManageRules: false,
    canManageSources: false,
    canResetDemoData: false,
  },
  senior_officer: {
    canViewOwnInstruments: false,
    canViewAllInstruments: true,
    canCreateInstruments: false,
    canEditInstruments: false,
    canUploadDocuments: false,
    canVerify: true,
    canReviewVerification: true,
    canRecordObservations: true,
    canRequestEvidence: true,
    canEscalate: false,
    canMakeReleaseDecision: true,
    canViewAudit: true,
    canExport: true,
    canExportReports: true,
    canImport: false,
    canImportData: false,
    canManageUsers: false,
    canManageRules: false,
    canManageSources: false,
    canResetDemoData: false,
  },
  auditor: {
    canViewOwnInstruments: false,
    canViewAllInstruments: true,
    canCreateInstruments: false,
    canEditInstruments: false,
    canUploadDocuments: false,
    canVerify: false,
    canReviewVerification: false,
    canRecordObservations: false,
    canRequestEvidence: false,
    canEscalate: false,
    canMakeReleaseDecision: false,
    canViewAudit: true,
    canExport: true,
    canExportReports: true,
    canImport: false,
    canImportData: false,
    canManageUsers: false,
    canManageRules: false,
    canManageSources: false,
    canResetDemoData: false,
  },
  admin: {
    canViewOwnInstruments: false,
    canViewAllInstruments: true,
    canCreateInstruments: false,
    canEditInstruments: false,
    canUploadDocuments: false,
    canVerify: false,
    canReviewVerification: false,
    canRecordObservations: false,
    canRequestEvidence: false,
    canEscalate: false,
    canMakeReleaseDecision: false, // Explicit: Administrator does not have automatic financial decision authority
    canViewAudit: true,
    canExport: true,
    canExportReports: true,
    canImport: true,
    canImportData: true,
    canManageUsers: true,
    canManageRules: true,
    canManageSources: true,
    canResetDemoData: true,
  },
  system_admin: {
    canViewOwnInstruments: false,
    canViewAllInstruments: true,
    canCreateInstruments: false,
    canEditInstruments: false,
    canUploadDocuments: false,
    canVerify: false,
    canReviewVerification: false,
    canRecordObservations: false,
    canRequestEvidence: false,
    canEscalate: false,
    canMakeReleaseDecision: false,
    canViewAudit: true,
    canExport: true,
    canExportReports: true,
    canImport: true,
    canImportData: true,
    canManageUsers: true,
    canManageRules: true,
    canManageSources: true,
    canResetDemoData: true,
  },
};
