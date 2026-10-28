// ============================================================================
// Sakshya PS 1 — Diagnostic Endpoint Security Guard
// Enforces strict server-side authentication for diagnostic and test routes.
//
// Security Constraints:
// 1. NEVER trusts caller-controlled identity headers (e.g. x-user-role: admin/auditor).
// 2. NEVER uses hard-coded secret fallbacks.
// 3. In production (NODE_ENV === 'production'):
//    - Requires server-side INTERNAL_TEST_KEY to be configured in environment.
//    - Rejects request if INTERNAL_TEST_KEY is missing or empty (endpoint disabled).
//    - Rejects request if supplied x-sakshya-test-key or Bearer token does not match.
// 4. Outside production (development / test):
//    - Preserves local testing without unnecessarily changing application behavior.
// 5. NEVER exposes replacement keys or internal secrets in client responses or logs.
// ============================================================================

import { NextResponse } from 'next/server';

export interface DiagnosticAuthOptions {
  nodeEnv?: string;
  internalTestKey?: string;
}

export interface DiagnosticAuthCheckResult {
  authorized: boolean;
  status?: number;
  reason?: 'missing_server_key' | 'missing_client_key' | 'invalid_key' | 'authorized';
  response?: NextResponse;
}

/**
 * Verifies diagnostic authorization against server-side environment configuration.
 *
 * @param headers - HTTP request headers
 * @param options - Optional overrides for testing environment states
 */
export function verifyDiagnosticAuth(
  headers: Headers | { get(name: string): string | null },
  options?: DiagnosticAuthOptions
): DiagnosticAuthCheckResult {
  const env = options?.nodeEnv !== undefined ? options.nodeEnv : process.env.NODE_ENV;
  const isProd = env === 'production';
  const configuredKey = options?.internalTestKey !== undefined
    ? options.internalTestKey
    : process.env.INTERNAL_TEST_KEY;

  // Extract client-supplied credentials (ONLY via dedicated test key header or Bearer token)
  const testKeyHeader = headers.get('x-sakshya-test-key')?.trim();
  const authHeader = headers.get('authorization')?.trim();
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const suppliedKey = testKeyHeader || bearerToken;

  if (isProd) {
    // 1. If INTERNAL_TEST_KEY is missing from server-side environment, endpoint is disabled
    if (!configuredKey || configuredKey.trim() === '') {
      return {
        authorized: false,
        status: 401,
        reason: 'missing_server_key',
        response: NextResponse.json(
          {
            error: 'Unauthorized: Diagnostic test suite is disabled in production.',
            hint: 'Server-side INTERNAL_TEST_KEY is not configured.',
          },
          { status: 401 }
        ),
      };
    }

    // 2. If client supplied no key or an incorrect key, reject with 401
    if (!suppliedKey || suppliedKey !== configuredKey) {
      return {
        authorized: false,
        status: 401,
        reason: !suppliedKey ? 'missing_client_key' : 'invalid_key',
        response: NextResponse.json(
          {
            error: 'Unauthorized: Invalid or missing diagnostic authorization key.',
            hint: 'Provide valid key via x-sakshya-test-key header or Authorization: Bearer token.',
          },
          { status: 401 }
        ),
      };
    }

    return { authorized: true, reason: 'authorized' };
  }

  // Non-production (local development / test environment):
  // If INTERNAL_TEST_KEY is set in development, and the caller supplies an incorrect key, reject.
  if (configuredKey && configuredKey.trim() !== '') {
    if (suppliedKey && suppliedKey !== configuredKey) {
      return {
        authorized: false,
        status: 401,
        reason: 'invalid_key',
        response: NextResponse.json(
          {
            error: 'Unauthorized: Invalid diagnostic authorization key.',
            hint: 'Key does not match configured INTERNAL_TEST_KEY.',
          },
          { status: 401 }
        ),
      };
    }
  }

  // In development without key or with matching key, local testing is preserved
  return { authorized: true, reason: 'authorized' };
}
