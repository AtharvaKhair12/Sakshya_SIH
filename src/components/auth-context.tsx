'use client';
// ============================================================================
// Sakshya — Auth Context
// Password-based authentication provider with Role-Based Access Control (RBAC).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Permission, ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/types';
import { DemoSession, getSession, setSession, clearSession, getUser, getUsers, addUser } from '@/lib/store';
import { DEMO_CREDENTIALS } from '@/lib/demo-data';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { normalizeRole } from '@/lib/permissions';

interface AuthContextType {
  user: User | null;
  session: DemoSession | null;
  permissions: Permission | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (userId: string, role: Role, institutionId?: string) => void;
  loginWithPassword: (
    email: string,
    password: string,
    expectedRole?: Role
  ) => Promise<{ success: boolean; error?: string; actualRole?: Role }>;
  signUp: (params: {
    name: string;
    email: string;
    password: string;
    role: Role;
    institutionId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
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
  signUp: async () => ({ success: false }),
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

  const loginWithPassword = useCallback(async (
    email: string,
    password: string,
    expectedRole?: Role
  ): Promise<{ success: boolean; error?: string; actualRole?: Role }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check demo credentials
    const cred = DEMO_CREDENTIALS.find((c) => c.email.toLowerCase() === cleanEmail);
    if (cred) {
      // Role enforcement: reject if user is using the wrong role's login portal
      if (expectedRole && normalizeRole(cred.role) !== normalizeRole(expectedRole)) {
        const expectedLabel = ROLE_LABELS[normalizeRole(expectedRole)] || expectedRole;
        const actualLabel = ROLE_LABELS[normalizeRole(cred.role)] || cred.role;
        return {
          success: false,
          error: `Role mismatch: This account is registered as "${actualLabel}". You cannot sign in through the ${expectedLabel} portal.`,
          actualRole: cred.role,
        };
      }

      if (cred.password !== password && password !== 'demo2025') {
        return { success: false, error: 'Incorrect password. Default demo password is demo2025.' };
      }

      // Sync Supabase Auth session if browser client is active
      try {
        const supabase = getBrowserSupabase();
        if (supabase) {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: 'demo2025',
          });
        }
      } catch {
        // Fallback to internal RBAC session
      }

      login(cred.userId, cred.role, cred.role === 'institution' ? 'inst-001' : undefined);
      return { success: true };
    }

    // Check if user is registered in local store
    const allUsers = getUsers();
    const existingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);

    // Attempt Supabase Auth login
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (data?.user && !error) {
          const userRole = (data.user.user_metadata?.role as Role) || existingUser?.role || 'institution';
          const instId = data.user.user_metadata?.institution_id || existingUser?.institutionId || 'inst-001';
          
          // Role enforcement for Supabase accounts
          if (expectedRole && normalizeRole(userRole) !== normalizeRole(expectedRole)) {
            const expectedLabel = ROLE_LABELS[normalizeRole(expectedRole)] || expectedRole;
            const actualLabel = ROLE_LABELS[normalizeRole(userRole)] || userRole;
            await supabase.auth.signOut();
            return {
              success: false,
              error: `Role mismatch: This account is registered as "${actualLabel}". You cannot sign in through the ${expectedLabel} portal.`,
              actualRole: userRole,
            };
          }

          if (!existingUser) {
            addUser({
              id: data.user.id,
              name: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
              email: cleanEmail,
              role: userRole,
              institutionId: instId,
              active: true,
              createdAt: data.user.created_at || new Date().toISOString(),
            });
          }

          login(existingUser?.id || data.user.id, userRole, instId);
          return { success: true };
        }
      }
    } catch {
      // Continue to check local store
    }

    if (existingUser) {
      if (expectedRole && normalizeRole(existingUser.role) !== normalizeRole(expectedRole)) {
        const expectedLabel = ROLE_LABELS[normalizeRole(expectedRole)] || expectedRole;
        const actualLabel = ROLE_LABELS[normalizeRole(existingUser.role)] || existingUser.role;
        return {
          success: false,
          error: `Role mismatch: This account is registered as "${actualLabel}". You cannot sign in through the ${expectedLabel} portal.`,
          actualRole: existingUser.role,
        };
      }

      login(existingUser.id, existingUser.role, existingUser.institutionId);
      return { success: true };
    }

    return { success: false, error: 'No user account found with this email address. Please register.' };
  }, [login]);

  const signUp = useCallback(async (params: {
    name: string;
    email: string;
    password: string;
    role: Role;
    institutionId?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = params.email.trim().toLowerCase();

    // Check if user already exists in demo credentials or store
    const inDemoCreds = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === cleanEmail);
    if (inDemoCreds) {
      const existingRoleLabel = ROLE_LABELS[normalizeRole(inDemoCreds.role)] || inDemoCreds.role;
      return {
        success: false,
        error: `An account with this email already exists under the "${existingRoleLabel}" role. Please sign in via the ${existingRoleLabel} portal.`
      };
    }

    const allUsers = getUsers();
    const existingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      const existingRoleLabel = ROLE_LABELS[normalizeRole(existingUser.role)] || existingUser.role;
      return {
        success: false,
        error: `An account with this email already exists under the "${existingRoleLabel}" role. Please sign in via the ${existingRoleLabel} portal.`
      };
    }

    let registeredUserId = `user-${Date.now().toString().slice(-6)}`;

    // 1. Create user in Supabase Auth & public.profiles via server API route
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name,
          email: cleanEmail,
          password: params.password,
          role: params.role,
          institutionId: params.institutionId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed in Supabase.' };
      }
      if (data.user?.id) {
        registeredUserId = data.user.id;
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Failed to reach registration server';
      return { success: false, error: err };
    }

    const newUser: User = {
      id: registeredUserId,
      name: params.name.trim(),
      email: cleanEmail,
      role: params.role,
      institutionId: params.institutionId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    // 2. Authenticate the Supabase browser client session
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });
      }
    } catch (e) {
      console.warn('Browser sign-in notice:', e);
    }

    addUser(newUser);
    login(registeredUserId, params.role, params.institutionId);
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
      signUp,
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
