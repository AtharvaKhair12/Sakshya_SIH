# Sakshya — Security Deposit & FDR Management Portal
> **AICTE Approval-Related Security Deposit and Fixed Deposit Receipt (FDR) Lifecycle Portal**
>
> Problem Statement 1 (PS 1): Streamline of Security Deposit / FDR Portal

---

## 1. Executive Summary & Architecture

**Sakshya** is an authoritative, end-to-end regulatory portal engineered specifically for Problem Statement 1: Managing the complete administrative lifecycle of security deposits and Fixed Deposit Receipts (FDRs) associated with AICTE institutional approvals.

The system implements the full regulatory lifecycle:
```
Institution FDR Submission & Evidence Upload
       │
       ▼
Automated Preliminary Checks (Duplicate check, date ordering, minimum term, required docs)
       │
       ▼
Scrutiny Officer Review & Discrepancy Findings (Evidence requests & case escalation)
       │
       ▼
Active Monitoring & Maturity Horizons (T-30, T-15, T-7 dynamic alerts & follow-ups)
       │
       ├──► Renewal / Replacement FDR Linking (Preserves predecessor audit trail)
       │
       ▼
Formal Release / Refund Request Workflow (Supporting NOC / closure evidence)
       │
       ▼
Senior Officer Authorized Decision (Approved / Declined / Returned with MANDATORY reason)
       │
       ▼
Immutable Append-Only Audit Trail (Database triggers prevent historical tampering)
```

---

## 2. Target Technology Stack

- **Frontend & App Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5 (Strict mode)
- **Styling:** Vanilla CSS & Tailwind design tokens for judicial/regulatory aesthetic
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth & Trusted Role Assignment
- **Document Storage:** Private Supabase Storage bucket (`fdr-documents`) with short-lived signed URLs
- **Backend Services:** Typed domain service layer (`src/lib/services/`)
- **Reference Data:** Official AICTE Approval Process Handbook (APH 2024-2027) & Ministry of Education AISHE Directory

---

## 3. Database Schema & Migration Instructions

All database tables, constraints, foreign keys, RLS policies, and triggers are defined in a version-controlled migration:
```
supabase/migrations/20261027000001_create_sakshya_schema.sql
```

### Entities Defined:
1. **`institutions`**: AISHE codes, official identifiers, reference provenance, and contact details.
2. **`profiles`**: User profiles linked to `auth.users(id)` with trusted roles (`institution`, `scrutiny_officer`, `senior_officer`, `auditor`, `admin`).
3. **`instruments`**: Exact numeric deposit representation (`numeric(15, 2)`), date ordering constraints (`maturity_date > issue_date`), distinct `status` vs `verification_status`.
4. **`instrument_documents`**: Metadata for uploaded certificates and letters stored in private bucket `fdr-documents`.
5. **`submissions`**: Institution submission references, correction tracking, and assigned officers.
6. **`verification_checks`**: Comparison results with sources, outcome status, and verification method.
7. **`instrument_findings`**: Discrepancy findings, duplicate identifiers, date mismatches, severity, and resolution reasons.
8. **`lifecycle_events`**: Immutable state transitions, predecessor-replacement instrument links, and actor tracking.
9. **`release_requests`**: Institutional refund requests, scrutiny observations, and Senior Officer authorized decisions.
10. **`regulatory_rules`**: AICTE APH clauses, page references, academic year applicability, and deterministic logic.
11. **`audit_events`**: Append-only audit events protected by PostgreSQL trigger `prevent_audit_tampering()`.
12. **`notifications`**: Persistent in-app notifications for approaching maturities and action items.

### Applying the Migration to Your Supabase Project:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to the **SQL Editor**.
3. Copy the entire contents of [`supabase/migrations/20261027000001_create_sakshya_schema.sql`](./supabase/migrations/20261027000001_create_sakshya_schema.sql).
4. Click **Run**. The tables, indexes, RLS policies, storage bucket, and tamper-proof triggers will be created.

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required credentials from your Supabase Project Settings (API tab):
```env
# Public Supabase Client (Browser & Server)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"

# Server-Only Secret (NEVER expose to client code)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"

# Storage Bucket
NEXT_PUBLIC_STORAGE_BUCKET="fdr-documents"
```

*Note: If environment variables are omitted or in offline demonstration mode, Sakshya gracefully operates with the typed local store without crashing or throwing unhandled 500 errors.*

---

## 5. Role-Based Access Control (RBAC) Matrix

Every action is enforced at both the UI layer, service layer, and PostgreSQL Row Level Security (RLS):

| Role | Instrument Access | FDR Creation | Scrutiny Observations & Findings | Release Decision Authority | Audit Log |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Institution User** | Own institution only | **Yes** (with docs & validations) | View observations, respond | Propose request only | Restricted |
| **Scrutiny Officer** | All authorized cases | No | **Yes** (request evidence, escalate) | No financial authority | Full read |
| **Senior Officer** | All cases & escalations | No | Full scrutiny inspection | **EXCLUSIVELY AUTHORIZED** (Mandatory reason) | Full read |
| **Auditor** | All cases | No | No (Strictly read-only) | No | **Full read & export** |
| **System Administrator** | System administration | No | No financial authority | **No release authority** | Full read |

---

## 6. Official Reference Data Provenance

Sakshya strictly complies with authentic public sources:
1. **AICTE Regulatory Reference Rules:**
   - Source: [AICTE Approval Process Handbook (APH 2024-2027)](https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf)
   - Sourced Clauses: Clause 1.4.1 (Joint Account Mandate), Clause 1.12(iv) (10-Year Retention), Table 1.4 (Deposit Amounts), Clause 1.4.3 (Scheduled Commercial Bank), Clause 6.46(b) (Internal Clearances), Appendix 8 (Release Clearance).
2. **Institutional Identity Data:**
   - Source: [Ministry of Education AISHE Institutional Directory](https://dashboard.aishe.gov.in/hedirectory/)
   - Genuine AISHE codes (e.g. `C-33827` for VJTI, `U-1199` for COEP Tech, `U-0099` for DTU).
3. **External Banking Adapters:**
   - Clearly documented with honest connection statuses (`requires_authorization` or `simulated`). No fake live bank endpoints or false bank-verification claims.

---

## 7. Local Development & Testing

```bash
# Install dependencies
npm install

# Type-check TypeScript codebase
npx tsc --noEmit

# Run Next.js development server
npm run dev

# Run comprehensive RBAC and FDR lifecycle test suite
# Direct API test endpoint: http://localhost:3000/api/test-rbac

# Build production bundle
npm run build
```

---

## 8. Deployment to Vercel

The application is configured to deploy directly to Vercel connected to the repository:
- **Repository:** `https://github.com/AtharvaKhair12/Sakshya_SIH.git`
- **Framework Preset:** Next.js
- **Build Command:** `next build`
- **Output Directory:** `.next`
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel Project Settings > Environment Variables for live database connectivity.
