import { FiTruck } from 'react-icons/fi';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const SCHEDULE = [
  { supplier: 'Hurtownia Śrub Polskie', days: [1, 3], time: '08:00-10:00' },
  { supplier: 'Dekoral Dystrybucja', days: [2], time: '09:00-11:00' },
  { supplier: 'Bosch Professional Polska', days: [4], time: '10:00-12:00' },
  { supplier: 'Mega-Bud Materiały Budowlane', days: [1, 4], time: '07:00-09:00' },
  { supplier: 'ElektroHurt24', days: [5], time: '08:00-10:00' },
];

/**
 * Widok modułu DeliverySchedulePage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z DeliverySchedule.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony DeliverySchedulePage
 */
export default function DeliverySchedulePage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Harmonogram dostaw</h1><p>Kalendarz planowanych dostaw od dostawców</p></div>
      </div>
      <div className="schedule-grid mb-24">
        <div className="schedule-header"></div>
        {DAYS.map(d => <div key={d} className="schedule-header">{d}</div>)}
        {SCHEDULE.map((s, i) => (
          <>
            <div key={`label-${i}`} className="schedule-cell" style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 500, background: 'var(--bg-tertiary)' }}>{s.supplier}</div>
            {DAYS.map((d, di) => (
              <div key={`${i}-${di}`} className="schedule-cell">
                {s.days.includes(di + 1) && (
                  <div style={{ padding: '4px 8px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--accent-light)' }}>
                    <FiTruck size={10} /> {s.time}
                  </div>
                )}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
