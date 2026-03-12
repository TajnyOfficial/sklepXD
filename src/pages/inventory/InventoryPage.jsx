import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiClipboard, FiPlay, FiCheck, FiPause } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const { products, categories } = useStore();
  const [inventories, setInventories] = useState([
    { id: '1', number: 'INW/2026/02/001', type: 'partial', scope: 'Elektronarzędzia', status: 'completed', blind: false, items: 8, count: 8, diff: -2, date: '2026-02-28' },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [form, setForm] = useState({ type: 'partial', scope: '', blind: false });
  const [activeInv, setActiveInv] = useState(null);
  const [counts, setCounts] = useState([]);

  function createInventory() {
    const inv = { id: crypto.randomUUID(), number: `INW/2026/03/${String(inventories.length + 1).padStart(3, '0')}`, type: form.type, scope: form.scope, status: 'in_progress', blind: form.blind, items: products.length, count: 0, diff: 0, date: new Date().toISOString().split('T')[0] };
    setInventories(prev => [inv, ...prev]);
    toast.success(`Inwentaryzacja ${inv.number} rozpoczęta`);
    setShowCreate(false);
    startCounting(inv);
  }

  function startCounting(inv) {
    setActiveInv(inv);
    setCounts(products.map(p => ({ product_id: p.id, name: p.name, sku: p.sku, system_qty: inv.blind ? null : p.stock_qty, counted_qty: '' })));
    setShowCount(true);
  }

  function updateCount(i, val) { setCounts(prev => prev.map((c, idx) => idx === i ? { ...c, counted_qty: val } : c)); }

  function completeInventory() {
    const counted = counts.filter(c => c.counted_qty !== '');
    if (counted.length === 0) { toast.error('Wprowadź co najmniej jeden wynik'); return; }
    const diffs = counted.reduce((sum, c) => sum + ((parseFloat(c.counted_qty) || 0) - (c.system_qty || 0)), 0);
    setInventories(prev => prev.map(inv => inv.id === activeInv.id ? { ...inv, status: 'completed', count: counted.length, diff: diffs } : inv));
    toast.success(`Inwentaryzacja zakończona — ${counted.length} pozycji przeliczonych`);
    setShowCount(false);
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Inwentaryzacja</h1><p>Spis z natury — tryb ślepy, częściowy, pełny</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlay size={16} /> Nowa inwentaryzacja</button>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">W trakcie</span><span className="stat-value text-warning">{inventories.filter(i => i.status === 'in_progress').length}</span></div>
        <div className="stat-card"><span className="stat-label">Zakończone</span><span className="stat-value text-success">{inventories.filter(i => i.status === 'completed').length}</span></div>
        <div className="stat-card"><span className="stat-label">Pozycji w katalogu</span><span className="stat-value">{products.length}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr inwentaryzacji</th><th>Typ</th><th>Zakres</th><th>Tryb</th><th>Przeliczono</th><th>Różnice</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {inventories.map(inv => (
              <tr key={inv.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{inv.number}</td>
                <td><span className="badge badge-ghost">{inv.type === 'full' ? 'Pełna' : inv.type === 'partial' ? 'Częściowa' : 'Cykliczna'}</span></td>
                <td className="text-sm">{inv.scope || 'Cały magazyn'}</td>
                <td>{inv.blind ? <span className="badge badge-warning">Ślepy</span> : <span className="badge badge-ghost">Normalny</span>}</td>
                <td>{inv.count}/{inv.items}</td>
                <td style={{ color: inv.diff !== 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{inv.diff > 0 ? `+${inv.diff}` : inv.diff}</td>
                <td><span className={`badge ${inv.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{inv.status === 'completed' ? 'Zakończona' : 'W trakcie'}</span></td>
                <td>{inv.status === 'in_progress' && <button className="btn btn-primary btn-sm" onClick={() => startCounting(inv)}>Kontynuuj</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nowa inwentaryzacja" footer={<><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Anuluj</button><button className="btn btn-primary" onClick={createInventory}>Rozpocznij</button></>}>
        <div className="input-group mb-16"><label>Typ</label><select className="select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option value="full">Pełna</option><option value="partial">Częściowa</option><option value="cyclic">Cykliczna</option></select></div>
        <div className="input-group mb-16"><label>Zakres (opis)</label><input className="input" value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} placeholder="np. Elektronarzędzia, Sektor A" /></div>
        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" id="blind-mode" checked={form.blind} onChange={e => setForm(p => ({ ...p, blind: e.target.checked }))} /><label htmlFor="blind-mode" style={{ margin: 0 }}>Tryb ślepy (bez widoku stanu systemowego)</label></div>
      </Modal>

      <Modal isOpen={showCount} onClose={() => setShowCount(false)} title={`Spis z natury — ${activeInv?.number}`} size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowCount(false)}>Przerwij</button><button className="btn btn-success" onClick={completeInventory}><FiCheck size={14} /> Zakończ i porównaj</button></>}>
        <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>SKU</th><th>Produkt</th>{!activeInv?.blind && <th>Stan syst.</th>}<th>Przeliczono</th>{!activeInv?.blind && <th>Różnica</th>}</tr></thead>
            <tbody>
              {counts.map((c, i) => {
                const diff = c.counted_qty !== '' ? (parseFloat(c.counted_qty) || 0) - (c.system_qty || 0) : null;
                return (
                  <tr key={i}>
                    <td className="font-mono text-sm">{c.sku}</td>
                    <td>{c.name}</td>
                    {!activeInv?.blind && <td className="text-muted">{c.system_qty}</td>}
                    <td><input className="input" type="number" value={c.counted_qty} onChange={e => updateCount(i, e.target.value)} style={{ width: 80 }} /></td>
                    {!activeInv?.blind && <td style={{ color: diff !== null && diff !== 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: diff !== null && diff !== 0 ? 600 : 400 }}>{diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
