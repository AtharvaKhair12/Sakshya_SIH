'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';
import { Role } from '@/lib/types';
import {
  Building2, Search, FileCheck, Eye, Settings,
  Clock, History, ArrowRight, ShieldCheck,
  UploadCloud, AlertTriangle, Layers, BellRing,
  UserCheck, CheckCircle2, Lock, Mail, EyeOff, KeyRound
} from 'lucide-react';

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  institution: <Building2 size={22} />,
  scrutiny_officer: <Search size={22} />,
  senior_officer: <FileCheck size={22} />,
  auditor: <Eye size={22} />,
  admin: <Settings size={22} />,
  system_admin: <Settings size={22} />,
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  institution: 'Submit FDR records, upload documents, track submissions, and manage renewal or release requests.',
  scrutiny_officer: 'Review submitted instruments, investigate discrepancies, and request supporting evidence.',
  senior_officer: 'Review escalated cases, resolve exceptions, and record authorized decisions.',
  auditor: 'Inspect verification records, decision history, and audit trails in read-only mode.',
  admin: 'Manage user accounts, configure rules, and maintain reference data.',
};

// 5 Connected Stages: Submission to Resolution
const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'Stage 1 — Secure Submission',
    description: 'Institutions submit security deposit/FDR information and the required supporting documents through a structured workflow.',
    icon: <UploadCloud size={20} />,
  },
  {
    step: '02',
    title: 'Stage 2 — Evidence-led Validation',
    description: 'The system checks document completeness, compares available records, and flags inconsistencies that require further review.',
    icon: <ShieldCheck size={20} />,
  },
  {
    step: '03',
    title: 'Stage 3 — Maturity & Renewal',
    description: 'Upcoming maturity dates, outstanding renewals, replacement instruments, and pending follow-ups remain visible to authorized users.',
    icon: <Clock size={20} />,
  },
  {
    step: '04',
    title: 'Stage 4 — Controlled Review & Release',
    description: 'Scrutiny officers investigate cases, senior officers record authorized decisions, and release requests follow the applicable review process.',
    icon: <UserCheck size={20} />,
  },
  {
    step: '05',
    title: 'Stage 5 — Traceable Outcomes',
    description: 'The system maintains an accessible history of submissions, verification outcomes, officer observations, and administrative actions.',
    icon: <History size={20} />,
  },
];

// 4 Intended Outcome Feature Blocks
const OUTCOME_BLOCKS = [
  {
    title: 'Centralized Records',
    description: 'Bring institution-wise FDR records, documents, and lifecycle status together in one workspace.',
    icon: <Layers size={22} className="text-forest-700" />,
  },
  {
    title: 'Earlier Discrepancy Detection',
    description: 'Help identify missing information, duplicated identifiers, inconsistent dates, and records requiring manual confirmation.',
    icon: <AlertTriangle size={22} className="text-forest-700" />,
  },
  {
    title: 'Proactive Follow-up',
    description: 'Improve visibility into upcoming maturities, overdue actions, renewal requirements, and pending requests.',
    icon: <BellRing size={22} className="text-forest-700" />,
  },
  {
    title: 'Accountable Decisions',
    description: 'Support evidence-linked scrutiny, role-specific permissions, controlled decision workflows, and traceable administrative history.',
    icon: <ShieldCheck size={22} className="text-forest-700" />,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithPassword, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>('institution');
  const [email, setEmail] = useState('meera.sharma@vjti.ac.in');
  const [password, setPassword] = useState('demo2025');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);
    const res = await loginWithPassword(email, password);
    setIsLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Authentication failed. Please verify credentials.');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSelectRoleCreds = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setSelectedRole(cred.role);
    setEmail(cred.email);
    setPassword(cred.password);
    setLoginError(null);
  };

  const handleDirectRoleLogin = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setIsLoading(true);
    setTimeout(() => {
      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
      router.push('/dashboard');
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-ivory)' }}>
      {/* Top Header Bar */}
      <header className="border-b px-6 py-3.5 flex items-center justify-between bg-white/90 backdrop-blur-sm sticky top-0 z-30"
        style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex items-center gap-3">
          <img
            src="/sakshya-logo.png"
            alt="Sakshya Logo"
            className="w-10 h-10 object-contain rounded-lg flex-shrink-0"
          />
          <div>
            <div className="font-serif text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
              Sakshya
            </div>
            <div className="text-[10px] tracking-wider uppercase font-medium" style={{ color: 'var(--color-charcoal-muted)' }}>
              EVIDENCE &amp; FDR MANAGEMENT WORKSPACE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'var(--color-brass-50)', color: 'var(--color-charcoal)', border: '1px solid var(--color-brass-200)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600 animate-pulse" />
            SECURITY DEPOSIT &amp; FDR MANAGEMENT
          </span>
          <a href="#workspace"
            className="text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 flex items-center gap-1.5"
            style={{ borderColor: 'var(--color-parchment)', color: 'var(--color-charcoal)' }}>
            Portal Access <ArrowRight size={13} />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-16">
        {/* Section 1: Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold tracking-wider uppercase"
            style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)', border: '1px solid var(--color-forest-200)' }}>
            <ShieldCheck size={13} />
            AICTE-RELATED APPROVAL WORKFLOWS
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-gray-900 leading-[1.18]"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
            Every deposit tracked.<br />
            <span style={{ color: 'var(--color-forest-700)' }}>Every action traceable.</span>
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-gray-600 max-w-2xl mx-auto">
            Sakshya brings institution-wise security deposit and FDR records, document checks, maturity reminders, renewal tracking, and release requests into one evidence-led workspace. It helps institutions and authorized reviewers manage financial instruments systematically and follow up on outstanding actions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a href="#workspace"
              className="btn-primary text-xs font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-sm">
              Enter Workspace <ArrowRight size={15} />
            </a>
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Unified access for institutions, scrutiny officers, and leadership
            </span>
          </div>
        </div>

        {/* Section 2: Purpose-Driven Visual Journey: A clearer path from submission to resolution */}
        <section className="bg-white border rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm space-y-8"
          style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              A clearer path from submission to resolution
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              A structured, evidence-led workflow guiding security deposits and FDR instruments through every administrative stage.
            </p>
          </div>

          {/* Desktop Connected Horizontal Timeline (>= lg) */}
          <div className="hidden lg:grid grid-cols-5 gap-4 relative pt-2">
            {/* Connecting baseline behind nodes */}
            <div className="absolute top-8 left-8 right-8 h-0.5 -z-0"
              style={{ background: 'linear-gradient(90deg, var(--color-forest-200) 0%, var(--color-brass-300) 50%, var(--color-forest-300) 100%)' }} />

            {WORKFLOW_STAGES.map((stage, idx) => (
              <div key={stage.step} className="relative z-10 flex flex-col items-center text-center px-2 group">
                {/* Node with Step Badge */}
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-white border-2 shadow-xs transition-transform group-hover:scale-105 duration-200 mb-3"
                  style={{
                    borderColor: idx === 0 ? 'var(--color-forest-600)' : 'var(--color-parchment)',
                    color: 'var(--color-forest-700)',
                  }}>
                  {stage.icon}
                </div>

                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5"
                  style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)' }}>
                  {stage.step}
                </span>

                <h3 className="font-serif font-bold text-xs text-gray-900 mt-1 mb-1.5" style={{ fontFamily: 'var(--font-serif)' }}>
                  {stage.title}
                </h3>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile & Tablet Vertical Connected Timeline (< lg) */}
          <div className="lg:hidden relative pl-6 border-l-2 ml-4 space-y-6"
            style={{ borderColor: 'var(--color-forest-200)' }}>
            {WORKFLOW_STAGES.map((stage) => (
              <div key={stage.step} className="relative space-y-1">
                {/* Timeline Node Dot */}
                <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-xl flex items-center justify-center bg-white border-2 shadow-xs"
                  style={{ borderColor: 'var(--color-forest-600)', color: 'var(--color-forest-700)' }}>
                  {stage.icon}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)' }}>
                    {stage.step}
                  </span>
                  <h3 className="font-serif font-bold text-xs text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                    {stage.title}
                  </h3>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed pt-0.5">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Outcomes Section Aligned with the Problem Statement */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
              style={{ background: 'var(--color-brass-50)', color: 'var(--color-charcoal)', border: '1px solid var(--color-brass-200)' }}>
              ALIGNED WITH AICTE-RELATED APPROVAL WORKFLOWS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              What Sakshya is designed to improve
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Key operational objectives designed to address security deposit management challenges systematically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OUTCOME_BLOCKS.map((block, i) => (
              <div key={i} className="bg-white border rounded-2xl p-5 shadow-xs space-y-2.5 flex flex-col justify-between"
                style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--color-forest-50)', border: '1px solid var(--color-forest-200)' }}>
                    {block.icon}
                  </div>
                  <h3 className="font-serif font-bold text-sm text-gray-900 pt-1" style={{ fontFamily: 'var(--font-serif)' }}>
                    {block.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {block.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Enter Your Workspace (Password Login & Role Selectors) */}
        <section id="workspace" className="pt-8 border-t space-y-8" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)', border: '1px solid var(--color-forest-200)' }}>
              AUTHENTICATED ACCESS CONTROL (RBAC)
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              Sign in to your authorized workspace
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Enter your credentials for role-based access control, or choose an authorized role identity below to auto-fill credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Official Password-Based Sign In Form */}
            <div className="lg:col-span-5 bg-white border rounded-2xl p-6 sm:p-7 shadow-xs space-y-5"
              style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-forest-50 text-forest-700">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                      Credential Sign In
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Password-verified portal access
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active Security
                </span>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Mail size={13} className="text-forest-700" /> Official Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                    placeholder="user@vjti.ac.in or officer@aicte-demo.in"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound size={13} className="text-forest-700" /> Portal Password
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Default: demo2025</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                      placeholder="Enter password"
                      className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all bg-gray-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t text-[11px] text-gray-500 text-center" style={{ borderColor: 'var(--color-parchment)' }}>
                Protected by PostgreSQL Row Level Security (RLS) &amp; Trusted Role Assignment.
              </div>
            </div>

            {/* Right Column: 5 Authorized Role Cards (Auto-Fill & Quick Launch) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-gray-700">
                  Select a role identity to auto-fill credentials:
                </span>
                <span className="text-[11px] text-forest-700 font-medium">
                  5 Authorized Roles
                </span>
              </div>

              <div className="space-y-2.5">
                {DEMO_CREDENTIALS.map((cred) => {
                  const isSelected = email.toLowerCase() === cred.email.toLowerCase();
                  const description = ROLE_DESCRIPTIONS[cred.role] || cred.description;

                  return (
                    <div
                      key={cred.role}
                      onClick={() => handleSelectRoleCreds(cred)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4 ${
                        isSelected ? 'bg-forest-50/80 border-forest-500 shadow-xs' : 'bg-white hover:bg-gray-50/80 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-forest-100 text-forest-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ROLE_ICONS[cred.role]}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-xs sm:text-sm text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                              {cred.label}
                            </span>
                            <span className="font-mono text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 truncate">
                              {cred.email}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectRoleLogin(cred);
                          }}
                          title="Instant Launch"
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border bg-white hover:bg-forest-700 hover:text-white hover:border-forest-700 text-forest-800 border-forest-300 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          Launch <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer & Trust Messaging */}
      <footer className="border-t py-8 px-6 bg-white/90 text-xs mt-12" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/sakshya-logo.png"
                alt="Sakshya"
                className="w-7 h-7 object-contain rounded-md"
              />
              <span className="font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                Sakshya
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">Evidence &amp; FDR Management Workspace</span>
            </div>

            {/* Concise Trust Statements */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-forest-700" /> Lifecycle tracking
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-forest-700" /> Evidence-linked review
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <UserCheck size={13} className="text-forest-700" /> Human-authorized decisions
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5 text-forest-800">
                <History size={13} /> Traceable audit history
              </span>
            </div>
          </div>

          <div className="pt-3 border-t text-center text-gray-500 text-[11px] leading-relaxed" style={{ borderColor: 'var(--color-parchment)' }}>
            Sakshya — AICTE Security Deposit &amp; Fixed Deposit Receipt (FDR) Compliance Workspace.
          </div>
        </div>
      </footer>
    </div>
  );
}
