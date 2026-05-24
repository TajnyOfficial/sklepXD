import { useState, useMemo } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiSearch, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function MobileStockPage() {
  const { products, warehouseLocations, updateProductStock } = useStore();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 50);
    const q = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.barcodes && p.barcodes.some(b => b.includes(q)))
    ).slice(0, 50);
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
    <div style={{ minHeight: '100dvh', background: '#0f172a', fontFamily: 'Inter, sans-serif', color: '#f8fafc', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Stany Magazynowe</h2>
        <div style={{ position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
          <input 
            type="text"
            placeholder="Szukaj (Nazwa, SKU, EAN)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 16px 12px 40px', 
              background: '#1e293b', border: '1px solid #334155', borderRadius: 12, 
              color: '#f8fafc', fontSize: '0.95rem', outline: 'none' 
            }}
          />
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding: '16px' }}>
        {filteredProducts.map(p => {
          const loc = warehouseLocations?.find(l => l.id === p.location_id);
          const isLow = p.stock_qty <= p.min_stock;

          return (
            <div 
              key={p.id} 
              onClick={() => { setSelectedProduct(p); setAdjustQty(''); setAdjustType('add'); }}
              style={{
                background: '#1e293b', borderRadius: 16, padding: '16px', marginBottom: 12,
                border: `1px solid ${isLow ? '#7f1d1d' : '#334155'}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, 
                background: isLow ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isLow ? '#ef4444' : '#6366f1'
              }}>
                <FiPackage size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span style={{ fontFamily: 'monospace' }}>{p.sku}</span>
                  {loc && <span>• LOK: {loc.sector}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isLow ? '#ef4444' : '#f8fafc' }}>
                  {p.stock_qty} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{p.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px' }}>
            Brak wyników wyszukiwania
          </div>
        )}
      </div>

      {/* Bottom Sheet Modal do edycji */}
      {selectedProduct && (
        <>
          <div 
            onClick={() => setSelectedProduct(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} 
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, 
            background: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
            padding: '24px', zIndex: 1000, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            borderTop: '1px solid #334155'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Korekta stanu</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 20 }}>{selectedProduct.name}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '16px', borderRadius: 12, marginBottom: 20 }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Aktualny stan:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>{selectedProduct.stock_qty} {selectedProduct.unit}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button 
                onClick={() => setAdjustType('add')}
                style={{
                  padding: '12px', borderRadius: 12, border: `2px solid ${adjustType === 'add' ? '#10b981' : '#334155'}`,
                  background: adjustType === 'add' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: adjustType === 'add' ? '#10b981' : '#f8fafc', fontWeight: 600, fontSize: '0.9rem'
                }}
              >➕ Przyjęcie</button>
              <button 
                onClick={() => setAdjustType('sub')}
                style={{
                  padding: '12px', borderRadius: 12, border: `2px solid ${adjustType === 'sub' ? '#ef4444' : '#334155'}`,
                  background: adjustType === 'sub' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: adjustType === 'sub' ? '#ef4444' : '#f8fafc', fontWeight: 600, fontSize: '0.9rem'
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
                width: '100%', padding: '16px', background: '#0f172a', border: '1px solid #334155',
                borderRadius: 12, color: '#f8fafc', fontSize: '1.2rem', textAlign: 'center', marginBottom: 20
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setSelectedProduct(null)}
                style={{ flex: 1, padding: '16px', borderRadius: 12, border: 'none', background: '#334155', color: '#f8fafc', fontWeight: 700 }}
              >Anuluj</button>
              <button 
                onClick={handleAdjust}
                style={{ flex: 2, padding: '16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700 }}
              >Zatwierdź zmianę</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
