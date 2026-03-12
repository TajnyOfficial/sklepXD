import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime, formatDateTime } from '../../utils/helpers';
import { FiClock, FiPlay, FiStopCircle, FiCoffee, FiEdit, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TimeTrackingPage() {
  const { profile } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [onBreak, setOnBreak] = useState(false);

  const entries = [
    { date: '2026-03-12', clockIn: '08:00', clockOut: null, breaks: '30 min', hours: '—', user: profile?.full_name },
    { date: '2026-03-11', clockIn: '07:55', clockOut: '16:05', breaks: '30 min', hours: '7h 40m', user: profile?.full_name },
    { date: '2026-03-10', clockIn: '08:02', clockOut: '16:00', breaks: '45 min', hours: '7h 13m', user: profile?.full_name },
    { date: '2026-03-09', clockIn: '08:00', clockOut: '16:30', breaks: '30 min', hours: '8h 0m', user: profile?.full_name },
    { date: '2026-03-08', clockIn: '09:00', clockOut: '17:15', breaks: '30 min', hours: '7h 45m', user: profile?.full_name },
  ];

  function handleClockIn() {
    setClockedIn(true);
    setClockInTime(new Date());
    toast.success('Czas pracy rozpoczęty!');
  }

  function handleClockOut() {
    setClockedIn(false);
    setClockInTime(null);
    setOnBreak(false);
    toast.success('Czas pracy zakończony!');
  }

  function handleBreak() {
    setOnBreak(!onBreak);
    toast(onBreak ? 'Powrót z przerwy' : 'Rozpoczęto przerwę', { icon: '☕' });
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Ewidencja czasu pracy</h1><p>Start/Stop, przerwy, korekty</p></div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: clockedIn ? 'var(--success)' : 'var(--text-muted)', marginBottom: 8 }}>
            {clockedIn ? new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—:—'}
          </div>
          <div className="text-sm text-muted mb-16">
            {clockedIn ? (onBreak ? '☕ Na przerwie' : '✅ W pracy') : 'Nie rozpoczęto'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {!clockedIn ? (
              <button className="btn btn-success btn-lg" onClick={handleClockIn}><FiPlay size={18} /> Rozpocznij zmianę</button>
            ) : (
              <>
                <button className={`btn ${onBreak ? 'btn-primary' : 'btn-secondary'} btn-lg`} onClick={handleBreak}>
                  <FiCoffee size={18} /> {onBreak ? 'Koniec przerwy' : 'Przerwa'}
                </button>
                <button className="btn btn-danger btn-lg" onClick={handleClockOut}><FiStopCircle size={18} /> Zakończ</button>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-16">Podsumowanie tygodnia</h3>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="stat-card"><span className="stat-label">Godziny (tydzień)</span><span className="stat-value">30h 38m</span></div>
            <div className="stat-card"><span className="stat-label">Norma tygodniowa</span><span className="stat-value">40h 0m</span></div>
            <div className="stat-card"><span className="stat-label">Nadgodziny</span><span className="stat-value text-warning">0h</span></div>
            <div className="stat-card"><span className="stat-label">Przerwy</span><span className="stat-value">2h 45m</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-16"><FiCalendar size={18} style={{ marginRight: 8 }} />Historia obecności</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Data</th><th>Wejście</th><th>Wyjście</th><th>Przerwy</th><th>Przepracowano</th></tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i}>
                  <td>{e.date}</td>
                  <td style={{ color: 'var(--success)' }}>{e.clockIn}</td>
                  <td>{e.clockOut || <span className="badge badge-success">Teraz</span>}</td>
                  <td className="text-muted">{e.breaks}</td>
                  <td style={{ fontWeight: 600 }}>{e.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
