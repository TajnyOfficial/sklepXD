import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import { FiDatabase, FiEdit, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

// Podgląd stanu magazynu w czasie rzeczywistym, pozwalający na ręczne operacje "Przyjęcia" i "Wydania" (korekta stocku)
export default function StockOverviewPage() {
  // Dostęp do globalnej listy asortymentu i API do inwentaryzacji/korekt na bazie
  const { products, categories, stockMovements, recordStockMovement } = useStore();
  const { profile } = useAuth();
  
  // Stany odpowiadające za wyświetlanie i obsługę formularza korekty magazynowej dla wybranego SKU
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('in'); // 'in' (wniesienie) | 'out' (wyniesienie)
  const [adjustNote, setAdjustNote] = useState('');

  function openAdjust(p, type) {
    setAdjustProduct(p);
    setAdjustQty('');
    setAdjustType(type);
    setAdjustNote('');
    setShowAdjust(true);
  }

  // Zastosowanie poprawek (delta +/-) do wybranego produktu z zabezpieczeniem bazy danych przed zerwaniem transakcji
  async function handleAdjust() {
    const qty = parseFloat(adjustQty);
    if (!qty || qty <= 0) { toast.error('Podaj poprawną ilość'); return; }
    if (!adjustNote.trim()) { toast.error('Wpisanie komentarza (powodu) jest obowiązkowe!'); return; }
    
    // 'in' (wniesienie) zwiększa stan (+), 'out' (wyniesienie) zmniejsza stan (-)
    const delta = adjustType === 'in' ? qty : -qty;

    try {
      await recordStockMovement(adjustProduct.id, adjustType, delta, adjustNote);
      toast.success(`Zarejestrowano ${adjustType === 'in' ? 'wniesienie' : 'wyniesienie'}: ${qty} ${adjustProduct.unit}`);
      setShowAdjust(false);
    } catch (error) {
      console.error('Error updating stock in Supabase:', error);
      toast.error('Błąd podczas zapisywania do bazy danych. Spróbuj ponownie.');
    }
  }

  const totalValue = products.reduce((s, p) => s + (p.sell_price || 0) * p.stock_qty, 0);
  const lowStockCount = products.filter(p => p.stock_qty <= p.min_stock && p.min_stock > 0).length;

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stany magazynowe</h1>
          <p>Real-time: wnoszenie, wynoszenie oraz kontrola logów ruchu towarów</p>
        </div>
      </div>
      
      <div className="grid-3 mb-24">
        <div className="stat-card">
          <div className="stat-icon"><FiDatabase /></div>
          <span className="stat-label">Pozycji łącznie</span>
          <span className="stat-value">{products.length}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><FiArrowUp /></div>
          <span className="stat-label">Wartość magazynu</span>
          <span className="stat-value">{formatCurrency(totalValue)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><FiArrowDown /></div>
          <span className="stat-label">Niskie stany</span>
          <span className="stat-value">{lowStockCount}</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produkt</th>
              <th>Stan magazynowy</th>
              <th>Min.</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Akcje szybkie</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const isLow = p.stock_qty <= p.min_stock && p.min_stock > 0;
              return (
                <tr key={p.id}>
                  <td className="font-mono text-sm">{p.sku}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontWeight: 600 }}>{p.stock_qty} {p.unit}</td>
                  <td className="text-muted">{p.min_stock}</td>
                  <td>
                    <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                      {isLow ? 'Niski stan' : 'OK'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => openAdjust(p, 'in')} 
                        title="Wnieś towar"
                        style={{ 
                          background: 'var(--success-bg, rgba(22, 163, 74, 0.1))', 
                          color: 'var(--success, #16a34a)', 
                          border: 'none', 
                          padding: '6px 12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4, 
                          fontWeight: 600 
                        }}
                      >
                        <FiArrowUp size={14} /> Wnieś
                      </button>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => openAdjust(p, 'out')} 
                        title="Wynieś towar"
                        style={{ 
                          background: 'var(--danger-bg, rgba(220, 38, 38, 0.1))', 
                          color: 'var(--danger, #dc2626)', 
                          border: 'none', 
                          padding: '6px 12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4, 
                          fontWeight: 600 
                        }}
                      >
                        <FiArrowDown size={14} /> Wynieś
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      <Modal
        isOpen={showAdjust}
        onClose={() => setShowAdjust(false)}
        title={adjustType === 'in' ? `Wnoszenie towaru — ${adjustProduct?.name}` : `Wynoszenie towaru — ${adjustProduct?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Anuluj</button>
            <button 
              className="btn" 
              onClick={handleAdjust}
              style={{
                background: adjustType === 'in' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)',
                color: '#fff'
              }}
            >
              Zatwierdź
            </button>
          </>
        }
      >
        {adjustProduct && (
          <div>
            <div className="flex-between mb-16" style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <span className="text-muted">Aktualny stan w magazynie:</span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>{adjustProduct.stock_qty} {adjustProduct.unit}</span>
            </div>
            
            <div className="input-row mb-16">
              <div className="input-group">
                <label>Typ operacji</label>
                <input 
                  className="input" 
                  value={adjustType === 'in' ? '➕ Wnoszenie (Przyjęcie)' : '➖ Wynoszenie (Wydanie)'} 
                  disabled 
                  style={{ fontWeight: 600, color: adjustType === 'in' ? 'var(--success)' : 'var(--danger)', background: 'var(--bg-secondary)' }}
                />
              </div>
              <div className="input-group">
                <label>Ilość *</label>
                <input 
                  className="input" 
                  type="number" 
                  placeholder="0"
                  value={adjustQty} 
                  onChange={e => setAdjustQty(e.target.value)} 
                  autoFocus 
                />
              </div>
            </div>

            <div className="input-group mb-16">
              <label>Pracownik realizujący (Z sesji)</label>
              <input 
                className="input" 
                value={profile?.full_name || 'System'} 
                disabled 
                style={{ fontWeight: 500, background: 'var(--bg-secondary)' }}
              />
            </div>

            <div className="input-group">
              <label>Komentarz / Powód operacji *</label>
              <textarea 
                className="input" 
                rows="3"
                value={adjustNote} 
                onChange={e => setAdjustNote(e.target.value)} 
                placeholder="Napisz szczegółowo powód (np. Zwrot uszkodzonego opakowania do producenta, Korekta stanów z dnia...)" 
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
