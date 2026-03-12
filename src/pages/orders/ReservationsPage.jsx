import { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiBookmark, FiPlus, FiCheck, FiTrash2, FiEye } from 'react-icons/fi';
import { useStore } from '../../contexts/StoreContext';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [
  { id: '1', customer: 'Marek Zieliński', items: [{name: 'Wiertarka Bosch GSB 13RE', qty: 1}], deposit: 100, total: 459.00, expires: '2026-03-15', status: 'active' },
  { id: '2', customer: 'Budmax Sp. z o.o.', items: [{name: 'Cement 25kg', qty: 50}, {name: 'Klej Ceresit 25kg', qty: 30}], deposit: 500, total: 2696.50, expires: '2026-03-14', status: 'active' },
  { id: '3', customer: 'Ewa Kamińska', items: [{name: 'Deska podłogowa dębowa 1m²', qty: 10}], deposit: 0, total: 1499.00, expires: '2026-03-13', status: 'expired' },
];
const EMPTY = { customer: '', items: [{ name: '', qty: '1' }], deposit: '0', expires: '' };

export default function ReservationsPage() {
  const { products } = useStore();
  const [reservations, setReservations] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }

  function handleSave() {
    if (!form.customer) { toast.error('Podaj klienta'); return; }
    const validItems = form.items.filter(i => i.name);
    if (validItems.length === 0) { toast.error('Dodaj produkty'); return; }
    const res = { id: crypto.randomUUID(), customer: form.customer, items: validItems.map(i => ({ name: i.name, qty: parseInt(i.qty) || 1 })), deposit: parseFloat(form.deposit) || 0, total: 0, expires: form.expires, status: 'active' };
    setReservations(prev => [res, ...prev]);
    toast.success('Rezerwacja utworzona');
    setShowModal(false); setForm(EMPTY);
  }
  function complete(id) { setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r)); toast.success('Rezerwacja zrealizowana — towar wydany'); }
  function cancel(id) { if (!confirm('Anulować rezerwację?')) return; setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r)); toast.success('Rezerwacja anulowana'); }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Rezerwacje towaru</h1><p>Blokady stanu, zaliczki, terminy odbioru</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowa rezerwacja</button>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">Aktywne rezerwacje</span><span className="stat-value">{reservations.filter(r => r.status === 'active').length}</span></div>
        <div className="stat-card"><span className="stat-label">Złożone zaliczki</span><span className="stat-value">{formatCurrency(reservations.filter(r => r.status === 'active').reduce((s, r) => s + r.deposit, 0))}</span></div>
        <div className="stat-card"><span className="stat-label">Wygasłe</span><span className="stat-value text-danger">{reservations.filter(r => r.status === 'expired').length}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Klient</th><th>Produkty</th><th>Zaliczka</th><th>Wartość</th><th>Termin odbioru</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reservations.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.customer}</td>
                <td className="text-sm">{r.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                <td>{r.deposit > 0 ? formatCurrency(r.deposit) : '—'}</td>
                <td style={{ fontWeight: 600 }}>{r.total > 0 ? formatCurrency(r.total) : '—'}</td>
                <td className="text-sm text-muted">{r.expires || '—'}</td>
                <td><span className={`badge ${r.status === 'active' ? 'badge-success' : r.status === 'expired' ? 'badge-danger' : r.status === 'completed' ? 'badge-info' : 'badge-ghost'}`}>{r.status === 'active' ? 'Aktywna' : r.status === 'expired' ? 'Wygasła' : r.status === 'completed' ? 'Zrealizowana' : 'Anulowana'}</span></td>
                <td>{r.status === 'active' && <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-success btn-sm" onClick={() => complete(r.id)}><FiCheck size={14} /> Wydaj</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => cancel(r.id)}>Anuluj</button>
                </div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa rezerwacja" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Zarezerwuj</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Klient *</label><input className="input" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} /></div><div className="input-group"><label>Termin odbioru</label><input className="input" type="date" value={form.expires} onChange={e => setForm(p => ({ ...p, expires: e.target.value }))} /></div></div>
        <div className="input-group mb-16"><label>Zaliczka (zł)</label><input className="input" type="number" value={form.deposit} onChange={e => setForm(p => ({ ...p, deposit: e.target.value }))} /></div>
        <h4 className="mb-8">Produkty</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Produkt</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} list="res-prod-list" /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
          </div>
        ))}
        <datalist id="res-prod-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj produkt</button>
      </Modal>
    </div>
  );
}
