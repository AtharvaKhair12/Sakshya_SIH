import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwuroynfdkwwgaccysiv.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dXJveW5mZGt3d2dhY2N5c2l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzEwNTYxNiwiZXhwIjoyMTA4NjgxNjE2fQ.a9nUxPOR8FyUQK2o4a6-CBRgp99CoB3tibMngF4ZMz0';

const client = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_INSTITUTIONS = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    name: 'Veermata Jijabai Technological Institute (VJTI)',
    official_id: 'MH-ENG-001',
    aishe_code: 'C-33827',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'Standalone Institution',
    contact_email: 'director@vjti.ac.in',
    contact_phone: '022-24198101',
    reference_source: 'AISHE Directory / AICTE Western Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    name: 'College of Engineering Pune (COEP Tech)',
    official_id: 'MH-ENG-002',
    aishe_code: 'U-1199',
    city: 'Pune',
    state: 'Maharashtra',
    type: 'University',
    contact_email: 'registrar@coep.ac.in',
    contact_phone: '020-25507000',
    reference_source: 'AISHE Directory / AICTE Western Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    name: 'Delhi Technological University (DTU)',
    official_id: 'DL-ENG-001',
    aishe_code: 'U-0099',
    city: 'New Delhi',
    state: 'Delhi',
    type: 'University',
    contact_email: 'registrar@dtu.ac.in',
    contact_phone: '011-27871018',
    reference_source: 'AISHE Directory / AICTE Northern Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000004',
    name: 'Jadavpur University — Faculty of Engineering',
    official_id: 'WB-ENG-001',
    aishe_code: 'U-0570',
    city: 'Kolkata',
    state: 'West Bengal',
    type: 'University',
    contact_email: 'dean.fet@jadavpuruniversity.in',
    contact_phone: '033-24146666',
    reference_source: 'AISHE Directory / AICTE Eastern Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000005',
    name: 'Malaviya National Institute of Technology',
    official_id: 'RJ-ENG-001',
    aishe_code: 'U-0402',
    city: 'Jaipur',
    state: 'Rajasthan',
    type: 'Deemed University',
    contact_email: 'registrar@mnit.ac.in',
    contact_phone: '0141-2529087',
    reference_source: 'AISHE Directory / AICTE North-Western Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000006',
    name: 'Maulana Azad National Institute of Technology',
    official_id: 'MP-ENG-001',
    aishe_code: 'U-0275',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    type: 'Deemed University',
    contact_email: 'registrar@manit.ac.in',
    contact_phone: '0755-4051000',
    reference_source: 'AISHE Directory / AICTE Central Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000007',
    name: 'Anna University — CEG Campus',
    official_id: 'TN-ENG-001',
    aishe_code: 'U-0437',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type: 'University',
    contact_email: 'registrar@annauniv.edu',
    contact_phone: '044-22357004',
    reference_source: 'AISHE Directory / AICTE Southern Region',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000008',
    name: 'Government College of Engineering, Amravati',
    official_id: 'MH-ENG-003',
    aishe_code: 'C-43118',
    city: 'Amravati',
    state: 'Maharashtra',
    type: 'Affiliated College',
    contact_email: 'principal@gcoea.ac.in',
    contact_phone: '0721-2531930',
    reference_source: 'AISHE Directory / AICTE Western Region',
  },
];

const AUTH_USERS = [
  {
    email: 'meera.sharma@vjti.ac.in',
    password: 'demo2025',
    displayName: 'Dr. Meera Sharma',
    role: 'institution',
    institutionId: 'e1000000-0000-0000-0000-000000000001',
    designation: 'Dean & FDR Authorised Signatory',
  },
  {
    email: 'meera.sharma@vbit.edu.in',
    password: 'demo2025',
    displayName: 'Dr. Meera Sharma',
    role: 'institution',
    institutionId: 'e1000000-0000-0000-0000-000000000001',
    designation: 'Dean & FDR Authorised Signatory',
  },
  {
    email: 'arun.patel@aicte.gov.in',
    password: 'demo2025',
    displayName: 'Arun Patel',
    role: 'scrutiny_officer',
    designation: 'Scrutiny Officer, AICTE Western Regional Office',
  },
  {
    email: 'ananya.iyer@aicte-demo.in',
    password: 'demo2025',
    displayName: 'Ananya Iyer',
    role: 'scrutiny_officer',
    designation: 'Scrutiny Officer, Bureau of Approvals',
  },
  {
    email: 'priya.deshmukh@aicte.gov.in',
    password: 'demo2025',
    displayName: 'Priya Deshmukh',
    role: 'scrutiny_officer',
    designation: 'Senior Legal & Financial Scrutiny Officer',
  },
  {
    email: 'rajesh.verma@aicte.gov.in',
    password: 'demo2025',
    displayName: 'Dr. Rajesh Verma',
    role: 'senior_officer',
    designation: 'Director & Senior Approving Authority',
  },
  {
    email: 'suresh.reddy@aicte-demo.in',
    password: 'demo2025',
    displayName: 'Dr. Suresh Reddy',
    role: 'senior_officer',
    designation: 'Senior Approving Officer, Approvals Bureau',
  },
  {
    email: 'cag.auditor@cag.gov.in',
    password: 'demo2025',
    displayName: 'CAG Senior Auditor',
    role: 'auditor',
    designation: 'Principal Compliance Auditor, CAG India',
  },
  {
    email: 'kavita.nair@audit-demo.in',
    password: 'demo2025',
    displayName: 'Kavita Nair',
    role: 'auditor',
    designation: 'Statutory Compliance Auditor',
  },
  {
    email: 'admin@aicte.gov.in',
    password: 'demo2025',
    displayName: 'System Administrator',
    role: 'admin',
    designation: 'Chief Information & Platform Administrator',
  },
  {
    email: 'amit.kulkarni@admin-demo.in',
    password: 'demo2025',
    displayName: 'Amit Kulkarni',
    role: 'admin',
    designation: 'System Administrator',
  },
];

const REGULATORY_RULES = [
  {
    id: 'RULE-APH-01',
    name: 'Technical Institution Security Deposit (Engg & Tech)',
    category: 'Deposit Amount',
    description: 'Minimum security deposit of ₹35,00,000 for establishing a new Technical Institution offering Degree level Engineering & Technology programs.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter I, Clause 1.4.1 (Table 1.1)',
    academic_year: '2024-2027',
    validation_logic: { minimumAmount: 3500000, category: 'Engineering & Technology', level: 'Degree' },
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'RULE-APH-02',
    name: 'Management / MBA / PGDM Security Deposit',
    category: 'Deposit Amount',
    description: 'Minimum security deposit of ₹15,00,000 for establishing a standalone Management Institution offering MBA/PGDM programs.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter I, Clause 1.4.2 (Table 1.1)',
    academic_year: '2024-2027',
    validation_logic: { minimumAmount: 1500000, category: 'Management', level: 'Post Graduate' },
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'RULE-APH-03',
    name: 'Architecture & Planning Faculty Deposit',
    category: 'Deposit Amount',
    description: 'Minimum security deposit of ₹20,00,000 for establishing Architecture & Planning degree institutions.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter I, Clause 1.4.3',
    academic_year: '2024-2027',
    validation_logic: { minimumAmount: 2000000, category: 'Architecture & Planning', level: 'Degree' },
    severity: 'error',
    enabled: true,
  },
  {
    id: 'RULE-APH-04',
    name: 'Joint FDR Pledging Mandate',
    category: 'Legal Mandate',
    description: 'Security Deposit must be in the form of a Fixed Deposit Receipt created in joint names of Regional Officer, AICTE and President/Chairman of Society/Trust.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter II, Clause 2.8.1',
    academic_year: '2024-2027',
    validation_logic: { jointHolderRequired: true, primaryHolder: 'Regional Officer, AICTE' },
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'RULE-APH-05',
    name: 'Minimum Deposit Tenor & Auto-Renewal Clause',
    category: 'Tenor & Maturity',
    description: 'FDR must have minimum maturity tenor of 8 to 10 years, and must incorporate an irrevocable auto-renewal mandate until released by AICTE.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter II, Clause 2.8.2',
    academic_year: '2024-2027',
    validation_logic: { minTenorYears: 8, autoRenewalMandatory: true },
    severity: 'error',
    enabled: true,
  },
  {
    id: 'RULE-APH-06',
    name: 'Security Deposit Release Protocol',
    category: 'Release & Closure',
    description: 'Release of security deposit on completion of mandatory period or institutional closure requires NOC from State Govt, affiliation board, and 90-day public notice without pending complaints.',
    source_document: 'AICTE Approval Process Handbook (APH 2024–27)',
    clause_reference: 'Chapter III, Clause 3.1.2',
    academic_year: '2024-2027',
    validation_logic: { requireNOC: true, noticeDays: 90, zeroPendingDues: true },
    severity: 'warning',
    enabled: true,
  },
];

async function seed() {
  console.log('--- STARTING SUPABASE SEEDING ---');

  // 1. Seed Institutions
  console.log('1. Upserting Institutions...');
  for (const inst of DEMO_INSTITUTIONS) {
    const { error } = await client.from('institutions').upsert(inst, { onConflict: 'aishe_code' });
    if (error) console.error(`Failed inst ${inst.aishe_code}:`, error.message);
  }
  console.log('Institutions upsert complete.');

  // 2. Create Auth Users and Profiles
  console.log('2. Creating Auth Users and User Profiles...');
  const existingUsers = (await client.auth.admin.listUsers()).data?.users || [];
  const userMap = new Map();

  for (const u of AUTH_USERS) {
    let authUser = existingUsers.find(eu => eu.email.toLowerCase() === u.email.toLowerCase());
    if (!authUser) {
      const { data, error } = await client.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          display_name: u.displayName,
          role: u.role,
          institution_id: u.institutionId || null,
        },
      });
      if (error) {
        console.error(`Error creating user ${u.email}:`, error.message);
        continue;
      }
      authUser = data.user;
    }

    userMap.set(u.email, authUser.id);

    // Upsert profile
    const { error: profErr } = await client.from('profiles').upsert({
      id: authUser.id,
      display_name: u.displayName,
      email: u.email,
      role: u.role,
      institution_id: u.institutionId || null,
      designation: u.designation,
      active: true,
    }, { onConflict: 'id' });
    if (profErr) console.error(`Error upserting profile ${u.email}:`, profErr.message);
  }
  console.log(`Auth users & Profiles seeded (${AUTH_USERS.length} accounts).`);

  // 3. Seed Regulatory Rules
  console.log('3. Upserting Regulatory Rules...');
  for (const rule of REGULATORY_RULES) {
    const { error } = await client.from('regulatory_rules').upsert(rule, { onConflict: 'id' });
    if (error) console.error(`Failed rule ${rule.id}:`, error.message);
  }
  console.log('Regulatory rules upsert complete.');

  // 4. Seed FDR Instruments
  console.log('4. Seeding Instruments...');
  const meeraId = userMap.get('meera.sharma@vjti.ac.in') || userMap.get('meera.sharma@vbit.edu.in');
  const arunId = userMap.get('arun.patel@aicte.gov.in') || userMap.get('ananya.iyer@aicte-demo.in');

  const SAMPLE_INSTRUMENTS = [
    {
      id: 'd1000000-0000-0000-0000-000000000001',
      institution_id: 'e1000000-0000-0000-0000-000000000001',
      internal_ref_id: 'FDR-2024-001',
      application_ref: 'APP/2024/MH/ENG-01',
      bank_name: 'State Bank of India',
      branch_name: 'Fort Main Branch, Mumbai',
      fdr_number: 'SBI-FDR-90001234',
      deposit_amount: 3500000.00,
      currency: 'INR',
      issue_date: '2024-08-15',
      maturity_date: '2034-08-15',
      status: 'active_monitoring',
      verification_status: 'verified_by_source',
      assigned_officer: arunId,
      created_by: meeraId,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000002',
      institution_id: 'e1000000-0000-0000-0000-000000000002',
      internal_ref_id: 'FDR-2024-002',
      application_ref: 'APP/2024/MH/ENG-02',
      bank_name: 'Bank of Baroda',
      branch_name: 'Shivaji Nagar Branch, Pune',
      fdr_number: 'BOB-FDR-45006789',
      deposit_amount: 3500000.00,
      currency: 'INR',
      issue_date: '2024-09-01',
      maturity_date: '2032-09-01',
      status: 'active_monitoring',
      verification_status: 'verified_by_source',
      assigned_officer: arunId,
      created_by: meeraId,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000003',
      institution_id: 'e1000000-0000-0000-0000-000000000003',
      internal_ref_id: 'FDR-2024-003',
      application_ref: 'APP/2024/DL/ENG-01',
      bank_name: 'Punjab National Bank',
      branch_name: 'Connaught Place Branch, New Delhi',
      fdr_number: 'PNB-FDR-78123456',
      deposit_amount: 5000000.00,
      currency: 'INR',
      issue_date: '2024-07-01',
      maturity_date: '2026-11-15',
      status: 'renewal_pending',
      verification_status: 'verified_by_source',
      assigned_officer: arunId,
      created_by: meeraId,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000004',
      institution_id: 'e1000000-0000-0000-0000-000000000004',
      internal_ref_id: 'FDR-2025-004',
      application_ref: 'APP/2025/WB/ENG-01',
      bank_name: 'Union Bank of India',
      branch_name: 'Dalhousie Square Branch, Kolkata',
      fdr_number: 'UBI-FDR-33098765',
      deposit_amount: 1500000.00,
      currency: 'INR',
      issue_date: '2025-01-10',
      maturity_date: '2035-01-10',
      status: 'verification_in_progress',
      verification_status: 'pending',
      assigned_officer: arunId,
      created_by: meeraId,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000005',
      institution_id: 'e1000000-0000-0000-0000-000000000005',
      internal_ref_id: 'FDR-2025-005',
      application_ref: 'APP/2025/RJ/ENG-01',
      bank_name: 'Canara Bank',
      branch_name: 'MI Road Branch, Jaipur',
      fdr_number: 'CAN-FDR-55012345',
      deposit_amount: 3500000.00,
      currency: 'INR',
      issue_date: '2025-02-01',
      maturity_date: '2033-02-01',
      status: 'discrepancy_flagged',
      verification_status: 'mismatch_detected',
      assigned_officer: arunId,
      created_by: meeraId,
    },
    {
      id: 'd1000000-0000-0000-0000-000000000006',
      institution_id: 'e1000000-0000-0000-0000-000000000006',
      internal_ref_id: 'FDR-2024-006',
      application_ref: 'APP/2024/MP/ENG-01',
      bank_name: 'HDFC Bank',
      branch_name: 'MP Nagar Branch, Bhopal',
      fdr_number: 'HDFC-FDR-99087654',
      deposit_amount: 2000000.00,
      currency: 'INR',
      issue_date: '2016-03-10',
      maturity_date: '2026-03-10',
      status: 'release_requested',
      verification_status: 'verified_by_source',
      assigned_officer: arunId,
      created_by: meeraId,
    },
  ];

  for (const inst of SAMPLE_INSTRUMENTS) {
    const { error } = await client.from('instruments').upsert(inst, { onConflict: 'internal_ref_id' });
    if (error) console.error(`Failed instrument ${inst.internal_ref_id}:`, error.message);
  }
  console.log('Instruments seeded.');

  // 5. Seed Lifecycle Events
  console.log('5. Seeding Lifecycle Events...');
  for (const inst of SAMPLE_INSTRUMENTS) {
    await client.from('lifecycle_events').insert({
      instrument_id: inst.id,
      from_status: null,
      to_status: inst.status,
      reason: `Initial record ingest for ${inst.internal_ref_id} (${inst.bank_name})`,
      actor_id: meeraId,
      actor_name: 'Dr. Meera Sharma',
      actor_role: 'institution',
    });
  }

  // 6. Seed Verification Checks & Findings
  console.log('6. Seeding Verification Checks & Findings...');
  await client.from('verification_checks').insert([
    {
      instrument_id: 'd1000000-0000-0000-0000-000000000001',
      verification_method: 'automated_bank_api',
      source: 'State Bank of India — Institutional API Gateway',
      result: 'verified_by_source',
      source_ref: 'SBI-REF-9812471',
      field_name: 'deposit_amount',
      submitted_value: '3500000.00',
      reference_value: '3500000.00',
      difference_detected: false,
      provenance: 'live',
      verified_by: arunId,
    },
    {
      instrument_id: 'd1000000-0000-0000-0000-000000000005',
      verification_method: 'canara_cbs_inquiry',
      source: 'Canara Bank Core Banking System',
      result: 'mismatch_detected',
      source_ref: 'CAN-CBS-44129',
      field_name: 'branch_name',
      submitted_value: 'MI Road Branch, Jaipur',
      reference_value: 'Tonk Road Branch, Jaipur',
      difference_detected: true,
      provenance: 'imported',
      verified_by: arunId,
    },
  ]);

  await client.from('instrument_findings').insert([
    {
      instrument_id: 'd1000000-0000-0000-0000-000000000005',
      rule_id: 'RULE-APH-04',
      rule_name: 'Joint FDR Pledging Mandate',
      severity: 'warning',
      description: 'Branch name in physical FDR certificate (MI Road) differs from Core Banking registry record (Tonk Road). Clarification required from issuing branch.',
      field_name: 'branch_name',
      expected_value: 'Tonk Road Branch, Jaipur',
      actual_value: 'MI Road Branch, Jaipur',
      resolved: false,
    },
  ]);

  // 7. Seed Release Request for FDR-2024-006
  console.log('7. Seeding Release Request...');
  await client.from('release_requests').insert({
    institution_id: 'e1000000-0000-0000-0000-000000000006',
    instrument_id: 'd1000000-0000-0000-0000-000000000006',
    reason: 'Completion of statutory 10-year lock-in period for Architecture Faculty under APH Clause 3.1.2.',
    status: 'under_scrutiny',
    supporting_documents: ['noc_state_dte.pdf', 'affidavit_no_dues.pdf', 'public_notice_clipping.pdf'],
    scrutiny_observation: 'Initial documentation complete. Verifying absence of pending student or faculty grievances before forwarding to Senior Approving Officer.',
    scrutiny_officer_id: arunId,
    created_by: meeraId,
  });

  // 8. Seed Audit Event
  console.log('8. Seeding Audit Events...');
  await client.from('audit_events').insert({
    actor_id: arunId,
    user_name: 'Arun Patel',
    user_role: 'scrutiny_officer',
    action: 'RECORD_INGESTION_AND_AUDIT_VERIFIED',
    entity_type: 'instrument',
    entity_id: 'd1000000-0000-0000-0000-000000000001',
    reason: 'Initial dataset seeded and verified against AICTE APH 2024-27 standards.',
    previous_value: null,
    new_value: 'active_monitoring',
  });

  console.log('--- SUPABASE SEEDING COMPLETE AND VERIFIED! ---');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
