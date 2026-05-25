import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiPlus, FiCheck, FiAlertTriangle, FiEye } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { supplier_id: '', expected_date: '', items: [{ product_name: '', expected_qty: '', received_qty: null }], assigned_users: [] };

/* Rejestr Dostaw (PZ) - przyjmowanie towaru od dostawców. Integruje się z Supabase i pozwala na wychwytywanie "rozbieżności" ilościowych */
export default function DeliveriesPage() {
  const { suppliers, employees, isSupabase } = useStore();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewDel, setViewDel] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    fetchDeliveries();
  }, [isSupabase]);

  async function fetchDeliveries() {
    if (!isSupabase) return;
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (err) {
      toast.error('Błąd: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { product_name: '', expected_qty: '', received_qty: null }] }));
  }

  function updateItem(i, f, v) {
    setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }));
  }

  async function handleSave() {
    if (!form.supplier_id) { toast.error('Wybierz dostawcę'); return; }

    try {
      const { data, error } = await supabase.from('deliveries').insert({
        delivery_number: `PZ/2026/05/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        supplier_id: form.supplier_id,
        status: 'expected',
        expected_date: form.expected_date || null,
        items: form.items.filter(i => i.product_name).map(i => ({
          product_name: i.product_name,
          expected_qty: parseInt(i.expected_qty) || 0,
          received_qty: null
        })),
        assigned_users: form.assigned_users || []
      }).select().single();

      if (error) throw error;
      toast.success(`Dostawa dodana`);
      setShowModal(false);
      setForm(EMPTY);
      fetchDeliveries();
    } catch (err) {
      toast.error('Błąd: ' + err.message);
    }
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

      {loading ? (
        <div className="text-center p-20 text-muted">Ładowanie dostaw...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nr PZ</th><th>Dostawca</th><th>Data oczekiwana</th><th>Pozycje</th><th>Rozbieżności</th><th>Status</th><th>Akcje</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{d.delivery_number}</td>
                  <td>{d.supplier?.name || 'Nieznany'}</td>
                  <td className="text-sm text-muted">{d.expected_date || '-'}</td>
                  <td className="text-sm">{Array.isArray(d.items) ? d.items.length : 0} pozycji</td>
                  <td>{d.has_discrepancy ? <span className="badge badge-danger"><FiAlertTriangle size={10} /> Tak</span> : <span className="badge badge-success">Brak</span>}</td>
                  <td>
                    <span className={`badge ${d.status === 'received' ? 'badge-success' : d.status === 'checking' ? 'badge-info' : 'badge-warning'}`}>
                      {d.status === 'received' ? 'Przyjęta' : d.status === 'checking' ? 'Sprawdzanie' : 'Oczekiwana'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setViewDel(d); setShowView(true); }}><FiEye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan="7" className="text-center text-muted p-20">Brak dostaw w systemie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa dostawa (PZ)" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Utwórz</button></>}>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Dostawca *</label>
            <select className="select" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">— Wybierz —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Spodziewana data</label>
            <input className="input" type="date" value={form.expected_date} onChange={e => setForm(p => ({ ...p, expected_date: e.target.value }))} />
          </div>
        </div>
        <div className="input-group mb-16">
          <label>Przypisz magazynierów</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            {employees.filter(e => e.active).map(e => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.assigned_users.includes(e.id)}
                  onChange={(ev) => {
                    const checked = ev.target.checked;
                    setForm(p => ({
                      ...p,
                      assigned_users: checked ? [...p.assigned_users, e.id] : p.assigned_users.filter(id => id !== e.id)
                    }));
                  }}
                />
                {e.name} ({e.role})
              </label>
            ))}
          </div>
        </div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}>
              <label>Produkt</label>
              <input className="input" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Ilość oczek.</label>
              <input className="input" type="number" value={item.expected_qty} onChange={e => updateItem(i, 'expected_qty', e.target.value)} />
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Dostawa ${viewDel?.delivery_number}`} size="modal-lg" footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}>
        {viewDel && (<div>
          <div className="grid-2 mb-16">
            {[
              ['Dostawca', viewDel.supplier?.name],
              ['Status', viewDel.status],
              ['Data oczekiwana', viewDel.expected_date],
              ['Data przyjęcia', viewDel.received_date || '—']
            ].map(([l, v]) => (
              <div key={l} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }} className="flex-between">
                <span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <h4 className="mb-8">Pozycje:</h4>
          <table>
            <thead><tr><th>Produkt</th><th>Oczekiwano</th><th>Przyjęto</th><th>Różnica</th></tr></thead>
            <tbody>
              {Array.isArray(viewDel.items) && viewDel.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.product_name}</td>
                  <td>{it.expected_qty}</td>
                  <td>{it.received_qty ?? '—'}</td>
                  <td style={{ color: it.received_qty !== null && Number(it.received_qty) !== Number(it.expected_qty) ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {it.received_qty !== null ? Number(it.received_qty) - Number(it.expected_qty) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {viewDel.discrepancy_note && <div className="mt-8"><h4>Uwagi z odbioru:</h4><p className="text-sm text-danger">{viewDel.discrepancy_note}</p></div>}
        </div>)}
      </Modal>
    </div>
  );
}
