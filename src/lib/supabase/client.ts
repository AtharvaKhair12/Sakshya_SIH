// ============================================================================
// Sakshya — Supabase Browser Client
// Initializer for browser-side authenticated Supabase sessions
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.publishableKey);
  }

  return browserClient;
}
