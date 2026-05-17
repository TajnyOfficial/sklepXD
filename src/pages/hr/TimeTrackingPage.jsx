import { useState, useMemo } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiClock, FiCalendar, FiUser, FiInfo } from 'react-icons/fi';

/**
 * Widok modułu TimeTrackingPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z TimeTracking.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony TimeTrackingPage
 */
export default function TimeTrackingPage() {
  const { attendance, employees } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Przygotuj dane do wyświetlenia — złącz ewidencję z danymi pracowników
  const enrichedEntries = useMemo(() => {
    return attendance
      .filter(a => a.clock_in.startsWith(selectedMonth))
      .map(a => {
        const emp = employees.find(e => e.id === a.profile_id);
        
        // Oblicz czas trwania jeśli sesja jest zamknięta
        let durationStr = '—';
        if (a.clock_out) {
            const diffMs = new Date(a.clock_out) - new Date(a.clock_in);
            const totalMin = Math.floor(diffMs / 60000);
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            durationStr = `${h}h ${m}m`;
        } else {
            durationStr = 'W toku...';
        }

        return {
          ...a,
          employeeName: emp?.name || 'Nieznany',
          date: new Date(a.clock_in).toLocaleDateString('pl-PL'),
          clockInTime: new Date(a.clock_in).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          clockOutTime: a.clock_out ? new Date(a.clock_out).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : null,
          duration: durationStr,
          totalMinutes: a.clock_out ? Math.floor((new Date(a.clock_out) - new Date(a.clock_in)) / 60000) : 0
        };
      });
  }, [attendance, employees, selectedMonth]);

  // Podsumowanie dla każdego pracownika w wybranym miesiącu
  const employeeSummaries = useMemo(() => {
    const summary = {};
    enrichedEntries.forEach(entry => {
        if (!summary[entry.profile_id]) {
            summary[entry.profile_id] = {
                name: entry.employeeName,
                totalMinutes: 0,
                sessions: 0
            };
        }
        summary[entry.profile_id].totalMinutes += entry.totalMinutes;
        summary[entry.profile_id].sessions += 1;
    });

    return Object.values(summary).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [enrichedEntries]);

  const formatMinutes = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Ewidencja czasu pracy</h1>
          <p>Przegląd sesji pracy i podsumowanie godzin</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <FiCalendar size={18} className="text-muted" />
          <input 
            type="month" 
            className="input" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 24 }}>
        <div className="card">
          <h3 className="mb-16">Ranking przepracowanych godzin</h3>
          {employeeSummaries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {employeeSummaries.map((s, idx) => (
                <div key={idx} className="flex-between p-12" style={{ background: 'var(--bg-alt)', borderRadius: 12 }}>
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                        {s.name[0]}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                        <div className="text-xs text-muted">{s.sessions} sesji</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>{formatMinutes(s.totalMinutes)}</div>
                    <div className="text-xs text-muted">suma czasu</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-center p-24">Brak danych dla wybranego okresu</div>
          )}
        </div>

        <div className="card">
            <h3 className="mb-16">Statystyki ogólne</h3>
            <div className="grid-2" style={{ gap: 12 }}>
                <div className="stat-card">
                    <span className="stat-label">Suma wszystkich godzin</span>
                    <span className="stat-value">{formatMinutes(employeeSummaries.reduce((acc, s) => acc + s.totalMinutes, 0))}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Liczba sesji</span>
                    <span className="stat-value">{enrichedEntries.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Średnia sesja</span>
                    <span className="stat-value">
                        {enrichedEntries.length ? formatMinutes(Math.floor(employeeSummaries.reduce((acc, s) => acc + s.totalMinutes, 0) / enrichedEntries.length)) : '0h 0m'}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Pracowników</span>
                    <span className="stat-value">{employeeSummaries.length}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-16">
            <h3><FiClock size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Szczegółowa historia odbić</h3>
            <div className="text-xs text-muted"><FiInfo size={12} /> Dane z miesiąca: {selectedMonth}</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
                <tr>
                    <th>Pracownik</th>
                    <th>Data</th>
                    <th>Wejście</th>
                    <th>Wyjście</th>
                    <th>Czas trwania</th>
                </tr>
            </thead>
            <tbody>
              {enrichedEntries.length > 0 ? (
                enrichedEntries.map((e, i) => (
                  <tr key={i}>
                    <td>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                            <FiUser size={14} className="text-muted" />
                            <span style={{ fontWeight: 500 }}>{e.employeeName}</span>
                        </div>
                    </td>
                    <td>{e.date}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{e.clockInTime}</td>
                    <td>
                        {e.clockOutTime ? (
                            <span style={{ fontWeight: 600 }}>{e.clockOutTime}</span>
                        ) : (
                            <span className="badge badge-success animate-pulse">W PRACY</span>
                        )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{e.duration}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center p-24 text-muted">Brak wpisów w tym miesiącu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
