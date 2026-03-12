import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiUsers, FiPlus, FiSearch, FiEdit, FiEye, FiTrash2, FiPhone, FiMail } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { type: 'person', name: '', company_name: '', nip: '', phone: '', email: '', price_group: 'regular', credit_limit: '0', credit_used: '0', address: '' };

export default function CustomersPage() {
  const { customers, setCustomers, priceGroups } = useStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.nip?.includes(search) || c.phone?.includes(search));

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(c) { setEditing(c); setForm({ ...c, credit_limit: String(c.credit_limit || 0), credit_used: String(c.credit_used || 0) }); setShowModal(true); }
  function openView(c) { setViewItem(c); setShowViewModal(true); }

  function handleSave() {
    if (!form.name) { toast.error('Podaj nazwę klienta'); return; }
    const cust = { ...form, id: editing?.id || crypto.randomUUID(), credit_limit: parseFloat(form.credit_limit) || 0, credit_used: parseFloat(form.credit_used) || 0 };
    if (editing) {
      setCustomers(prev => prev.map(c => c.id === editing.id ? cust : c));
      toast.success('Klient zaktualizowany');
    } else {
      setCustomers(prev => [...prev, cust]);
      toast.success('Klient dodany');
    }
    setShowModal(false);
  }

  function handleDelete(c) {
    if (!confirm(`Usunąć klienta "${c.name}"?`)) return;
    setCustomers(prev => prev.filter(x => x.id !== c.id));
    toast.success('Klient usunięty');
  }

  const F = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Klienci (CRM)</h1><p>Baza kontrahentów, kredyt kupiecki, grupy cenowe</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowy klient</button>
      </div>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Szukaj po nazwie, NIP lub telefonie..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Klient</th><th>Typ</th><th>NIP</th><th>Kontakt</th><th>Grupa cenowa</th><th>Kredyt</th><th></th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><span className={`badge ${c.type === 'company' ? 'badge-info' : 'badge-ghost'}`}>{c.type === 'company' ? 'Firma' : 'Osoba'}</span></td>
                <td className="font-mono text-sm text-muted">{c.nip || '—'}</td>
                <td><div className="text-sm">{c.phone && <div><FiPhone size={10} /> {c.phone}</div>}{c.email && <div><FiMail size={10} /> {c.email}</div>}</div></td>
                <td><span className="badge badge-primary">{priceGroups[c.price_group]?.label || c.price_group}</span></td>
                <td>{c.credit_limit > 0 ? (<div><div className="progress-bar" style={{ width: 80 }}><div className="progress-bar-fill" style={{ width: `${(c.credit_used / c.credit_limit) * 100}%` }} /></div><div className="text-xs text-muted mt-4">{formatCurrency(c.credit_used)} / {formatCurrency(c.credit_limit)}</div></div>) : <span className="text-muted text-sm">—</span>}</td>
                <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => openView(c)}><FiEye size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><FiEdit size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c)}><FiTrash2 size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj klienta' : 'Nowy klient'} size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-row mb-16">
          <div className="input-group"><label>Typ</label><select className="select" value={form.type} onChange={F('type')}><option value="person">Osoba fizyczna</option><option value="company">Firma</option></select></div>
          <div className="input-group"><label>Grupa cenowa</label><select className="select" value={form.price_group} onChange={F('price_group')}><option value="regular">Detaliczny</option><option value="loyal">Stały klient</option><option value="contractor">Wykonawca</option><option value="wholesale">Hurtowy</option></select></div>
        </div>
        <div className="input-row mb-16">
          <div className="input-group"><label>Nazwa / Imię i nazwisko *</label><input className="input" value={form.name} onChange={F('name')} /></div>
          {form.type === 'company' && <div className="input-group"><label>Nazwa firmy</label><input className="input" value={form.company_name} onChange={F('company_name')} /></div>}
        </div>
        <div className="input-row mb-16">
          <div className="input-group"><label>NIP</label><input className="input" value={form.nip} onChange={F('nip')} placeholder="1234567890" /></div>
          <div className="input-group"><label>Telefon</label><input className="input" value={form.phone} onChange={F('phone')} /></div>
        </div>
        <div className="input-row mb-16">
          <div className="input-group"><label>E-mail</label><input className="input" value={form.email} onChange={F('email')} /></div>
          <div className="input-group"><label>Adres</label><input className="input" value={form.address || ''} onChange={F('address')} /></div>
        </div>
        <div className="input-row">
          <div className="input-group"><label>Limit kredytu</label><input className="input" type="number" value={form.credit_limit} onChange={F('credit_limit')} /></div>
          <div className="input-group"><label>Wykorzystany kredyt</label><input className="input" type="number" value={form.credit_used} onChange={F('credit_used')} /></div>
        </div>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Klient — szczegóły" footer={<button className="btn btn-primary" onClick={() => setShowViewModal(false)}>Zamknij</button>}>
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Nazwa', viewItem.name], ['Typ', viewItem.type === 'company' ? 'Firma' : 'Osoba'], ['NIP', viewItem.nip || '—'], ['Telefon', viewItem.phone || '—'], ['E-mail', viewItem.email || '—'], ['Grupa cenowa', priceGroups[viewItem.price_group]?.label], ['Limit kredytu', formatCurrency(viewItem.credit_limit || 0)], ['Wykorzystany', formatCurrency(viewItem.credit_used || 0)]].map(([l, v]) => (
              <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
