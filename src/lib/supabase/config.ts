// ============================================================================
// Sakshya — Supabase Configuration Helper
// Validates presence of credentials and returns connection metadata
// ============================================================================

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  serviceRoleKey?: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isConfigured = Boolean(
    url &&
    publishableKey &&
    url.startsWith('http') &&
    !url.includes('placeholder')
  );

  return {
    url,
    publishableKey,
    serviceRoleKey,
    isConfigured,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}
