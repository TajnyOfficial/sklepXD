import { useState } from 'react';
import { FiUsers, FiPlus, FiEdit, FiTrash2, FiPhone, FiMail } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [
  { id: '1', name: 'Jan Kowalski', role: 'Administrator', phone: '501000111', email: 'jan@sklep.pl', hired: '2020-01-15', hourly: 45, active: true },
  { id: '2', name: 'Anna Nowak', role: 'Kierownik Sprzedaży', phone: '502000222', email: 'anna@sklep.pl', hired: '2021-03-01', hourly: 35, active: true },
  { id: '3', name: 'Tomasz Lewandowski', role: 'Kierownik Magazynu', phone: '503000333', email: 'tomasz@sklep.pl', hired: '2021-06-15', hourly: 33, active: true },
  { id: '4', name: 'Katarzyna Wójcik', role: 'Kasjer', phone: '504000444', email: 'kasia@sklep.pl', hired: '2022-09-01', hourly: 28, active: true },
  { id: '5', name: 'Piotr Wiśniewski', role: 'Kasjer', phone: '505000555', email: 'piotr@sklep.pl', hired: '2023-02-01', hourly: 27, active: true },
  { id: '6', name: 'Maria Zielińska', role: 'Magazynier', phone: '506000666', email: 'maria@sklep.pl', hired: '2023-05-15', hourly: 26, active: true },
  { id: '7', name: 'Krzysztof Szymański', role: 'Pracownik Sprzątający', phone: '507000777', email: null, hired: '2024-01-10', hourly: 24, active: false },
];
const ROLES_LIST = ['Administrator', 'Kierownik Zmiany', 'Kierownik Sprzedaży', 'Kierownik Magazynu', 'Kierownik Serwisu', 'Kasjer', 'Magazynier', 'Pracownik Sprzątający'];
const EMPTY = { name: '', role: 'Kasjer', phone: '', email: '', hired: '', hourly: '28', active: true };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(e) { setEditing(e); setForm({ name: e.name, role: e.role, phone: e.phone, email: e.email || '', hired: e.hired, hourly: String(e.hourly), active: e.active }); setShowModal(true); }
  function handleSave() {
    if (!form.name) { toast.error('Podaj imię i nazwisko'); return; }
    const emp = { id: editing?.id || crypto.randomUUID(), name: form.name, role: form.role, phone: form.phone, email: form.email || null, hired: form.hired, hourly: parseFloat(form.hourly) || 0, active: form.active };
    if (editing) { setEmployees(prev => prev.map(e => e.id === editing.id ? emp : e)); toast.success('Pracownik zaktualizowany'); }
    else { setEmployees(prev => [...prev, emp]); toast.success('Pracownik dodany'); }
    setShowModal(false);
  }
  function handleDelete(e) { if (!confirm(`Usunąć pracownika "${e.name}"?`)) return; setEmployees(prev => prev.filter(x => x.id !== e.id)); toast.success('Pracownik usunięty'); }
  function toggleActive(id) { setEmployees(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e)); toast.success('Status zmieniony'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Pracownicy</h1><p>Kartoteka pracownicza, dane kontaktowe</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Dodaj pracownika</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {employees.map(e => (
          <div key={e.id} className="card" style={{ opacity: e.active ? 1 : 0.5 }}>
            <div className="flex-between mb-8">
              <div className="flex gap-12" style={{ alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--accent), #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>{e.name.split(' ').map(w => w[0]).join('')}</div>
                <div><div style={{ fontWeight: 600 }}>{e.name}</div><div className="text-xs text-muted">{e.role}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}><FiEdit size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e)}><FiTrash2 size={14} /></button>
              </div>
            </div>
            <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {e.phone && <div className="text-muted"><FiPhone size={10} /> {e.phone}</div>}
              {e.email && <div className="text-muted"><FiMail size={10} /> {e.email}</div>}
              <div className="flex-between mt-4">
                <span className="text-xs text-muted">Od: {e.hired}</span>
                <span className="text-xs">{e.hourly} zł/h</span>
                <button className={`badge ${e.active ? 'badge-success' : 'badge-danger'}`} onClick={() => toggleActive(e.id)} style={{ cursor: 'pointer', border: 'none' }}>{e.active ? 'Aktywny' : 'Nieaktywny'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj pracownika' : 'Nowy pracownik'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Imię i nazwisko *</label><input className="input" value={form.name} onChange={F('name')} /></div><div className="input-group"><label>Stanowisko</label><select className="select" value={form.role} onChange={F('role')}>{ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}</select></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Telefon</label><input className="input" value={form.phone} onChange={F('phone')} /></div><div className="input-group"><label>E-mail</label><input className="input" value={form.email} onChange={F('email')} /></div></div>
        <div className="input-row"><div className="input-group"><label>Data zatrudnienia</label><input className="input" type="date" value={form.hired} onChange={F('hired')} /></div><div className="input-group"><label>Stawka godzinowa (zł)</label><input className="input" type="number" value={form.hourly} onChange={F('hourly')} /></div></div>
      </Modal>
    </div>
  );
}
