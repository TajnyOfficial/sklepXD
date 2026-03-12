import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiFilter, FiCheck, FiX } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO_ORDERS = [
  { id: '1', number: 'ZAM-2026/001', customer: 'Budmax Sp. z o.o.', status: 'new', type: 'phone', total: 4560.00, items: [{name: 'Cement portlandzki 25kg', qty: 100}, {name: 'Klej do płytek 25kg', qty: 50}], deposit: 0, pickup: '2026-03-15', created: '2026-03-12' },
  { id: '2', number: 'ZAM-2026/002', customer: 'Marek Zieliński', status: 'ready', type: 'click_collect', total: 459.00, items: [{name: 'Wiertarka Bosch GSB 13RE', qty: 1}], deposit: 100, pickup: '2026-03-13', created: '2026-03-11' },
  { id: '3', number: 'ZAM-2026/003', customer: 'ElektroMont S.A.', status: 'picking', type: 'manual', total: 2312.00, items: [{name: 'Kabel YDYp 3x2.5', qty: 8}], deposit: 500, pickup: '2026-03-14', created: '2026-03-10' },
];
const STATUSES = { all: 'Wszystkie', new: 'Nowe', unpaid: 'Nieopłacone', picking: 'Kompletowanie', ready: 'Gotowe', issued: 'Wydane', partial: 'Częściowe', cancelled: 'Anulowane' };
const EMPTY = { customer: '', type: 'manual', items: [{ name: '', qty: '1' }], deposit: '0', pickup: '', note: '' };

export default function OrdersPage() {
  const { products } = useStore();
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const filtered = orders.filter(o => (statusFilter === 'all' || o.status === statusFilter) && (!search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.number.includes(search)));

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }

  function handleSave() {
    if (!form.customer) { toast.error('Podaj klienta'); return; }
    const validItems = form.items.filter(i => i.name);
    if (validItems.length === 0) { toast.error('Dodaj pozycje'); return; }
    const order = { id: crypto.randomUUID(), number: `ZAM-2026/${String(orders.length + 1).padStart(3, '0')}`, customer: form.customer, status: 'new', type: form.type, total: 0, items: validItems.map(i => ({ name: i.name, qty: parseInt(i.qty) })), deposit: parseFloat(form.deposit) || 0, pickup: form.pickup, created: new Date().toISOString().split('T')[0] };
    setOrders(prev => [order, ...prev]);
    toast.success(`Zamówienie ${order.number} utworzone`);
    setShowModal(false); setForm(EMPTY);
  }

  function changeStatus(id, newStatus) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o)); toast.success(`Status zmieniony na: ${STATUSES[newStatus]}`); }
  function cancelOrder(id) { if (!confirm('Anulować zamówienie?')) return; changeStatus(id, 'cancelled'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Zamówienia</h1><p>Logistyka zamówień, statusy, Click&Collect</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowe zamówienie</button>
      </div>
      <div className="page-tabs">{Object.entries(STATUSES).map(([k, v]) => <button key={k} className={`page-tab ${statusFilter === k ? 'active' : ''}`} onClick={() => setStatusFilter(k)}>{v} {k !== 'all' && <span className="text-xs">({orders.filter(o => o.status === k).length})</span>}</button>)}</div>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}><FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input className="input" placeholder="Szukaj po kliencie lub numerze..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr zamówienia</th><th>Klient</th><th>Typ</th><th>Pozycje</th><th>Zaliczka</th><th>Odbiór</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{o.number}</td>
                <td style={{ fontWeight: 500 }}>{o.customer}</td>
                <td><span className="badge badge-ghost">{o.type === 'click_collect' ? 'Click&Collect' : o.type === 'phone' ? 'Telefoniczne' : 'Ręczne'}</span></td>
                <td className="text-sm">{o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                <td>{o.deposit > 0 ? formatCurrency(o.deposit) : '—'}</td>
                <td className="text-sm text-muted">{o.pickup || '—'}</td>
                <td><span className={`badge ${o.status === 'ready' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : o.status === 'new' ? 'badge-info' : 'badge-warning'}`}>{STATUSES[o.status]}</span></td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setViewOrder(o); setShowView(true); }}><FiEye size={14} /></button>
                  {o.status === 'new' && <button className="btn btn-ghost btn-sm" onClick={() => changeStatus(o.id, 'picking')}>Kompletuj</button>}
                  {o.status === 'picking' && <button className="btn btn-success btn-sm" onClick={() => changeStatus(o.id, 'ready')}><FiCheck size={14} /> Gotowe</button>}
                  {o.status === 'ready' && <button className="btn btn-primary btn-sm" onClick={() => changeStatus(o.id, 'issued')}>Wydaj</button>}
                  {!['issued', 'cancelled'].includes(o.status) && <button className="btn btn-ghost btn-sm" onClick={() => cancelOrder(o.id)}><FiX size={14} /></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowe zamówienie" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Utwórz</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Klient *</label><input className="input" value={form.customer} onChange={F('customer')} /></div><div className="input-group"><label>Typ</label><select className="select" value={form.type} onChange={F('type')}><option value="manual">Ręczne</option><option value="phone">Telefoniczne</option><option value="click_collect">Click&Collect</option></select></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Zaliczka</label><input className="input" type="number" value={form.deposit} onChange={F('deposit')} /></div><div className="input-group"><label>Data odbioru</label><input className="input" type="date" value={form.pickup} onChange={F('pickup')} /></div></div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Produkt</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} list="prod-list" /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
          </div>
        ))}
        <datalist id="prod-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Zamówienie ${viewOrder?.number}`} footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}>
        {viewOrder && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Nr', viewOrder.number], ['Klient', viewOrder.customer], ['Typ', viewOrder.type], ['Status', STATUSES[viewOrder.status]], ['Zaliczka', formatCurrency(viewOrder.deposit || 0)], ['Odbiór', viewOrder.pickup || '—'], ['Data', viewOrder.created]].map(([l, v]) => <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>)}
          <h4 className="mt-8">Pozycje:</h4>
          {viewOrder.items.map((it, i) => <div key={i} className="text-sm" style={{ padding: '4px 0' }}>• {it.name} × {it.qty}</div>)}
        </div>}
      </Modal>
    </div>
  );
}
