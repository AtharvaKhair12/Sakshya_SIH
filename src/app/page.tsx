'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';
import { ROLE_LABELS, Role } from '@/lib/types';
import { Shield, Building2, Search, FileCheck, Eye, Settings, ChevronRight, Lock } from 'lucide-react';

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  institution: <Building2 size={24} />,
  scrutiny_officer: <Search size={24} />,
  senior_officer: <FileCheck size={24} />,
  auditor: <Eye size={24} />,
  admin: <Settings size={24} />,
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    }, 400);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cred = DEMO_CREDENTIALS.find(c => c.email === email && c.password === password);
    if (!cred) {
      setError('Invalid demo credentials. Use one of the quick-access cards below.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--color-ivory)' }}>
      {/* Left panel — Brand introduction */}
      <div className="lg:w-[45%] relative overflow-hidden flex flex-col justify-between p-8 lg:p-12"
        style={{ background: 'linear-gradient(145deg, #1f3a28 0%, #2d5039 50%, #3d6b4e 100%)' }}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30Z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '60px 60px' }} />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div className="font-serif text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>S</div>
            </div>
            <div>
              <div className="text-white font-serif text-xl font-semibold tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>Sakshya</div>
              <div className="text-xs tracking-widest uppercase" style={{ color: 'rgba(212,199,142,0.7)' }}>Evidence & FDR Management</div>
            </div>
          </div>

          {/* Tagline */}
          <h1 className="text-3xl lg:text-4xl font-serif leading-tight mb-6" style={{ fontFamily: 'var(--font-serif)', color: 'rgba(255,255,255,0.95)' }}>
            Streamlined Security Deposit & FDR Lifecycle Management
          </h1>
          <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            A professional workspace for managing the complete lifecycle of financial instruments — from institutional submission through verification, monitoring, and authorized release.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: <Shield size={18} />, text: 'Role-based access with traceable audit history' },
              { icon: <FileCheck size={18} />, text: 'Document verification and discrepancy investigation' },
              { icon: <Search size={18} />, text: 'Maturity monitoring and renewal tracking' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>{item.icon}</div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo notice */}
        <div className="relative z-10 mt-8">
          <div className="text-xs py-3 px-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)' }}>
            Prototype environment · Independent demonstration · Not an official AICTE system
          </div>
        </div>
      </div>

      {/* Right panel — Login */}
      <div className="lg:w-[55%] flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-2xl font-serif font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
              Welcome to Sakshya
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-charcoal-muted)' }}>
              Select a demo role or sign in with demo credentials to explore the workspace.
            </p>
          </div>

          {/* Manual login form */}
          <form onSubmit={handleFormLogin} className="mb-8">
            <div className="space-y-4">
              <div>
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input" placeholder="demo-email@example.in" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-input" placeholder="Demo password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !email || !password}>
                <Lock size={16} />
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: 'var(--color-parchment)' }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-charcoal-muted)' }}>Quick Demo Access</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-parchment)' }} />
          </div>

          {/* Role selection cards */}
          <div className="space-y-3">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.role}
                onClick={() => handleDemoLogin(cred)}
                disabled={isLoading}
                className="w-full text-left p-4 rounded-xl border transition-all group"
                style={{
                  background: selectedRole === cred.role ? 'var(--color-forest-50)' : 'white',
                  borderColor: selectedRole === cred.role ? 'var(--color-forest-300)' : 'var(--color-parchment)',
                }}
                onMouseEnter={() => setSelectedRole(cred.role)}
                onMouseLeave={() => setSelectedRole(null)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg transition-colors"
                    style={{
                      background: selectedRole === cred.role ? 'var(--color-forest-100)' : 'var(--color-ivory)',
                      color: selectedRole === cred.role ? 'var(--color-forest-700)' : 'var(--color-charcoal-muted)',
                    }}>
                    {ROLE_ICONS[cred.role]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-charcoal)' }}>
                      {cred.label}
                    </div>
                    <div className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                      {cred.description}
                    </div>
                  </div>
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--color-charcoal-muted)' }} />
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs mt-6 text-center" style={{ color: 'var(--color-charcoal-muted)' }}>
            All demo accounts use password: <code className="font-mono px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--color-ivory-warm)' }}>demo2025</code>
          </p>
        </div>
      </div>
    </div>
  );
}
