import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiTruck, FiChevronRight, FiClock, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';

/* Widok listy dostaw oczekujących i odebranych dla aplikacji mobilnej. Wykorzystuje Supabase do odczytu danych w czasie rzeczywistym */
export default function MobileDeliveriesPage() {
  const navigate = useNavigate();
  const { isSupabase } = useStore();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, [isSupabase]);

  async function fetchDeliveries() {
    if (!isSupabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .order('expected_date', { ascending: false });
      
      if (error) throw error;
      setDeliveries(data || []);
    } catch (err) {
      toast.error('Błąd: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Ładowanie dostaw...</div>;
  }

  const expected = deliveries.filter(d => d.status === 'expected');
  const received = deliveries.filter(d => d.status === 'received');

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', color: 'var(--text-heading)', paddingBottom: 80 }}>
      <MobileHeader title="Sklep Mobile" subtitle="Dostawy (PZ)" />
      
      <div style={{ padding: '20px' }}>

      <div style={{ marginBottom: 12, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Oczekujące</div>
      {expected.length === 0 ? (
        <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Brak oczekujących dostaw
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {expected.map(d => (
            <div 
              key={d.id} 
              onClick={() => navigate(`/deliveries/${d.id}`)}
              style={{ 
                background: 'var(--bg-card)', padding: 16, borderRadius: 12, 
                border: '1px solid var(--border-light)', display: 'flex', 
                alignItems: 'center', justifyContent: 'space-between' 
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{d.supplier?.name || 'Nieznany'}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiTruck /> {d.delivery_number}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiClock /> {d.expected_date}</span>
                </div>
              </div>
              <FiChevronRight size={20} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 12, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ostatnio odebrane</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {received.slice(0, 5).map(d => (
          <div 
            key={d.id} 
            style={{ 
              background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12, 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              opacity: 0.8
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.supplier?.name || 'Nieznany'}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{d.delivery_number}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
              <FiCheckCircle /> Odebrane
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
