import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiShuffle, FiPlus, FiCheck, FiClock } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [];

// Rejestr Przesunięć Międzymagazynowych (MM) śledzący transport wewnętrzny pomiędzy różnymi lokalizacjami w sklepie
export default function TransfersPage() {
  // Odczyt struktury magazynowej w celu zasilenia listy wyboru lokalizacji 'od' i 'do'
  const { products, warehouseLocations } = useStore();
  
  // Tymczasowy lokalny stan dla dokumentów MM (docelowo powinien być zastąpiony tabelą Supabase tak jak Orders)
  const [transfers, setTransfers] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', items: [{ product_name: '', qty: '' }], note: '' });

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { product_name: '', qty: '' }] })); }
  function removeItem(i) { setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); }
  function updateItem(i, field, val) { setForm(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) })); }

  // Wygenerowanie i dodanie nowego dokumentu MM z poprawnym przeliczeniem statusu i weryfikacją pozycji dodanych przez użytkownika
  function handleSave() {
    if (!form.from || !form.to) { toast.error('Podaj lokalizację źródłową i docelową'); return; }
    if (form.from === form.to) { toast.error('Lokalizacja docelowa musi być inna niż źródłowa'); return; }
    const validItems = form.items.filter(i => i.product_name && i.qty);
    if (validItems.length === 0) { toast.error('Dodaj co najmniej jedną pozycję'); return; }
    const tr = {
      id: crypto.randomUUID(),
      number: `MM/2026/03/${String(transfers.length + 1).padStart(3, '0')}`,
      from: form.from,
      to: form.to,
      status: 'in_transit',
      items: validItems.map(i => ({ name: i.product_name, qty: parseInt(i.qty) })),
      date: new Date().toISOString().split('T')[0],
      created_by: 'Bieżący użytkownik'
    };
    setTransfers(prev => [tr, ...prev]);
    toast.success('Przesunięcie MM utworzone');
    setShowModal(false);
    setForm({ from: '', to: '', items: [{ product_name: '', qty: '' }], note: '' });
  }

  function completeTransfer(id) {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    toast.success('Przesunięcie zakończone');
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Przesunięcia MM</h1><p>Przesunięcia międzymagazynowe</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus size={16} /> Nowe przesunięcie</button>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr dokumentu</th><th>Z lokalizacji</th><th>Do lokalizacji</th><th>Pozycje</th><th>Data</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{t.number}</td>
                <td>{t.from}</td>
                <td>{t.to}</td>
                <td className="text-sm">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {t.items.map((i, idx) => (
                      <div key={idx}>• {i.name} ({i.qty} szt.)</div>
                    ))}
                  </div>
                </td>
                <td className="text-sm text-muted">{t.date}</td>
                <td><span className={`badge ${t.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{t.status === 'completed' ? 'Zakończone' : 'W transporcie'}</span></td>
                <td>{t.status !== 'completed' && <button className="btn btn-success btn-sm" onClick={() => completeTransfer(t.id)}><FiCheck size={14} /> Potwierdź</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowe przesunięcie MM" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Utwórz</button></>}>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Z lokalizacji *</label>
            <select className="select" value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))}>
              <option value="">— Wybierz lokalizację źródłową —</option>
              {warehouseLocations.map(l => {
                const locText = `Sektor ${l.sector} - ${l.description || 'Bez opisu'} (Regał ${l.rack || '—'}, Półka ${l.shelf || '—'})`;
                const dbValue = `Sektor ${l.sector}${l.rack ? `, Regał ${l.rack}` : ''}`;
                return <option key={l.id} value={dbValue}>{locText}</option>;
              })}
            </select>
          </div>
          <div className="input-group">
            <label>Do lokalizacji *</label>
            <select className="select" value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))}>
              <option value="">— Wybierz lokalizację docelową —</option>
              {warehouseLocations.map(l => {
                const locText = `Sektor ${l.sector} - ${l.description || 'Bez opisu'} (Regał ${l.rack || '—'}, Półka ${l.shelf || '—'})`;
                const dbValue = `Sektor ${l.sector}${l.rack ? `, Regał ${l.rack}` : ''}`;
                return <option key={l.id} value={dbValue}>{locText}</option>;
              })}
            </select>
          </div>
        </div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 12, marginBottom: 12 }}>
            <div className="input-group mb-8">
              <label>Produkt</label>
              <input className="input" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="Nazwa produktu" list="products-list" />
            </div>
            <div className="flex gap-8" style={{ alignItems: 'flex-end' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Ilość</label>
                <input className="input" type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
              </div>
              {form.items.length > 1 && (
                <button className="btn btn-ghost" style={{ color: 'var(--danger)', height: '42px', padding: '0 16px' }} onClick={() => removeItem(i)}>✕ Usuń</button>
              )}
            </div>
          </div>
        ))}
        <datalist id="products-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>
    </div>
  );
}
