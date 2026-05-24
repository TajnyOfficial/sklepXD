import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiTruck, FiPlus, FiSearch, FiEdit, FiTrash2, FiStar, FiPhone, FiMail } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { name: '', nip: '', contact: { phone: '', email: '' }, rating: '4.0', address: '', payment_terms: '14' };

/**
 * Widok modułu SuppliersPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Suppliers.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony SuppliersPage
 */
export default function SuppliersPage() {
  const { suppliers, setSuppliers } = useStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.nip?.includes(search));

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(s) { setEditing(s); setForm({ ...s, rating: String(s.rating), payment_terms: String(s.payment_terms || 14) }); setShowModal(true); }
  function handleSave() {
    if (!form.name) { toast.error('Podaj nazwę dostawcy'); return; }
    const sup = { ...form, id: editing?.id || crypto.randomUUID(), rating: parseFloat(form.rating) || 0, payment_terms: parseInt(form.payment_terms) || 14, contact: { phone: form.contact?.phone || '', email: form.contact?.email || '' } };
    if (editing) { setSuppliers(prev => prev.map(s => s.id === editing.id ? sup : s)); toast.success('Dostawca zaktualizowany'); }
    else { setSuppliers(prev => [...prev, sup]); toast.success('Dostawca dodany'); }
    setShowModal(false);
  }
  function handleDelete(s) { if (!confirm(`Usunąć dostawcę "${s.name}"?`)) return; setSuppliers(prev => prev.filter(x => x.id !== s.id)); toast.success('Dostawca usunięty'); }
  const F = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const FC = (field) => (e) => setForm(prev => ({ ...prev, contact: { ...prev.contact, [field]: e.target.value } }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Dostawcy</h1><p>Rejestr kontrahentów, ranking terminowości</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowy dostawca</button>
      </div>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Szukaj po nazwie lub NIP..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Dostawca</th><th>NIP</th><th>Kontakt</th><th>Ocena</th><th>Termin płatności</th><th></th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td className="font-mono text-sm text-muted">{s.nip || '—'}</td>
                <td className="text-sm">{s.contact?.phone && <div><FiPhone size={10} /> {s.contact.phone}</div>}{s.contact?.email && <div><FiMail size={10} /> {s.contact.email}</div>}</td>
                <td><span className={`badge ${s.rating >= 4.5 ? 'badge-success' : s.rating >= 3.5 ? 'badge-warning' : 'badge-danger'}`}><FiStar size={10} /> {s.rating}</span></td>
                <td className="text-sm">{s.payment_terms || 14} dni</td>
                <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><FiEdit size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s)}><FiTrash2 size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj dostawcę' : 'Nowy dostawca'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Nazwa *</label><input className="input" value={form.name} onChange={F('name')} /></div><div className="input-group"><label>NIP</label><input className="input" value={form.nip} onChange={F('nip')} /></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Telefon</label><input className="input" value={form.contact?.phone} onChange={FC('phone')} /></div><div className="input-group"><label>E-mail</label><input className="input" value={form.contact?.email} onChange={FC('email')} /></div></div>
        <div className="input-row"><div className="input-group"><label>Ocena (0-5)</label><input className="input" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={F('rating')} /></div><div className="input-group"><label>Termin płatności (dni)</label><input className="input" type="number" value={form.payment_terms} onChange={F('payment_terms')} /></div></div>
      </Modal>
    </div>
  );
}
