'use client';
// ============================================================================
// Sakshya — Auth Context
// Demo authentication provider with role-based access control.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Permission, ROLE_PERMISSIONS } from '@/lib/types';
import { DemoSession, getSession, setSession, clearSession, getUser } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  session: DemoSession | null;
  permissions: Permission | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (userId: string, role: Role, institutionId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  permissions: null,
  isAuthenticated: false,
  isDemoMode: true,
  login: () => {},
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

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    setUser(null);
  }, []);

  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      permissions,
      isAuthenticated: !!session,
      isDemoMode: true,
      login,
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
