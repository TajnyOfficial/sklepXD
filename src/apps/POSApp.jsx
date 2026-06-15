// Moduł systemu kasowego (POS). 
// Samodzielne środowisko sprzedażowe obsługiwane dotykiem i skanerem.

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

// Ekran startowy wymuszający określenie fizycznego stanowiska (np. "Kasa 1").
function RegisterSelection() {
  const { updatePosSession, shopSettings } = useStore();

  const registers = shopSettings?.registers || ['Kasa 1', 'Kasa 2', 'Kasa 3', 'Kasa 4'];

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-sans)'
    }}>
      <div className="card animate-fadeIn" style={{ width: 500, textAlign: 'center', padding: 56, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '4px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <FiMonitor size={32} color="#fff" />
        </div>
        <h1 style={{ color: 'var(--text-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>System POS</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '1rem' }}>Wybierz stanowisko kasowe, aby rozpocząć sprzedaż</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {registers.map(reg => (
            <button
              key={reg}
              className="btn btn-secondary"
              style={{
                height: 140, flexDirection: 'column', gap: 16, fontSize: '1.2rem', fontWeight: 600,
                background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)'
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

// Klawiatura numeryczna do autoryzacji kodem PIN kasjera obsługującego sprzedaż.
function POSPinLogin({ selectedRegister }) {
  const { updatePosSession, clearPosSession, employees, addPosLog, enforceDeviceLogin } = useStore();
  const [pin, setPin] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!pin || pin.length < 4) return;

    let employee = null;
    
    // Zapytanie bezpośrednio do bazy danych, aby ominąć problemy z ładowaniem kontekstu
    if (!!import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('pin', pin)
        .single();
        
      if (data) {
        employee = { ...data, name: data.full_name, active: data.is_active };
      }
    } else {
      // Fallback na kontekst dla trybu offline
      if (employees) {
        employee = employees.find(emp => String(emp.pin) === String(pin) && (emp.active || emp.is_active));
      }
    }

    if (employee) {
      if (!employee.active && !employee.is_active) {
        toast.error('Konto pracownika jest wyłączone (nieaktywne)');
        setPin('');
        return;
      }

      const allowedRoles = ['admin', 'shift_manager', 'sales_manager', 'cashier'];
      if (!allowedRoles.includes(employee.role)) {
        toast.error('Odmowa dostępu: Brak uprawnień do obsługi kasy');
        setPin('');
        return;
      }
      
      const authResult = await enforceDeviceLogin(employee.id, 'pos');
      if (!authResult.success) {
        toast.error(authResult.error);
        setPin('');
        return;
      }

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
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-sans)'
    }}>
      <div className="card animate-fadeIn" style={{ width: 420, textAlign: 'center', padding: 56, background: '#1e293b', border: '1px solid #334155', borderRadius: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="badge badge-info mb-16" style={{ fontSize: '0.9rem', padding: '8px 20px', background: 'var(--bg-primary)', color: 'var(--info)', fontWeight: 700 }}>{selectedRegister}</div>
        <h2 style={{ color: 'var(--text-heading)', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Zaloguj się</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>Wprowadź swój PIN kasjera</p>

        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 32 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '4px',
                background: i < pin.length ? 'var(--accent)' : 'transparent',
                border: `1px solid ${i < pin.length ? 'var(--accent)' : 'var(--border-primary)'}`,
                
                transition: 'all 0.1s'
              }} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} type="button" className="btn btn-secondary" style={{ height: 70, fontSize: '1.6rem', fontWeight: 700, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} onClick={() => pressDigit(n)}>{n}</button>
            ))}
            <button type="button" className="btn btn-ghost" style={{ height: 70, color: 'var(--text-muted)', fontSize: '1.2rem' }} onClick={() => setPin('')}>C</button>
            <button type="button" className="btn btn-secondary" style={{ height: 70, fontSize: '1.6rem', fontWeight: 700, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} onClick={() => pressDigit('0')}>0</button>
            <button type="submit" className="btn btn-primary" style={{ height: 70, background: 'var(--accent)' }}><FiChevronRight size={24} /></button>
          </div>

          <button type="button" className="btn btn-ghost w-full" style={{ color: 'var(--text-muted)' }} onClick={() => clearPosSession()}>Zmień stanowisko</button>
        </form>
      </div>
    </div>
  );
}

// Górny pasek środowiska POS – dane kasjera, stanowisko oraz szybka nawigacja.
function POSTopbar({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutPosUser } = useStore();

  return (
    <header style={{
      background: 'var(--bg-sidebar)',
      padding: '0 32px',
      height: 64,
      borderBottom: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000
    }}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>S</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Kasjer</span>
            <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem' }}>{session.posUser?.name || session.posUser?.full_name}</span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 8, background: 'var(--bg-primary)', padding: 6, borderRadius: '4px' }}>
          <button
            className={`btn ${location.pathname === '/' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigate('/')}
            style={{
              padding: '8px 20px', fontSize: '0.9rem', borderRadius: '4px',
              background: location.pathname === '/' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/' ? 'var(--text-heading)' : 'var(--text-muted)'
            }}
          >
            <FiShoppingCart size={16} /> Kasa
          </button>
          <button
            className={`btn ${location.pathname === '/cash' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigate('/cash')}
            style={{
              padding: '8px 20px', fontSize: '0.9rem', borderRadius: '4px',
              background: location.pathname === '/cash' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/cash' ? 'var(--text-heading)' : 'var(--text-muted)'
            }}
          >
            <FiDollarSign size={16} /> Szuflada
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stanowisko</div>
          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{session.selectedRegister}</div>
        </div>
        <button className="btn btn-ghost" style={{ color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: '4px', padding: '8px 16px' }} onClick={() => {
          if (confirm('Czy chcesz się wylogować?')) logoutPosUser();
        }}>
          <FiLogOut size={18} /> Wyloguj
        </button>
      </div>
    </header>
  );
}

// Główne sterowanie stanem POS – upewnia się, że wybrano kasę i zalogowano kasjera.
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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)' }}>
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

// Punkt wejścia (Router) aplikacji kasy fiskalnej, odizolowany pod ścieżką /pos.
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
                background: 'var(--bg-sidebar)', color: 'var(--text-heading)',
                border: '1px solid var(--border-primary)', borderRadius: '4px', fontSize: '0.875rem',
              },
            }}
          />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
