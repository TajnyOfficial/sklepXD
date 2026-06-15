/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES, ROLE_LABELS, hasPermission, hasAnyPermission, getNavItems } from '../utils/rbac';

const AuthContext = createContext(null);



// Główny dostawca (Provider) kontekstu autoryzacji, zarządzający sesją użytkownika oraz jego uprawnieniami (RBAC).
export function AuthProvider({ children }) {
  // Podstawowe dane uwierzytelnionego użytkownika zwracane przez Supabase (m.in. ID, email).
  const [user, setUser] = useState(null);
  
  // Szczegółowe dane profilowe pracownika, takie jak przypisana rola, pełne imię i nazwisko oraz numer PIN.
  const [profile, setProfile] = useState(null);
  
  // Flaga określająca, czy aktualnie trwa proces weryfikacji i ładowania sesji z bazy danych.
  const [loading, setLoading] = useState(true);
  


  useEffect(() => {
    checkSession();
  }, []);

  // Główna funkcja weryfikująca token i przywracająca aktywną sesję użytkownika podczas inicjalizacji aplikacji.
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
        const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        if (import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co') && isValidUuid(parsed.id)) {
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
              setLoading(false);
              return;
            }
          }

          if (error || !activeSession) {
            // Invalid session or logged out from elsewhere
            localStorage.removeItem('local_user');
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
            setLoading(false);
            return;
          }

          // Update last seen
          await supabase.from('active_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', activeSession.id);
        } else {
          setUser({ id: parsed.id });
          setProfile(parsed);
        }
      }
    } catch {
      // Ignoruj błędy ładowania sesji
    } finally {
      setLoading(false);
    }
  }


  // Logowanie przeznaczone dla aplikacji POS oraz Kiosk, wykorzystujące autoryzację szybkim kodem PIN.
  const loginWithPin = useCallback(async (pin) => {
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
  }, []);

  // Tradycyjne logowanie do panelu z użyciem loginu i hasła. Zawiera też logikę lokalnego konta awaryjnego (admin).
  const loginWithCredentials = useCallback(async (username, password) => {
    // 1. Zawsze działające konto awaryjne: admin / admin
    if (username === 'admin' && password === 'admin') {
      const emergencyAdmin = {
        id: 'emergency-admin-1',
        full_name: 'Admin Awaryjny',
        role: ROLES.ADMIN,
        email: 'admin@sklep.pl',
        pin: '11111111',
        avatar_url: null
      };

      if (import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
        let deviceId = localStorage.getItem('system_device_id');
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem('system_device_id', deviceId);
        }

        try {
          const { data: storeData } = await supabase.from('store_settings').select('settings_json, id').limit(1).single();
          if (storeData) {
            const activeDemo = storeData.settings_json?.activeDemoSessions || {};
            const adminSession = activeDemo['admin'];
            const now = new Date().getTime();

            if (adminSession && adminSession.device_id !== deviceId && (now - adminSession.timestamp < 30 * 60 * 1000)) {
              return { success: false, error: 'Użytkownik jest już zalogowany na innej przeglądarce, karcie lub urządzeniu. Wyloguj się tam najpierw.' };
            }

            await supabase.from('store_settings').update({
              settings_json: { ...storeData.settings_json, activeDemoSessions: { ...activeDemo, admin: { device_id: deviceId, timestamp: now } } }
            }).eq('id', storeData.id);
          }
        } catch (err) {
          console.warn('Błąd blokady sesji awaryjnej', err);
        }
      }

      setProfile(emergencyAdmin);
      setUser({ id: emergencyAdmin.id, email: emergencyAdmin.email });
      localStorage.setItem('local_user', JSON.stringify(emergencyAdmin));
      return { success: true };
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
          return { success: false, error: 'Użytkownik jest już zalogowany na innej przeglądarce, karcie lub urządzeniu. Wyloguj się tam najpierw.' };
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
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  }, []);

  // Bezpieczne wylogowanie z instancji Supabase, usunięcie sesji urządzenia z bazy oraz wyczyszczenie pamięci lokalnej.
  const logout = useCallback(async () => {
    const deviceId = localStorage.getItem('system_device_id');
    
    if (profile?.id === 'emergency-admin-1' && import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
      try {
        const { data: storeData } = await supabase.from('store_settings').select('settings_json, id').limit(1).single();
        if (storeData) {
           const activeDemo = storeData.settings_json?.activeDemoSessions || {};
           if (activeDemo['admin']?.device_id === deviceId) {
              delete activeDemo['admin'];
              await supabase.from('store_settings').update({
                settings_json: { ...storeData.settings_json, activeDemoSessions: activeDemo }
              }).eq('id', storeData.id);
           }
        }
      } catch (err) {
        console.warn('Błąd zwalniania blokady sesji awaryjnej', err);
      }
    }

    if (profile) {
      await supabase.auth.signOut();
      
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
  }, [profile]);

  // Funkcja pomocnicza RBAC do sprawdzania, czy zalogowany pracownik posiada dane konkretne uprawnienie.
  const can = useCallback((permission) => {
    return hasPermission(profile?.role, permission);
  }, [profile]);

  // Funkcja pomocnicza RBAC weryfikująca, czy pracownik posiada przynajmniej jedno uprawnienie z podanej listy.
  const canAny = useCallback((permissions) => {
    return hasAnyPermission(profile?.role, permissions);
  }, [profile]);

  // Zestaw danych i funkcji autoryzacyjnych udostępniany wszystkim komponentom otoczonym przez AuthProvider.
  const value = {
    user,
    profile,
    loading,
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

// Niestandardowy hook (custom hook) ułatwiający pobieranie danych z AuthContext wewnątrz komponentów funkcyjnych.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
