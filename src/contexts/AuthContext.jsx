import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES, ROLE_LABELS, hasPermission, hasAnyPermission, getNavItems } from '../utils/rbac';

const AuthContext = createContext(null);

// Demo users for development (when Supabase isn't configured)
const DEMO_USERS = [
  { id: '1', full_name: 'Jan Kowalski', role: ROLES.ADMIN, pin: '1111', email: 'admin@sklep.pl', avatar_url: null },
  { id: '2', full_name: 'Anna Nowak', role: ROLES.SHIFT_MANAGER, pin: '2222', email: 'kierownik@sklep.pl', avatar_url: null },
  { id: '3', full_name: 'Piotr Wiśniewski', role: ROLES.CASHIER, pin: '3333', email: 'kasjer@sklep.pl', avatar_url: null },
  { id: '4', full_name: 'Maria Zielińska', role: ROLES.WAREHOUSE_WORKER, pin: '4444', email: 'magazyn@sklep.pl', avatar_url: null },
  { id: '5', full_name: 'Tomasz Lewandowski', role: ROLES.WAREHOUSE_MANAGER, pin: '5555', email: 'kier.magazyn@sklep.pl', avatar_url: null },
  { id: '6', full_name: 'Katarzyna Dąbrowska', role: ROLES.SALES_MANAGER, pin: '6666', email: 'kier.sprzedaz@sklep.pl', avatar_url: null },
  { id: '7', full_name: 'Andrzej Majewski', role: ROLES.CLEANER, pin: '7777', email: 'sprzatanie@sklep.pl', avatar_url: null },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        // No session => demo mode
        setIsDemoMode(true);
      }
    } catch {
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch {
      // If profile fetch fails, use first demo user
      setProfile(DEMO_USERS[0]);
      setIsDemoMode(true);
    }
  }

  const loginWithDemo = useCallback((userId) => {
    const demoUser = DEMO_USERS.find(u => u.id === userId);
    if (demoUser) {
      setProfile(demoUser);
      setUser({ id: demoUser.id, email: demoUser.email });
      setIsDemoMode(true);
    }
  }, []);

  const loginWithPin = useCallback(async (pin) => {
    // In demo mode, check demo users
    if (isDemoMode || !import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
      const demoUser = DEMO_USERS.find(u => u.pin === pin);
      if (demoUser) {
        setProfile(demoUser);
        setUser({ id: demoUser.id, email: demoUser.email });
        return { success: true };
      }
      return { success: false, error: 'Nieprawidłowy PIN' };
    }

    // Real Supabase auth would go here
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('pin', pin)
        .eq('is_active', true)
        .single();

      if (error || !data) return { success: false, error: 'Nieprawidłowy PIN' };
      setProfile(data);
      setUser({ id: data.user_id, email: data.email });
      return { success: true };
    } catch {
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  }, [isDemoMode]);

  const loginWithEmail = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      setUser(data.user);
      await fetchProfile(data.user.id);
      return { success: true };
    } catch {
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }, [isDemoMode]);

  const can = useCallback((permission) => {
    return hasPermission(profile?.role, permission);
  }, [profile]);

  const canAny = useCallback((permissions) => {
    return hasAnyPermission(profile?.role, permissions);
  }, [profile]);

  const value = {
    user,
    profile,
    loading,
    isDemoMode,
    demoUsers: DEMO_USERS,
    loginWithDemo,
    loginWithPin,
    loginWithEmail,
    logout,
    can,
    canAny,
    isAuthenticated: !!profile,
    role: profile?.role,
    roleName: ROLE_LABELS[profile?.role] || profile?.role,
    navItems: getNavItems(profile?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
