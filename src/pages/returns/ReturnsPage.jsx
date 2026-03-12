import { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiRotateCcw, FiPlus, FiCheck, FiX, FiEye } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [
  { id: '1', number: 'ZW/2026/03/001', customer: 'Marek Zieliński', receipt: 'PAR-2026-002', items: [{name: 'Pędzel płaski 75mm Hardy', qty: 1}], total: 16.90, quarantine: 'shelf', status: 'pending', reason: 'Wada produktu — pędzel się rozsypuje', date: '2026-03-12' },
  { id: '2', number: 'ZW/2026/03/002', customer: 'Ewa Kamińska', receipt: 'PAR-2026-004', items: [{name: 'Panel podłogowy dąb naturalny', qty: 3}], total: 158.70, quarantine: 'shelf', status: 'completed', reason: 'Niezgodność wzoru z próbką', date: '2026-03-10' },
  { id: '3', number: 'ZW/2026/03/003', customer: 'Budmax Sp. z o.o.', receipt: 'FV/2026/03/001', items: [{name: 'Wiertarka Bosch GSB 13RE', qty: 1}], total: 459.00, quarantine: 'service', status: 'pending', reason: 'Usterka — nie włącza się po tygodniu', date: '2026-03-11' },
];
const EMPTY = { customer: '', receipt: '', items: [{ name: '', qty: '1' }], reason: '', quarantine: 'shelf' };

export default function ReturnsPage() {
  const [returns, setReturns] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }

  function handleSave() {
    if (!form.customer || !form.reason) { toast.error('Podaj klienta i powód zwrotu'); return; }
    const ret = { id: crypto.randomUUID(), number: `ZW/2026/03/${String(returns.length + 1).padStart(3, '0')}`, customer: form.customer, receipt: form.receipt, items: form.items.filter(i => i.name), total: 0, quarantine: form.quarantine, status: 'pending', reason: form.reason, date: new Date().toISOString().split('T')[0] };
    setReturns(prev => [ret, ...prev]);
    toast.success(`Zwrot ${ret.number} zarejestrowany`);
    setShowModal(false); setForm(EMPTY);
  }
  function approve(id) { setReturns(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r)); toast.success('Zwrot zatwierdzony — towar na półkę/serwis'); }
  function reject(id) { if (!confirm('Odrzucić zwrot?')) return; setReturns(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)); toast.success('Zwrot odrzucony'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Zwroty / RMA</h1><p>Rejestracja zwrotów, kwarantanna, serwis</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowy zwrot</button>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">Oczekujące</span><span className="stat-value text-warning">{returns.filter(r => r.status === 'pending').length}</span></div>
        <div className="stat-card"><span className="stat-label">Na półkę</span><span className="stat-value">{returns.filter(r => r.quarantine === 'shelf').length}</span></div>
        <div className="stat-card"><span className="stat-label">Do serwisu</span><span className="stat-value text-danger">{returns.filter(r => r.quarantine === 'service').length}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr zwrotu</th><th>Klient</th><th>Nr paragonu/FV</th><th>Pozycje</th><th>Kwarantanna</th><th>Powód</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {returns.map(r => (
              <tr key={r.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{r.number}</td>
                <td>{r.customer}</td><td className="text-sm text-muted">{r.receipt}</td>
                <td className="text-sm">{r.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                <td><span className={`badge ${r.quarantine === 'service' ? 'badge-danger' : 'badge-info'}`}>{r.quarantine === 'service' ? 'Serwis' : 'Na półkę'}</span></td>
                <td className="text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.status === 'completed' ? 'Zatwierdzony' : r.status === 'rejected' ? 'Odrzucony' : 'Oczekujący'}</span></td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setViewItem(r); setShowView(true); }}><FiEye size={14} /></button>
                  {r.status === 'pending' && <><button className="btn btn-success btn-sm" onClick={() => approve(r.id)}><FiCheck size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => reject(r.id)}><FiX size={14} /></button></>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowy zwrot / RMA" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Zarejestruj zwrot</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Klient *</label><input className="input" value={form.customer} onChange={F('customer')} /></div><div className="input-group"><label>Nr paragonu/FV</label><input className="input" value={form.receipt} onChange={F('receipt')} /></div></div>
        <div className="input-group mb-16"><label>Kwarantanna</label><select className="select" value={form.quarantine} onChange={F('quarantine')}><option value="shelf">Na półkę (towar OK)</option><option value="service">Do serwisu (wada)</option><option value="scrap">Na złom</option></select></div>
        <h4 className="mb-8">Zwracane produkty</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Produkt</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm mb-16" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
        <div className="input-group"><label>Powód zwrotu *</label><textarea className="input" rows={3} value={form.reason} onChange={F('reason')} placeholder="Opis przyczyny zwrotu..." style={{ resize: 'vertical' }} /></div>
      </Modal>

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Zwrot ${viewItem?.number}`} footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}>
        {viewItem && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Nr', viewItem.number], ['Klient', viewItem.customer], ['Paragon/FV', viewItem.receipt], ['Kwarantanna', viewItem.quarantine === 'service' ? 'Serwis' : viewItem.quarantine === 'scrap' ? 'Złom' : 'Półka'], ['Status', viewItem.status], ['Data', viewItem.date]].map(([l, v]) => <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>)}
          <h4 className="mt-8">Pozycje:</h4>
          {viewItem.items.map((it, i) => <div key={i} className="text-sm">• {it.name} × {it.qty}</div>)}
          <h4 className="mt-8">Powód:</h4><p className="text-sm">{viewItem.reason}</p>
        </div>}
      </Modal>
    </div>
  );
}
