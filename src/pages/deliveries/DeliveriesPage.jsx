import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiPlus, FiCheck, FiAlertTriangle, FiEye } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [
  { id: '1', number: 'PZ/2026/03/001', supplier: 'Hurtownia Śrub Polskie', status: 'received', expected: '2026-03-11', received_date: '2026-03-11', items: [{ name: 'Śruba M8x40', expected: 1000, received: 1000 }, { name: 'Wkręt 4x50 (200szt)', expected: 50, received: 48 }], has_discrepancy: true, note: 'Brak 2 opakowań wkrętów' },
  { id: '2', number: 'PZ/2026/03/002', supplier: 'Dekoral Dystrybucja', status: 'expected', expected: '2026-03-14', received_date: null, items: [{ name: 'Farba akrylowa biała 10L', expected: 30, received: null }, { name: 'Farba lateksowa szara 5L', expected: 20, received: null }], has_discrepancy: false },
  { id: '3', number: 'PZ/2026/03/003', supplier: 'Bosch Professional', status: 'checking', expected: '2026-03-12', received_date: '2026-03-12', items: [{ name: 'Wiertarka GSB 13RE', expected: 10, received: 10 }, { name: 'Szlifierka GA5030', expected: 5, received: 5 }], has_discrepancy: false },
];
const EMPTY = { supplier: '', expected: '', items: [{ name: '', expected: '', received: '' }] };

export default function DeliveriesPage() {
  const { suppliers } = useStore();
  const [deliveries, setDeliveries] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewDel, setViewDel] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', expected: '', received: '' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }

  function handleSave() {
    if (!form.supplier) { toast.error('Wybierz dostawcę'); return; }
    const del = { id: crypto.randomUUID(), number: `PZ/2026/03/${String(deliveries.length + 1).padStart(3, '0')}`, supplier: form.supplier, status: 'expected', expected: form.expected, received_date: null, items: form.items.filter(i => i.name).map(i => ({ name: i.name, expected: parseInt(i.expected) || 0, received: null })), has_discrepancy: false };
    setDeliveries(prev => [del, ...prev]);
    toast.success(`Dostawa ${del.number} dodana`);
    setShowModal(false); setForm(EMPTY);
  }

  function startChecking(id) { setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: 'checking' } : d)); toast.success('Rozpoczęto sprawdzanie dostawy'); }

  function confirmReceived(id) {
    setDeliveries(prev => prev.map(d => {
      if (d.id !== id) return d;
      const hasDisc = d.items.some(i => i.received !== null && i.received !== i.expected);
      return { ...d, status: 'received', received_date: new Date().toISOString().split('T')[0], has_discrepancy: hasDisc };
    }));
    toast.success('Dostawa potwierdzona');
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Dostawy (PZ)</h1><p>Przyjęcia magazynowe, protokoły rozbieżności</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowa dostawa</button>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">Oczekiwane</span><span className="stat-value text-warning">{deliveries.filter(d => d.status === 'expected').length}</span></div>
        <div className="stat-card"><span className="stat-label">W trakcie sprawdzania</span><span className="stat-value text-info">{deliveries.filter(d => d.status === 'checking').length}</span></div>
        <div className="stat-card"><span className="stat-label">Z rozbieżnościami</span><span className="stat-value text-danger">{deliveries.filter(d => d.has_discrepancy).length}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr PZ</th><th>Dostawca</th><th>Data oczekiwana</th><th>Pozycje</th><th>Rozbieżności</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{d.number}</td>
                <td>{d.supplier}</td>
                <td className="text-sm text-muted">{d.expected}</td>
                <td className="text-sm">{d.items.length} pozycji</td>
                <td>{d.has_discrepancy ? <span className="badge badge-danger"><FiAlertTriangle size={10} /> Tak</span> : <span className="badge badge-success">Brak</span>}</td>
                <td><span className={`badge ${d.status === 'received' ? 'badge-success' : d.status === 'checking' ? 'badge-info' : 'badge-warning'}`}>{d.status === 'received' ? 'Przyjęta' : d.status === 'checking' ? 'Sprawdzanie' : 'Oczekiwana'}</span></td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setViewDel(d); setShowView(true); }}><FiEye size={14} /></button>
                  {d.status === 'expected' && <button className="btn btn-primary btn-sm" onClick={() => startChecking(d.id)}>Przyjmij</button>}
                  {d.status === 'checking' && <button className="btn btn-success btn-sm" onClick={() => confirmReceived(d.id)}><FiCheck size={14} /> Potwierdź</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa dostawa (PZ)" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Utwórz</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Dostawca *</label><select className="select" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}><option value="">— Wybierz —</option>{suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div><div className="input-group"><label>Spodziewana data</label><input className="input" type="date" value={form.expected} onChange={e => setForm(p => ({ ...p, expected: e.target.value }))} /></div></div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Produkt</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość oczek.</label><input className="input" type="number" value={item.expected} onChange={e => updateItem(i, 'expected', e.target.value)} /></div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Dostawa ${viewDel?.number}`} size="modal-lg" footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}>
        {viewDel && (<div>
          <div className="grid-2 mb-16">{[['Dostawca', viewDel.supplier], ['Status', viewDel.status], ['Data oczek.', viewDel.expected], ['Data przyjęcia', viewDel.received_date || '—']].map(([l, v]) => <div key={l} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }} className="flex-between"><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>)}</div>
          <h4 className="mb-8">Pozycje:</h4>
          <table><thead><tr><th>Produkt</th><th>Oczekiwano</th><th>Przyjęto</th><th>Różnica</th></tr></thead>
            <tbody>{viewDel.items.map((it, i) => <tr key={i}><td>{it.name}</td><td>{it.expected}</td><td>{it.received ?? '—'}</td><td style={{ color: it.received !== null && it.received !== it.expected ? 'var(--danger)' : 'var(--text-muted)' }}>{it.received !== null ? it.received - it.expected : '—'}</td></tr>)}</tbody>
          </table>
          {viewDel.note && <div className="mt-8"><h4>Uwagi:</h4><p className="text-sm">{viewDel.note}</p></div>}
        </div>)}
      </Modal>
    </div>
  );
}
