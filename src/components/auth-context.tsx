'use client';
// ============================================================================
// Sakshya — Auth Context
// Password-based authentication provider with Role-Based Access Control (RBAC).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Permission, ROLE_PERMISSIONS } from '@/lib/types';
import { DemoSession, getSession, setSession, clearSession, getUser, getUsers, addUser } from '@/lib/store';
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

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check demo credentials
    const cred = DEMO_CREDENTIALS.find((c) => c.email.toLowerCase() === cleanEmail);
    if (cred) {
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

    // Check if user already exists
    const allUsers = getUsers();
    if (allUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    const newUserId = `user-${Date.now().toString().slice(-6)}`;
    const newUser: User = {
      id: newUserId,
      name: params.name.trim(),
      email: cleanEmail,
      role: params.role,
      institutionId: params.institutionId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    // Attempt Supabase Auth signup if connected
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              display_name: params.name,
              role: params.role,
              institution_id: params.institutionId,
            },
          },
        });
      }
    } catch (e) {
      console.warn('Supabase auth signup notice:', e);
    }

    addUser(newUser);
    login(newUserId, params.role, params.institutionId);
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
