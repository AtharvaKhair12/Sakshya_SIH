// ============================================================================
// Sakshya — Supabase Server Client
// Initializer for Next.js Server Components, Server Actions & Route Handlers
// ============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';

export async function getServerSupabase() {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
