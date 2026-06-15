import { useState, useMemo, Fragment } from 'react';
import { useStore } from '../../contexts/StoreContext';
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  isSameDay,
  parseISO,
  isToday
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  FiCalendar,
  FiPlus,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiTrash2,
  FiClock
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Graficzny kreator grafików (Harmonogram) oparty na kalendarzu tygodniowym: planowanie przypisanych zmian (od-do) dla każdego pracownika
export default function SchedulePage() {
  // Funkcje i zbiory danych dot. pracowników i ich wpisów w grafiku pobrane z globalnego stanu
  const { employees, schedules, saveSchedule, deleteSchedule } = useStore();

  // Stan zarządzający "wstęgą czasu" (aktualnie oglądany tydzień, na bazie biblioteki date-fns)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Week days array
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingDate, setEditingDate] = useState(null);

  // Form state
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');

  // Navigation handlers
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Modal handlers
  // Funkcja otwierająca okno modyfikacji pojedynczej komórki (dzień + pracownik). Rozpoznaje czy kliknięto w nową czy istniejącą zmianę
  const openShiftModal = (employee, date, shift = null) => {
    setEditingEmployee(employee);
    setEditingDate(date);
    if (shift) {
      setSelectedShift(shift);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
    } else {
      setSelectedShift(null);
      setStartTime('08:00');
      setEndTime('16:00');
    }
    setIsModalOpen(true);
  };

  // Złożenie pakietu danych o godzinach i dacie zmiany, po czym przesłanie go do bazy w celu zapisania zaplanowanego grafiku
  const handleSave = () => {
    const shiftData = {
      id: selectedShift?.id,
      profile_id: editingEmployee.id,
      date: format(editingDate, 'yyyy-MM-dd'),
      startTime,
      endTime
    };

    saveSchedule(shiftData);
    toast.success(selectedShift ? 'Zmiana zaktualizowana' : 'Zmiana dodana');
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (selectedShift) {
      deleteSchedule(selectedShift.id);
      toast.success('Zmiana usunięta');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Grafik zmian</h1>
          <p>Planowanie czasu pracy zespołu</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="btn-group" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevWeek} title="Poprzedni tydzień">
              <FiChevronLeft size={18} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={goToToday} style={{ fontWeight: 600, padding: '0 12px' }}>
              Dzisiaj
            </button>
            <button className="btn btn-ghost btn-sm" onClick={nextWeek} title="Następny tydzień">
              <FiChevronRight size={18} />
            </button>
          </div>
          <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
            {format(weekStart, 'd MMMM', { locale: pl })} — {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: pl })}
          </span>
        </div>
      </div>

      <div className="schedule-container card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="schedule-grid" style={{
          display: 'grid',
          gridTemplateColumns: '200px repeat(7, 1fr)',
          borderCollapse: 'collapse'
        }}>
          <div className="schedule-header-cell" style={{
            padding: 16,
            background: 'var(--bg-tertiary)',
            borderBottom: '2px solid var(--border-primary)',
            borderRight: '1px solid var(--border-light)',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em'
          }}>
            Pracownik
          </div>

          {weekDays.map(day => (
            <div key={day.toString()} className="schedule-header-cell" style={{
              padding: '12px 16px',
              background: isToday(day) ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
              borderBottom: '2px solid var(--border-primary)',
              borderRight: '1px solid var(--border-light)',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '0.75rem', color: isToday(day) ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                {format(day, 'EEEE', { locale: pl })}
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)' }}>
                {format(day, 'dd.MM')}
              </div>
              {isToday(day) && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'var(--accent)'
                }} />
              )}
            </div>
          ))}

          {employees.filter(e => e.active !== false && e.is_active !== false).map(emp => (
            <Fragment key={emp.id}>
              <div className="schedule-cell employee-cell" style={{
                padding: '12px 16px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-light)',
                borderRight: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.full_name || emp.name}</div>
                <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{emp.role}</div>
              </div>

              {weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const shift = schedules.find(s => s.profile_id === emp.id && s.date === dayStr);

                return (
                  <div
                    key={day.toString()}
                    className="schedule-cell day-cell"
                    style={{
                      padding: 8,
                      background: 'var(--bg-card)',
                      borderBottom: '1px solid var(--border-light)',
                      borderRight: '1px solid var(--border-light)',
                      minHeight: 80,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card)'}
                    onClick={() => openShiftModal(emp, day, shift)}
                  >
                    {shift ? (
                      <div style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--accent-bg)',
                        border: '1px solid var(--accent-border)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>
                    ) : (
                      <div className="add-shift-btn" style={{
                        opacity: 0,
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem'
                      }}>
                        <FiPlus /> Dodaj
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <style>{`
        .day-cell:hover .add-shift-btn { opacity: 1 !important; }
      `}</style>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>
                {selectedShift ? 'Edytuj zmianę' : 'Dodaj zmianę'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 600 }}>{editingEmployee?.full_name || editingEmployee?.name}</div>
                <div className="text-sm text-muted">
                  {format(editingDate, 'EEEE, d MMMM yyyy', { locale: pl })}
                </div>
              </div>

              <div className="grid-2" style={{ gap: 16 }}>
                <div className="input-group">
                  <label>Początek</label>
                  <div style={{ position: 'relative' }}>
                    <FiClock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="time"
                      className="input"
                      style={{ paddingLeft: 36 }}
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Koniec</label>
                  <div style={{ position: 'relative' }}>
                    <FiClock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="time"
                      className="input"
                      style={{ paddingLeft: 36 }}
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {selectedShift && (
                  <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
                    <FiTrash2 size={16} /> Usuń
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Anuluj</button>
                <button className="btn btn-primary" onClick={handleSave}>Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
