import { FiCalendar, FiPlus, FiRefreshCw } from 'react-icons/fi';

const DAYS = ['Pon 10.03', 'Wt 11.03', 'Śr 12.03', 'Czw 13.03', 'Pt 14.03', 'Sob 15.03', 'Ndz 16.03'];
const EMPLOYEES = [
  { name: 'Anna Nowak', role: 'Kierownik', shifts: [{d:0,h:'8-16'},{d:1,h:'8-16'},{d:2,h:'8-16'},{d:3,h:'8-16'},{d:4,h:'8-16'}] },
  { name: 'Piotr Wiśniewski', role: 'Kasjer', shifts: [{d:0,h:'8-16'},{d:1,h:'8-16'},{d:2,h:'8-16'},{d:4,h:'10-18'},{d:5,h:'9-15'}] },
  { name: 'Katarzyna Dąbrowska', role: 'Kier. sprzedaży', shifts: [{d:0,h:'9-17'},{d:2,h:'9-17'},{d:3,h:'9-17'},{d:4,h:'9-17'}] },
  { name: 'Maria Zielińska', role: 'Magazynier', shifts: [{d:0,h:'7-15'},{d:1,h:'7-15'},{d:2,h:'7-15'},{d:3,h:'7-15'},{d:4,h:'7-15'}] },
  { name: 'Tomasz Lewandowski', role: 'Kier. magazynu', shifts: [{d:0,h:'7-15'},{d:1,h:'7-15'},{d:3,h:'7-15'},{d:4,h:'7-15'},{d:5,h:'8-14'}] },
  { name: 'Andrzej Majewski', role: 'Sprzątacz', shifts: [{d:1,h:'6-14'},{d:2,h:'6-14'},{d:3,h:'6-14'},{d:5,h:'6-12'}] },
];

export default function SchedulePage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Grafik zmian</h1><p>Planowanie, wymiana zmian, kontrola norm</p></div>
        <div className="page-header-right">
          <button className="btn btn-secondary"><FiRefreshCw size={16} /> Wymiana zmian</button>
          <button className="btn btn-primary"><FiPlus size={16} /> Nowy grafik</button>
        </div>
      </div>
      <div className="schedule-grid">
        <div className="schedule-header">Pracownik</div>
        {DAYS.map(d => <div key={d} className="schedule-header">{d}</div>)}
        {EMPLOYEES.map((emp, i) => (
          <>
            <div key={`n-${i}`} className="schedule-cell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-tertiary)', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 600 }}>{emp.name}</div>
              <div className="text-xs text-muted">{emp.role}</div>
            </div>
            {DAYS.map((d, di) => {
              const shift = emp.shifts.find(s => s.d === di);
              return (
                <div key={`${i}-${di}`} className="schedule-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {shift ? (
                    <div style={{ padding: '4px 10px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-light)', fontWeight: 500 }}>
                      {shift.h}
                    </div>
                  ) : (
                    <span className="text-xs text-muted">wolne</span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
