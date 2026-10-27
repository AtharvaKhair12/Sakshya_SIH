// ============================================================================
// Sakshya — Demo Data Seed
// Fictional data for demonstration purposes only.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  User, Institution, Instrument, UploadedDocument, VerificationResult,
  ComplianceFinding, LifecycleEvent, ReleaseRequest, Notification,
  AuditEvent, RegulatoryRule, SourceAdapter, Role,
} from './types';

// ── Institutions ──
export const DEMO_INSTITUTIONS: Institution[] = [
  { id: 'inst-001', name: 'Vidya Bharati Institute of Technology', aisheCode: 'C-12345', city: 'Pune', state: 'Maharashtra', type: 'Standalone Institution', contactEmail: 'admin@vbit.edu.in', contactPhone: '020-25001234', active: true },
  { id: 'inst-002', name: 'Lakshmi Narain College of Engineering', aisheCode: 'C-23456', city: 'Bhopal', state: 'Madhya Pradesh', type: 'Affiliated College', contactEmail: 'office@lnce.edu.in', contactPhone: '0755-2530001', active: true },
  { id: 'inst-003', name: 'Saraswati University of Applied Sciences', aisheCode: 'U-34567', city: 'Jaipur', state: 'Rajasthan', type: 'Deemed University', contactEmail: 'registrar@suas.ac.in', contactPhone: '0141-2720001', active: true },
  { id: 'inst-004', name: 'Ganga Technical College', aisheCode: 'C-45678', city: 'Varanasi', state: 'Uttar Pradesh', type: 'Affiliated College', contactEmail: 'principal@gtc.edu.in', contactPhone: '0542-2310001', active: true },
  { id: 'inst-005', name: 'Kaveri Institute of Management', aisheCode: 'C-56789', city: 'Mysuru', state: 'Karnataka', type: 'Standalone Institution', contactEmail: 'director@kim.edu.in', contactPhone: '0821-2450001', active: true },
  { id: 'inst-006', name: 'Narmada College of Pharmacy', aisheCode: 'C-67890', city: 'Indore', state: 'Madhya Pradesh', type: 'Affiliated College', contactEmail: 'dean@ncp.edu.in', contactPhone: '0731-2550001', active: true },
  { id: 'inst-007', name: 'Tapi Engineering & Research Institute', aisheCode: 'C-78901', city: 'Surat', state: 'Gujarat', type: 'Standalone Institution', contactEmail: 'info@teri.edu.in', contactPhone: '0261-2370001', active: true },
  { id: 'inst-008', name: 'Godavari University', aisheCode: 'U-89012', city: 'Nashik', state: 'Maharashtra', type: 'University', contactEmail: 'vc@godavariuni.ac.in', contactPhone: '0253-2400001', active: true },
];

// ── Users ──
export const DEMO_USERS: User[] = [
  { id: 'user-001', name: 'Dr. Meera Sharma', email: 'meera.sharma@vbit.edu.in', role: 'institution', institutionId: 'inst-001', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-002', name: 'Prof. Rajesh Patel', email: 'rajesh.patel@lnce.edu.in', role: 'institution', institutionId: 'inst-002', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-003', name: 'Ananya Iyer', email: 'ananya.iyer@aicte-demo.in', role: 'scrutiny_officer', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-004', name: 'Vikram Deshmukh', email: 'vikram.deshmukh@aicte-demo.in', role: 'scrutiny_officer', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-005', name: 'Dr. Suresh Reddy', email: 'suresh.reddy@aicte-demo.in', role: 'senior_officer', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-006', name: 'Kavita Nair', email: 'kavita.nair@audit-demo.in', role: 'auditor', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-007', name: 'Amit Kulkarni', email: 'amit.kulkarni@admin-demo.in', role: 'admin', active: true, createdAt: '2025-06-15T10:00:00Z' },
  { id: 'user-008', name: 'Dr. Priya Menon', email: 'priya.menon@suas.ac.in', role: 'institution', institutionId: 'inst-003', active: true, createdAt: '2025-07-01T10:00:00Z' },
];

const now = new Date();
const fmt = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const daysAgo = (n: number) => daysFromNow(-n);

// ── Instruments ──
export const DEMO_INSTRUMENTS: Instrument[] = [
  {
    id: 'FDR-2025-0001', institutionId: 'inst-001', institutionName: 'Vidya Bharati Institute of Technology',
    aisheCode: 'C-12345', applicationRef: 'APP/2025/001', bankName: 'State Bank of India',
    branch: 'Pune Main Branch', fdrNumber: 'SBI-FDR-90001234', depositAmount: 2500000,
    issueDate: '2024-08-15', maturityDate: daysFromNow(25).split('T')[0],
    status: 'active_monitoring', verificationStatus: 'verified_by_source',
    assignedReviewer: 'user-003', submittedBy: 'user-001', submittedAt: daysAgo(120),
    updatedAt: daysAgo(30), documents: ['doc-001', 'doc-002'], remarks: 'Annual security deposit for approval cycle 2025-26.',
  },
  {
    id: 'FDR-2025-0002', institutionId: 'inst-002', institutionName: 'Lakshmi Narain College of Engineering',
    aisheCode: 'C-23456', applicationRef: 'APP/2025/002', bankName: 'Bank of Baroda',
    branch: 'Bhopal Civil Lines', fdrNumber: 'BOB-FDR-45006789', depositAmount: 1500000,
    issueDate: '2024-09-01', maturityDate: daysFromNow(7).split('T')[0],
    status: 'active_monitoring', verificationStatus: 'verified_by_source',
    assignedReviewer: 'user-003', submittedBy: 'user-002', submittedAt: daysAgo(100),
    updatedAt: daysAgo(45), documents: ['doc-003'], remarks: '',
  },
  {
    id: 'FDR-2025-0003', institutionId: 'inst-003', institutionName: 'Saraswati University of Applied Sciences',
    aisheCode: 'U-34567', applicationRef: 'APP/2025/003', bankName: 'Punjab National Bank',
    branch: 'Jaipur MI Road', fdrNumber: 'PNB-FDR-78123456', depositAmount: 5000000,
    issueDate: '2024-07-01', maturityDate: daysAgo(10).split('T')[0],
    status: 'renewal_pending', verificationStatus: 'verified_by_source',
    assignedReviewer: 'user-004', submittedBy: 'user-008', submittedAt: daysAgo(180),
    updatedAt: daysAgo(5), documents: ['doc-004', 'doc-005'],
    remarks: 'Matured — awaiting renewal or replacement submission.',
  },
  {
    id: 'FDR-2025-0004', institutionId: 'inst-004', institutionName: 'Ganga Technical College',
    aisheCode: 'C-45678', bankName: 'Union Bank of India',
    branch: 'Varanasi Cantonment', fdrNumber: 'UBI-FDR-33098765', depositAmount: 1000000,
    issueDate: '2025-01-10', maturityDate: daysFromNow(90).split('T')[0],
    status: 'verification_in_progress', verificationStatus: 'pending',
    assignedReviewer: 'user-003', submittedBy: 'user-001', submittedAt: daysAgo(14),
    updatedAt: daysAgo(2), documents: ['doc-006'],
    remarks: 'Pending verification — submitted on behalf of institution.',
  },
  {
    id: 'FDR-2025-0005', institutionId: 'inst-005', institutionName: 'Kaveri Institute of Management',
    aisheCode: 'C-56789', bankName: 'Canara Bank',
    branch: 'Mysuru Saraswathipuram', fdrNumber: 'CAN-FDR-55012345', depositAmount: 2000000,
    issueDate: '2025-02-01', maturityDate: daysFromNow(180).split('T')[0],
    status: 'discrepancy_flagged', verificationStatus: 'mismatch_detected',
    assignedReviewer: 'user-004', submittedBy: 'user-001', submittedAt: daysAgo(60),
    updatedAt: daysAgo(3), documents: ['doc-007', 'doc-008'],
    remarks: 'Amount mismatch detected between FDR certificate and affidavit.',
  },
  {
    id: 'FDR-2025-0006', institutionId: 'inst-006', institutionName: 'Narmada College of Pharmacy',
    aisheCode: 'C-67890', bankName: 'HDFC Bank',
    branch: 'Indore Palasia', fdrNumber: 'HDFC-FDR-99087654', depositAmount: 1200000,
    issueDate: '2025-03-15', maturityDate: daysFromNow(15).split('T')[0],
    status: 'pending_scrutiny', verificationStatus: 'not_started',
    assignedReviewer: 'user-003', submittedBy: 'user-001', submittedAt: daysAgo(7),
    updatedAt: daysAgo(7), documents: [],
    remarks: 'Supporting documents not yet uploaded.',
  },
  {
    id: 'FDR-2025-0007', institutionId: 'inst-007', institutionName: 'Tapi Engineering & Research Institute',
    aisheCode: 'C-78901', bankName: 'ICICI Bank',
    branch: 'Surat Ring Road', fdrNumber: 'ICICI-FDR-11223344', depositAmount: 3000000,
    issueDate: '2024-06-01', maturityDate: daysAgo(30).split('T')[0],
    status: 'release_requested', verificationStatus: 'verified_by_source',
    assignedReviewer: 'user-004', submittedBy: 'user-001', submittedAt: daysAgo(200),
    updatedAt: daysAgo(1), documents: ['doc-009', 'doc-010'],
    remarks: 'Release request pending senior decision.',
  },
  {
    id: 'FDR-2025-0008', institutionId: 'inst-001', institutionName: 'Vidya Bharati Institute of Technology',
    aisheCode: 'C-12345', bankName: 'State Bank of India',
    branch: 'Pune Main Branch', fdrNumber: 'SBI-FDR-90005678', depositAmount: 2500000,
    issueDate: '2025-05-01', maturityDate: daysFromNow(300).split('T')[0],
    status: 'submitted', verificationStatus: 'not_started',
    linkedPredecessorId: 'FDR-2025-0001',
    submittedBy: 'user-001', submittedAt: daysAgo(3),
    updatedAt: daysAgo(3), documents: ['doc-011'],
    remarks: 'Replacement FDR for FDR-2025-0001.',
  },
  {
    id: 'FDR-2025-0009', institutionId: 'inst-008', institutionName: 'Godavari University',
    aisheCode: 'U-89012', bankName: 'Bank of Maharashtra',
    branch: 'Nashik College Road', fdrNumber: 'BOM-FDR-77654321', depositAmount: 4000000,
    issueDate: '2024-10-01', maturityDate: daysFromNow(60).split('T')[0],
    status: 'verified', verificationStatus: 'verified_by_source',
    assignedReviewer: 'user-003', submittedBy: 'user-008', submittedAt: daysAgo(150),
    updatedAt: daysAgo(20), documents: ['doc-012', 'doc-013'],
    remarks: 'Verified and under active monitoring.',
  },
  {
    id: 'FDR-2025-0010', institutionId: 'inst-002', institutionName: 'Lakshmi Narain College of Engineering',
    aisheCode: 'C-23456', bankName: 'Bank of Baroda',
    branch: 'Bhopal New Market', fdrNumber: 'BOB-FDR-45006789', depositAmount: 1800000,
    issueDate: '2025-04-01', maturityDate: daysFromNow(200).split('T')[0],
    status: 'submitted', verificationStatus: 'not_started',
    submittedBy: 'user-002', submittedAt: daysAgo(5),
    updatedAt: daysAgo(5), documents: ['doc-014'],
    remarks: 'Duplicate FDR number — same as FDR-2025-0002.',
  },
  // Additional instruments for volume
  ...Array.from({ length: 15 }, (_, i) => {
    const instIdx = i % 8;
    const inst = DEMO_INSTITUTIONS[instIdx];
    const statuses: Instrument['status'][] = ['active_monitoring', 'verified', 'pending_scrutiny', 'submitted', 'verification_in_progress'];
    const verStatuses: Instrument['verificationStatus'][] = ['verified_by_source', 'pending', 'not_started', 'simulated_response', 'public_reference_match'];
    const banks = ['State Bank of India', 'Bank of Baroda', 'Punjab National Bank', 'HDFC Bank', 'ICICI Bank', 'Canara Bank', 'Union Bank of India', 'Bank of Maharashtra'];
    return {
      id: `FDR-2025-${String(11 + i).padStart(4, '0')}`,
      institutionId: inst.id,
      institutionName: inst.name,
      aisheCode: inst.aisheCode,
      bankName: banks[i % banks.length],
      branch: `${inst.city} Branch ${i + 1}`,
      fdrNumber: `FDR-${String(10000000 + i * 1111).padStart(8, '0')}`,
      depositAmount: (1000000 + (i * 500000)) % 8000000 + 500000,
      issueDate: `2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
      maturityDate: daysFromNow(30 + i * 20).split('T')[0],
      status: statuses[i % statuses.length],
      verificationStatus: verStatuses[i % verStatuses.length],
      assignedReviewer: i % 2 === 0 ? 'user-003' : 'user-004',
      submittedBy: `user-00${(instIdx % 3) + 1}`,
      submittedAt: daysAgo(30 + i * 5),
      updatedAt: daysAgo(i + 1),
      documents: [],
      remarks: '',
    } as Instrument;
  }),
];

// ── Documents ──
export const DEMO_DOCUMENTS: UploadedDocument[] = [
  { id: 'doc-001', instrumentId: 'FDR-2025-0001', fileName: 'FDR_Certificate_SBI.pdf', fileSize: 245000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-001', uploadedAt: daysAgo(120) },
  { id: 'doc-002', instrumentId: 'FDR-2025-0001', fileName: 'Bank_Letter_SBI.pdf', fileSize: 180000, fileType: 'application/pdf', documentType: 'bank_letter', uploadedBy: 'user-001', uploadedAt: daysAgo(120) },
  { id: 'doc-003', instrumentId: 'FDR-2025-0002', fileName: 'FDR_Certificate_BOB.pdf', fileSize: 210000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-002', uploadedAt: daysAgo(100) },
  { id: 'doc-004', instrumentId: 'FDR-2025-0003', fileName: 'FDR_Certificate_PNB.pdf', fileSize: 320000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-008', uploadedAt: daysAgo(180) },
  { id: 'doc-005', instrumentId: 'FDR-2025-0003', fileName: 'Affidavit_SUAS.pdf', fileSize: 150000, fileType: 'application/pdf', documentType: 'affidavit', uploadedBy: 'user-008', uploadedAt: daysAgo(180) },
  { id: 'doc-006', instrumentId: 'FDR-2025-0004', fileName: 'FDR_Certificate_UBI.jpg', fileSize: 890000, fileType: 'image/jpeg', documentType: 'fdr_certificate', uploadedBy: 'user-001', uploadedAt: daysAgo(14) },
  { id: 'doc-007', instrumentId: 'FDR-2025-0005', fileName: 'FDR_Certificate_Canara.pdf', fileSize: 275000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-001', uploadedAt: daysAgo(60) },
  { id: 'doc-008', instrumentId: 'FDR-2025-0005', fileName: 'Affidavit_KIM.pdf', fileSize: 140000, fileType: 'application/pdf', documentType: 'affidavit', uploadedBy: 'user-001', uploadedAt: daysAgo(60) },
  { id: 'doc-009', instrumentId: 'FDR-2025-0007', fileName: 'FDR_Certificate_ICICI.pdf', fileSize: 195000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-001', uploadedAt: daysAgo(200) },
  { id: 'doc-010', instrumentId: 'FDR-2025-0007', fileName: 'Release_Application.pdf', fileSize: 160000, fileType: 'application/pdf', documentType: 'application_form', uploadedBy: 'user-001', uploadedAt: daysAgo(10) },
  { id: 'doc-011', instrumentId: 'FDR-2025-0008', fileName: 'FDR_Replacement_SBI.pdf', fileSize: 230000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-001', uploadedAt: daysAgo(3) },
  { id: 'doc-012', instrumentId: 'FDR-2025-0009', fileName: 'FDR_Certificate_BOM.pdf', fileSize: 310000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-008', uploadedAt: daysAgo(150) },
  { id: 'doc-013', instrumentId: 'FDR-2025-0009', fileName: 'Bank_Verification_BOM.pdf', fileSize: 175000, fileType: 'application/pdf', documentType: 'bank_letter', uploadedBy: 'user-008', uploadedAt: daysAgo(150) },
  { id: 'doc-014', instrumentId: 'FDR-2025-0010', fileName: 'FDR_Certificate_BOB_2.pdf', fileSize: 220000, fileType: 'application/pdf', documentType: 'fdr_certificate', uploadedBy: 'user-002', uploadedAt: daysAgo(5) },
];

// ── Verification Results ──
export const DEMO_VERIFICATIONS: VerificationResult[] = [
  {
    id: 'ver-001', instrumentId: 'FDR-2025-0001', fieldName: 'Deposit Amount',
    submittedValue: '₹25,00,000', comparisonValue: '₹25,00,000', source: 'SBI Branch Verification (Simulated)',
    differenceDetected: false, verificationStatus: 'simulated_response',
    reviewedBy: 'user-003', reviewedAt: daysAgo(90), observation: 'Amount matches simulated bank record.',
    createdAt: daysAgo(100),
  },
  {
    id: 'ver-002', instrumentId: 'FDR-2025-0001', fieldName: 'FDR Number',
    submittedValue: 'SBI-FDR-90001234', comparisonValue: 'SBI-FDR-90001234', source: 'SBI Branch Verification (Simulated)',
    differenceDetected: false, verificationStatus: 'simulated_response',
    reviewedBy: 'user-003', reviewedAt: daysAgo(90), observation: 'FDR number matches.',
    createdAt: daysAgo(100),
  },
  {
    id: 'ver-003', instrumentId: 'FDR-2025-0005', fieldName: 'Deposit Amount',
    submittedValue: '₹20,00,000', comparisonValue: '₹18,50,000', source: 'Affidavit Cross-Check',
    differenceDetected: true, verificationStatus: 'mismatch_detected',
    reviewedBy: 'user-004', reviewedAt: daysAgo(3),
    observation: 'The FDR certificate states ₹20,00,000 but the accompanying affidavit declares ₹18,50,000. Discrepancy of ₹1,50,000 needs clarification from institution.',
    createdAt: daysAgo(5),
  },
  {
    id: 'ver-004', instrumentId: 'FDR-2025-0004', fieldName: 'Maturity Date',
    submittedValue: daysFromNow(90).split('T')[0], comparisonValue: 'Pending', source: 'Bank Verification (Not yet initiated)',
    differenceDetected: false, verificationStatus: 'pending',
    createdAt: daysAgo(10),
  },
  {
    id: 'ver-005', instrumentId: 'FDR-2025-0010', fieldName: 'FDR Number',
    submittedValue: 'BOB-FDR-45006789', comparisonValue: 'BOB-FDR-45006789 (FDR-2025-0002)', source: 'Internal Duplicate Check',
    differenceDetected: true, verificationStatus: 'mismatch_detected',
    observation: 'Duplicate FDR number detected. Same receipt identifier as FDR-2025-0002.',
    createdAt: daysAgo(4),
  },
];

// ── Compliance Findings ──
export const DEMO_FINDINGS: ComplianceFinding[] = [
  {
    id: 'find-001', instrumentId: 'FDR-2025-0005', ruleId: 'rule-001', ruleName: 'Amount Consistency Check',
    severity: 'error', description: 'Deposit amount on FDR certificate does not match amount declared in affidavit.',
    fieldName: 'depositAmount', expectedValue: 'Consistent across documents', actualValue: 'FDR: ₹20,00,000 vs Affidavit: ₹18,50,000',
    resolved: false, createdAt: daysAgo(5),
  },
  {
    id: 'find-002', instrumentId: 'FDR-2025-0006', ruleId: 'rule-005', ruleName: 'Required Documents Check',
    severity: 'warning', description: 'No supporting documents have been uploaded for this instrument.',
    resolved: false, createdAt: daysAgo(7),
  },
  {
    id: 'find-003', instrumentId: 'FDR-2025-0010', ruleId: 'rule-004', ruleName: 'Duplicate Instrument Check',
    severity: 'critical', description: 'FDR number BOB-FDR-45006789 is already registered under FDR-2025-0002.',
    fieldName: 'fdrNumber', expectedValue: 'Unique identifier', actualValue: 'BOB-FDR-45006789 (duplicate)',
    resolved: false, createdAt: daysAgo(4),
  },
  {
    id: 'find-004', instrumentId: 'FDR-2025-0003', ruleId: 'rule-007', ruleName: 'Maturity Deadline Check',
    severity: 'warning', description: 'Instrument has matured. Renewal or replacement action required.',
    resolved: false, createdAt: daysAgo(10),
  },
  {
    id: 'find-005', instrumentId: 'FDR-2025-0008', ruleId: 'rule-006', ruleName: 'Replacement Predecessor Link',
    severity: 'info', description: 'Replacement instrument linked to predecessor FDR-2025-0001.',
    resolved: true, resolvedBy: 'user-003', resolvedAt: daysAgo(2), resolution: 'Linked correctly.',
    createdAt: daysAgo(3),
  },
];

// ── Lifecycle Events ──
export const DEMO_LIFECYCLE_EVENTS: LifecycleEvent[] = [
  { id: 'lc-001', instrumentId: 'FDR-2025-0001', fromStatus: 'submitted', toStatus: 'preliminary_validation', reason: 'Auto-validation passed', performedBy: 'user-003', performedAt: daysAgo(119) },
  { id: 'lc-002', instrumentId: 'FDR-2025-0001', fromStatus: 'preliminary_validation', toStatus: 'pending_scrutiny', reason: 'Ready for scrutiny review', performedBy: 'user-003', performedAt: daysAgo(118) },
  { id: 'lc-003', instrumentId: 'FDR-2025-0001', fromStatus: 'pending_scrutiny', toStatus: 'verification_in_progress', reason: 'Scrutiny initiated', performedBy: 'user-003', performedAt: daysAgo(100) },
  { id: 'lc-004', instrumentId: 'FDR-2025-0001', fromStatus: 'verification_in_progress', toStatus: 'verified', reason: 'All checks passed (simulated)', performedBy: 'user-003', performedAt: daysAgo(90) },
  { id: 'lc-005', instrumentId: 'FDR-2025-0001', fromStatus: 'verified', toStatus: 'active_monitoring', reason: 'Entered active monitoring period', performedBy: 'user-003', performedAt: daysAgo(85) },
  { id: 'lc-006', instrumentId: 'FDR-2025-0005', fromStatus: 'submitted', toStatus: 'preliminary_validation', reason: 'Auto-validation passed', performedBy: 'user-004', performedAt: daysAgo(58) },
  { id: 'lc-007', instrumentId: 'FDR-2025-0005', fromStatus: 'preliminary_validation', toStatus: 'pending_scrutiny', reason: 'Ready for scrutiny', performedBy: 'user-004', performedAt: daysAgo(55) },
  { id: 'lc-008', instrumentId: 'FDR-2025-0005', fromStatus: 'pending_scrutiny', toStatus: 'verification_in_progress', reason: 'Verification started', performedBy: 'user-004', performedAt: daysAgo(10) },
  { id: 'lc-009', instrumentId: 'FDR-2025-0005', fromStatus: 'verification_in_progress', toStatus: 'discrepancy_flagged', reason: 'Amount mismatch detected between FDR and affidavit', performedBy: 'user-004', performedAt: daysAgo(3) },
  { id: 'lc-010', instrumentId: 'FDR-2025-0003', fromStatus: 'active_monitoring', toStatus: 'renewal_pending', reason: 'Instrument matured — renewal required', performedBy: 'user-004', performedAt: daysAgo(5) },
];

// ── Release Requests ──
export const DEMO_RELEASE_REQUESTS: ReleaseRequest[] = [
  {
    id: 'rel-001', instrumentId: 'FDR-2025-0007', institutionId: 'inst-007',
    requestDate: daysAgo(10).split('T')[0], reason: 'Institution has completed all obligations for the approval cycle. Requesting release of security deposit.',
    status: 'pending_senior_decision', supportingDocuments: ['doc-010'],
    scrutinyObservation: 'All verification checks passed. Instrument has matured. Documents are in order. Recommending for senior review.',
    scrutinyOfficerId: 'user-004',
    createdBy: 'user-001', createdAt: daysAgo(10), updatedAt: daysAgo(2),
  },
];

// ── Notifications ──
export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'notif-001', userId: 'user-001', type: 'maturity_approaching', title: 'FDR Maturing Soon', message: 'FDR-2025-0001 (SBI-FDR-90001234) is maturing in 25 days.', entityType: 'instrument', entityId: 'FDR-2025-0001', read: false, createdAt: daysAgo(1) },
  { id: 'notif-002', userId: 'user-002', type: 'maturity_approaching', title: 'Urgent: FDR Maturing in 7 Days', message: 'FDR-2025-0002 (BOB-FDR-45006789) is maturing in 7 days. Immediate action required.', entityType: 'instrument', entityId: 'FDR-2025-0002', read: false, createdAt: daysAgo(0) },
  { id: 'notif-003', userId: 'user-003', type: 'new_submission', title: 'New FDR Submitted', message: 'FDR-2025-0008 submitted by Vidya Bharati Institute of Technology. Replacement for FDR-2025-0001.', entityType: 'instrument', entityId: 'FDR-2025-0008', read: false, createdAt: daysAgo(3) },
  { id: 'notif-004', userId: 'user-003', type: 'verification_update', title: 'Verification Pending', message: 'FDR-2025-0004 (Ganga Technical College) requires verification.', entityType: 'instrument', entityId: 'FDR-2025-0004', read: true, createdAt: daysAgo(10) },
  { id: 'notif-005', userId: 'user-004', type: 'escalation', title: 'Discrepancy Found', message: 'Amount mismatch detected on FDR-2025-0005. Review required.', entityType: 'instrument', entityId: 'FDR-2025-0005', read: false, createdAt: daysAgo(3) },
  { id: 'notif-006', userId: 'user-005', type: 'release_update', title: 'Release Request Awaiting Decision', message: 'Release request REL-001 for FDR-2025-0007 is pending senior review.', entityType: 'release_request', entityId: 'rel-001', read: false, createdAt: daysAgo(2) },
  { id: 'notif-007', userId: 'user-006', type: 'system', title: 'Audit Report Available', message: 'Weekly audit report for instruments processed in the last 7 days is available.', read: false, createdAt: daysAgo(1) },
  { id: 'notif-008', userId: 'user-008', type: 'overdue_action', title: 'Overdue: Renewal Required', message: 'FDR-2025-0003 has matured. Please submit a renewal or replacement.', entityType: 'instrument', entityId: 'FDR-2025-0003', read: false, createdAt: daysAgo(5) },
];

// ── Audit Events ──
export const DEMO_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'aud-001', timestamp: daysAgo(120), userId: 'user-001', userName: 'Dr. Meera Sharma', userRole: 'institution', entityType: 'instrument', entityId: 'FDR-2025-0001', action: 'instrument_created', reason: 'New FDR registration' },
  { id: 'aud-002', timestamp: daysAgo(120), userId: 'user-001', userName: 'Dr. Meera Sharma', userRole: 'institution', entityType: 'document', entityId: 'doc-001', action: 'document_uploaded', reason: 'FDR certificate uploaded' },
  { id: 'aud-003', timestamp: daysAgo(100), userId: 'user-003', userName: 'Ananya Iyer', userRole: 'scrutiny_officer', entityType: 'instrument', entityId: 'FDR-2025-0001', action: 'verification_started', reason: 'Scrutiny initiated' },
  { id: 'aud-004', timestamp: daysAgo(90), userId: 'user-003', userName: 'Ananya Iyer', userRole: 'scrutiny_officer', entityType: 'instrument', entityId: 'FDR-2025-0001', action: 'verification_completed', reason: 'All checks passed (simulated verification)', newValue: 'verified_by_source' },
  { id: 'aud-005', timestamp: daysAgo(60), userId: 'user-001', userName: 'Dr. Meera Sharma', userRole: 'institution', entityType: 'instrument', entityId: 'FDR-2025-0005', action: 'instrument_created', reason: 'New FDR registration' },
  { id: 'aud-006', timestamp: daysAgo(5), userId: 'user-004', userName: 'Vikram Deshmukh', userRole: 'scrutiny_officer', entityType: 'instrument', entityId: 'FDR-2025-0005', action: 'finding_created', reason: 'Amount mismatch between FDR certificate and affidavit', newValue: 'Discrepancy: ₹1,50,000' },
  { id: 'aud-007', timestamp: daysAgo(3), userId: 'user-004', userName: 'Vikram Deshmukh', userRole: 'scrutiny_officer', entityType: 'instrument', entityId: 'FDR-2025-0005', action: 'status_changed', previousValue: 'verification_in_progress', newValue: 'discrepancy_flagged', reason: 'Amount mismatch detected' },
  { id: 'aud-008', timestamp: daysAgo(10), userId: 'user-001', userName: 'Dr. Meera Sharma', userRole: 'institution', entityType: 'release_request', entityId: 'rel-001', action: 'release_request_created', reason: 'Release of matured FDR-2025-0007' },
  { id: 'aud-009', timestamp: daysAgo(3), userId: 'user-001', userName: 'Dr. Meera Sharma', userRole: 'institution', entityType: 'instrument', entityId: 'FDR-2025-0008', action: 'instrument_created', reason: 'Replacement FDR for FDR-2025-0001' },
  { id: 'aud-010', timestamp: daysAgo(4), userId: 'user-003', userName: 'Ananya Iyer', userRole: 'scrutiny_officer', entityType: 'instrument', entityId: 'FDR-2025-0010', action: 'finding_created', reason: 'Duplicate FDR number detected' },
];

// ── Regulatory Rules ──
export const DEMO_RULES: RegulatoryRule[] = [
  {
    id: 'rule-001', name: 'Amount Consistency Check', category: 'Financial Validation',
    description: 'The deposit amount stated on the FDR certificate must be consistent with the amount declared in accompanying affidavit or application form.',
    sourceDocument: 'Internal Validation Policy (Illustrative)', severity: 'error', enabled: true,
    validationLogic: JSON.stringify({ type: 'cross_document_match', fields: ['depositAmount'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-002', name: 'Date Ordering Validation', category: 'Date Validation',
    description: 'Issue date must precede maturity date for all instruments.',
    severity: 'error', enabled: true,
    validationLogic: JSON.stringify({ type: 'date_order', fields: ['issueDate', 'maturityDate'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-003', name: 'Institution Identity Consistency', category: 'Identity Validation',
    description: 'Institution name and AISHE code must be consistent across submitted records for the same institution.',
    severity: 'warning', enabled: true,
    validationLogic: JSON.stringify({ type: 'identity_consistency', fields: ['institutionName', 'aisheCode'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-004', name: 'Duplicate Instrument Check', category: 'Uniqueness Validation',
    description: 'No two instruments should share the same FDR number unless they are explicitly linked as predecessor/replacement.',
    severity: 'critical', enabled: true,
    validationLogic: JSON.stringify({ type: 'unique_check', fields: ['fdrNumber'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-005', name: 'Required Documents Check', category: 'Document Validation',
    description: 'At least one supporting document (FDR certificate) must be uploaded before an instrument can proceed to scrutiny.',
    severity: 'warning', enabled: true,
    validationLogic: JSON.stringify({ type: 'document_presence', requiredTypes: ['fdr_certificate'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-006', name: 'Replacement Predecessor Link', category: 'Lifecycle Validation',
    description: 'A replacement instrument must have a valid linked predecessor.',
    severity: 'info', enabled: true,
    validationLogic: JSON.stringify({ type: 'link_validation', fields: ['linkedPredecessorId'] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-007', name: 'Maturity Deadline Check', category: 'Date Validation',
    description: 'Instruments past their maturity date require timely renewal or replacement action.',
    severity: 'warning', enabled: true,
    validationLogic: JSON.stringify({ type: 'maturity_check', thresholdDays: [30, 15, 7] }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
  {
    id: 'rule-008', name: 'Source Verification Status', category: 'Verification Validation',
    description: 'Source verification must not remain unresolved beyond the configured review period.',
    severity: 'warning', enabled: true,
    validationLogic: JSON.stringify({ type: 'verification_timeout', maxDays: 30 }),
    version: 1, changeHistory: [{ version: 1, changedBy: 'user-007', changedAt: daysAgo(365), description: 'Initial rule creation (demo)' }],
  },
];

// ── Source Adapters ──
export const DEMO_SOURCES: SourceAdapter[] = [
  { id: 'src-001', name: 'AICTE Handbook Reference', type: 'handbook', connectionStatus: 'imported', recordCount: 45, documentationLink: '#', dataFreshness: 'Static reference (demo)', retryAvailable: false },
  { id: 'src-002', name: 'AISHE Institutional Directory', type: 'aishe_data', connectionStatus: 'imported', lastSync: daysAgo(30), recordCount: 8, dataFreshness: 'Last imported 30 days ago (demo)', retryAvailable: false },
  { id: 'src-003', name: 'Bank FDR Verification (SBI)', type: 'bank_verification', connectionStatus: 'requires_authorization', documentationLink: '#', dataFreshness: 'Not connected — requires integration authorization', retryAvailable: false },
  { id: 'src-004', name: 'Bank FDR Verification (Others)', type: 'bank_verification', connectionStatus: 'unavailable', lastError: 'No API integration available for this bank.', dataFreshness: 'Not available', retryAvailable: false },
  { id: 'src-005', name: 'Demo Simulator', type: 'demo_simulator', connectionStatus: 'simulated', recordCount: 25, dataFreshness: 'Simulated responses — not independently verified', retryAvailable: true },
  { id: 'src-006', name: 'CSV Import (Institutional Data)', type: 'csv_import', connectionStatus: 'imported', lastSync: daysAgo(7), recordCount: 8, dataFreshness: 'Last imported 7 days ago', retryAvailable: false },
];

// ── Demo Credentials (fictional) ──
export const DEMO_CREDENTIALS: Array<{ role: Role; label: string; description: string; email: string; password: string; userId: string }> = [
  { role: 'institution', label: 'Institution User', description: 'Submit FDR records, upload documents, track submissions, and manage renewal requests for your institution.', email: 'meera.sharma@vbit.edu.in', password: 'demo2025', userId: 'user-001' },
  { role: 'scrutiny_officer', label: 'Scrutiny Officer', description: 'Review submitted instruments, verify documents, investigate discrepancies, and escalate cases.', email: 'ananya.iyer@aicte-demo.in', password: 'demo2025', userId: 'user-003' },
  { role: 'senior_officer', label: 'Senior Officer', description: 'Access escalated cases, review findings, and make authorized decisions on release requests.', email: 'suresh.reddy@aicte-demo.in', password: 'demo2025', userId: 'user-005' },
  { role: 'auditor', label: 'Auditor', description: 'Read-only access to records, verification history, decision trails, and audit logs.', email: 'kavita.nair@audit-demo.in', password: 'demo2025', userId: 'user-006' },
  { role: 'admin', label: 'System Administrator', description: 'Manage users, configure rules, import reference data, and maintain system settings.', email: 'amit.kulkarni@admin-demo.in', password: 'demo2025', userId: 'user-007' },
];

export function generateAllDemoData() {
  return {
    institutions: DEMO_INSTITUTIONS,
    users: DEMO_USERS,
    instruments: DEMO_INSTRUMENTS,
    documents: DEMO_DOCUMENTS,
    verifications: DEMO_VERIFICATIONS,
    findings: DEMO_FINDINGS,
    lifecycleEvents: DEMO_LIFECYCLE_EVENTS,
    releaseRequests: DEMO_RELEASE_REQUESTS,
    notifications: DEMO_NOTIFICATIONS,
    auditEvents: DEMO_AUDIT_EVENTS,
    rules: DEMO_RULES,
    sources: DEMO_SOURCES,
  };
}
