import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiRotateCcw, FiPlus, FiCheck, FiX, FiEye, FiPackage, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
const EMPTY = { customer: '', receipt: '', items: [{ name: '', qty: '1' }], reason: '', quarantine: 'na_magazyn' };

// Moduł RMA (Zwroty i Reklamacje): rejestracja zwracanego towaru z decyzją systemową (wraca na stan magazynowy vs trafia na straty)
export default function ReturnsPage() {
  const { returnsList = [], saveReturn, updateReturnStatus, addPosLog, profile } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }

  async function handleSave() {
    if (!form.customer || !form.reason) { toast.error('Podaj klienta i powód zwrotu'); return; }
    try {
      const ret = {
        number: `ZW/2026/03/${String(returnsList.length + 1).padStart(3, '0')}`,
        customer: form.customer,
        receipt: form.receipt,
        items: form.items.filter(i => i.name),
        total: 0,
        quarantine: form.quarantine,
        status: 'pending',
        reason: form.reason
      };
      await saveReturn(ret);
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('create', userLabel, 'Admin', `Zarejestrowano nowy zwrot RMA: ${ret.number} dla ${ret.customer}`);
      toast.success(`Zwrot ${ret.number} zarejestrowany`);
      setShowModal(false); setForm(EMPTY);
    } catch (e) {
      toast.error('Błąd zapisu zwrotu: ' + e.message);
    }
  }

  async function approve(id) {
    try {
      await updateReturnStatus(id, 'completed');
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('update', userLabel, 'Admin', `Zatwierdzono zwrot RMA`);
      toast.success('Zwrot zatwierdzony');
    } catch (e) { toast.error('Błąd: ' + e.message); }
  }

  async function reject(id) {
    if (!confirm('Odrzucić zwrot?')) return;
    try {
      await updateReturnStatus(id, 'rejected');
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('update', userLabel, 'Admin', `Odrzucono zwrot RMA`);
      toast.success('Zwrot odrzucony');
    } catch (e) { toast.error('Błąd: ' + e.message); }
  }

  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  // Normalizuj stare wartości (shelf/service/scrap) do nowych
  const getDestLabel = (q) => {
    if (q === 'na_straty' || q === 'service' || q === 'scrap') return 'Na straty';
    return 'Na magazyn';
  };
  const isStraty = (q) => q === 'na_straty' || q === 'service' || q === 'scrap';

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zwroty / RMA</h1>
          <p>Rejestracja i obsługa zwrotów towarów</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}>
          <FiPlus size={16} /> Nowy zwrot
        </button>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-card">
          <span className="stat-label">Oczekujące</span>
          <span className="stat-value text-warning">{returnsList.filter(r => r.status === 'pending').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Na magazyn</span>
          <span className="stat-value text-success">{returnsList.filter(r => !isStraty(r.quarantine)).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Na straty</span>
          <span className="stat-value text-danger">{returnsList.filter(r => isStraty(r.quarantine)).length}</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nr zwrotu</th>
              <th>Klient</th>
              <th>Nr paragonu/FV</th>
              <th>Pozycje</th>
              <th>Status towaru</th>
              <th>Powód</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {returnsList.map(r => (
              <tr key={r.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{r.number}</td>
                <td>{r.customer}</td>
                <td className="text-sm text-muted">{r.receipt}</td>
                <td className="text-sm">{r.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                <td>
                  <span
                    className={`badge ${isStraty(r.quarantine) ? 'badge-danger' : 'badge-success'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {isStraty(r.quarantine) ? <FiTrash2 size={11} /> : <FiPackage size={11} />}
                    {getDestLabel(r.quarantine)}
                  </span>
                </td>
                <td className="text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason}
                </td>
                <td>
                  <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {r.status === 'completed' ? 'Zatwierdzony' : r.status === 'rejected' ? 'Odrzucony' : 'Oczekujący'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setViewItem(r); setShowView(true); }}><FiEye size={14} /></button>
                    {r.status === 'pending' && <>
                      <button className="btn btn-success btn-sm" onClick={() => approve(r.id)}><FiCheck size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => reject(r.id)}><FiX size={14} /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
            {returnsList.length === 0 && (
              <tr><td colSpan="8" className="text-center p-24 text-muted">Brak zarejestrowanych zwrotów</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nowy zwrot / RMA"
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>Zarejestruj zwrot</button>
          </>
        }
      >
        <div className="input-row mb-16">
          <div className="input-group"><label>Klient *</label><input className="input" value={form.customer} onChange={F('customer')} /></div>
          <div className="input-group"><label>Nr paragonu/FV</label><input className="input" value={form.receipt} onChange={F('receipt')} /></div>
        </div>

        <div className="input-group mb-20">
          <label style={{ marginBottom: 10, display: 'block' }}>Status towaru</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, quarantine: 'na_magazyn' }))}
              style={{
                flex: 1, padding: '16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${form.quarantine === 'na_magazyn' ? '#22c55e' : 'var(--border-light)'}`,
                background: form.quarantine === 'na_magazyn' ? 'rgba(34,197,94,0.12)' : 'var(--bg-alt)',
                color: form.quarantine === 'na_magazyn' ? '#22c55e' : 'var(--text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', fontFamily: 'inherit'
              }}
            >
              <FiPackage size={26} />
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Na magazyn</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>Towar wraca do sprzedaży</span>
            </button>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, quarantine: 'na_straty' }))}
              style={{
                flex: 1, padding: '16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${form.quarantine === 'na_straty' ? '#ef4444' : 'var(--border-light)'}`,
                background: form.quarantine === 'na_straty' ? 'rgba(239,68,68,0.12)' : 'var(--bg-alt)',
                color: form.quarantine === 'na_straty' ? '#ef4444' : 'var(--text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', fontFamily: 'inherit'
              }}
            >
              <FiTrash2 size={26} />
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Na straty</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>Uszkodzony / do utylizacji</span>
            </button>
          </div>
        </div>

        <h4 className="mb-8">Zwracane produkty</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Produkt</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm mb-16" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
        <div className="input-group">
          <label>Powód zwrotu *</label>
          <textarea className="input" rows={3} value={form.reason} onChange={F('reason')} placeholder="Opis przyczyny zwrotu..." style={{ resize: 'vertical' }} />
        </div>
      </Modal>

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`Zwrot ${viewItem?.number}`}
        footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}
      >
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Nr', viewItem.number],
              ['Klient', viewItem.customer],
              ['Paragon/FV', viewItem.receipt],
              ['Status towaru', getDestLabel(viewItem.quarantine)],
              ['Status', viewItem.status === 'completed' ? 'Zatwierdzony' : viewItem.status === 'rejected' ? 'Odrzucony' : 'Oczekujący'],
              ['Data', viewItem.date]
            ].map(([l, v]) => (
              <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span className="text-sm text-muted">{l}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <h4 className="mt-8">Pozycje:</h4>
            {viewItem.items.map((it, i) => <div key={i} className="text-sm">• {it.name} × {it.qty}</div>)}
            <h4 className="mt-8">Powód:</h4>
            <p className="text-sm">{viewItem.reason}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
