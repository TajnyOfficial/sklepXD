import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES, ROLE_LABELS, hasPermission, hasAnyPermission, getNavItems } from '../utils/rbac';

const AuthContext = createContext(null);

/* Tablica predefiniowanych użytkowników testowych (demo), używana przy braku połączenia z bazą */
const DEMO_USERS = [
  { id: '1', full_name: 'Jan Kowalski', role: ROLES.ADMIN, pin: '11111111', email: 'admin@sklep.pl', avatar_url: null },
  { id: '2', full_name: 'Anna Nowak', role: ROLES.SHIFT_MANAGER, pin: '22222222', email: 'kierownik@sklep.pl', avatar_url: null },
  { id: '3', full_name: 'Piotr Wiśniewski', role: ROLES.CASHIER, pin: '33333333', email: 'kasjer@sklep.pl', avatar_url: null },
  { id: '4', full_name: 'Maria Zielińska', role: ROLES.WAREHOUSE_WORKER, pin: '44444444', email: 'magazyn@sklep.pl', avatar_url: null },
  { id: '5', full_name: 'Tomasz Lewandowski', role: ROLES.WAREHOUSE_MANAGER, pin: '55555555', email: 'kier.magazyn@sklep.pl', avatar_url: null },
  { id: '6', full_name: 'Katarzyna Dąbrowska', role: ROLES.SALES_MANAGER, pin: '66666666', email: 'kier.sprzedaz@sklep.pl', avatar_url: null },
  { id: '7', full_name: 'Andrzej Majewski', role: ROLES.CLEANER, pin: '77777777', email: 'sprzatanie@sklep.pl', avatar_url: null },
];

/* Główny komponent dostarczający kontekst autoryzacji, zarządzający sesją i uprawnieniami */
export function AuthProvider({ children }) {
  /* Stan przechowujący podstawowe dane zalogowanego użytkownika (np. ID, email) */
  const [user, setUser] = useState(null);
  
  /* Stan przechowujący szczegółowy profil użytkownika (rola, imię, inicjały itp.) */
  const [profile, setProfile] = useState(null);
  
  /* Stan określający, czy trwa weryfikacja sesji podczas uruchamiania aplikacji */
  const [loading, setLoading] = useState(true);
  
  /* Stan informujący, czy aplikacja działa w trybie demonstracyjnym (offline/bez Supabase) */
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  /* Funkcja asynchroniczna weryfikująca aktywną sesję użytkownika na starcie aplikacji */
  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Obsolete Supabase Auth handling. We force sign out to prevent conflict with local_user bypass.
        await supabase.auth.signOut();
      }

      // Restore session from localStorage to support cross-tab in same browser
      const localUser = localStorage.getItem('local_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        
        if (import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
          // Verify with active_sessions
          let deviceId = localStorage.getItem('system_device_id');
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('system_device_id', deviceId);
          }

          const { data: activeSession, error } = await supabase
            .from('active_sessions')
            .select('id, last_seen_at')
            .eq('profile_id', parsed.id)
            .eq('device_id', deviceId)
            .eq('app_type', 'web')
            .single();

          if (error) {
            console.error('Błąd weryfikacji sesji (możliwy brak tabeli):', error);
            // If table doesn't exist, fallback to keeping them logged in locally
            if (error.code === '42P01' || (error.message && error.message.includes('relation'))) {
              setUser({ id: parsed.id });
              setProfile(parsed);
              setIsDemoMode(false);
              setLoading(false);
              return;
            }
          }

          if (error || !activeSession) {
            // Invalid session or logged out from elsewhere
            localStorage.removeItem('local_user');
            setIsDemoMode(true);
            setLoading(false);
            return;
          }

          // Check if session is older than 30 minutes
          const lastSeen = new Date(activeSession.last_seen_at).getTime();
          const now = new Date().getTime();
          const thirtyMinutes = 30 * 60 * 1000;
          if (now - lastSeen > thirtyMinutes) {
            await supabase.from('active_sessions').delete().eq('id', activeSession.id);
            localStorage.removeItem('local_user');
            setIsDemoMode(true);
            setLoading(false);
            return;
          }

          // Update last seen
          await supabase.from('active_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', activeSession.id);
        }

        setUser({ id: parsed.id });
        setProfile(parsed);
        setIsDemoMode(false);
      } else {
        setIsDemoMode(true);
      }
    } catch {
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }

  /* Funkcja asynchroniczna pobierająca szczegółowy profil pracownika z bazy na podstawie userId */
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

  /* Funkcja logująca użytkownika na konto testowe w trybie demonstracyjnym */
  const loginWithDemo = useCallback((userId) => {
    const demoUser = DEMO_USERS.find(u => u.id === userId);
    if (demoUser) {
      setProfile(demoUser);
      setUser({ id: demoUser.id, email: demoUser.email });
      setIsDemoMode(true);
    }
  }, []);

  /* Funkcja asynchroniczna weryfikująca kod PIN i logująca użytkownika w modułach POS/Kiosk */
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

  /* Funkcja asynchroniczna autoryzująca użytkownika tradycyjnym loginem i hasłem z wykorzystaniem Supabase */
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
      await supabase.auth.signOut(); // Clear any stale native session
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('system_login', username)
        .eq('system_password', password)
        .single();
        
      if (error || !data) {
        return { success: false, error: 'Nieprawidłowa nazwa użytkownika lub hasło' };
      }

      // Check if user is already logged in on another web device
      let deviceId = localStorage.getItem('system_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('system_device_id', deviceId);
      }

      // If user is already logged in on ANOTHER device (app_type=web), reject
      const { data: existingSessions } = await supabase
        .from('active_sessions')
        .select('id, device_id')
        .eq('profile_id', data.id)
        .eq('app_type', 'web');

      if (existingSessions && existingSessions.length > 0) {
        const otherDevice = existingSessions.find(s => s.device_id !== deviceId);
        if (otherDevice) {
          // Check if it's abandoned (e.g. > 12h)
          // Simplified: We reject if there is another session
          return { success: false, error: 'Użytkownik jest już zalogowany na innym urządzeniu. Wyloguj się tam najpierw.' };
        }
      }

      // Upsert current session
      const { error: sessionError } = await supabase.from('active_sessions').upsert({
        profile_id: data.id,
        device_id: deviceId,
        app_type: 'web',
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'device_id,app_type' });

      if (sessionError) {
        console.warn('Błąd podczas tworzenia sesji (Active Sessions). Logowanie kontynuowane offline dla tej funkcji.', sessionError);
      }
      
      setUser({ id: data.id });
      setProfile(data);
      localStorage.setItem('local_user', JSON.stringify(data));
      setIsDemoMode(false);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  }, [isDemoMode]);

  /* Funkcja asynchroniczna czyszcząca sesję i wylogowująca użytkownika ze wszystkich urządzeń typu web */
  const logout = useCallback(async () => {
    if (!isDemoMode && profile) {
      await supabase.auth.signOut();
      
      const deviceId = localStorage.getItem('system_device_id');
      if (deviceId) {
        await supabase.from('active_sessions')
          .delete()
          .eq('device_id', deviceId)
          .eq('app_type', 'web');
      }
    }
    localStorage.removeItem('local_user');
    setUser(null);
    setProfile(null);
  }, [isDemoMode, profile]);

  /* Funkcja sprawdzająca, czy zalogowany pracownik posiada wskazane pojedyncze uprawnienie (RBAC) */
  const can = useCallback((permission) => {
    return hasPermission(profile?.role, permission);
  }, [profile]);

  /* Funkcja sprawdzająca, czy zalogowany pracownik posiada przynajmniej jedno ze wskazanych uprawnień */
  const canAny = useCallback((permissions) => {
    return hasAnyPermission(profile?.role, permissions);
  }, [profile]);

  /* Obiekt kontekstu udostępniany do wszystkich komponentów potomnych aplikacji */
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

/* Niestandardowy hook ułatwiający dostęp do kontekstu autoryzacji w komponentach funkcyjnych */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
