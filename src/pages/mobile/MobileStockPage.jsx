import { useState, useMemo } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiSearch, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';

// Przeglądarka stanów magazynowych na urządzeniach przenośnych. Wyświetla produkty z uwzględnieniem minimalnych zapasów oraz ich fizycznych lokalizacji na regałach
export default function MobileStockPage() {
  const { products, warehouseLocations, updateProductStock } = useStore();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 50);
    const q = search.toLowerCase();
    return products.filter(p => {
      const nameMatch = p.name ? p.name.toLowerCase().includes(q) : false;
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
      const barcodeMatch = p.barcodes && Array.isArray(p.barcodes) ? p.barcodes.some(b => b && String(b).toLowerCase().includes(q)) : false;
      return nameMatch || skuMatch || barcodeMatch;
    }).slice(0, 50);
  }, [products, search]);

  async function handleAdjust() {
    const qty = parseFloat(adjustQty);
    if (!qty || qty <= 0) {
      toast.error('Podaj prawidłową ilość');
      return;
    }
    const delta = adjustType === 'add' ? qty : -qty;

    try {
      await updateProductStock(selectedProduct.id, delta);
      toast.success(`Zaktualizowano stan ${selectedProduct.name}`);
      setSelectedProduct(null);
      setAdjustQty('');
    } catch (err) {
      toast.error(`Błąd aktualizacji: ${err.message}`);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', color: 'var(--text-heading)', paddingBottom: 80 }}>
      <MobileHeader title="Sklep Mobile" subtitle="Stany Magazynowe" />
      
      <div style={{ padding: '20px' }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="text"
            placeholder="Szukaj (Nazwa, SKU, EAN)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '14px 16px 14px 44px', 
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 14, 
              color: 'var(--text-heading)', fontSize: '1rem', outline: 'none' 
            }}
          />
        </div>
        {filteredProducts.map(p => {
          const loc = warehouseLocations?.find(l => l.id === p.location_id);
          const isLow = p.stock_qty <= p.min_stock;

          return (
            <div 
              key={p.id} 
              onClick={() => { setSelectedProduct(p); setAdjustQty(''); setAdjustType('add'); }}
              style={{
                background: 'var(--bg-card)', borderRadius: 16, padding: '16px', marginBottom: 12,
                border: `1px solid ${isLow ? '#7f1d1d' : 'var(--border-primary)'}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, 
                background: isLow ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isLow ? 'var(--danger)' : 'var(--accent)'
              }}>
                <FiPackage size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{p.sku}</span>
                  {loc && <span>• LOK: {loc.sector}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text-heading)' }}>
                  {p.stock_qty} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{p.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
            Brak wyników wyszukiwania
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          <div 
            onClick={() => setSelectedProduct(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} 
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, 
            background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
            padding: '24px', zIndex: 1000, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            borderTop: '1px solid var(--border-primary)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Korekta stanu</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>{selectedProduct.name}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '16px', borderRadius: 12, marginBottom: 20 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aktualny stan:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>{selectedProduct.stock_qty} {selectedProduct.unit}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button 
                onClick={() => setAdjustType('add')}
                style={{
                  padding: '12px', borderRadius: 12, border: `2px solid ${adjustType === 'add' ? 'var(--success)' : 'var(--border-primary)'}`,
                  background: adjustType === 'add' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: adjustType === 'add' ? 'var(--success)' : 'var(--text-heading)', fontWeight: 600, fontSize: '0.9rem'
                }}
              >➕ Przyjęcie</button>
              <button 
                onClick={() => setAdjustType('sub')}
                style={{
                  padding: '12px', borderRadius: 12, border: `2px solid ${adjustType === 'sub' ? 'var(--danger)' : 'var(--border-primary)'}`,
                  background: adjustType === 'sub' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: adjustType === 'sub' ? 'var(--danger)' : 'var(--text-heading)', fontWeight: 600, fontSize: '0.9rem'
                }}
              >➖ Wydanie</button>
            </div>

            <input 
              type="number" 
              inputMode="decimal"
              placeholder="Ilość..."
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              style={{
                width: '100%', padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                borderRadius: 12, color: 'var(--text-heading)', fontSize: '1.2rem', textAlign: 'center', marginBottom: 20
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setSelectedProduct(null)}
                style={{ flex: 1, padding: '16px', borderRadius: 12, border: 'none', background: 'var(--border-primary)', color: 'var(--text-heading)', fontWeight: 700 }}
              >Anuluj</button>
              <button 
                onClick={handleAdjust}
                style={{ flex: 2, padding: '16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: '#fff', fontWeight: 700 }}
              >Zatwierdź zmianę</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
