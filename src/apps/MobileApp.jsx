/**
 * Moduł (Aplikacja) Mobilnego Asystenta Sklepu.
 * 
 * Zoptymalizowany pod urządzenia przenośne (smartfony, terminale zebra).
 * Służy głównie do inwentaryzacji, przyjmowania dostaw i szybkiego sprawdzania stanów.
 * Interfejs opiera się na dolnym pasku nawigacyjnym (Bottom Navigation).
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import MobileInventoryPage from '../pages/mobile/MobileInventoryPage';
import MobileStockPage from '../pages/mobile/MobileStockPage';
import MobileScanPage from '../pages/mobile/MobileScanPage';
import MobileDeliveriesPage from '../pages/mobile/MobileDeliveriesPage';
import MobileReceiveDeliveryPage from '../pages/mobile/MobileReceiveDeliveryPage';
import { FiClipboard, FiPackage, FiSearch, FiLogOut, FiTablet, FiTruck } from 'react-icons/fi';

/**
 * Ekran logowania kodem PIN dla pracowników na urządzeniach mobilnych.
 * Identyfikuje osobę obsługującą skaner przed dopuszczeniem jej do pracy.
 */
function MobilePinLogin() {
  const { employees, updateMobileSession, addPosLog, enforceDeviceLogin } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (pin.length < 4) return;

    setError('');
    let employee = null;

    // Zapytanie bezpośrednio do bazy danych, aby ominąć problemy z ładowaniem kontekstu
    if (!!import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('pin', pin)
        .single();

      if (data) {
        employee = { ...data, name: data.full_name, active: data.is_active };
      }
    } else {
      if (employees) {
        employee = employees.find(emp => String(emp.pin) === String(pin) && (emp.active || emp.is_active));
      }
    }

    if (employee) {
      if (!employee.active && !employee.is_active) {
        setError('Konto pracownika jest wyłączone (nieaktywne)');
        setPin('');
        return;
      }

      const authResult = await enforceDeviceLogin(employee.id, 'mobile');
      if (!authResult.success) {
        setError(authResult.error);
        setPin('');
        return;
      }

      updateMobileSession({ mobileUser: employee });
      if (addPosLog) {
        addPosLog(
          'login',
          employee.name || employee.full_name,
          'Mobile',
          'Rozpoczęcie sesji'
        );
      }
      setPin('');
      toast.success(`Witaj, ${employee.name || employee.full_name}`);
    } else {
      setError('Nieprawidłowy PIN');
      setPin('');
    }
  }

  function pressDigit(d) {
    const next = pin.length < 4 ? pin + d : pin;
    setPin(next);
  }

  useEffect(() => {
    if (pin.length === 4) handleSubmit();
  }, [pin]);

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-sans)', padding: '24px 20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '4px', margin: '0 auto 16px',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FiTablet size={26} color="#fff" />
        </div>
        <div style={{ color: 'var(--text-heading)', fontWeight: 800, fontSize: '1.4rem' }}>Sklep Mobile</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
          Logowanie PIN — Inwentaryzacja i Magazyn
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '4px',
        padding: '32px 28px', width: '100%', maxWidth: 320,
      }}>
        {/* PIN dots */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 28 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '4px',
              background: i < pin.length ? 'var(--accent)' : 'transparent',
              border: `1px solid ${i < pin.length ? 'var(--accent)' : 'var(--border-primary)'}`,
              transition: 'all 0.12s',
            }} />
          ))}
        </div>

        {error && (
          <div style={{ textAlign: 'center', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button key={d} onClick={() => pressDigit(d)} style={{
              padding: '20px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
              borderRadius: '4px', color: 'var(--text-heading)', fontSize: '1.5rem', fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>{d}</button>
          ))}
          <button onClick={() => setPin(p => p.slice(0, -1))} style={{
            padding: '20px 8px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
            borderRadius: '4px', color: 'var(--danger)', fontSize: '1.2rem', cursor: 'pointer',
          }}>⌫</button>
          <button onClick={() => pressDigit('0')} style={{
            padding: '20px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
            borderRadius: '4px', color: 'var(--text-heading)', fontSize: '1.5rem', fontWeight: 700, cursor: 'pointer',
          }}>0</button>
          <button onClick={handleSubmit} style={{
            padding: '20px 8px', background: 'var(--accent)', border: '1px solid var(--accent)',
            borderRadius: '4px', color: 'var(--text-heading)', fontSize: '1.2rem', cursor: 'pointer',
          }}>✓</button>
        </div>
      </div>
    </div >
  );
}


/**
 * Dolny pasek nawigacyjny (Bottom Navigation).
 * Ergonomiczny interfejs charakterystyczny dla systemów operacyjnych urządzeń mobilnych.
 * Pozwala na szybkie przełączanie między inwentaryzacją, stanami i skanerem, używając kciuka.
 */
function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutMobileUser } = useStore();

  const tabs = [
    { path: '/', label: 'Inwent', icon: FiClipboard },
    { path: '/stock', label: 'Stany', icon: FiPackage },
    { path: '/scan', label: 'Skaner', icon: FiSearch },
    { path: '/deliveries', label: 'Dostawy', icon: FiTruck },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
      background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border-primary)',
      display: 'flex', alignItems: 'stretch',
      fontFamily: 'var(--font-sans)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
      maxWidth: '480px', margin: '0 auto'
    }}>
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button key={path} onClick={() => navigate(path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            border: 'none', background: 'transparent',
            color: active ? 'var(--accent-light)' : 'var(--text-muted)',
            fontSize: '0.65rem', fontWeight: active ? 700 : 500,
            cursor: 'pointer', transition: 'color 0.15s',
          }}>
            <Icon size={20} style={{ strokeWidth: active ? 2.5 : 1.5 }} />
            {label}
          </button>
        );
      })}
      <button onClick={() => {
        if (confirm('Czy chcesz się wylogować?')) logoutMobileUser();
      }} style={{
        width: 56, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        border: 'none', background: 'transparent', color: 'var(--text-muted)',
        fontSize: '0.65rem', cursor: 'pointer',
      }}>
        <FiLogOut size={18} />
        Wyjdź
      </button>
    </nav>
  );
}

/**
 * Szablon (Layout) wizualny aplikacji mobilnej.
 * Obejmuje obszar ze ścieżkami (Routes) zajmujący większość ekranu 
 * oraz przytwierdzony na stałe dolny pasek (BottomNav).
 */
function MobileLayout() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 64 }}>
      <Routes>
        <Route path="/" element={<MobileInventoryPage />} />
        <Route path="/stock" element={<MobileStockPage />} />
        <Route path="/scan" element={<MobileScanPage />} />
        <Route path="/deliveries" element={<MobileDeliveriesPage />} />
        <Route path="/deliveries/:id" element={<MobileReceiveDeliveryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function MobileInner() {
  const { mobileSession } = useStore();
  const session = mobileSession || { mobileUser: null };
  const isAuth = !!session.mobileUser;

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100dvh',
      background: 'var(--bg)',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {!isAuth ? <MobilePinLogin /> : <MobileLayout />}
    </div>
  );
}

/* Punkt startowy (Root) aplikacji mobilnej. Odpowiada za dostarczenie kontekstów (Store, Auth) i ustawienie bazowej ścieżki routingu na "/mobile" */
export default function MobileApp() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter basename="/mobile">
          <MobileInner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)', color: 'var(--text-heading)',
                border: '1px solid var(--border-primary)', borderRadius: '4px',
              },
            }}
          />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
