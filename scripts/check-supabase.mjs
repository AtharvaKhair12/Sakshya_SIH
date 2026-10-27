import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwuroynfdkwwgaccysiv.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dXJveW5mZGt3d2dhY2N5c2l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzEwNTYxNiwiZXhwIjoyMTA4NjgxNjE2fQ.a9nUxPOR8FyUQK2o4a6-CBRgp99CoB3tibMngF4ZMz0';

const client = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const tables = ['institutions', 'profiles', 'instruments', 'instrument_documents', 'submissions', 'verification_checks', 'instrument_findings', 'lifecycle_events', 'release_requests', 'regulatory_rules', 'audit_events', 'notifications'];

  for (const t of tables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${t}: Error -> ${error.message}`);
    } else {
      console.log(`Table ${t}: ${count} rows`);
    }
  }

  const { data: usersData, error: usersErr } = await client.auth.admin.listUsers();
  if (usersErr) {
    console.log('Auth users list error:', usersErr.message);
  } else {
    console.log(`Supabase Auth users: ${usersData.users.length}`);
    usersData.users.forEach(u => console.log(`  User: ${u.email} (${u.id})`));
  }
}

check();
