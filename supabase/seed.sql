-- ============================================================================
-- SAKSHYA — MASTER SUPABASE SEED DATASET
-- Sourced from: Ministry of Education AISHE Directory & AICTE APH 2024–27
-- Covers: 8 Verified Institutions, 6 Regulatory Rules, Sample FDR Instruments,
-- Verification Checks, Findings, Lifecycle Events, Release Requests & Audit Events
-- ============================================================================

-- 1. INSTITUTIONS (Official AISHE Directory Data)
INSERT INTO public.institutions (id, name, official_id, aishe_code, city, state, type, contact_email, contact_phone, reference_source, active)
VALUES
('e1000000-0000-0000-0000-000000000001', 'Veermata Jijabai Technological Institute (VJTI)', 'MH-ENG-001', 'C-33827', 'Mumbai', 'Maharashtra', 'Standalone Institution', 'director@vjti.ac.in', '022-24198101', 'AISHE Directory / AICTE Western Region', true),
('e1000000-0000-0000-0000-000000000002', 'College of Engineering Pune (COEP Tech)', 'MH-ENG-002', 'U-1199', 'Pune', 'Maharashtra', 'University', 'registrar@coep.ac.in', '020-25507000', 'AISHE Directory / AICTE Western Region', true),
('e1000000-0000-0000-0000-000000000003', 'Delhi Technological University (DTU)', 'DL-ENG-001', 'U-0099', 'New Delhi', 'Delhi', 'University', 'registrar@dtu.ac.in', '011-27871018', 'AISHE Directory / AICTE Northern Region', true),
('e1000000-0000-0000-0000-000000000004', 'Jadavpur University — Faculty of Engineering', 'WB-ENG-001', 'U-0570', 'Kolkata', 'West Bengal', 'University', 'dean.fet@jadavpuruniversity.in', '033-24146666', 'AISHE Directory / AICTE Eastern Region', true),
('e1000000-0000-0000-0000-000000000005', 'Malaviya National Institute of Technology', 'RJ-ENG-001', 'U-0402', 'Jaipur', 'Rajasthan', 'Deemed University', 'registrar@mnit.ac.in', '0141-2529087', 'AISHE Directory / AICTE North-Western Region', true),
('e1000000-0000-0000-0000-000000000006', 'Maulana Azad National Institute of Technology', 'MP-ENG-001', 'U-0275', 'Bhopal', 'Madhya Pradesh', 'Deemed University', 'registrar@manit.ac.in', '0755-4051000', 'AISHE Directory / AICTE Central Region', true),
('e1000000-0000-0000-0000-000000000007', 'Anna University — CEG Campus', 'TN-ENG-001', 'U-0437', 'Chennai', 'Tamil Nadu', 'University', 'registrar@annauniv.edu', '044-22357004', 'AISHE Directory / AICTE Southern Region', true),
('e1000000-0000-0000-0000-000000000008', 'Government College of Engineering, Amravati', 'MH-ENG-003', 'C-43118', 'Amravati', 'Maharashtra', 'Affiliated College', 'principal@gcoea.ac.in', '0721-2531930', 'AISHE Directory / AICTE Western Region', true)
ON CONFLICT (aishe_code) DO UPDATE SET
    name = EXCLUDED.name,
    official_id = EXCLUDED.official_id,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    contact_email = EXCLUDED.contact_email,
    reference_source = EXCLUDED.reference_source;

-- 2. REGULATORY RULES (AICTE Approval Process Handbook 2024–27)
INSERT INTO public.regulatory_rules (id, name, category, description, source_document, clause_reference, academic_year, validation_logic, severity, enabled)
VALUES
('RULE-APH-01', 'Technical Institution Security Deposit (Engg & Tech)', 'Deposit Amount', 'Minimum security deposit of ₹35,00,000 for establishing a new Technical Institution offering Degree level Engineering & Technology programs.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter I, Clause 1.4.1 (Table 1.1)', '2024-2027', '{"minimumAmount": 3500000, "category": "Engineering & Technology", "level": "Degree"}'::jsonb, 'critical', true),
('RULE-APH-02', 'Management / MBA / PGDM Security Deposit', 'Deposit Amount', 'Minimum security deposit of ₹15,00,000 for establishing a standalone Management Institution offering MBA/PGDM programs.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter I, Clause 1.4.2 (Table 1.1)', '2024-2027', '{"minimumAmount": 1500000, "category": "Management", "level": "Post Graduate"}'::jsonb, 'critical', true),
('RULE-APH-03', 'Architecture & Planning Faculty Deposit', 'Deposit Amount', 'Minimum security deposit of ₹20,00,000 for establishing Architecture & Planning degree institutions.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter I, Clause 1.4.3', '2024-2027', '{"minimumAmount": 2000000, "category": "Architecture & Planning", "level": "Degree"}'::jsonb, 'error', true),
('RULE-APH-04', 'Joint FDR Pledging Mandate', 'Legal Mandate', 'Security Deposit must be in the form of a Fixed Deposit Receipt created in joint names of Regional Officer, AICTE and President/Chairman of Society/Trust.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter II, Clause 2.8.1', '2024-2027', '{"jointHolderRequired": true, "primaryHolder": "Regional Officer, AICTE"}'::jsonb, 'critical', true),
('RULE-APH-05', 'Minimum Deposit Tenor & Auto-Renewal Clause', 'Tenor & Maturity', 'FDR must have minimum maturity tenor of 8 to 10 years, and must incorporate an irrevocable auto-renewal mandate until released by AICTE.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter II, Clause 2.8.2', '2024-2027', '{"minTenorYears": 8, "autoRenewalMandatory": true}'::jsonb, 'error', true),
('RULE-APH-06', 'Security Deposit Release Protocol', 'Release & Closure', 'Release of security deposit on completion of mandatory period or institutional closure requires NOC from State Govt, affiliation board, and 90-day public notice without pending complaints.', 'AICTE Approval Process Handbook (APH 2024–27)', 'Chapter III, Clause 3.1.2', '2024-2027', '{"requireNOC": true, "noticeDays": 90, "zeroPendingDues": true}'::jsonb, 'warning', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    clause_reference = EXCLUDED.clause_reference,
    validation_logic = EXCLUDED.validation_logic;

-- 3. FDR INSTRUMENTS
INSERT INTO public.instruments (id, institution_id, internal_ref_id, application_ref, bank_name, branch_name, fdr_number, deposit_amount, currency, issue_date, maturity_date, status, verification_status)
VALUES
('d1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'FDR-2024-001', 'APP/2024/MH/ENG-01', 'State Bank of India', 'Fort Main Branch, Mumbai', 'SBI-FDR-90001234', 3500000.00, 'INR', '2024-08-15', '2034-08-15', 'active_monitoring', 'verified_by_source'),
('d1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'FDR-2024-002', 'APP/2024/MH/ENG-02', 'Bank of Baroda', 'Shivaji Nagar Branch, Pune', 'BOB-FDR-45006789', 3500000.00, 'INR', '2024-09-01', '2032-09-01', 'active_monitoring', 'verified_by_source'),
('d1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'FDR-2024-003', 'APP/2024/DL/ENG-01', 'Punjab National Bank', 'Connaught Place Branch, New Delhi', 'PNB-FDR-78123456', 5000000.00, 'INR', '2024-07-01', '2026-11-15', 'renewal_pending', 'verified_by_source'),
('d1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000004', 'FDR-2025-004', 'APP/2025/WB/ENG-01', 'Union Bank of India', 'Dalhousie Square Branch, Kolkata', 'UBI-FDR-33098765', 1500000.00, 'INR', '2025-01-10', '2035-01-10', 'verification_in_progress', 'pending'),
('d1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000005', 'FDR-2025-005', 'APP/2025/RJ/ENG-01', 'Canara Bank', 'MI Road Branch, Jaipur', 'CAN-FDR-55012345', 3500000.00, 'INR', '2025-02-01', '2033-02-01', 'discrepancy_flagged', 'mismatch_detected'),
('d1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000006', 'FDR-2024-006', 'APP/2024/MP/ENG-01', 'HDFC Bank', 'MP Nagar Branch, Bhopal', 'HDFC-FDR-99087654', 2000000.00, 'INR', '2016-03-10', '2026-03-10', 'release_requested', 'verified_by_source')
ON CONFLICT (internal_ref_id) DO UPDATE SET
    deposit_amount = EXCLUDED.deposit_amount,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status;
