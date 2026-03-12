import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiDatabase, FiEdit, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

export default function StockOverviewPage() {
  const { products, categories, setProducts } = useStore();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [adjustNote, setAdjustNote] = useState('');

  function openAdjust(p) { setAdjustProduct(p); setAdjustQty(''); setAdjustType('add'); setAdjustNote(''); setShowAdjust(true); }
  function handleAdjust() {
    const qty = parseFloat(adjustQty);
    if (!qty || qty <= 0) { toast.error('Podaj poprawną ilość'); return; }
    const delta = adjustType === 'add' ? qty : -qty;
    setProducts(prev => prev.map(p => p.id === adjustProduct.id ? { ...p, stock_qty: Math.max(0, p.stock_qty + delta) } : p));
    toast.success(`Stan ${adjustProduct.name}: ${adjustType === 'add' ? '+' : '-'}${qty} ${adjustProduct.unit}`);
    setShowAdjust(false);
  }

  const totalValue = products.reduce((s, p) => s + p.sell_price * p.stock_qty, 0);
  const totalReserved = products.reduce((s, p) => s + (p.reserved_qty || 0), 0);
  const lowStockCount = products.filter(p => p.stock_qty <= p.min_stock && p.min_stock > 0).length;

  return (
    <div className="page animate-fadeIn">
      <div className="page-header"><div className="page-header-left"><h1>Stany magazynowe</h1><p>Real-time: stan całkowity, dostępny, zarezerwowany</p></div></div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><div className="stat-icon"><FiDatabase /></div><span className="stat-label">Pozycji łącznie</span><span className="stat-value">{products.length}</span></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><FiArrowUp /></div><span className="stat-label">Wartość magazynu</span><span className="stat-value">{formatCurrency(totalValue)}</span></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><FiArrowDown /></div><span className="stat-label">Niskie stany</span><span className="stat-value">{lowStockCount}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>SKU</th><th>Produkt</th><th>Stan całkowity</th><th>Dostępny</th><th>Zarezerwowany</th><th>Min.</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map(p => {
              const reserved = p.reserved_qty || Math.floor(p.stock_qty * 0.1);
              const available = p.stock_qty - reserved;
              const isLow = p.stock_qty <= p.min_stock && p.min_stock > 0;
              return (
                <tr key={p.id}>
                  <td className="font-mono text-sm">{p.sku}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontWeight: 600 }}>{p.stock_qty} {p.unit}</td>
                  <td style={{ color: 'var(--success)' }}>{available}</td>
                  <td style={{ color: reserved > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>🔒 {reserved}</td>
                  <td className="text-muted">{p.min_stock}</td>
                  <td><span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>{isLow ? 'Niski stan' : 'OK'}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openAdjust(p)} title="Koryguj stan"><FiEdit size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={`Korekta stanu — ${adjustProduct?.name}`} footer={<><button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleAdjust}>Zastosuj</button></>}>
        {adjustProduct && <div>
          <div className="flex-between mb-16" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-muted">Aktualny stan:</span><span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{adjustProduct.stock_qty} {adjustProduct.unit}</span></div>
          <div className="input-row mb-16">
            <div className="input-group"><label>Operacja</label><select className="select" value={adjustType} onChange={e => setAdjustType(e.target.value)}><option value="add">➕ Przyjęcie</option><option value="sub">➖ Wydanie / Korekta</option></select></div>
            <div className="input-group"><label>Ilość</label><input className="input" type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} autoFocus /></div>
          </div>
          <div className="input-group"><label>Notatka (powód)</label><input className="input" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="np. Korekta po inwentaryzacji" /></div>
        </div>}
      </Modal>
    </div>
  );
}
