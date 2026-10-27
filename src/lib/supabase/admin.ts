// ============================================================================
// Sakshya — Supabase Admin Client (Server-Only)
// Privileged client using service role key for system-level migrations,
// seed operations, and background verification jobs.
// NEVER EXPOSE TO BROWSER CLIENTS.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

export function getAdminSupabase() {
  const config = getSupabaseConfig();

  if (!config.isConfigured || !config.serviceRoleKey) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
