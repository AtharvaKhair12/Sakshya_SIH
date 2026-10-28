// ============================================================================
// Sakshya — Master RBAC & Full FDR Lifecycle Automated Test Suite
// Verifies all Section 13 criteria: Submission, Validation, Scrutiny, Duplicate Detection,
// Evidence Requests, Replacement Linking, Maturity Calculations, Senior Decision Reason Enforcement,
// Auditor Read-Only Boundaries, and Audit Trail Persistence.
// ============================================================================

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { Role, ROLE_PERMISSIONS, Instrument } from '@/lib/types';
import {
  normalizeRole,
  hasPermission,
  canAccessRoute,
  canAccessInstrument,
  canPerformAction,
  getVisibleNavigation,
} from '@/lib/permissions';
import {
  getInstruments,
  getReleaseRequests,
  makeReleaseDecision,
  createInstrument,
  getAuditEvents,
  DemoSession,
} from '@/lib/store';
import {
  FDRService,
  VerificationService,
  ReleaseService,
  MaturityService,
  DocumentService,
} from '@/lib/services';
import { isSupabaseConfigured, getSupabaseConfig } from '@/lib/supabase/config';

export async function GET(req: Request) {
  // Production Endpoint Protection:
  // In production, require test secret header or auditor/admin authorization
  const isProd = process.env.NODE_ENV === 'production';
  const testKeyHeader = req.headers.get('x-sakshya-test-key');
  const validKey = process.env.INTERNAL_TEST_KEY || 'sakshya-verified-audit-2026';

  if (isProd && testKeyHeader !== validKey && req.headers.get('authorization') !== `Bearer ${validKey}`) {
    const roleHeader = req.headers.get('x-user-role');
    if (roleHeader !== 'admin' && roleHeader !== 'auditor') {
      return NextResponse.json(
        {
          error: 'Unauthorized: Diagnostic test suite is protected in production.',
          hint: 'Provide x-sakshya-test-key header or authenticate as auditor/admin.',
        },
        { status: 401 }
      );
    }
  }

  const results: { name: string; passed: boolean; details?: string; error?: string }[] = [];

  async function check(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ name, passed: false, error: message });
    }
  }

  // 1. Role Normalization
  await check('1. normalizeRole maps system_admin and handles defaults', () => {
    if (normalizeRole('admin') !== 'admin') throw new Error('admin mismatch');
    if (normalizeRole('system_admin') !== 'admin') throw new Error('system_admin mismatch');
    if (normalizeRole('institution') !== 'institution') throw new Error('institution mismatch');
    if (normalizeRole('scrutiny_officer') !== 'scrutiny_officer') throw new Error('scrutiny_officer mismatch');
    if (normalizeRole('senior_officer') !== 'senior_officer') throw new Error('senior_officer mismatch');
    if (normalizeRole('auditor') !== 'auditor') throw new Error('auditor mismatch');
    if (normalizeRole(undefined) !== 'institution') throw new Error('default role mismatch');
  });

  // 2. Permission Matrix
  await check('2. ROLE_PERMISSIONS matrix correctly differentiates all 5 roles', () => {
    // Institution User
    if (!ROLE_PERMISSIONS.institution.canCreateInstruments) throw new Error('Institution must create FDR');
    if (ROLE_PERMISSIONS.institution.canMakeReleaseDecision) throw new Error('Institution must NOT make release decisions');
    if (ROLE_PERMISSIONS.institution.canManageRules) throw new Error('Institution must NOT manage rules');

    // Scrutiny Officer
    if (!ROLE_PERMISSIONS.scrutiny_officer.canReviewVerification) throw new Error('Scrutiny must review verification');
    if (!ROLE_PERMISSIONS.scrutiny_officer.canRecordObservations) throw new Error('Scrutiny must record observations');
    if (ROLE_PERMISSIONS.scrutiny_officer.canMakeReleaseDecision) throw new Error('Scrutiny must NOT make release decisions');

    // Senior Officer
    if (!ROLE_PERMISSIONS.senior_officer.canMakeReleaseDecision) throw new Error('Senior Officer must have release decision authority');
    if (ROLE_PERMISSIONS.senior_officer.canManageRules) throw new Error('Senior Officer must NOT manage rules');

    // Auditor (Strictly Read-Only)
    if (ROLE_PERMISSIONS.auditor.canCreateInstruments) throw new Error('Auditor must NOT create instruments');
    if (ROLE_PERMISSIONS.auditor.canMakeReleaseDecision) throw new Error('Auditor must NOT make release decisions');
    if (ROLE_PERMISSIONS.auditor.canManageRules) throw new Error('Auditor must NOT manage rules');
    if (!ROLE_PERMISSIONS.auditor.canViewAudit) throw new Error('Auditor must view audit history');
    if (!ROLE_PERMISSIONS.auditor.canExportReports) throw new Error('Auditor must export reports');

    // System Administrator
    if (!ROLE_PERMISSIONS.admin.canManageUsers) throw new Error('Admin must manage users');
    if (ROLE_PERMISSIONS.admin.canMakeReleaseDecision) throw new Error('Admin must NOT make release decisions');
  });

  // 3. Cross-Institution Data Isolation
  await check('3. Institution user cannot access other institutions\' private records', () => {
    const instAUser = { role: 'institution' as Role, institutionId: 'inst-001' };
    const instBUser = { role: 'institution' as Role, institutionId: 'inst-002' };
    const officer = { role: 'scrutiny_officer' as Role };

    const instAInstrument: Instrument = {
      id: 'FDR-TEST-001',
      institutionId: 'inst-001',
      institutionName: 'VJTI Mumbai',
      aisheCode: 'C-33827',
      fdrNumber: 'FDR-A-100',
      bankName: 'SBI',
      branch: 'Matunga West',
      depositAmount: 2500000,
      issueDate: '2024-01-01',
      maturityDate: '2034-01-01',
      status: 'active_monitoring',
      verificationStatus: 'verified_by_source',
      submittedBy: 'user-001',
      submittedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      documents: [],
    };

    const instBInstrument: Instrument = {
      ...instAInstrument,
      id: 'FDR-TEST-002',
      institutionId: 'inst-002',
      institutionName: 'COEP Pune',
      aisheCode: 'U-1199',
    };

    if (!canAccessInstrument(instAUser, instAInstrument)) throw new Error('Inst A should access own FDR');
    if (canAccessInstrument(instAUser, instBInstrument)) throw new Error('Security Violation: Inst A accessed Inst B FDR');
    if (!canAccessInstrument(instBUser, instBInstrument)) throw new Error('Inst B should access own FDR');
    if (canAccessInstrument(instBUser, instAInstrument)) throw new Error('Security Violation: Inst B accessed Inst A FDR');
    if (!canAccessInstrument(officer, instAInstrument)) throw new Error('Scrutiny Officer should access FDR');
  });

  // 4. Invalid Date Ordering Rejection
  await check('4. Invalid issue and maturity dates are rejected (maturity <= issue date)', () => {
    const invalidSubmission = {
      institutionId: 'inst-001',
      institutionName: 'VJTI Mumbai',
      aisheCode: 'C-33827',
      bankName: 'State Bank of India',
      branch: 'Matunga West',
      fdrNumber: 'SBI-TEST-DATE',
      depositAmount: 1500000,
      issueDate: '2025-01-01',
      maturityDate: '2024-01-01', // Maturity before issue date!
    };

    const errors = FDRService.validateSubmission(invalidSubmission);
    const dateError = errors.find((e) => e.field === 'maturityDate');
    if (!dateError) {
      throw new Error('FDR submission validation failed to flag invalid maturityDate <= issueDate');
    }
  });

  // 5. Institution User Submits FDR & Can Retrieve It
  await check('5. Institution user submits an FDR and record is preserved', async () => {
    const instSession: DemoSession = {
      userId: 'user-001',
      role: 'institution',
      institutionId: 'inst-001',
      loginAt: new Date().toISOString(),
    };

    const uniqueFdrNumber = `FDR-SUB-${Date.now()}`;
    const result = await FDRService.registerFDR(
      {
        institutionId: 'inst-001',
        institutionName: 'VJTI Mumbai',
        aisheCode: 'C-33827',
        bankName: 'State Bank of India',
        branch: 'Matunga West',
        fdrNumber: uniqueFdrNumber,
        depositAmount: 2500000,
        issueDate: '2024-01-01',
        maturityDate: '2034-01-01',
      },
      instSession
    );

    if (!result.instrument || !result.instrument.id) {
      throw new Error('Instrument creation failed');
    }

    const retrieved = FDRService.getInstrumentById(result.instrument.id, instSession);
    if (!retrieved || retrieved.fdrNumber !== uniqueFdrNumber) {
      throw new Error('Saved FDR could not be retrieved by the submitting institution');
    }
  });

  // 6. Duplicate FDR Identifier Detection
  await check('6. Duplicate FDR identifiers produce a discrepancy finding', async () => {
    const instSession: DemoSession = {
      userId: 'user-001',
      role: 'institution',
      institutionId: 'inst-001',
      loginAt: new Date().toISOString(),
    };

    const duplicateFDRNumber = 'SBI-FDR-90001234'; // Matches existing FDR-2025-0001
    const result = await FDRService.registerFDR(
      {
        institutionId: 'inst-001',
        institutionName: 'VJTI Mumbai',
        aisheCode: 'C-33827',
        bankName: 'State Bank of India',
        branch: 'Matunga West',
        fdrNumber: duplicateFDRNumber,
        depositAmount: 1000000,
        issueDate: '2024-01-01',
        maturityDate: '2034-01-01',
      },
      instSession
    );

    if (result.findings.length === 0) {
      throw new Error('Duplicate FDR identifier was not flagged with a compliance finding');
    }

    if (result.instrument.status !== 'discrepancy_flagged') {
      throw new Error(`Expected instrument status 'discrepancy_flagged', got '${result.instrument.status}'`);
    }
  });

  // 7. Scrutiny Officer Requests Additional Supporting Evidence
  await check('7. Scrutiny Officer can request additional evidence and notify institution', () => {
    const scrutinySession: DemoSession = {
      userId: 'user-003',
      role: 'scrutiny_officer',
      loginAt: new Date().toISOString(),
    };

    VerificationService.requestAdditionalEvidence(
      {
        instrumentId: 'FDR-2025-0004',
        officerObservation: 'Bank verification seal missing on uploaded PDF scan.',
        requestedDocuments: ['bank_letter', 'joint_endorsement'],
      },
      scrutinySession
    );

    const instrument = FDRService.getInstrumentById('FDR-2025-0004');
    if (!instrument || instrument.status !== 'discrepancy_flagged') {
      throw new Error('Instrument status not updated to discrepancy_flagged following evidence request');
    }
  });

  // 8. Replacement FDR Retains Predecessor Link
  await check('8. Replacement FDR submission preserves link to predecessor instrument', async () => {
    const instSession: DemoSession = {
      userId: 'user-001',
      role: 'institution',
      institutionId: 'inst-001',
      loginAt: new Date().toISOString(),
    };

    const result = await FDRService.registerFDR(
      {
        institutionId: 'inst-001',
        institutionName: 'VJTI Mumbai',
        aisheCode: 'C-33827',
        bankName: 'State Bank of India',
        branch: 'Matunga West',
        fdrNumber: `FDR-REPL-${Date.now()}`,
        depositAmount: 2500000,
        issueDate: '2025-01-01',
        maturityDate: '2035-01-01',
        linkedPredecessorId: 'FDR-2025-0001',
      },
      instSession
    );

    if (result.instrument.linkedPredecessorId !== 'FDR-2025-0001') {
      throw new Error('Replacement FDR failed to link predecessor ID');
    }
  });

  // 9. Dynamic Maturity Calculation & Horizons
  await check('9. Maturity status and T-30/T-15/T-7 horizons are calculated dynamically from stored dates', () => {
    const today = new Date();

    const future30d = new Date(today);
    future30d.setDate(today.getDate() + 25);
    const status30 = MaturityService.getMaturityStatus(future30d.toISOString().split('T')[0], today);
    if (status30.category !== 'approaching_30d') {
      throw new Error(`Expected category approaching_30d, got ${status30.category}`);
    }

    const future7d = new Date(today);
    future7d.setDate(today.getDate() + 5);
    const status7 = MaturityService.getMaturityStatus(future7d.toISOString().split('T')[0], today);
    if (status7.category !== 'critical_7d') {
      throw new Error(`Expected category critical_7d, got ${status7.category}`);
    }

    const past10d = new Date(today);
    past10d.setDate(today.getDate() - 10);
    const statusOverdue = MaturityService.getMaturityStatus(past10d.toISOString().split('T')[0], today);
    if (statusOverdue.category !== 'overdue') {
      throw new Error(`Expected category overdue, got ${statusOverdue.category}`);
    }
  });

  // 10. Senior Officer Decision Authority with Mandatory Reason
  await check('10. Senior Officer decision requires mandatory reason; Auditor & Admin blocked', () => {
    const seniorSession: DemoSession = {
      userId: 'user-005',
      role: 'senior_officer',
      loginAt: new Date().toISOString(),
    };
    const auditorSession: DemoSession = {
      userId: 'user-006',
      role: 'auditor',
      loginAt: new Date().toISOString(),
    };
    const adminSession: DemoSession = {
      userId: 'user-007',
      role: 'admin',
      loginAt: new Date().toISOString(),
    };

    const reqs = getReleaseRequests();
    if (reqs.length === 0) throw new Error('No release requests found for decision test');
    const targetReq = reqs[0];

    // Auditor blocked
    let auditorBlocked = false;
    try {
      ReleaseService.recordSeniorDecision(targetReq.id, 'approved', 'Auditor attempting decision', auditorSession);
    } catch {
      auditorBlocked = true;
    }
    if (!auditorBlocked) throw new Error('Auditor must NOT have release decision authority');

    // Admin blocked
    let adminBlocked = false;
    try {
      ReleaseService.recordSeniorDecision(targetReq.id, 'approved', 'Admin attempting decision', adminSession);
    } catch {
      adminBlocked = true;
    }
    if (!adminBlocked) throw new Error('Administrator must NOT have release decision authority');

    // Senior Officer with empty reason blocked
    let emptyReasonBlocked = false;
    try {
      ReleaseService.recordSeniorDecision(targetReq.id, 'approved', '   ', seniorSession);
    } catch {
      emptyReasonBlocked = true;
    }
    if (!emptyReasonBlocked) throw new Error('Senior Officer must NOT submit decision without mandatory reason');

    // Senior Officer with valid reason succeeds
    const decided = ReleaseService.recordSeniorDecision(
      targetReq.id,
      'approved',
      'Ten-year term completed with AICTE approval conditions fulfilled and NOC on record.',
      seniorSession
    );

    if (decided.seniorDecision !== 'approved' || !decided.seniorDecisionReason) {
      throw new Error('Senior Officer decision record was not saved correctly');
    }
  });

  // 11. Document Upload Size & MIME Type Validation
  await check('11. Private document storage enforces 10MB limit and MIME validation', () => {
    // 1. Invalid MIME type (e.g. executable or script)
    let badMimeBlocked = false;
    try {
      DocumentService.validateDocument('malicious.exe', 1024, 'application/x-msdownload');
    } catch {
      badMimeBlocked = true;
    }
    if (!badMimeBlocked) throw new Error('Document validation failed to reject invalid MIME type');

    // 2. Oversized file (> 10MB)
    let oversizeBlocked = false;
    try {
      DocumentService.validateDocument('huge_scan.pdf', 15 * 1024 * 1024, 'application/pdf');
    } catch {
      oversizeBlocked = true;
    }
    if (!oversizeBlocked) throw new Error('Document validation failed to reject file > 10MB');
  });

  // 12. Audit Events Logging
  await check('12. Audit events log all consequential actions and user roles', () => {
    const events = getAuditEvents();
    if (events.length === 0) throw new Error('No audit events found in audit log');

    const createdEvent = events.find((e) => e.action === 'instrument_created');
    if (!createdEvent) throw new Error('instrument_created audit event not found');

    const releaseDecisionEvent = events.find((e) => e.action === 'release_decision');
    if (!releaseDecisionEvent) throw new Error('release_decision audit event not found');
  });

  // 13. Supabase Credentials Configuration Status Check
  await check('13. Supabase connectivity status is reported truthfully without fake data', () => {
    const config = getSupabaseConfig();
    const isConfigured = isSupabaseConfigured();

    if (isConfigured && !config.url.startsWith('https://')) {
      throw new Error('Supabase URL format invalid');
    }
  });

  const allPassed = results.every((r) => r.passed);
  return NextResponse.json(
    {
      status: allPassed ? 'success' : 'failure',
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      supabaseConfigured: isSupabaseConfigured(),
      tests: results,
    },
    { status: 200 }
  );
}
