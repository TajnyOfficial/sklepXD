import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import toast from 'react-hot-toast';

// Zegar na żywo
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
      <div style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-heading)', lineHeight: 1 }}>
        {timeStr}
      </div>
      <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: 6, textTransform: 'capitalize' }}>
        {dateStr}
      </div>
    </div>
  );
}

// Wyświetlacz PIN
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
            borderRadius: '4px',
            background: filled ? 'var(--accent)' : 'transparent',
            border: `1px solid ${filled ? 'var(--accent)' : 'var(--border-primary)'}`,
            transition: 'all 0.15s',

          }}
        />
      ))}
    </div>
  );
}

// Klawisz klawiatury numerycznej
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
          ? (pressed ? 'var(--danger)' : 'transparent')
          : (pressed ? 'var(--accent)' : 'transparent'),
        border: `1px solid ${danger ? 'var(--danger)' : pressed ? 'var(--accent)' : 'var(--border-primary)'}`,
        borderRadius: '4px',
        color: danger ? 'var(--danger)' : 'var(--text-heading)',
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
      {sub && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em' }}>{sub}</span>}
    </button>
  );
}

// Status po wpisaniu PIN
const STATUS_CONFIG = {
  idle: { bg: 'var(--bg-primary)', color: 'var(--text-primary)', icon: '', text: '' },
  checking: { bg: 'var(--bg-card)', color: 'var(--text-muted)', icon: '⏳', text: 'Weryfikacja...' },
  success_in: { bg: 'var(--success-bg)', color: 'var(--success)', icon: '✅', text: 'Witaj!' },
  success_out: { bg: 'var(--info-bg)', color: 'var(--info)', icon: '👋', text: 'Żegnaj!' },
  error: { bg: 'var(--danger-bg)', color: 'var(--danger)', icon: '❌', text: 'Błąd' },
};

// Statyczny ekran powitalny terminala (Rejestracja Czasu Pracy) z wbudowanym zegarem i klawiaturą PIN umożliwiającą rozpoczęcie oraz zakończenie zmiany pracownika
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
      const newStatus = type === 'clock_in' ? 'success_in' : 'success_out';
      setStatus(newStatus);
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

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG['idle'];

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: statusCfg.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
      transition: 'background 0.4s',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>S</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1.1rem' }}>Sklep HR</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Terminal rejestracji czasu pracy</div>
        </div>
      </div>

      <LiveClock />

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--bg-card)', borderRadius: '4px',
        border: `1px solid ${status === 'error' ? 'var(--danger)' : status === 'success' ? 'var(--success)' : 'var(--border-primary)'}`,
        padding: '28px 24px 24px',

      }}>
        {status !== 'idle' ? (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{statusCfg.icon}</div>
            <div style={{ color: statusCfg.color, fontWeight: 600, fontSize: '1.1rem' }}>{status === 'error' ? errorMsg : statusCfg.text}</div>
            {empName && <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 8 }}>{empName}</div>}
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16, textTransform: 'uppercase' }}>Wpisz PIN</div>
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
