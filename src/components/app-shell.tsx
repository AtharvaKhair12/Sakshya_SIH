'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/store';
import { ROLE_LABELS } from '@/lib/types';
import {
  getVisibleNavigation, canAccessRoute, normalizeRole, NavigationLink,
} from '@/lib/permissions';
import {
  LayoutDashboard, FileText, PlusCircle, Send, ShieldCheck, Calendar, ArrowRightLeft,
  BarChart3, History, Users, Settings, LogOut, Bell, Search, Menu, X,
  ChevronRight, ShieldAlert, AlertTriangle, CheckCircle, Sliders, Database, Upload,
} from 'lucide-react';

function getNavIcon(iconName: string) {
  switch (iconName) {
    case 'LayoutDashboard': return <LayoutDashboard size={20} />;
    case 'FileText': return <FileText size={20} />;
    case 'PlusCircle': return <PlusCircle size={20} />;
    case 'Send': return <Send size={20} />;
    case 'ShieldCheck': return <ShieldCheck size={20} />;
    case 'Calendar': return <Calendar size={20} />;
    case 'ArrowRightLeft': return <ArrowRightLeft size={20} />;
    case 'BarChart3': return <BarChart3 size={20} />;
    case 'History': return <History size={20} />;
    case 'Users': return <Users size={20} />;
    case 'Settings': return <Settings size={20} />;
    case 'AlertTriangle': return <AlertTriangle size={20} />;
    case 'CheckCircle': return <CheckCircle size={20} />;
    case 'Sliders': return <Sliders size={20} />;
    case 'Database': return <Database size={20} />;
    case 'Upload': return <Upload size={20} />;
    default: return <FileText size={20} />;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!isAuthenticated || !user || !session) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-ivory)' }}>
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-serif">Checking authorization...</p>
        </div>
      </div>
    );
  }

  const notifications = getNotifications(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks: NavigationLink[] = getVisibleNavigation(session);
  const isRoutePermitted = canAccessRoute(session, pathname);

  const activeLink = navLinks.find(item => {
    if (item.href === '/dashboard') return pathname === '/dashboard';
    const baseUrl = item.href.split('?')[0];
    return pathname.startsWith(baseUrl);
  });
  const pageTitle = activeLink?.label || 'Sakshya';

  const breadcrumbs = pathname.split('/').filter(Boolean).map((segment, i, arr) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    href: '/' + arr.slice(0, i + 1).join('/'),
    isLast: i === arr.length - 1,
  }));

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-ivory)' }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        flex flex-col bg-white border-r
        transition-all duration-200 ease-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'w-[72px]'}
      `} style={{ borderColor: 'var(--color-parchment)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b flex-shrink-0" style={{ borderColor: 'var(--color-parchment)' }}>
          <img
            src="/sakshya-logo.png"
            alt="Sakshya"
            className="w-10 h-10 object-contain rounded-lg flex-shrink-0"
          />
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-serif font-semibold text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>Sakshya</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-charcoal-muted)' }}>FDR Workspace</div>
            </div>
          )}
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto lg:hidden p-1">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(item => {
            const baseUrl = item.href.split('?')[0];
            const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(baseUrl);
            return (
              <Link key={`${item.href}-${item.label}`} href={item.href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : undefined}>
                <span className="icon">{getNavIcon(item.iconName)}</span>
                {sidebarOpen && <span className="flex-1">{item.label}</span>}
                {sidebarOpen && item.badgeCount ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--color-status-error)', color: 'white' }}>
                    {item.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t px-3 py-3 flex-shrink-0" style={{ borderColor: 'var(--color-parchment)' }}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'var(--color-forest-100)', color: 'var(--color-forest-700)' }}>
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-charcoal)' }}>{user.name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--color-charcoal-muted)' }}>{ROLE_LABELS[session.role]}</div>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Logout" style={{ color: 'var(--color-status-error)' }}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="sidebar-nav-item justify-center" title="Logout">
              <LogOut size={20} />
            </button>
          )}
        </div>

        {/* Collapse toggle - desktop only */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center h-8 border-t text-xs"
          style={{ borderColor: 'var(--color-parchment)', color: 'var(--color-charcoal-muted)' }}>
          {sidebarOpen ? '‹ Collapse' : '›'}
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-6 bg-white border-b flex-shrink-0" style={{ borderColor: 'var(--color-parchment)' }}>
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5">
            <Menu size={22} style={{ color: 'var(--color-charcoal)' }} />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-sm hide-mobile">
            <Link href="/dashboard" className="hover:underline" style={{ color: 'var(--color-charcoal-muted)' }}>Home</Link>
            {breadcrumbs.map(bc => (
              <React.Fragment key={bc.href}>
                <ChevronRight size={14} style={{ color: 'var(--color-charcoal-muted)' }} />
                {bc.isLast ? (
                  <span className="font-medium" style={{ color: 'var(--color-charcoal)' }}>{bc.label}</span>
                ) : (
                  <Link href={bc.href} className="hover:underline" style={{ color: 'var(--color-charcoal-muted)' }}>{bc.label}</Link>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Page title (mobile) */}
          <div className="font-serif font-semibold show-mobile-only" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
            {pageTitle}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hide-mobile">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-charcoal-muted)' }} />
            <input
              type="text"
              placeholder="Search instruments, institutions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  router.push(`/instruments?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
              className="form-input pl-9 py-2 text-sm w-64"
              style={{ background: 'var(--color-ivory)' }}
            />
          </div>

          {/* Status badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Portal Active
          </div>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg relative transition-colors hover:bg-gray-100">
              <Bell size={20} style={{ color: 'var(--color-charcoal-muted)' }} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--color-status-error)', color: 'white' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-white border rounded-xl shadow-lg z-50 fade-in" style={{ borderColor: 'var(--color-parchment)' }}>
                  <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-parchment)' }}>
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={() => { markAllNotificationsRead(user.id); setNotifOpen(false); }}
                        className="text-xs font-medium" style={{ color: 'var(--color-forest-600)' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm" style={{ color: 'var(--color-charcoal-muted)' }}>No notifications</div>
                  ) : (
                    <div>
                      {notifications.slice(0, 10).map(n => (
                        <button key={n.id} className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                          style={{ borderColor: 'var(--color-parchment)', background: !n.read ? 'var(--color-forest-50)' : undefined }}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.entityType === 'instrument') router.push(`/instruments/${n.entityId}`);
                            else if (n.entityType === 'release_request') router.push('/release-requests');
                          }}>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>{n.title}</div>
                          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-charcoal-muted)' }}>{n.message}</div>
                          <div className="text-[10px] mt-1" style={{ color: 'var(--color-charcoal-muted)' }}>
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!isRoutePermitted ? (
            <div className="max-w-xl mx-auto mt-12 p-8 bg-white border rounded-xl shadow-sm text-center" style={{ borderColor: 'var(--color-parchment)' }}>
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-brass-100)', color: 'var(--color-brass-600)' }}>
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-xl font-serif font-bold mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}>
                Access Restricted by Role Policy
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Your current role as <strong>{ROLE_LABELS[session.role]}</strong> is not permitted to access this module (<code>{pathname}</code>). This restriction is enforced according to the central Sakshya role-based access control policy.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/dashboard" className="btn-primary">
                  Return to My Workspace
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Footer */}
        <footer className="h-8 flex items-center justify-center text-[10px] border-t px-4 no-print flex-shrink-0"
          style={{ borderColor: 'var(--color-parchment)', color: 'var(--color-charcoal-muted)', background: 'white' }}>
          Sakshya — AICTE Security Deposit &amp; FDR Management Portal · Authorized Access Only
        </footer>
      </div>
    </div>
  );
}
