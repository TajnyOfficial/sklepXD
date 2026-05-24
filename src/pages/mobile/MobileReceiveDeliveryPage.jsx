import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiArrowLeft, FiCheck, FiSearch, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function MobileReceiveDeliveryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSupabase, mobileSession } = useStore();
  const [delivery, setDelivery] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDelivery();
  }, [id, isSupabase]);

  async function fetchDelivery() {
    if (!isSupabase) return;
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setDelivery(data);
      // Jeśli dokument jest nowy, przepisujemy received_qty z expected_qty = 0
      const parsedItems = Array.isArray(data.items) ? data.items : [];
      setItems(parsedItems.map(item => ({
        ...item,
        received_qty: item.received_qty !== undefined ? item.received_qty : 0
      })));
    } catch (err) {
      toast.error('Błąd: ' + err.message);
      navigate('/deliveries');
    } finally {
      setLoading(false);
    }
  }

  function updateQty(idx, val) {
    const newItems = [...items];
    newItems[idx].received_qty = Number(val);
    setItems(newItems);
  }

  async function handleConfirm() {
    if (!isSupabase) return;
    setLoading(true);
    try {
      // Obliczamy różnice
      const hasDiscrepancy = items.some(i => Number(i.expected_qty) !== Number(i.received_qty));
      
      const { error } = await supabase
        .from('deliveries')
        .update({
          items: items,
          status: 'received',
          received_date: new Date().toISOString().split('T')[0],
          has_discrepancy: hasDiscrepancy,
          received_by: mobileSession?.mobileUser?.id || null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Dostawa odebrana');
      navigate('/deliveries');
    } catch (err) {
      toast.error('Błąd zapisu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !delivery) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Ładowanie szczegółów...</div>;
  }

  const filteredItems = items.filter(i => {
    const q = search.toLowerCase();
    return i.product_name?.toLowerCase().includes(q) || i.ean?.includes(q) || i.sku?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 12px', background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => navigate('/deliveries')} style={{ 
          background: 'transparent', border: 'none', color: 'var(--text-primary)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 
        }}>
          <FiArrowLeft size={24} />
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>PZ: {delivery.delivery_number}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{delivery.supplier?.name}</div>
        </div>
      </div>

      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Szukaj (Nazwa, EAN, SKU)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 12px 12px 36px', 
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', 
              borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem' 
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredItems.map((item, idx) => {
            const isMatch = Number(item.received_qty) === Number(item.expected_qty);
            const isOver = Number(item.received_qty) > Number(item.expected_qty);
            
            return (
              <div key={idx} style={{ 
                background: 'var(--bg-card)', padding: 12, borderRadius: 12, 
                border: `1px solid ${isMatch ? 'var(--success-border, #166534)' : isOver ? 'var(--danger-border, #991b1b)' : 'var(--border-light)'}` 
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{item.product_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  SKU: {item.sku || '-'} | EAN: {item.ean || '-'}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Oczekiwano: <strong style={{ color: 'var(--text-primary)' }}>{item.expected_qty}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Odebrano:</span>
                    <input 
                      type="number" 
                      value={item.received_qty}
                      onChange={e => updateQty(items.findIndex(i => i === item), e.target.value)}
                      style={{ 
                        width: 80, padding: '8px 12px', background: 'var(--bg-input)', 
                        border: '1px solid var(--border-primary)', borderRadius: 8, 
                        color: 'var(--text-heading)', fontWeight: 700, fontSize: '1rem',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ 
        padding: '16px 12px', background: 'var(--bg-card)', 
        borderTop: '1px solid var(--border-primary)',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
      }}>
        <button 
          onClick={handleConfirm}
          style={{ 
            width: '100%', padding: '16px', background: 'var(--success, #16a34a)', 
            border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, 
            fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 
          }}
        >
          <FiCheck size={20} /> Zatwierdź odbiór dostawy
        </button>
      </div>
    </div>
  );
}
