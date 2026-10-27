'use client';
// ============================================================================
// Sakshya — Auth Context
// Password-based authentication provider with Role-Based Access Control (RBAC).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Permission, ROLE_PERMISSIONS } from '@/lib/types';
import { DemoSession, getSession, setSession, clearSession, getUser } from '@/lib/store';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';
import { getBrowserSupabase } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: DemoSession | null;
  permissions: Permission | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (userId: string, role: Role, institutionId?: string) => void;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  permissions: null,
  isAuthenticated: false,
  isDemoMode: true,
  login: () => {},
  loginWithPassword: async () => ({ success: false }),
  loginWithRole: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<DemoSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) {
      setSessionState(s);
      const u = getUser(s.userId);
      if (u) setUser(u);
    }
    setMounted(true);
  }, []);

  const login = useCallback((userId: string, role: Role, institutionId?: string) => {
    const s: DemoSession = {
      userId,
      role,
      institutionId,
      loginAt: new Date().toISOString(),
    };
    setSession(s);
    setSessionState(s);
    const u = getUser(userId);
    if (u) setUser(u);
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cred = DEMO_CREDENTIALS.find((c) => c.email.toLowerCase() === cleanEmail);

    if (!cred) {
      return { success: false, error: 'No user account found matching this email address.' };
    }

    if (cred.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify your credentials.' };
    }

    // Attempt Supabase Auth session if browser client is active
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      }
    } catch {
      // Graceful fallback to application RBAC store
    }

    login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
    return { success: true };
  }, [login]);

  const loginWithRole = useCallback((role: Role) => {
    const cred = DEMO_CREDENTIALS.find((c) => c.role === role);
    if (cred) {
      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
    }
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    setUser(null);
    try {
      getBrowserSupabase()?.auth.signOut();
    } catch {
      // ignore
    }
  }, []);

  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      permissions,
      isAuthenticated: !!session,
      isDemoMode: true,
      login,
      loginWithPassword,
      loginWithRole,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function usePermission(key: keyof Permission): boolean {
  const { permissions } = useAuth();
  return permissions ? permissions[key] : false;
}
