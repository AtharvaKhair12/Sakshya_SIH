// ============================================================================
// Sakshya — Centralized Role & Permissions System
// Reusable authorization policies, route guards, and scoped access checks.
// ============================================================================

import React from 'react';
import {
  Role, Permission, ROLE_PERMISSIONS, ROLE_LABELS, Instrument, User
} from './types';
import { DemoSession } from './store';

export type UserOrSession = User | DemoSession | { role: Role; institutionId?: string; id?: string } | null | undefined;

/**
 * Normalizes role identifier (supporting 'admin' and 'system_admin' equivalently).
 */
export function normalizeRole(role?: string): Role {
  if (!role) return 'institution';
  if (role === 'admin' || role === 'system_admin') return 'admin';
  return role as Role;
}

/**
 * Checks if user/session possesses a specific permission key.
 */
export function hasPermission(
  user: UserOrSession,
  permission: keyof Permission
): boolean {
  if (!user || !user.role) return false;
  const role = normalizeRole(user.role);
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return Boolean(perms[permission]);
}

/**
 * Determines whether a user/session is permitted to view/access a given route path.
 */
export function canAccessRoute(
  user: UserOrSession,
  pathname: string
): boolean {
  if (!user || !user.role) return pathname === '/';
  const role = normalizeRole(user.role);

  // Common public / base route
  if (pathname === '/' || pathname === '/dashboard') return true;

  // Institution-only submission creation
  if (pathname.startsWith('/instruments/new')) {
    return role === 'institution' || role === 'admin';
  }

  // Institutional submissions view
  if (pathname.startsWith('/submissions')) {
    return role === 'institution' || role === 'scrutiny_officer';
  }

  // Verification queue (Scrutiny, Senior Officer, Auditor)
  if (pathname.startsWith('/verification')) {
    return role === 'scrutiny_officer' || role === 'senior_officer' || role === 'auditor';
  }

  // Reports and Audit Log (Officers, Auditor, Admin)
  if (pathname.startsWith('/reports') || pathname.startsWith('/audit')) {
    return role === 'scrutiny_officer' || role === 'senior_officer' || role === 'auditor' || role === 'admin';
  }

  // User and Settings Management (Administrator only)
  if (pathname.startsWith('/users') || pathname.startsWith('/settings')) {
    return role === 'admin';
  }

  // Instruments, Maturity, Release Requests are accessible to all roles with scoped views
  if (
    pathname.startsWith('/instruments') ||
    pathname.startsWith('/maturity') ||
    pathname.startsWith('/release-requests')
  ) {
    return true;
  }

  return true;
}

/**
 * Validates whether user/session has authority to view or operate on a specific Instrument.
 * Strict ownership isolation: Institution users can ONLY access their own institution's records.
 */
export function canAccessInstrument(
  user: UserOrSession,
  instrument: Instrument | null | undefined
): boolean {
  if (!user || !instrument) return false;
  const role = normalizeRole(user.role);

  if (role === 'institution') {
    return Boolean(user.institutionId && instrument.institutionId === user.institutionId);
  }

  // Officers, Auditors, and Admins can view instruments within their authorized regulatory scopes
  return true;
}

/**
 * Granular action authorization.
 * Strict rule: Auditor is strictly read-only and blocked from all mutations.
 * Administrator cannot make financial release decisions.
 */
export function canPerformAction(
  user: UserOrSession,
  action:
    | 'create_instrument'
    | 'edit_instrument'
    | 'upload_document'
    | 'record_observation'
    | 'request_evidence'
    | 'verify_source'
    | 'escalate_case'
    | 'make_release_decision'
    | 'resolve_finding'
    | 'manage_users'
    | 'manage_rules'
    | 'import_data'
    | 'reset_demo_data',
  resource?: { institutionId?: string; status?: string }
): boolean {
  if (!user || !user.role) return false;
  const role = normalizeRole(user.role);

  // Auditor is strictly READ-ONLY across all actions
  if (role === 'auditor') {
    return false;
  }

  switch (action) {
    case 'create_instrument':
      return role === 'institution' || role === 'admin';

    case 'edit_instrument':
    case 'upload_document':
      if (role === 'institution') {
        return Boolean(resource?.institutionId && user.institutionId === resource.institutionId);
      }
      return role === 'admin';

    case 'record_observation':
    case 'request_evidence':
      return role === 'scrutiny_officer' || role === 'senior_officer';

    case 'verify_source':
    case 'resolve_finding':
      return role === 'scrutiny_officer' || role === 'senior_officer';

    case 'escalate_case':
      return role === 'scrutiny_officer';

    case 'make_release_decision':
      // Explicit rule: Senior Officer alone possesses final financial release/refund authority
      return role === 'senior_officer';

    case 'manage_users':
    case 'manage_rules':
    case 'import_data':
    case 'reset_demo_data':
      return role === 'admin';

    default:
      return false;
  }
}

/**
 * Navigation item structure.
 */
export interface NavigationLink {
  label: string;
  href: string;
  iconName: string;
  badgeCount?: number;
  description?: string;
}

/**
 * Returns the exact, purpose-built navigation configuration for the authenticated role.
 */
export function getVisibleNavigation(user: UserOrSession): NavigationLink[] {
  if (!user || !user.role) return [];
  const role = normalizeRole(user.role);

  switch (role) {
    case 'institution':
      return [
        { label: 'My FDR Summary', href: '/dashboard', iconName: 'LayoutDashboard', description: 'Institutional Overview' },
        { label: 'My Instruments', href: '/instruments', iconName: 'FileText', description: 'Registered FDRs' },
        { label: 'New Submission', href: '/instruments/new', iconName: 'PlusCircle', description: 'Register FDR' },
        { label: 'Submissions & Scrutiny', href: '/submissions', iconName: 'Send', description: 'Status & Queries' },
        { label: 'Maturity & Renewal', href: '/maturity', iconName: 'Calendar', description: 'Horizon Alerts' },
        { label: 'Release Requests', href: '/release-requests', iconName: 'ArrowRightLeft', description: 'Discharge Applications' },
      ];

    case 'scrutiny_officer':
      return [
        { label: 'Scrutiny Desk', href: '/dashboard', iconName: 'LayoutDashboard', description: 'Operational Workload' },
        { label: 'Review Queue', href: '/verification', iconName: 'ShieldCheck', description: 'Verification & OCR' },
        { label: 'Instrument Register', href: '/instruments', iconName: 'FileText', description: 'Master FDR Records' },
        { label: 'Discrepancy Cases', href: '/instruments?status=discrepancy_flagged', iconName: 'AlertTriangle', description: 'Flagged Mismatches' },
        { label: 'Maturity Monitoring', href: '/maturity', iconName: 'Calendar', description: 'Maturity Horizons' },
        { label: 'Release Scrutiny', href: '/release-requests', iconName: 'ArrowRightLeft', description: 'Scrutiny Requests' },
        { label: 'Scrutiny Reports', href: '/reports', iconName: 'BarChart3', description: 'Statutory Exports' },
        { label: 'Audit Trail', href: '/audit', iconName: 'History', description: 'Case History' },
      ];

    case 'senior_officer':
      return [
        { label: 'Decision Dashboard', href: '/dashboard', iconName: 'LayoutDashboard', description: 'Decisions & Escalations' },
        { label: 'Pending Decisions', href: '/release-requests?status=pending_senior_decision', iconName: 'CheckCircle', description: 'Awaiting Authorization' },
        { label: 'Escalated Cases', href: '/verification?status=mismatch_detected', iconName: 'AlertTriangle', description: 'Officer Escalations' },
        { label: 'Release & Refunds', href: '/release-requests', iconName: 'ArrowRightLeft', description: 'All Release Cases' },
        { label: 'Instrument Register', href: '/instruments', iconName: 'FileText', description: 'National FDR Registry' },
        { label: 'Decision History', href: '/audit?action=release_decision', iconName: 'History', description: 'Authorized Decrees' },
        { label: 'Executive Reports', href: '/reports', iconName: 'BarChart3', description: 'Management Summaries' },
      ];

    case 'auditor':
      return [
        { label: 'Audit Workspace', href: '/dashboard', iconName: 'LayoutDashboard', description: 'Compliance & Integrity' },
        { label: 'Audit Explorer', href: '/audit', iconName: 'History', description: 'Traceable Event Log' },
        { label: 'Instrument Records', href: '/instruments', iconName: 'FileText', description: 'Read-Only Inspect' },
        { label: 'Verification Traceability', href: '/verification', iconName: 'ShieldCheck', description: 'Evidence Verification' },
        { label: 'Decision Review', href: '/release-requests', iconName: 'ArrowRightLeft', description: 'Decrees & Reasons' },
        { label: 'Statutory Reports', href: '/reports', iconName: 'BarChart3', description: 'Audit Extracts' },
      ];

    case 'admin':
      return [
        { label: 'System Overview', href: '/dashboard', iconName: 'LayoutDashboard', description: 'Health & Configuration' },
        { label: 'User Management', href: '/users', iconName: 'Users', description: 'Accounts & Roles' },
        { label: 'Regulatory Rules', href: '/settings?tab=rules', iconName: 'Sliders', description: 'Rule Parameters' },
        { label: 'Source Adapters', href: '/settings?tab=sources', iconName: 'Database', description: 'External Adapters' },
        { label: 'Reference Ingestion', href: '/settings?tab=import', iconName: 'Upload', description: 'CSV/JSON Datasets' },
        { label: 'System Activity', href: '/audit', iconName: 'History', description: 'Configuration Logs' },
        { label: 'System Settings', href: '/settings?tab=preferences', iconName: 'Settings', description: 'Preferences & Reset' },
      ];

    default:
      return [];
  }
}
