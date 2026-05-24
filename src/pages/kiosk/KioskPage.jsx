/**
 * Interfejs terminala Kiosku (Rejestracja Czasu Pracy).
 * 
 * Ekran przeznaczony stricte pod tablety zamontowane na stałe przy wejściu do firmy.
 * Posiada wbudowany duży zegar czasu rzeczywistego i dedykowaną klawiaturę numeryczną
 * do wpisywania PIN-u w celu zarejestrowania godziny rozpoczęcia/zakończenia pracy.
 * 
 * @returns {JSX.Element}
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import toast from 'react-hot-toast';

// ── Zegar na żywo ────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc', lineHeight: 1 }}>
        {timeStr}
      </div>
      <div style={{ fontSize: '1rem', color: '#64748b', marginTop: 6, textTransform: 'capitalize' }}>
        {dateStr}
      </div>
    </div>
  );
}

// ── Wyświetlacz PIN ─────────────────────────────────────────────────────────
function PinDisplay({ value }) {
  const dots = Array.from({ length: 4 }, (_, i) => ({
    filled: i < value.length,
    key: i,
  }));

  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
      {dots.map(({ filled, key }) => (
        <div
          key={key}
          style={{
            width: 18, height: 18,
            borderRadius: '50%',
            background: filled ? '#6366f1' : 'transparent',
            border: `2px solid ${filled ? '#6366f1' : '#334155'}`,
            transition: 'all 0.15s',
            boxShadow: filled ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Klawisz klawiatury numerycznej ───────────────────────────────────────────
function NumKey({ label, sub, onClick, danger, wide }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick?.(); }}
      onPointerLeave={() => setPressed(false)}
      style={{
        gridColumn: wide ? 'span 2' : undefined,
        padding: '22px 8px',
        background: danger
          ? (pressed ? '#7f1d1d' : '#1c1917')
          : (pressed ? '#4338ca' : '#1e293b'),
        border: `1px solid ${danger ? '#7f1d1d' : pressed ? '#6366f1' : '#334155'}`,
        borderRadius: 14,
        color: danger ? '#f87171' : '#f8fafc',
        fontSize: '1.5rem',
        fontWeight: 700,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
        transition: 'background 0.08s, border-color 0.08s',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}
    >
      {label}
      {sub && <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 400, letterSpacing: '0.05em' }}>{sub}</span>}
    </button>
  );
}

// ── Status po wpisaniu PIN ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle: { bg: '#111827', color: '#f8fafc', icon: '', text: '' },
  checking: { bg: '#1e293b', color: '#94a3b8', icon: '⏳', text: 'Weryfikacja...' },
  success: { bg: '#064e3b', color: '#34d399', icon: '✅', text: 'Witaj!' },
  error: { bg: '#7f1d1d', color: '#fca5a5', icon: '❌', text: 'Błąd' },
};

export default function KioskPage() {
  const { clockInOutEmployee } = useStore();
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('idle');
  const [empName, setEmpName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (pin.length === 4 && status === 'idle') {
      handleSubmit();
    }
  }, [pin, status]);

  async function handleSubmit() {
    if (pin.length < 4) return;
    setStatus('checking');
    try {
      const result = await clockInOutEmployee(pin);
      const { employee, type } = result;
      setStatus('success');
      setEmpName(`${employee.name} — ${type === 'clock_in' ? '▶ Wejście' : '⏹ Wyjście'}`);
      setTimeout(() => { setStatus('idle'); setPin(''); setEmpName(''); }, 4000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Błędny PIN');
      setTimeout(() => { setStatus('idle'); setPin(''); setErrorMsg(''); }, 2500);
    }
  }

  const pressDigit = (d) => setPin(p => p.length < 4 ? p + d : p);
  const pressBackspace = () => setPin(p => p.slice(0, -1));
  const pressClear = () => setPin('');

  const statusCfg = STATUS_CONFIG[status];

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: statusCfg.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
      transition: 'background 0.4s',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>S</div>
        <div>
          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>SklepXD HR</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Terminal rejestracji czasu pracy</div>
        </div>
      </div>

      <LiveClock />

      <div style={{
        width: '100%', maxWidth: 360,
        background: '#0f172a', borderRadius: 24,
        border: `1px solid ${status === 'error' ? '#7f1d1d' : status === 'success' ? '#14532d' : '#1e293b'}`,
        padding: '28px 24px 24px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
      }}>
        {status !== 'idle' ? (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{statusCfg.icon}</div>
            <div style={{ color: statusCfg.color, fontWeight: 600, fontSize: '1.1rem' }}>{status === 'error' ? errorMsg : statusCfg.text}</div>
            {empName && <div style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: 8 }}>{empName}</div>}
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginBottom: 16, textTransform: 'uppercase' }}>Wpisz PIN</div>
            <PinDisplay value={pin} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <NumKey key={d} label={d} onClick={() => pressDigit(d)} />)}
              <NumKey label="⌫" onClick={pressBackspace} danger />
              <NumKey label="0" onClick={() => pressDigit('0')} />
              <NumKey label="✓" onClick={handleSubmit} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
