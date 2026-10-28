import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';

// Map demo institution IDs (inst-001..inst-008) to Supabase UUIDs
const DEMO_INSTITUTION_UUID_MAP: Record<string, string> = {
  'inst-001': 'e1000000-0000-0000-0000-000000000001',
  'inst-002': 'e1000000-0000-0000-0000-000000000002',
  'inst-003': 'e1000000-0000-0000-0000-000000000003',
  'inst-004': 'e1000000-0000-0000-0000-000000000004',
  'inst-005': 'e1000000-0000-0000-0000-000000000005',
  'inst-006': 'e1000000-0000-0000-0000-000000000006',
  'inst-007': 'e1000000-0000-0000-0000-000000000007',
  'inst-008': 'e1000000-0000-0000-0000-000000000008',
};

function resolveInstitutionUuid(instId?: string): string | null {
  if (!instId) return null;
  if (DEMO_INSTITUTION_UUID_MAP[instId]) {
    return DEMO_INSTITUTION_UUID_MAP[instId];
  }
  // If it's already a UUID string
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(instId)) {
    return instId;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, institutionId } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and role are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const admin = getAdminSupabase();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin service is not configured.' },
        { status: 500 }
      );
    }

    const resolvedInstId = role === 'institution' ? resolveInstitutionUuid(institutionId) : null;

    // 1. Check if user already exists in Supabase Auth
    const { data: existingList } = await admin.auth.admin.listUsers();
    const alreadyExists = existingList?.users?.find(
      u => u.email?.toLowerCase() === cleanEmail
    );

    let userId: string;

    if (alreadyExists) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists in Supabase. Please sign in.' },
        { status: 400 }
      );
    }

    // 2. Create user with email_confirm: true (bypasses Supabase SMTP send rate limits)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        display_name: name || cleanEmail.split('@')[0],
        role,
        institution_id: resolvedInstId || institutionId || null,
      },
    });

    if (authError || !authData?.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Failed to create user in Supabase Auth.' },
        { status: 400 }
      );
    }

    userId = authData.user.id;

    // 3. Insert or update the public.profiles table so it is visible in Supabase Table Editor
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        display_name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role,
        institution_id: resolvedInstId,
        designation: role === 'institution' ? 'Institution Officer' : 'Authorized Officer',
        active: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.warn('Supabase profile insertion note:', profileError.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        role,
        institutionId: resolvedInstId || institutionId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server registration error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
