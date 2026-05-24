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
  const { employees, updateMobileSession, addPosLog } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (pin.length < 4) return;
    if (!employees) {
      setError('Brak listy pracowników');
      setPin('');
      return;
    }

    setError('');
    const employee = employees.find(emp => String(emp.pin) === String(pin) && (emp.active || emp.is_active));

    if (employee) {
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
      background: 'linear-gradient(160deg, #0f172a 0%, #0c1446 100%)',
      fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FiTablet size={26} color="#fff" />
        </div>
        <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1.4rem' }}>SklepXD Mobile</div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 6 }}>
          Logowanie PIN — Inwentaryzacja i Magazyn
        </div>
      </div>

      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 24,
        padding: '32px 28px', width: '100%', maxWidth: 320,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* PIN dots */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 28 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%',
              background: i < pin.length ? '#0ea5e9' : 'transparent',
              border: `2px solid ${i < pin.length ? '#0ea5e9' : '#334155'}`,
              transition: 'all 0.12s',
              boxShadow: i < pin.length ? '0 0 10px rgba(14,165,233,0.5)' : 'none',
            }} />
          ))}
        </div>

        {error && (
          <div style={{ textAlign: 'center', color: '#f87171', fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button key={d} onClick={() => pressDigit(d)} style={{
              padding: '20px 8px', background: '#0f172a', border: '1px solid #334155',
              borderRadius: 14, color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>{d}</button>
          ))}
          <button onClick={() => setPin(p => p.slice(0, -1))} style={{
            padding: '20px 8px', background: '#1c1917', border: '1px solid #7f1d1d',
            borderRadius: 14, color: '#f87171', fontSize: '1.2rem', cursor: 'pointer',
          }}>⌫</button>
          <button onClick={() => pressDigit('0')} style={{
            padding: '20px 8px', background: '#0f172a', border: '1px solid #334155',
            borderRadius: 14, color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, cursor: 'pointer',
          }}>0</button>
          <button onClick={handleSubmit} style={{
            padding: '20px 8px', background: '#0369a1', border: '1px solid #0ea5e9',
            borderRadius: 14, color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
          }}>✓</button>
        </div>
      </div>
    </div>
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
      background: '#0f172a', borderTop: '1px solid #1e293b',
      display: 'flex', alignItems: 'stretch',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button key={path} onClick={() => navigate(path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            border: 'none', background: 'transparent',
            color: active ? '#0ea5e9' : '#475569',
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
        border: 'none', background: 'transparent', color: '#475569',
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

  if (!isAuth) return <MobilePinLogin />;
  return <MobileLayout />;
}

/**
 * Główny komponent (root) aplikacji Mobile.
 * Inicjalizuje wymagane konteksty oraz obsługuje routing dla bazy "/mobile".
 */
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
                background: '#1e293b', color: '#f8fafc',
                border: '1px solid #334155', borderRadius: '12px',
              },
            }}
          />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
