# Sakshya — Evidence & FDR Management Workspace
> **AICTE Security Deposit & Fixed Deposit Receipt (FDR) Administrative Portal**
>
> *Prototype environment · Independent demonstration · Not an official AICTE system*

---

## 1. Executive Summary & Vision

**Sakshya** is an administrative regulatory portal built to streamline the entire lifecycle of Security Deposits and Fixed Deposit Receipts (FDRs) associated with AICTE institutional approval and compliance workflows.

The portal enforces structured governance across the full lifecycle:
```
Institution Submission → Document Upload & OCR Extraction → Preliminary Validation →
Record Comparison & Verification → Scrutiny Observation → Active Monitoring & Maturity Horizons →
Renewal / Replacement Linking → Formal Release / Refund Application → Senior Authorized Decision → Traceable Audit Log
```

---

## 2. Visual Architecture & Design Language

Inspired by high-trust judicial and regulatory records portals:
- **Primary Color:** Deep Forest Green (`#2d5039`, `#1f3a28`)
- **Accent Color:** Muted Brass / Warm Gold (`#c4ad65`, `#8a7630`)
- **Canvas & Surfaces:** Warm Ivory (`#faf8f4`, `#f5f0e8`) and Parchment
- **Typography:** Serif Display (`Playfair Display`) paired with clean Sans-serif (`Inter`) for crisp data tables
- **Interface Patterns:** Editorial split-screen authentication, master-detail verification queue, timeline horizon tracking, and accessible status badges

---

## 3. Demo Roles & Quick Access Credentials

Sakshya provides one-click demo login buttons directly on the landing page for all five required roles:

| Role | Demo Identity | Sample Email | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Institution** | Registrar, Apex Institute of Technology | `apex.registrar@demo.edu.in` | Submit new FDRs, upload documents, track review status, initiate release requests. Restricted strictly to own institution. |
| **Scrutiny Officer** | Smt. Priya Sharma (Scrutiny Desk) | `priya.sharma@demo.gov.in` | Inspect queue, review OCR findings vs bank letters, record observations, request clarifications, escalate cases. |
| **Senior Officer** | Dr. A. K. Sundaram (Director - Approvals) | `ak.sundaram@demo.gov.in` | Review escalated cases, approve/decline release & refund requests with mandatory justification, sign off discharges. |
| **Auditor** | Shri Rajeshwar Rao (Audit & Vigilance) | `rajeshwar.rao@demo.gov.in` | **Strictly read-only** audit access across all records, verifications, decision histories, and CSV statutory exports. |
| **Administrator** | Systems Administrator | `admin@sakshya.local` | Manage demo user accounts & roles, toggle regulatory rules, inspect source adapters, import reference data, reset demo state. |

---

## 4. Workflows & Implemented Features

### 1. Split-Screen Role Authentication (`/`)
- Brand narrative, security posture notice, and one-click demo role switcher.

### 2. Operational Work Dashboard (`/dashboard`)
- Real-time KPIs calculated dynamically from the active store: Total Registered, Active Monitoring, Maturing in 30 Days, Overdue Lapsed, Verification Queue, Discrepancies, and Release Requests.
- Prioritized Action Required table and recent activity timeline.

### 3. Instruments Register (`/instruments`)
- Searchable, filterable, and paginated master table of all registered FDRs.
- Multi-dimensional filters: Status, Bank, Institution, Verification outcome.
- Sortable columns and CSV statutory export.

### 4. Multi-Step FDR Registration (`/instruments/new`)
- **Step 1:** Deposit & Institution details, tenure ordering check, duplicate FDR number alert, predecessor renewal linking.
- **Step 2:** Supporting evidence upload (PDF/JPG/PNG) with **Simulated OCR Field Extraction** prototype.
- **Step 3:** Automated pre-flight validation rules review.
- **Step 4:** Immutable confirmation receipt with printable view and immediate routing to scrutiny queue.

### 5. Dedicated Lifecycle & Evidence Detail (`/instruments/[id]`)
- Lifecycle progression stepper, deposit specifications, linked replacement chains.
- Tabbed interface: Overview, Evidence Documents, Verification Comparison Grid, and Full Audit Timeline.
- Role-gated action buttons: Advance Status, Escalate Case, Add Observation, and Resolve Discrepancy.

### 6. Institutional Submissions Workspace (`/submissions`)
- Focused tracking view for institutions to monitor filed FDRs, reviewer notes, and discrepancy requests.

### 7. Verification & Scrutiny Workspace (`/verification`)
- Master-detail split layout for regulatory officers.
- Left: Filterable queue by priority and outcome (mismatches, manual confirmation, verified).
- Right: Field-level comparison ledger (Submitted Value vs Source Reference Value), evidence inspection, and outcome recording.

### 8. Maturity & Renewal Workspace (`/maturity`)
- Calendar timeline and list horizons: &le; 30 Days (Critical), 31&ndash;60 Days, 61&ndash;90 Days, and Lapsed/Overdue.
- In-app notification dispatcher for proactive institutional renewal reminders.

### 9. Security Deposit Release & Refund (`/release-requests`)
- Formal multi-stage discharge workflow:
  - Institution files request with legal justification.
  - Scrutiny officer reviews lock-in conditions and forwards to Senior Officer.
  - Senior Officer records formal decision (Approved / Declined / Returned) with **mandatory recorded reason**.
  - Approved requests update the instrument status to `Released`.

### 10. Regulatory Rules Engine (`/settings`)
- Configurable rules with academic year applicability, severity levels, and toggle controls.
- Version history and change tracking.

### 11. Source Adapters & Data Import (`/settings`)
- Registry of public and bank adapters with connection statuses: Live, Imported, Simulated, Unavailable, Requires Authorization.
- Built-in CSV dataset importer with column mapping and preview.

### 12. Traceable Audit Trail (`/audit`)
- Chronological append-only event log recording timestamps, actors, roles, modified values, and reasons.
- CSV export capability.

### 13. User Administration (`/users`)
- Demo user creation, role assignment, and active status toggling.

---

## 5. Technology Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5 (Strict type checking)
- **Styling:** Tailwind CSS 4 with custom design tokens for warm ivory, deep forest, and muted brass
- **Icons:** Lucide React
- **Storage:** Browser `localStorage` service layer with fallback to memory seed data
- **Deployment:** Vercel-ready with zero required server credentials for demo mode

---

## 6. Local Development & Build Commands

### Prerequisites
- Node.js 18.x or later
- npm 9.x or later

### Running Locally
```bash
# Navigate to the project directory
cd sakshya

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

---

## 7. Vercel Deployment Instructions

1. Push this repository to GitHub or GitLab.
2. In the Vercel dashboard, click **Add New Project** and select the repository.
3. Configure the Root Directory as `sakshya` (if deploying from a monorepo) or `./`.
4. Build command: `next build`
5. Output directory: `.next`
6. Click **Deploy**. No private environment variables or secrets are mandatory for demonstration mode.

---

## 8. Known Demo Limitations & Future Backend Integrations

- **Local Storage Scope:** Demonstrations run in browser-local storage; changes made in one browser session do not sync across different physical devices.
- **Simulated External Adapters:** Bank verification APIs and AICTE AISHE webhooks are represented via demonstrable mock adapters to illustrate error handling and mismatch detection without violating real-world privacy.
- **Future Integration Points:** Clean abstractions exist in `src/lib/store.ts` to replace the local store with a PostgreSQL / Prisma backend, AWS S3 / Azure Blob Storage for encrypted documents, and Digilocker / NPCI / Bank Open Banking APIs for production verification.
