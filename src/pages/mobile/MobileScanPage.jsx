import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';
import { FiSearch, FiPackage, FiMapPin, FiDollarSign, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/helpers';

export default function MobileScanPage() {
  const { findProductByBarcode, findProduct, updateProductStock, warehouseLocations, categories } = useStore();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [manualCode, setManualCode] = useState('');
  
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  function handleScan(code) {
    setShowScanner(false);
    searchProduct(code);
  }

  function searchProduct(code) {
    if (!code) return;
    const prod = findProductByBarcode(code) || findProduct(code)[0];
    if (prod) {
      setScannedProduct(prod);
      setAdjustQty('');
      setAdjustType('add');
      toast.success(`Znaleziono: ${prod.name}`);
      setManualCode('');
    } else {
      toast.error(`Nie znaleziono produktu dla kodu: ${code}`);
    }
  }

  async function handleAdjust() {
    const qty = parseFloat(adjustQty);
    if (!qty || qty <= 0) {
      toast.error('Podaj prawidłową ilość');
      return;
    }
    const delta = adjustType === 'add' ? qty : -qty;

    try {
      await updateProductStock(scannedProduct.id, delta);
      toast.success(`Zaktualizowano stan ${scannedProduct.name}`);
      setScannedProduct(null);
    } catch (err) {
      toast.error(`Błąd aktualizacji: ${err.message}`);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f172a', fontFamily: 'Inter, sans-serif', color: '#f8fafc' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Skaner Magazynowy</h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Wyszukaj produkt i skoryguj stan</p>
      </div>

      <div style={{ padding: '20px' }}>
        <button
          onClick={() => setShowScanner(true)}
          style={{
            width: '100%', padding: '24px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            border: 'none', borderRadius: 20,
            color: '#fff', fontWeight: 800, fontSize: '1.1rem',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: '0 10px 30px rgba(99,102,241,0.3)'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>📷</span>
          Otwórz aparat i skanuj kod EAN
        </button>

        <div style={{ textAlign: 'center', margin: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>LUB WPROWADŹ RĘCZNIE</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            placeholder="SKU lub kod kreskowy..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{
              flex: 1, padding: '14px 16px', background: '#1e293b', border: '1px solid #334155',
              borderRadius: 14, color: '#f8fafc', fontSize: '1rem', outline: 'none'
            }}
          />
          <button 
            onClick={() => searchProduct(manualCode)}
            style={{ padding: '0 20px', background: '#3b82f6', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700 }}
          >
            <FiSearch size={20} />
          </button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner 
          onConfirm={handleScan}
          onClose={() => setShowScanner(false)}
          title="Skanuj produkt"
        />
      )}

      {/* Widok produktu po zeskanowaniu */}
      {scannedProduct && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
          background: '#0f172a', zIndex: 1000, overflowY: 'auto',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Informacje o produkcie</h2>
            <button 
              onClick={() => setScannedProduct(null)}
              style={{ background: '#1e293b', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#f8fafc', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>

          <div style={{ padding: '24px 20px', flex: 1 }}>
            {/* Tytuł i SKU */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>{scannedProduct.name}</h3>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontFamily: 'monospace' }}>SKU: {scannedProduct.sku}</div>
            </div>

            {/* Główne informacje (Cena, Stan) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: 16, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6 }}>
                  <FiPackage size={14} /> Ilość w magazynie
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
                  {scannedProduct.stock_qty} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>{scannedProduct.unit}</span>
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '16px', borderRadius: 16, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6 }}>
                  <FiDollarSign size={14} /> Cena detaliczna
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                  {formatCurrency(scannedProduct.sell_price)}
                </div>
              </div>
            </div>

            {/* Opisy i lokalizacja */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: 16, border: '1px solid #334155', marginBottom: 24 }}>
              {(() => {
                const loc = warehouseLocations?.find(l => l.id === scannedProduct.location_id);
                const cat = categories?.find(c => c.id === scannedProduct.category_id);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ background: '#334155', padding: 8, borderRadius: 8, color: '#60a5fa' }}><FiMapPin size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 2 }}>Miejsce w magazynie</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                          {loc ? `Sektor ${loc.sector} ${loc.rack ? `- Regał ${loc.rack}` : ''} ${loc.shelf ? ` Półka ${loc.shelf}` : ''}` : 'Brak przypisanego miejsca'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 1, background: '#334155' }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ background: '#334155', padding: 8, borderRadius: 8, color: '#a78bfa' }}><FiTag size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 2 }}>Kategoria / Opis</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                          {cat ? cat.name : 'Brak kategorii'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Akcje / Korekta stanu */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: 16, border: '1px solid #334155', marginBottom: 24 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Szybka korekta stanu</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <button 
                  onClick={() => setAdjustType('add')}
                  style={{
                    padding: '14px', borderRadius: 12, border: `2px solid ${adjustType === 'add' ? '#10b981' : '#334155'}`,
                    background: adjustType === 'add' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: adjustType === 'add' ? '#10b981' : '#f8fafc', fontWeight: 600, fontSize: '0.95rem'
                  }}
                >➕ Przyjęcie</button>
                <button 
                  onClick={() => setAdjustType('sub')}
                  style={{
                    padding: '14px', borderRadius: 12, border: `2px solid ${adjustType === 'sub' ? '#ef4444' : '#334155'}`,
                    background: adjustType === 'sub' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    color: adjustType === 'sub' ? '#ef4444' : '#f8fafc', fontWeight: 600, fontSize: '0.95rem'
                  }}
                >➖ Wydanie</button>
              </div>

              <input 
                type="number" 
                inputMode="decimal"
                placeholder={`Ilość w ${scannedProduct.unit}...`}
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                style={{
                  width: '100%', padding: '16px', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: 12, color: '#f8fafc', fontSize: '1.2rem', textAlign: 'center', marginBottom: 16
                }}
              />

              <button 
                onClick={handleAdjust}
                style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}
              >Zatwierdź zmianę</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
