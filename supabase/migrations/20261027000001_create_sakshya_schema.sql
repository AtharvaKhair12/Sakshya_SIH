-- ============================================================================
-- SAKSHYA — AICTE SECURITY DEPOSIT & FDR MANAGEMENT SYSTEM
-- MASTER DATABASE MIGRATION & RLS POLICIES
-- PostgreSQL / Supabase Schema (PS 1: Streamline of Security Deposit / FDR Portal)
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. INSTITUTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    official_id TEXT UNIQUE,
    aishe_code TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Affiliated College',
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    reference_source TEXT DEFAULT 'AISHE Directory / AICTE Approved List',
    source_retrieval_date TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('institution', 'scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin')),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    designation TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. FDR INSTRUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    internal_ref_id TEXT UNIQUE NOT NULL,
    application_ref TEXT,
    bank_name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    fdr_number TEXT NOT NULL,
    deposit_amount NUMERIC(15, 2) NOT NULL CHECK (deposit_amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'draft', 'submitted', 'preliminary_validation', 'pending_scrutiny',
        'verification_in_progress', 'verified', 'discrepancy_flagged',
        'active_monitoring', 'renewal_pending', 'replacement_submitted',
        'release_requested', 'released', 'closed'
    )),
    verification_status TEXT NOT NULL DEFAULT 'not_started' CHECK (verification_status IN (
        'not_started', 'pending', 'verified_by_source', 'public_reference_match',
        'mismatch_detected', 'expired', 'source_unavailable',
        'manual_confirmation_required', 'simulated_response'
    )),
    assigned_officer UUID REFERENCES public.profiles(id),
    previous_instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (maturity_date > issue_date)
);

-- Index for searching and fast lookup
CREATE INDEX IF NOT EXISTS idx_instruments_institution ON public.instruments(institution_id);
CREATE INDEX IF NOT EXISTS idx_instruments_fdr_number ON public.instruments(fdr_number);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON public.instruments(status);
CREATE INDEX IF NOT EXISTS idx_instruments_maturity_date ON public.instruments(maturity_date);

-- ============================================================================
-- 4. INSTRUMENT DOCUMENTS (Private storage metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instrument_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    document_category TEXT NOT NULL CHECK (document_category IN (
        'fdr_certificate', 'bank_letter', 'affidavit', 'identity_proof',
        'joint_endorsement', 'release_application', 'other'
    )),
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    content_hash TEXT,
    uploaded_by UUID REFERENCES public.profiles(id),
    extraction_status TEXT NOT NULL DEFAULT 'completed' CHECK (extraction_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    extraction_metadata JSONB DEFAULT '{}'::jsonb,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_docs_instrument ON public.instrument_documents(instrument_id);

-- ============================================================================
-- 5. SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    submission_ref TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    remarks TEXT,
    assigned_officer UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. VERIFICATION CHECKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    verification_method TEXT NOT NULL,
    source TEXT NOT NULL,
    result TEXT NOT NULL,
    source_ref TEXT,
    field_name TEXT NOT NULL,
    submitted_value TEXT,
    reference_value TEXT,
    difference_detected BOOLEAN NOT NULL DEFAULT false,
    provenance TEXT NOT NULL DEFAULT 'imported' CHECK (provenance IN ('live', 'imported', 'manual', 'simulated')),
    verified_by UUID REFERENCES public.profiles(id),
    response_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_instrument ON public.verification_checks(instrument_id);

-- ============================================================================
-- 7. COMPLIANCE FINDINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instrument_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    description TEXT NOT NULL,
    field_name TEXT,
    expected_value TEXT,
    actual_value TEXT,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_instrument ON public.instrument_findings(instrument_id);

-- ============================================================================
-- 8. LIFECYCLE EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    related_instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_instrument ON public.lifecycle_events(instrument_id);

-- ============================================================================
-- 9. RELEASE & REFUND REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.release_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_scrutiny', 'evidence_requested',
        'pending_senior_decision', 'approved', 'declined', 'closed'
    )),
    supporting_documents TEXT[] DEFAULT '{}',
    scrutiny_observation TEXT,
    scrutiny_officer_id UUID REFERENCES public.profiles(id),
    senior_decision TEXT CHECK (senior_decision IN ('approved', 'declined', 'returned')),
    senior_decision_reason TEXT,
    senior_officer_id UUID REFERENCES public.profiles(id),
    decision_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_requests_institution ON public.release_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_release_requests_instrument ON public.release_requests(instrument_id);

-- ============================================================================
-- 10. REGULATORY RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.regulatory_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    source_document TEXT,
    clause_reference TEXT,
    academic_year TEXT,
    validation_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    reviewed_by TEXT,
    last_reviewed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. AUDIT EVENTS (Append-only immutable event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    reason TEXT,
    previous_value TEXT,
    new_value TEXT,
    case_ref TEXT,
    source_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events(created_at);

-- Trigger to prevent UPDATE or DELETE on public.audit_events (tamper resistance)
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are append-only and cannot be altered or removed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable ON public.audit_events;
CREATE TRIGGER trg_audit_immutable
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT,
    entity_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper functions for trusted role and institution retrieval
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_institution_id()
RETURNS UUID AS $$
    SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Institutions RLS
DROP POLICY IF EXISTS "Institutions viewable by authenticated users" ON public.institutions;
CREATE POLICY "Institutions viewable by authenticated users"
ON public.institutions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Institutions manageable by admin only" ON public.institutions;
CREATE POLICY "Institutions manageable by admin only"
ON public.institutions FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'system_admin'));

-- 2. Profiles RLS
DROP POLICY IF EXISTS "Users can view own profile or officers can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or officers can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin'));

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'system_admin'));

-- 3. Instruments RLS
DROP POLICY IF EXISTS "Institutions view own instruments; officers view all" ON public.instruments;
CREATE POLICY "Institutions view own instruments; officers view all"
ON public.instruments FOR SELECT TO authenticated
USING (
    (public.get_current_role() = 'institution' AND institution_id = public.get_current_institution_id())
    OR public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin')
);

DROP POLICY IF EXISTS "Institutions can create instruments for themselves" ON public.instruments;
CREATE POLICY "Institutions can create instruments for themselves"
ON public.instruments FOR INSERT TO authenticated
WITH CHECK (
    public.get_current_role() = 'institution'
    AND institution_id = public.get_current_institution_id()
);

DROP POLICY IF EXISTS "Officers can update instruments status" ON public.instruments;
CREATE POLICY "Officers can update instruments status"
ON public.instruments FOR UPDATE TO authenticated
USING (public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'admin', 'system_admin'));

-- 4. Documents RLS
DROP POLICY IF EXISTS "Document access matching instrument ownership" ON public.instrument_documents;
CREATE POLICY "Document access matching instrument ownership"
ON public.instrument_documents FOR SELECT TO authenticated
USING (
    (public.get_current_role() = 'institution' AND institution_id = public.get_current_institution_id())
    OR public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin')
);

DROP POLICY IF EXISTS "Institutions upload documents to own instruments" ON public.instrument_documents;
CREATE POLICY "Institutions upload documents to own instruments"
ON public.instrument_documents FOR INSERT TO authenticated
WITH CHECK (
    public.get_current_role() = 'institution'
    AND institution_id = public.get_current_institution_id()
);

-- 5. Release Requests RLS
DROP POLICY IF EXISTS "Release requests viewable by owner institution or officers" ON public.release_requests;
CREATE POLICY "Release requests viewable by owner institution or officers"
ON public.release_requests FOR SELECT TO authenticated
USING (
    (public.get_current_role() = 'institution' AND institution_id = public.get_current_institution_id())
    OR public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin')
);

DROP POLICY IF EXISTS "Institution can create release request" ON public.release_requests;
CREATE POLICY "Institution can create release request"
ON public.release_requests FOR INSERT TO authenticated
WITH CHECK (
    public.get_current_role() = 'institution'
    AND institution_id = public.get_current_institution_id()
);

DROP POLICY IF EXISTS "Senior officer can authorize decision on release request" ON public.release_requests;
CREATE POLICY "Senior officer can authorize decision on release request"
ON public.release_requests FOR UPDATE TO authenticated
USING (public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'admin', 'system_admin'));

-- 6. Audit Events RLS (Strict Read-Only)
DROP POLICY IF EXISTS "Audit events readable by officers, auditors and admins" ON public.audit_events;
CREATE POLICY "Audit events readable by officers, auditors and admins"
ON public.audit_events FOR SELECT TO authenticated
USING (public.get_current_role() IN ('scrutiny_officer', 'senior_officer', 'auditor', 'admin', 'system_admin'));

DROP POLICY IF EXISTS "System can record audit events" ON public.audit_events;
CREATE POLICY "System can record audit events"
ON public.audit_events FOR INSERT TO authenticated
WITH CHECK (true);

-- 7. Regulatory Rules RLS
DROP POLICY IF EXISTS "Regulatory rules viewable by all authenticated" ON public.regulatory_rules;
CREATE POLICY "Regulatory rules viewable by all authenticated"
ON public.regulatory_rules FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Regulatory rules manageable by admin only" ON public.regulatory_rules;
CREATE POLICY "Regulatory rules manageable by admin only"
ON public.regulatory_rules FOR ALL TO authenticated
USING (public.get_current_role() IN ('admin', 'system_admin'));

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION (fdr-documents)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fdr-documents',
    'fdr-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- Storage RLS
DROP POLICY IF EXISTS "Storage private access to authenticated users" ON storage.objects;
CREATE POLICY "Storage private access to authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fdr-documents');

DROP POLICY IF EXISTS "Storage upload to authenticated institution and officers" ON storage.objects;
CREATE POLICY "Storage upload to authenticated institution and officers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fdr-documents');

