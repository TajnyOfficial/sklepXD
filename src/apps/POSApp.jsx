/**
 * Moduł (Aplikacja) Punktu Sprzedaży (POS).
 * 
 * Izolowane środowisko kasowe zoptymalizowane pod obsługę dotykową i skanery kodów.
 * Funkcjonalności: Wybór kasy, logowanie szybkim kodem PIN, dedykowany pasek górny.
 */

import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import POSPage from '../pages/pos/POSPage';
import CashDrawerPage from '../pages/pos/CashDrawerPage';
import {
  FiLogOut, FiMonitor, FiShoppingCart, FiDollarSign,
  FiGrid, FiChevronRight, FiUser
} from 'react-icons/fi';

/**
 * Ekran wyboru stanowiska kasowego.
 * Wymuszany na początku sesji POS, aby przypisać transakcje i logi
 * do odpowiedniej fizycznej kasy (np. "Kasa 1", "Kasa 2").
 */
function RegisterSelection() {
  const { updatePosSession, shopSettings } = useStore();

  const registers = shopSettings?.registers || ['Kasa 1', 'Kasa 2', 'Kasa 3', 'Kasa 4'];

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div className="card animate-fadeIn" style={{ width: 500, textAlign: 'center', padding: 56, background: '#1e293b', border: '1px solid #334155', borderRadius: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <FiMonitor size={32} color="#fff" />
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>System POS</h1>
        <p style={{ color: '#94a3b8', marginBottom: 40, fontSize: '1rem' }}>Wybierz stanowisko kasowe, aby rozpocząć sprzedaż</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {registers.map(reg => (
            <button
              key={reg}
              className="btn btn-secondary"
              style={{
                height: 140, flexDirection: 'column', gap: 16, fontSize: '1.2rem', fontWeight: 600,
                background: '#0f172a', border: '1px solid #334155', color: '#f8fafc'
              }}
              onClick={() => updatePosSession({ selectedRegister: reg })}
            >
              <FiGrid size={32} />
              {reg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Ekran logowania za pomocą kodu PIN dla kasjerów.
 * Wyświetlany natychmiast po wybraniu konkretnej kasy.
 * 
 * @param {Object} props Właściwości komponentu
 * @param {string} props.selectedRegister - Nazwa aktualnie wybranego stanowiska kasowego
 */
function POSPinLogin({ selectedRegister }) {
  const { updatePosSession, clearPosSession, employees, addPosLog } = useStore();
  const [pin, setPin] = useState('');

  const handleLogin = (e) => {
    e?.preventDefault();
    if (!employees) return;
    const employee = employees.find(emp => String(emp.pin) === String(pin) && (emp.active || emp.is_active));
    if (employee) {
      updatePosSession({ posUser: employee });
      if (addPosLog) {
        addPosLog(
          'login',
          employee.name || employee.full_name,
          selectedRegister,
          'Rozpoczęcie sesji'
        );
      }
      setPin('');
      toast.success(`Witaj, ${employee.name || employee.full_name}`);
    } else {
      toast.error('Nieprawidłowy PIN');
      setPin('');
    }
  };

  const pressDigit = (d) => setPin(p => p.length < 4 ? p + d : p);

  useEffect(() => {
    if (pin.length === 4) handleLogin();
  }, [pin]);

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div className="card animate-fadeIn" style={{ width: 420, textAlign: 'center', padding: 56, background: '#1e293b', border: '1px solid #334155', borderRadius: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="badge badge-info mb-16" style={{ fontSize: '0.9rem', padding: '8px 20px', background: '#334155', color: '#6366f1', fontWeight: 700 }}>{selectedRegister}</div>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Zaloguj się</h2>
        <p style={{ color: '#94a3b8', marginBottom: 40 }}>Wprowadź swój PIN kasjera</p>

        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 32 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: i < pin.length ? '#6366f1' : 'transparent',
                border: `2px solid ${i < pin.length ? '#6366f1' : '#334155'}`,
                boxShadow: i < pin.length ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                transition: 'all 0.1s'
              }} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} type="button" className="btn btn-secondary" style={{ height: 70, fontSize: '1.6rem', fontWeight: 700, background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} onClick={() => pressDigit(n)}>{n}</button>
            ))}
            <button type="button" className="btn btn-ghost" style={{ height: 70, color: '#94a3b8', fontSize: '1.2rem' }} onClick={() => setPin('')}>C</button>
            <button type="button" className="btn btn-secondary" style={{ height: 70, fontSize: '1.6rem', fontWeight: 700, background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} onClick={() => pressDigit('0')}>0</button>
            <button type="submit" className="btn btn-primary" style={{ height: 70, background: '#4f46e5' }}><FiChevronRight size={24} /></button>
          </div>

          <button type="button" className="btn btn-ghost w-full" style={{ color: '#64748b' }} onClick={() => clearPosSession()}>Zmień stanowisko</button>
        </form>
      </div>
    </div>
  );
}

/**
 * Górny pasek nawigacyjny, unikalny dla środowiska POS.
 * Zawiera dane zalogowanego kasjera, informację o stanowisku 
 * oraz szybkie nawigacje do widoku koszyka lub otwierania szuflady na gotówkę.
 * 
 * @param {Object} props Właściwości komponentu
 * @param {Object} props.session - Aktualna sesja zawierająca wybraną kasę i użytkownika
 */
function POSTopbar({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutPosUser } = useStore();

  return (
    <header style={{
      background: '#0f172a',
      padding: '0 32px',
      height: 64,
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000
    }}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>S</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Kasjer</span>
            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>{session.posUser?.name || session.posUser?.full_name}</span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 8, background: '#1e293b', padding: 6, borderRadius: 12 }}>
          <button
            className={`btn ${location.pathname === '/' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigate('/')}
            style={{
              padding: '8px 20px', fontSize: '0.9rem', borderRadius: 8,
              background: location.pathname === '/' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/' ? '#fff' : '#94a3b8'
            }}
          >
            <FiShoppingCart size={16} /> Kasa
          </button>
          <button
            className={`btn ${location.pathname === '/cash' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigate('/cash')}
            style={{
              padding: '8px 20px', fontSize: '0.9rem', borderRadius: 8,
              background: location.pathname === '/cash' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/cash' ? '#fff' : '#94a3b8'
            }}
          >
            <FiDollarSign size={16} /> Szuflada
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Stanowisko</div>
          <div style={{ fontWeight: 700, color: '#f8fafc' }}>{session.selectedRegister}</div>
        </div>
        <button className="btn btn-ghost" style={{ color: '#f87171', border: '1px solid #7f1d1d', borderRadius: 10, padding: '8px 16px' }} onClick={() => {
          if (confirm('Czy chcesz się wylogować?')) logoutPosUser();
        }}>
          <FiLogOut size={18} /> Wyloguj
        </button>
      </div>
    </header>
  );
}

// ── 4. POS Inner ─────────────────────────────────────────────────────────────
function POSInner() {
  const { posSession } = useStore();

  const session = posSession || { selectedRegister: null, posUser: null };
  const isAuth = !!session.posUser;
  const isRegisterSelected = !!session.selectedRegister;

  if (!isRegisterSelected) {
    return <RegisterSelection />;
  }

  if (!isAuth) {
    return <POSPinLogin selectedRegister={session.selectedRegister} />;
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <POSTopbar session={session} />
      <main style={{ flex: 1, paddingTop: 64, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<POSPage />} />
          <Route path="/cash" element={<CashDrawerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * Główny komponent (root) aplikacji POS.
 * Podłącza dostawców stanu, autoryzacji oraz definiuje nadrzędny router (basename="/pos").
 */
export default function POSApp() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter basename="/pos">
          <POSInner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f172a', color: '#f8fafc',
                border: '1px solid #1e293b', borderRadius: '12px', fontSize: '0.875rem',
              },
            }}
          />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
