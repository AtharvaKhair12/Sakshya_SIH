// ============================================================================
// Sakshya — RBAC & Workflow Test Suite
// Validates role isolation, permissions, route guards, and action authority.
// ============================================================================

import assert from 'node:assert';

// Import types & permissions logic directly from TypeScript sources
import { ROLE_PERMISSIONS, Instrument } from '@/lib/types';
import {
  normalizeRole,
  hasPermission,
  canAccessRoute,
  canAccessInstrument,
  canPerformAction,
  getVisibleNavigation,
} from '@/lib/permissions';

console.log('=== Running Sakshya RBAC & Role Separation Test Suite ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
  }
}

// 1. Role Normalization
test('normalizeRole maps system_admin to admin and defaults gracefully', () => {
  assert.strictEqual(normalizeRole('admin'), 'admin');
  assert.strictEqual(normalizeRole('system_admin'), 'admin');
  assert.strictEqual(normalizeRole('institution'), 'institution');
  assert.strictEqual(normalizeRole('scrutiny_officer'), 'scrutiny_officer');
  assert.strictEqual(normalizeRole('senior_officer'), 'senior_officer');
  assert.strictEqual(normalizeRole('auditor'), 'auditor');
  assert.strictEqual(normalizeRole(undefined), 'institution');
});

// 2. Permission Matrix Checks
test('ROLE_PERMISSIONS grants distinct capabilities per role', () => {
  // Institution User
  assert.strictEqual(ROLE_PERMISSIONS.institution.canCreateInstruments, true);
  assert.strictEqual(ROLE_PERMISSIONS.institution.canMakeReleaseDecision, false);
  assert.strictEqual(ROLE_PERMISSIONS.institution.canManageRules, false);

  // Scrutiny Officer
  assert.strictEqual(ROLE_PERMISSIONS.scrutiny_officer.canReviewVerification, true);
  assert.strictEqual(ROLE_PERMISSIONS.scrutiny_officer.canRecordObservations, true);
  assert.strictEqual(ROLE_PERMISSIONS.scrutiny_officer.canMakeReleaseDecision, false); // Crucial!

  // Senior Officer
  assert.strictEqual(ROLE_PERMISSIONS.senior_officer.canMakeReleaseDecision, true); // Exclusive authority!
  assert.strictEqual(ROLE_PERMISSIONS.senior_officer.canManageRules, false);

  // Auditor (Strictly Read-Only)
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canCreateInstruments, false);
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canMakeReleaseDecision, false);
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canManageRules, false);
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canManageUsers, false);
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canViewAudit, true);
  assert.strictEqual(ROLE_PERMISSIONS.auditor.canExportReports, true);

  // System Administrator (No financial release authority)
  assert.strictEqual(ROLE_PERMISSIONS.admin.canManageUsers, true);
  assert.strictEqual(ROLE_PERMISSIONS.admin.canManageRules, true);
  assert.strictEqual(ROLE_PERMISSIONS.admin.canMakeReleaseDecision, false); // Safeguard!
});

// 3. Central Helper hasPermission
test('hasPermission enforces assigned role permissions', () => {
  const instSession = { role: 'institution' as const, userId: 'u1' };
  const scrutinySession = { role: 'scrutiny_officer' as const, userId: 'u2' };
  const seniorSession = { role: 'senior_officer' as const, userId: 'u3' };
  const auditorSession = { role: 'auditor' as const, userId: 'u4' };
  const adminSession = { role: 'admin' as const, userId: 'u5' };

  assert.strictEqual(hasPermission(instSession, 'canCreateInstruments'), true);
  assert.strictEqual(hasPermission(scrutinySession, 'canCreateInstruments'), false);

  assert.strictEqual(hasPermission(seniorSession, 'canMakeReleaseDecision'), true);
  assert.strictEqual(hasPermission(auditorSession, 'canMakeReleaseDecision'), false);
  assert.strictEqual(hasPermission(adminSession, 'canMakeReleaseDecision'), false);

  assert.strictEqual(hasPermission(adminSession, 'canManageRules'), true);
  assert.strictEqual(hasPermission(seniorSession, 'canManageRules'), false);
});

// 4. Route Access Control
test('canAccessRoute blocks unauthorized URL navigation', () => {
  const instSession = { role: 'institution' as const };
  const scrutinySession = { role: 'scrutiny_officer' as const };
  const seniorSession = { role: 'senior_officer' as const };
  const auditorSession = { role: 'auditor' as const };
  const adminSession = { role: 'admin' as const };

  // All can access dashboard
  assert.strictEqual(canAccessRoute(instSession, '/dashboard'), true);
  assert.strictEqual(canAccessRoute(auditorSession, '/dashboard'), true);

  // Institution-only submission creation
  assert.strictEqual(canAccessRoute(instSession, '/instruments/new'), true);
  assert.strictEqual(canAccessRoute(scrutinySession, '/instruments/new'), false);
  assert.strictEqual(canAccessRoute(auditorSession, '/instruments/new'), false);

  // Admin-only management
  assert.strictEqual(canAccessRoute(adminSession, '/users'), true);
  assert.strictEqual(canAccessRoute(adminSession, '/settings'), true);
  assert.strictEqual(canAccessRoute(instSession, '/users'), false);
  assert.strictEqual(canAccessRoute(scrutinySession, '/users'), false);
  assert.strictEqual(canAccessRoute(auditorSession, '/settings'), false);

  // Verification queue
  assert.strictEqual(canAccessRoute(scrutinySession, '/verification'), true);
  assert.strictEqual(canAccessRoute(seniorSession, '/verification'), true);
  assert.strictEqual(canAccessRoute(instSession, '/verification'), false);
});

// 5. Cross-Institution Data Isolation
test('canAccessInstrument prevents cross-institution data leakage', () => {
  const instAUser = { role: 'institution' as const, institutionId: 'inst-001' };
  const instBUser = { role: 'institution' as const, institutionId: 'inst-002' };
  const officerUser = { role: 'scrutiny_officer' as const };

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

  // Institution A can access Instrument A, but NEVER Instrument B
  assert.strictEqual(canAccessInstrument(instAUser, instAInstrument), true);
  assert.strictEqual(canAccessInstrument(instAUser, instBInstrument), false);

  // Institution B can access Instrument B, but NEVER Instrument A
  assert.strictEqual(canAccessInstrument(instBUser, instBInstrument), true);
  assert.strictEqual(canAccessInstrument(instBUser, instAInstrument), false);

  // Officers can access both for regulatory scrutiny
  assert.strictEqual(canAccessInstrument(officerUser, instAInstrument), true);
  assert.strictEqual(canAccessInstrument(officerUser, instBInstrument), true);
});

// 6. Action-Level Mutation Authorization
test('canPerformAction enforces strict operational boundaries', () => {
  const instUser = { role: 'institution' as const, institutionId: 'inst-001' };
  const scrutinyOfficer = { role: 'scrutiny_officer' as const };
  const seniorOfficer = { role: 'senior_officer' as const };
  const auditor = { role: 'auditor' as const };
  const sysAdmin = { role: 'admin' as const };

  // 1. Release decision: ONLY Senior Officer
  assert.strictEqual(canPerformAction(seniorOfficer, 'make_release_decision'), true);
  assert.strictEqual(canPerformAction(scrutinyOfficer, 'make_release_decision'), false);
  assert.strictEqual(canPerformAction(instUser, 'make_release_decision'), false);
  assert.strictEqual(canPerformAction(auditor, 'make_release_decision'), false);
  assert.strictEqual(canPerformAction(sysAdmin, 'make_release_decision'), false);

  // 2. Auditor: STRICTLY READ-ONLY for all mutations
  assert.strictEqual(canPerformAction(auditor, 'create_instrument'), false);
  assert.strictEqual(canPerformAction(auditor, 'record_observation'), false);
  assert.strictEqual(canPerformAction(auditor, 'verify_source'), false);
  assert.strictEqual(canPerformAction(auditor, 'escalate_case'), false);
  assert.strictEqual(canPerformAction(auditor, 'manage_users'), false);
  assert.strictEqual(canPerformAction(auditor, 'reset_demo_data'), false);

  // 3. Escalation: Scrutiny Officer
  assert.strictEqual(canPerformAction(scrutinyOfficer, 'escalate_case'), true);
  assert.strictEqual(canPerformAction(instUser, 'escalate_case'), false);

  // 4. Admin operations: System Administrator
  assert.strictEqual(canPerformAction(sysAdmin, 'manage_users'), true);
  assert.strictEqual(canPerformAction(sysAdmin, 'manage_rules'), true);
  assert.strictEqual(canPerformAction(sysAdmin, 'reset_demo_data'), true);
  assert.strictEqual(canPerformAction(seniorOfficer, 'manage_users'), false);
});

// 7. Navigation Differentiation
test('getVisibleNavigation returns purpose-built navigation for each role', () => {
  const instNav = getVisibleNavigation({ role: 'institution' });
  const scrutinyNav = getVisibleNavigation({ role: 'scrutiny_officer' });
  const seniorNav = getVisibleNavigation({ role: 'senior_officer' });
  const auditorNav = getVisibleNavigation({ role: 'auditor' });
  const adminNav = getVisibleNavigation({ role: 'admin' });

  // Verify unique navigation items
  assert(instNav.some(n => n.href === '/instruments/new'));
  assert(!scrutinyNav.some(n => n.href === '/instruments/new'));
  assert(!auditorNav.some(n => n.href === '/instruments/new'));

  assert(scrutinyNav.some(n => n.label === 'Scrutiny Desk'));
  assert(seniorNav.some(n => n.label === 'Decision Dashboard'));
  assert(auditorNav.some(n => n.label === 'Audit Workspace'));
  assert(adminNav.some(n => n.label === 'System Overview'));

  // Auditor has no creation or admin routes
  assert(!auditorNav.some(n => n.href === '/instruments/new'));
  assert(!auditorNav.some(n => n.href === '/users'));
  assert(!auditorNav.some(n => n.href === '/settings'));

  // Admin has users and settings
  assert(adminNav.some(n => n.href === '/users'));
  assert(adminNav.some(n => n.href === '/settings'));
});

// Summary
console.log(`\n=== Test Results: ${passedTests}/${totalTests} Passed ===`);
if (passedTests === totalTests) {
  console.log('All RBAC and Role Separation validations passed successfully!');
} else {
  process.exit(1);
}
