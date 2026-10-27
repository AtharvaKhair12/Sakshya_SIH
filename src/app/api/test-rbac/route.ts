import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import {
  Role, ROLE_PERMISSIONS, Instrument
} from '@/lib/types';
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
  DemoSession,
} from '@/lib/store';

export async function GET() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function check(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ name, passed: false, error: message });
    }
  }

  // 1. Role Normalization
  check('normalizeRole maps system_admin and handles defaults', () => {
    if (normalizeRole('admin') !== 'admin') throw new Error('admin mismatch');
    if (normalizeRole('system_admin') !== 'admin') throw new Error('system_admin mismatch');
    if (normalizeRole('institution') !== 'institution') throw new Error('institution mismatch');
    if (normalizeRole('scrutiny_officer') !== 'scrutiny_officer') throw new Error('scrutiny_officer mismatch');
    if (normalizeRole('senior_officer') !== 'senior_officer') throw new Error('senior_officer mismatch');
    if (normalizeRole('auditor') !== 'auditor') throw new Error('auditor mismatch');
    if (normalizeRole(undefined) !== 'institution') throw new Error('default role mismatch');
  });

  // 2. Permission Matrix
  check('ROLE_PERMISSIONS matrix correctly differentiates all 5 roles', () => {
    // Institution User
    if (!ROLE_PERMISSIONS.institution.canCreateInstruments) {
      throw new Error(`Institution must be able to create FDR`);
    }
    if (ROLE_PERMISSIONS.institution.canMakeReleaseDecision) throw new Error('Institution must NOT make release decisions');
    if (ROLE_PERMISSIONS.institution.canManageRules) throw new Error('Institution must NOT manage rules');

    // Scrutiny Officer
    if (!ROLE_PERMISSIONS.scrutiny_officer.canReviewVerification) throw new Error('Scrutiny must review verification');
    if (!ROLE_PERMISSIONS.scrutiny_officer.canRecordObservations) throw new Error('Scrutiny must record observations');
    if (ROLE_PERMISSIONS.scrutiny_officer.canMakeReleaseDecision) throw new Error('Scrutiny must NOT make final release decisions');

    // Senior Officer
    if (!ROLE_PERMISSIONS.senior_officer.canMakeReleaseDecision) throw new Error('Senior Officer must have release decision authority');
    if (ROLE_PERMISSIONS.senior_officer.canManageRules) throw new Error('Senior Officer must NOT manage rules');

    // Auditor (Strictly Read-Only)
    if (ROLE_PERMISSIONS.auditor.canCreateInstruments) throw new Error('Auditor must NOT create instruments');
    if (ROLE_PERMISSIONS.auditor.canMakeReleaseDecision) throw new Error('Auditor must NOT make release decisions');
    if (ROLE_PERMISSIONS.auditor.canManageRules) throw new Error('Auditor must NOT manage rules');
    if (ROLE_PERMISSIONS.auditor.canManageUsers) throw new Error('Auditor must NOT manage users');
    if (!ROLE_PERMISSIONS.auditor.canViewAudit) throw new Error('Auditor must be able to view audit history');
    if (!ROLE_PERMISSIONS.auditor.canExportReports) throw new Error('Auditor must be able to export reports');

    // System Administrator
    if (!ROLE_PERMISSIONS.admin.canManageUsers) throw new Error('Admin must manage users');
    if (!ROLE_PERMISSIONS.admin.canManageRules) throw new Error('Admin must manage rules');
    if (ROLE_PERMISSIONS.admin.canMakeReleaseDecision) throw new Error('Admin must NOT make release decisions');
  });

  // 3. hasPermission helper
  check('hasPermission returns accurate boolean per user role', () => {
    const inst = { role: 'institution' as Role, userId: 'u1' };
    const scrutiny = { role: 'scrutiny_officer' as Role, userId: 'u2' };
    const senior = { role: 'senior_officer' as Role, userId: 'u3' };
    const auditor = { role: 'auditor' as Role, userId: 'u4' };
    const admin = { role: 'admin' as Role, userId: 'u5' };

    if (!hasPermission(inst, 'canCreateInstruments')) throw new Error('inst failed');
    if (hasPermission(scrutiny, 'canCreateInstruments')) throw new Error('scrutiny failed');
    if (!hasPermission(senior, 'canMakeReleaseDecision')) throw new Error('senior failed');
    if (hasPermission(auditor, 'canMakeReleaseDecision')) throw new Error('auditor failed');
    if (hasPermission(admin, 'canMakeReleaseDecision')) throw new Error('admin failed');
    if (!hasPermission(admin, 'canManageUsers')) throw new Error('admin manage users failed');
  });

  // 4. canAccessRoute route protection
  check('canAccessRoute blocks unauthorized module access', () => {
    const inst = { role: 'institution' as Role };
    const scrutiny = { role: 'scrutiny_officer' as Role };
    const senior = { role: 'senior_officer' as Role };
    const auditor = { role: 'auditor' as Role };
    const admin = { role: 'admin' as Role };

    // New instrument creation
    if (!canAccessRoute(inst, '/instruments/new')) throw new Error('inst should access /instruments/new');
    if (canAccessRoute(scrutiny, '/instruments/new')) throw new Error('scrutiny should NOT access /instruments/new');
    if (canAccessRoute(auditor, '/instruments/new')) throw new Error('auditor should NOT access /instruments/new');

    // Admin pages
    if (!canAccessRoute(admin, '/users')) throw new Error('admin should access /users');
    if (canAccessRoute(inst, '/users')) throw new Error('inst should NOT access /users');
    if (canAccessRoute(scrutiny, '/users')) throw new Error('scrutiny should NOT access /users');
    if (canAccessRoute(senior, '/users')) throw new Error('senior should NOT access /users');
    if (canAccessRoute(auditor, '/users')) throw new Error('auditor should NOT access /users');

    // Verification queue
    if (!canAccessRoute(scrutiny, '/verification')) throw new Error('scrutiny should access /verification');
    if (!canAccessRoute(senior, '/verification')) throw new Error('senior should access /verification');
    if (canAccessRoute(inst, '/verification')) throw new Error('inst should NOT access /verification');
  });

  // 5. Cross-institution data isolation
  check('canAccessInstrument prevents cross-institution data leakage', () => {
    const instAUser = { role: 'institution' as Role, institutionId: 'inst-001' };
    const instBUser = { role: 'institution' as Role, institutionId: 'inst-002' };
    const officer = { role: 'scrutiny_officer' as Role };

    const instAInstrument: Instrument = {
      id: 'FDR-2025-0001',
      institutionId: 'inst-001',
      institutionName: 'College A',
      aisheCode: 'C-12345',
      fdrNumber: 'FDR111',
      bankName: 'SBI',
      branch: 'Main Branch',
      depositAmount: 1000000,
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
      id: 'FDR-2025-0002',
      institutionId: 'inst-002',
      institutionName: 'College B',
    };

    if (!canAccessInstrument(instAUser, instAInstrument)) throw new Error('Inst A should access Instrument A');
    if (canAccessInstrument(instAUser, instBInstrument)) throw new Error('Inst A MUST NOT access Instrument B');
    if (!canAccessInstrument(instBUser, instBInstrument)) throw new Error('Inst B should access Instrument B');
    if (canAccessInstrument(instBUser, instAInstrument)) throw new Error('Inst B MUST NOT access Instrument A');
    if (!canAccessInstrument(officer, instAInstrument)) throw new Error('Officer should access Instrument A');
    if (!canAccessInstrument(officer, instBInstrument)) throw new Error('Officer should access Instrument B');
  });

  // 6. Action-Level Mutation Boundaries
  check('canPerformAction strictly blocks unauthorized mutations', () => {
    const instUser = { role: 'institution' as Role, institutionId: 'inst-001' };
    const scrutiny = { role: 'scrutiny_officer' as Role };
    const senior = { role: 'senior_officer' as Role };
    const auditor = { role: 'auditor' as Role };
    const admin = { role: 'admin' as Role };

    // Release Decision: ONLY Senior Officer
    if (!canPerformAction(senior, 'make_release_decision')) throw new Error('Senior Officer must be authorized for release decisions');
    if (canPerformAction(scrutiny, 'make_release_decision')) throw new Error('Scrutiny Officer must NOT make release decisions');
    if (canPerformAction(instUser, 'make_release_decision')) throw new Error('Institution must NOT make release decisions');
    if (canPerformAction(auditor, 'make_release_decision')) throw new Error('Auditor must NOT make release decisions');
    if (canPerformAction(admin, 'make_release_decision')) throw new Error('Admin must NOT make release decisions');

    // Auditor is STRICTLY read-only
    if (canPerformAction(auditor, 'create_instrument')) throw new Error('Auditor must NOT create instruments');
    if (canPerformAction(auditor, 'record_observation')) throw new Error('Auditor must NOT record observations');
    if (canPerformAction(auditor, 'verify_source')) throw new Error('Auditor must NOT verify sources');
    if (canPerformAction(auditor, 'escalate_case')) throw new Error('Auditor must NOT escalate cases');
    if (canPerformAction(auditor, 'manage_users')) throw new Error('Auditor must NOT manage users');
    if (canPerformAction(auditor, 'reset_demo_data')) throw new Error('Auditor must NOT reset demo data');

    // Escalation: Scrutiny Officer
    if (!canPerformAction(scrutiny, 'escalate_case')) throw new Error('Scrutiny Officer must be authorized to escalate');
    if (canPerformAction(instUser, 'escalate_case')) throw new Error('Institution must NOT escalate');
  });

  // 7. Distinct Navigation Configurations
  check('getVisibleNavigation returns 5 distinct menu structures', () => {
    const instNav = getVisibleNavigation({ role: 'institution' });
    const scrutinyNav = getVisibleNavigation({ role: 'scrutiny_officer' });
    const seniorNav = getVisibleNavigation({ role: 'senior_officer' });
    const auditorNav = getVisibleNavigation({ role: 'auditor' });
    const adminNav = getVisibleNavigation({ role: 'admin' });

    // Distinct titles
    if (!instNav.some(n => n.label === 'My FDR Summary')) throw new Error('Institution navigation missing My FDR Summary');
    if (!scrutinyNav.some(n => n.label === 'Scrutiny Desk')) throw new Error('Scrutiny navigation missing Scrutiny Desk');
    if (!seniorNav.some(n => n.label === 'Decision Dashboard')) throw new Error('Senior navigation missing Decision Dashboard');
    if (!auditorNav.some(n => n.label === 'Audit Workspace')) throw new Error('Auditor navigation missing Audit Workspace');
    if (!adminNav.some(n => n.label === 'System Overview')) throw new Error('Admin navigation missing System Overview');

    // Route scoping in menus
    if (scrutinyNav.some(n => n.href === '/instruments/new')) throw new Error('Scrutiny menu should not have New Submission');
    if (auditorNav.some(n => n.href === '/instruments/new')) throw new Error('Auditor menu should not have New Submission');
    if (auditorNav.some(n => n.href === '/users')) throw new Error('Auditor menu should not have Users');
    if (seniorNav.some(n => n.href === '/users')) throw new Error('Senior menu should not have Users');
  });

  // 8. Store Layer Scoping
  check('getInstruments scopes data to institution when session is passed', () => {
    const instASession: DemoSession = {
      userId: 'user-001',
      role: 'institution',
      institutionId: 'inst-001',
      loginAt: new Date().toISOString(),
    };
    const instAData = getInstruments(undefined, instASession);
    // Every instrument returned must belong to inst-001
    const leaked = instAData.filter(i => i.institutionId !== 'inst-001');
    if (leaked.length > 0) {
      throw new Error(`Data leak detected: ${leaked.length} instruments belonging to other institutions returned to inst-001`);
    }
  });

  // 9. Institution -> Scrutiny Workflow
  check('Institution creation workflow registers FDR in scrutiny queue', () => {
    const instSession: DemoSession = {
      userId: 'user-001',
      role: 'institution',
      institutionId: 'inst-001',
      loginAt: new Date().toISOString(),
    };
    const created = createInstrument({
      institutionId: 'inst-001',
      institutionName: 'Pune Engineering Academy',
      aisheCode: 'C-99881',
      fdrNumber: `FDR-TEST-${Date.now()}`,
      bankName: 'State Bank of India',
      branch: 'Shivajinagar',
      depositAmount: 2500000,
      issueDate: '2024-01-01',
      maturityDate: '2034-01-01',
      submittedBy: 'user-001',
      submittedAt: new Date().toISOString(),
    }, instSession);

    if (created.status !== 'submitted') throw new Error(`Expected status 'submitted', got ${created.status}`);
    if (created.verificationStatus !== 'not_started') throw new Error(`Expected verificationStatus 'not_started', got ${created.verificationStatus}`);
  });

  // 10. Senior Decision Workflow & Reason Enforcement
  check('Senior Officer decision records decree, updates instrument, and requires mandatory reason', () => {
    const seniorSession: DemoSession = {
      userId: 'user-005',
      role: 'senior_officer',
      loginAt: new Date().toISOString(),
    };
    const reqs = getReleaseRequests();
    if (reqs.length === 0) throw new Error('No release requests found for testing');
    const targetReq = reqs[0];

    // Must fail if empty reason provided
    let emptyReasonBlocked = false;
    try {
      makeReleaseDecision(targetReq.id, 'approved', '   ', seniorSession);
    } catch {
      emptyReasonBlocked = true;
    }
    if (!emptyReasonBlocked) throw new Error('Senior Officer must NOT submit empty decision reason');

    // Must succeed with mandatory valid reason
    const decided = makeReleaseDecision(targetReq.id, 'approved', 'Statutory lock-in fulfilled; release authorized by Senior Officer.', seniorSession);
    if (!decided || decided.seniorDecision !== 'approved') throw new Error('Decision was not recorded');
  });

  // 11. Auditor Mutation Denial
  check('Auditor role is strictly blocked from making release decisions or mutations', () => {
    const auditorSession: DemoSession = {
      userId: 'user-004',
      role: 'auditor',
      loginAt: new Date().toISOString(),
    };
    const reqs = getReleaseRequests();
    const targetReq = reqs[0];

    let blocked = false;
    try {
      makeReleaseDecision(targetReq.id, 'approved', 'Auditor trying to approve', auditorSession);
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error('Security flaw: Auditor was allowed to mutate release decision!');
  });

  // 12. Admin Financial Decision Denial
  check('System Administrator cannot approve financial releases', () => {
    const adminSession: DemoSession = {
      userId: 'user-002',
      role: 'admin',
      loginAt: new Date().toISOString(),
    };
    const reqs = getReleaseRequests();
    const targetReq = reqs[0];

    let blocked = false;
    try {
      makeReleaseDecision(targetReq.id, 'approved', 'Admin trying to approve financial release', adminSession);
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error('Security flaw: Admin was allowed to make financial release decision!');
  });

  const allPassed = results.every(r => r.passed);
  return NextResponse.json({
    status: allPassed ? 'success' : 'failure',
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    tests: results,
  }, { status: 200 });
}
