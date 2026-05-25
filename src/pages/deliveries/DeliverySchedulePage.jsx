import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiTruck, FiChevronLeft, FiChevronRight, FiPackage } from 'react-icons/fi';
import { startOfWeek, addWeeks, subWeeks, format, addDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

/* Harmonogram graficzny dostawców (stałe okna dostaw) nałożony na kalendarz tygodniowy - ułatwia planowanie pracy magazynierów */
export default function DeliverySchedulePage() {
  const { isSupabase } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [suppliers, setSuppliers] = useState([]);
  const [plannedDeliveries, setPlannedDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart.getTime()]);

  useEffect(() => {
    fetchScheduleData();
  }, [isSupabase, weekStart.getTime()]);

  async function fetchScheduleData() {
    if (!isSupabase) return;
    setLoading(true);
    try {
      // Pobieranie dostawców (stały harmonogram)
      const { data: supData, error: supErr } = await supabase
        .from('suppliers')
        .select('*');
      if (!supErr) setSuppliers(supData || []);

      // Pobieranie konkretnych dostaw zaplanowanych na ten tydzień
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      
      const { data: delData, error: delErr } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .gte('expected_date', startDate)
        .lte('expected_date', endDate);
      
      if (!delErr) setPlannedDeliveries(delData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Przetwarzanie stałego harmonogramu
  const scheduledSuppliers = suppliers.filter(s => {
    const ds = s.delivery_schedule;
    return ds && ds.days && Array.isArray(ds.days) && ds.days.length > 0;
  });

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Harmonogram dostaw</h1>
          <p>Kalendarz planowanych dostaw od dostawców (stałe i jednorazowe)</p>
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
          gridTemplateColumns: '220px repeat(7, 1fr)',
          borderCollapse: 'collapse'
        }}>
          {/* Header Row */}
          <div className="schedule-header-cell" style={{ padding: 16, background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)', borderRight: '1px solid var(--border-light)', fontWeight: 700, color: 'var(--text-muted)' }}>
            Dostawca / Status
          </div>
          {weekDays.map(day => (
            <div key={day.toString()} className="schedule-header-cell" style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)', borderRight: '1px solid var(--border-light)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {format(day, 'EEEE', { locale: pl })}
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {format(day, 'dd.MM')}
              </div>
            </div>
          ))}

          {/* Regular Schedule Rows */}
          {scheduledSuppliers.map((s, i) => (
            <Fragment key={`supplier-${s.id}`}>
              <div className="schedule-cell" style={{ padding: '12px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                {s.name} <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Stałe)</span>
              </div>
              {weekDays.map((day, di) => {
                const dayIndex = di + 1; // 1-7 (Pon-Ndz)
                const hasDelivery = s.delivery_schedule.days.includes(dayIndex);
                
                return (
                  <div key={`cell-${s.id}-${di}`} className="schedule-cell" style={{ padding: 8, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hasDelivery && (
                      <div style={{ padding: '4px 8px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiTruck size={12} /> {s.delivery_schedule.time || 'W ciągu dnia'}
                      </div>
                    )}
                  </div>
                );
              })}
              </Fragment>
          ))}

          {/* Planned Deliveries Rows */}
          {plannedDeliveries.map((del) => {
            const expDate = new Date(del.expected_date);
            return (
              <Fragment key={`delivery-${del.id}`}>
                <div className="schedule-cell" style={{ padding: '12px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{del.supplier?.name || 'Nieznany dostawca'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{del.delivery_number}</div>
                </div>
                {weekDays.map((day, di) => {
                  const isDeliveryDay = isSameDay(day, expDate);
                  return (
                    <div key={`del-cell-${del.id}-${di}`} className="schedule-cell" style={{ padding: 8, background: isDeliveryDay ? 'var(--primary-bg)' : 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isDeliveryDay && (
                        <div style={{ padding: '4px 8px', background: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <FiPackage size={12} /> {del.status === 'received' ? 'Odebrane' : 'Oczekiwana'}
                        </div>
                      )}
                    </div>
                  );
                })}
                </Fragment>
            );
          })}

          {scheduledSuppliers.length === 0 && plannedDeliveries.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Brak zaplanowanych dostaw na ten tydzień.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
