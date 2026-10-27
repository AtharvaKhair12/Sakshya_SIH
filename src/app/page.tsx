'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';
import { Role } from '@/lib/types';
import {
  Building2, Search, FileCheck, Eye, Settings,
  Calendar, CheckCircle2, Clock, Lock, FileText,
  History, ArrowRight, ShieldCheck, AlertCircle
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
  admin: 'Manage prototype users, configure rules, and maintain reference data.',
  system_admin: 'Manage prototype users, configure rules, and maintain reference data.',
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleDemoLogin = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
      router.push('/dashboard');
    }, 350);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cred = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password);
    if (!cred) {
      setError('Invalid demo credentials. Please click any role card below for instant demo access.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
      router.push('/dashboard');
    }, 350);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-ivory)' }}>
      {/* Top Header Bar */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-30"
        style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'var(--color-forest-700)', color: 'white' }}>
            <span className="font-serif text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>S</span>
          </div>
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
            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 flex items-center gap-1"
            style={{ borderColor: 'var(--color-parchment)', color: 'var(--color-charcoal)' }}>
            Demo Access <ArrowRight size={13} />
          </a>
        </div>
      </header>

      {/* Main Hero & Illustration Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-12">
        {/* Two-Column Hero Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand & Messaging */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider uppercase"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)', border: '1px solid var(--color-forest-200)' }}>
              <ShieldCheck size={13} />
              AICTE-RELATED APPROVAL WORKFLOWS
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-gray-900 leading-[1.18]"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
              Every deposit tracked.<br />
              <span style={{ color: 'var(--color-forest-700)' }}>Every action traceable.</span>
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-gray-600 max-w-2xl">
              Sakshya brings institution-wise security deposit and FDR records, document checks, maturity reminders, renewal tracking, and release requests into one evidence-led workspace. It helps institutions and authorized reviewers manage financial instruments systematically and follow up on outstanding actions.
            </p>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-1" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="text-forest-700 font-semibold text-xs flex items-center gap-1.5">
                  <Clock size={15} /> Lifecycle Tracking
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">
                  End-to-end monitoring from submission to maturity and discharge.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-1" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="text-forest-700 font-semibold text-xs flex items-center gap-1.5">
                  <FileText size={15} /> Evidence-Linked Review
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Side-by-side certificate verification against AISHE and handbook rules.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-1" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="text-forest-700 font-semibold text-xs flex items-center gap-1.5">
                  <History size={15} /> Human-Authorized Decisions
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Traceable audit history with mandatory officer orders and rationales.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a href="#workspace"
                className="btn-primary text-xs font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-sm">
                Explore Demo Roles <ArrowRight size={15} />
              </a>
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Pre-configured sandbox with 5 distinct role workspaces
              </span>
            </div>
          </div>

          {/* Right Column: Refined Paper-Based FDR / Document Illustration */}
          <div className="lg:col-span-5 relative">
            {/* Background decorative glow */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-forest-100 to-amber-100/50 opacity-60 blur-lg -z-10" />

            {/* Main FDR Record Card */}
            <div className="bg-white rounded-2xl border p-5 sm:p-6 shadow-md space-y-4 relative"
              style={{ borderColor: 'var(--color-parchment)' }}>

              {/* Document Header */}
              <div className="flex items-start justify-between border-b pb-3.5" style={{ borderColor: 'var(--color-parchment)' }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                    Official Instrument Record
                  </div>
                  <h3 className="text-sm font-serif font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'var(--font-serif)' }}>
                    SECURITY DEPOSIT / FDR RECORD
                  </h3>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded font-bold bg-forest-50 text-forest-700 border border-forest-200">
                  FDR-2025-0001
                </span>
              </div>

              {/* Document Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Institution reference</div>
                  <div className="font-semibold text-gray-900 mt-0.5 truncate">Vidya Bharati Inst. of Tech</div>
                  <div className="text-[10px] font-mono text-gray-500">AISHE: C-12345</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Receipt number</div>
                  <div className="font-semibold text-gray-900 mt-0.5 font-mono truncate">SBI-882194019</div>
                  <div className="text-[10px] text-gray-500">State Bank of India</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Issue date</div>
                  <div className="font-medium text-gray-800 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" /> 15 Jan 2024
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Maturity date</div>
                  <div className="font-medium text-gray-800 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} className="text-forest-600" /> 15 Jan 2034 (10 Yrs)
                  </div>
                </div>
              </div>

              {/* Floating Status Panel: Maturity & Renewal */}
              <div className="p-3 rounded-xl text-xs space-y-1.5"
                style={{ background: 'var(--color-brass-50)', border: '1px solid var(--color-brass-200)' }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-brass-800 flex items-center gap-1.5 text-xs">
                    <AlertCircle size={14} className="text-amber-700" />
                    Maturity approaching
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    T-30 Days Notice
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 leading-normal">
                  Renewal follow-up required: Institutional FDR Horizon alert triggered for regulatory review.
                </p>
              </div>

              {/* Verification Panel: Record Comparison */}
              <div className="border rounded-xl p-3 bg-white space-y-2 text-xs" style={{ borderColor: 'var(--color-parchment)' }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-800 text-xs">
                    Record comparison &amp; Supporting evidence review
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800">
                    Reference match
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 border-t border-gray-100">
                  <span>Joint Holder: AICTE / Regional Director</span>
                  <span className="text-emerald-700 font-medium">Clear Title Confirmed</span>
                </div>
              </div>

              {/* Audit Decree Label */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                <span className="flex items-center gap-1 text-forest-700 font-medium">
                  <ShieldCheck size={13} /> Administrative action recorded
                </span>
                <span className="font-mono text-[10px] text-gray-400">Order #DEC-8812</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Enter Your Workspace (Role Login Panel) */}
        <section id="workspace" className="pt-8 border-t space-y-6" style={{ borderColor: 'var(--color-parchment)' }}>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
              style={{ background: 'var(--color-forest-50)', color: 'var(--color-forest-800)', border: '1px solid var(--color-forest-200)' }}>
              FDR &amp; SECURITY DEPOSIT WORKSPACE
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
              Enter your workspace
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Select your role to manage FDR records, review submissions, monitor deadlines, or inspect audit history.
            </p>
          </div>

          {/* 5 Distinct Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_CREDENTIALS.map((cred) => {
              const isSelected = selectedRole === cred.role;
              const description = ROLE_DESCRIPTIONS[cred.role] || cred.description;

              return (
                <button
                  key={cred.role}
                  onClick={() => handleDemoLogin(cred)}
                  disabled={isLoading}
                  onMouseEnter={() => setSelectedRole(cred.role)}
                  onMouseLeave={() => setSelectedRole(null)}
                  className={`text-left p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between group ${
                    isSelected ? 'shadow-md scale-[1.01]' : 'hover:shadow-sm'
                  }`}
                  style={{
                    background: isSelected ? 'var(--color-forest-50)' : 'white',
                    borderColor: isSelected ? 'var(--color-forest-400)' : 'var(--color-parchment)',
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{
                          background: isSelected ? 'var(--color-forest-100)' : 'var(--color-ivory)',
                          color: isSelected ? 'var(--color-forest-800)' : 'var(--color-forest-700)',
                        }}>
                        {ROLE_ICONS[cred.role]}
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider"
                        style={{ background: 'var(--color-ivory)', color: 'var(--color-charcoal-muted)' }}>
                        Demo access
                      </span>
                    </div>

                    <div>
                      <div className="font-serif font-bold text-base text-gray-900 group-hover:text-forest-800 transition-colors"
                        style={{ fontFamily: 'var(--font-serif)' }}>
                        {cred.label}
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t flex items-center justify-between text-xs font-semibold text-forest-700"
                    style={{ borderColor: isSelected ? 'rgba(45,80,57,0.15)' : 'var(--color-parchment)' }}>
                    <span>Launch workspace</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}

            {/* Optional Manual Sign In Toggle Card */}
            <div className="p-5 rounded-2xl border bg-white/70 flex flex-col justify-between space-y-4"
              style={{ borderColor: 'var(--color-parchment)' }}>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 mb-3">
                  <Lock size={18} />
                </div>
                <div className="font-serif font-bold text-base text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                  Manual Sign In
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Have specific demo credentials? Switch to the manual credentials input form.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualForm(!showManualForm)}
                className="btn-secondary text-xs font-medium py-2 px-3 w-full text-center">
                {showManualForm ? 'Hide Form' : 'Show Manual Sign In Form'}
              </button>
            </div>
          </div>

          {/* Collapsible Manual Form */}
          {showManualForm && (
            <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border shadow-sm space-y-4 fade-in"
              style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="border-b pb-2">
                <h3 className="font-serif font-bold text-sm text-gray-900">Demo Sign In Form</h3>
                <p className="text-xs text-gray-500">Sign in using any configured demo credentials</p>
              </div>

              <form onSubmit={handleFormLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="email">Demo Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g., ananya.iyer@aicte-demo.in"
                    className="form-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="password">Demo Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (demo2025)"
                    className="form-input text-xs w-full"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="btn-primary w-full text-xs py-2.5 font-semibold flex items-center justify-center gap-1.5">
                  <Lock size={14} />
                  {isLoading ? 'Signing In...' : 'Sign In with Demo Credentials'}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* Footer & Trust Messaging */}
      <footer className="border-t py-8 px-6 bg-white/90 text-xs mt-12" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center font-serif text-xs font-bold text-white"
                style={{ background: 'var(--color-forest-700)' }}>
                S
              </div>
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
                <FileText size={13} className="text-forest-700" /> Evidence-linked review
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <History size={13} className="text-forest-700" /> Human-authorized decisions
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5 text-forest-800">
                <ShieldCheck size={13} /> Traceable audit history
              </span>
            </div>
          </div>

          <div className="pt-3 border-t text-center text-gray-500 text-[11px] leading-relaxed" style={{ borderColor: 'var(--color-parchment)' }}>
            Independent prototype for AICTE-related workflows · Not an official AICTE service.
          </div>
        </div>
      </footer>
    </div>
  );
}
