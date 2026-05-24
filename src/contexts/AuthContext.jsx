import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES, ROLE_LABELS, hasPermission, hasAnyPermission, getNavItems } from '../utils/rbac';

const AuthContext = createContext(null);

/**
 * Tablica predefiniowanych użytkowników testowych (demo).
 * Wykorzystywana domyślnie podczas programowania lub w przypadku braku poprawnej 
 * konfiguracji backendu Supabase. Zawiera użytkowników o różnych rolach.
 */
const DEMO_USERS = [
  { id: '1', full_name: 'Jan Kowalski', role: ROLES.ADMIN, pin: '11111111', email: 'admin@sklep.pl', avatar_url: null },
  { id: '2', full_name: 'Anna Nowak', role: ROLES.SHIFT_MANAGER, pin: '22222222', email: 'kierownik@sklep.pl', avatar_url: null },
  { id: '3', full_name: 'Piotr Wiśniewski', role: ROLES.CASHIER, pin: '33333333', email: 'kasjer@sklep.pl', avatar_url: null },
  { id: '4', full_name: 'Maria Zielińska', role: ROLES.WAREHOUSE_WORKER, pin: '44444444', email: 'magazyn@sklep.pl', avatar_url: null },
  { id: '5', full_name: 'Tomasz Lewandowski', role: ROLES.WAREHOUSE_MANAGER, pin: '55555555', email: 'kier.magazyn@sklep.pl', avatar_url: null },
  { id: '6', full_name: 'Katarzyna Dąbrowska', role: ROLES.SALES_MANAGER, pin: '66666666', email: 'kier.sprzedaz@sklep.pl', avatar_url: null },
  { id: '7', full_name: 'Andrzej Majewski', role: ROLES.CLEANER, pin: '77777777', email: 'sprzatanie@sklep.pl', avatar_url: null },
];

/**
 * Dostawca kontekstu autoryzacji (Auth Provider).
 * 
 * Główne centrum zarządzania tożsamością w aplikacji.
 * Przechowuje stan sesji, weryfikuje lokalne tokeny przy starcie aplikacji,
 * dostarcza funkcje logowania (w tym logowanie kodem PIN) oraz udostępnia
 * metody sprawdzające uprawnienia (can, canAny) dla zalogowanego pracownika.
 * 
 * @param {Object} props
 * @param {JSX.Element} props.children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  /**
   * Weryfikuje aktywną sesję użytkownika z serwerem Supabase (lub z LocalStorage).
   * Jeśli sesja nie zostanie znaleziona lub wystąpi błąd - wymusza tryb demonstracyjny.
   */
  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        const localUser = localStorage.getItem('local_user');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          setUser({ id: parsed.id });
          setProfile(parsed);
        } else {
          setIsDemoMode(true);
        }
      }
    } catch {
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Odpytuje bazę danych o szczegóły profilu przypisanego do konkretnego `userId`.
   * Przekształca surowe ID z Supabase na obiekt biznesowy profilu (rola, imię, inicjały).
   * @param {string} userId - Identyfikator UUID w bazie Supabase
   */
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

  /**
   * Próba logowania z użyciem szybkiego kodu PIN.
   * Weryfikuje, czy podany PIN pasuje do jednego z autoryzowanych kont.
   * 
   * @param {string} pin - Ciąg cyfr (hasło PIN)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
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

  const loginWithCredentials = useCallback(async (username, password) => {
    // 1. Zawsze działające konto awaryjne: admin / admin
    if (username === 'admin' && password === 'admin') {
      const adminDemo = DEMO_USERS.find(u => u.role === ROLES.ADMIN) || DEMO_USERS[0];
      setProfile(adminDemo);
      setUser({ id: adminDemo.id, email: adminDemo.email });
      setIsDemoMode(true);
      return { success: true };
    }

    // 2. W trybie demo (brak URL), pozwalamy logować się za pomocą pierwszego imienia jako loginu
    if (!import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
      const uName = username.toLowerCase();
      const demoUser = DEMO_USERS.find(u => 
        u.email.split('@')[0].toLowerCase() === uName || 
        u.full_name.split(' ')[0].toLowerCase() === uName
      );
      // W wersji demo akceptujemy puste hasło lub 'haslo'
      if (demoUser && (password === 'haslo' || password === '')) {
        setProfile(demoUser);
        setUser({ id: demoUser.id, email: demoUser.email });
        return { success: true };
      }
      return { success: false, error: 'Nieprawidłowa nazwa użytkownika lub hasło (Tryb offline)' };
    }

    // 3. Prawdziwe logowanie w Supabase za pomocą system_login i system_password
    try {
      // Szukamy pracownika w bazie Supabase po loginie i haśle
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('system_login', username)
        .eq('system_password', password)
        .single();
        
      if (error || !data) {
        return { success: false, error: 'Nieprawidłowa nazwa użytkownika lub hasło' };
      }
      
      setUser({ id: data.id });
      setProfile(data);
      localStorage.setItem('local_user', JSON.stringify(data));
      setIsDemoMode(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  }, [isDemoMode]);

  const logout = useCallback(async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('local_user');
    setUser(null);
    setProfile(null);
  }, [isDemoMode]);

  /**
   * Sprawdza pojedyncze uprawnienie przypisane do aktualnej roli użytkownika.
   * Wykorzystuje wbudowany system RBAC (Role-Based Access Control).
   * 
   * @param {string} permission - Identyfikator uprawnienia (np. "MANAGE_USERS")
   * @returns {boolean} - true jeśli posiada uprawnienie
   */
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
    loginWithCredentials,
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

/**
 * Niestandardowy Hook dostępowy do AuthContext.
 * Zabezpiecza przed użyciem kontekstu w złym miejscu drzewa React.
 * 
 * @returns {Object} Aktualny obiekt profilu, funkcje logowania oraz sprawdzania praw.
 * @throws {Error} Jeśli zostanie użyty poza <AuthProvider>
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
