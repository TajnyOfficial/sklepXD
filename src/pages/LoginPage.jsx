import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../utils/rbac';
import { FiLogIn, FiShield, FiUser } from 'react-icons/fi';

/**
 * Ekran logowania do systemu.
 * Posiada dwa tryby:
 * 1. Logowanie testowe (Demo) - szybki wybór konta z listy
 * 2. Logowanie bezpiecznym kodem PIN (Produkcja) z dużą klawiaturą dotykową
 * 
 * @returns {JSX.Element} Widok strony logowania
 */
export default function LoginPage() {
  const { loginWithPin, loginWithDemo, demoUsers } = useAuth();
  const [mode, setMode] = useState('select'); // 'select' | 'pin'
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePinSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginWithPin(pin);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  }

  function handlePinPad(digit) {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(async () => {
          setError('');
          setLoading(true);
          const result = await loginWithPin(newPin);
          if (!result.success) {
            setError(result.error);
            setPin('');
          }
          setLoading(false);
        }, 200);
      }
    }
  }

  function handleBackspace() {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }

  if (mode === 'select') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div className="login-logo">
            <div className="sidebar-logo" style={{ width: 48, height: 48, fontSize: '1.5rem' }}>S</div>
          </div>
          <h2>Sklep — System Zarządzania</h2>
          <p className="login-subtitle">Wybierz konto lub zaloguj się kodem PIN</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoUsers.map(user => (
              <button
                key={user.id}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  width: '100%'
                }}
                onClick={() => loginWithDemo(user.id)}
              >
                <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                  {user.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                    {user.full_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[user.role]}
                  </div>
                </div>
                <FiLogIn size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setMode('pin')}>
              <FiShield size={16} />
              Zaloguj kodem PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="sidebar-logo" style={{ width: 48, height: 48, fontSize: '1.5rem' }}>S</div>
        </div>
        <h2>Wprowadź PIN</h2>
        <p className="login-subtitle">Wpisz 4-cyfrowy kod PIN aby się zalogować</p>

        <form onSubmit={handlePinSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${pin.length > i ? 'var(--accent)' : 'var(--border-primary)'}`,
                  background: 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-heading)',
                  transition: 'all 0.15s ease',
                }}
              >
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              textAlign: 'center',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 16,
              animation: 'slideUp 0.2s ease'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            maxWidth: 240,
            margin: '0 auto'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
              <button
                key={digit}
                type="button"
                className="btn btn-secondary"
                style={{
                  aspectRatio: '1',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-lg)',
                }}
                onClick={() => handlePinPad(String(digit))}
                disabled={loading}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ aspectRatio: '1', justifyContent: 'center' }}
              onClick={() => { setMode('select'); setPin(''); setError(''); }}
            >
              <FiUser size={18} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                aspectRatio: '1',
                fontSize: '1.25rem',
                fontWeight: 600,
                justifyContent: 'center',
                borderRadius: 'var(--radius-lg)',
              }}
              onClick={() => handlePinPad('0')}
              disabled={loading}
            >
              0
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ aspectRatio: '1', justifyContent: 'center', fontSize: '1.25rem' }}
              onClick={handleBackspace}
            >
              ⌫
            </button>
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <div className="spinner"></div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
