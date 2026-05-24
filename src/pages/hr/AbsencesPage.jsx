import { useState } from 'react';
import { FiCalendar, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [];
const TYPES = { vacation: 'Urlop wypocz.', sick_leave: 'L4', on_demand: 'Na żądanie', personal: 'Okolicznościowy', other: 'Inny' };
const EMPTY = { name: '', type: 'vacation', from: '', to: '', note: '' };

/**
 * Widok modułu AbsencesPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Absences.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony AbsencesPage
 */
export default function AbsencesPage() {
  const [absences, setAbsences] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function handleSave() {
    if (!form.name || !form.from || !form.to) { toast.error('Wypełnij pracownika i daty'); return; }
    const d1 = new Date(form.from), d2 = new Date(form.to);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    const abs = { id: crypto.randomUUID(), name: form.name, type: form.type, from: form.from, to: form.to, days, status: 'pending', note: form.note };
    setAbsences(prev => [abs, ...prev]);
    toast.success('Wniosek o nieobecność złożony');
    setShowModal(false); setForm(EMPTY);
  }
  function approve(id) { setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a)); toast.success('Wniosek zatwierdzony'); }
  function reject(id) { if (!confirm('Odrzucić wniosek?')) return; setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a)); toast.success('Wniosek odrzucony'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Nieobecności</h1><p>Urlopy, L4, wnioski o nieobecność</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowy wniosek</button>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">Oczekujące</span><span className="stat-value text-warning">{absences.filter(a => a.status === 'pending').length}</span></div>
        <div className="stat-card"><span className="stat-label">Zatwierdzone</span><span className="stat-value text-success">{absences.filter(a => a.status === 'approved').length}</span></div>
        <div className="stat-card"><span className="stat-label">Dni nieobecności (miesiąc)</span><span className="stat-value">{absences.reduce((s, a) => s + a.days, 0)}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Pracownik</th><th>Typ</th><th>Od</th><th>Do</th><th>Dni</th><th>Uwagi</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {absences.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 500 }}>{a.name}</td>
                <td><span className={`badge ${a.type === 'sick_leave' ? 'badge-danger' : a.type === 'on_demand' ? 'badge-warning' : 'badge-info'}`}>{TYPES[a.type]}</span></td>
                <td className="text-sm">{a.from}</td><td className="text-sm">{a.to}</td>
                <td style={{ fontWeight: 600 }}>{a.days}</td>
                <td className="text-sm text-muted">{a.note}</td>
                <td><span className={`badge ${a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{a.status === 'approved' ? 'Zatwierdzony' : a.status === 'rejected' ? 'Odrzucony' : 'Oczekuje'}</span></td>
                <td>{a.status === 'pending' && <div style={{ display: 'flex', gap: 4 }}><button className="btn btn-success btn-sm" onClick={() => approve(a.id)}><FiCheck size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => reject(a.id)}><FiX size={14} /></button></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowy wniosek o nieobecność" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Złóż wniosek</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Pracownik *</label><input className="input" value={form.name} onChange={F('name')} placeholder="Imię i nazwisko" /></div><div className="input-group"><label>Typ</label><select className="select" value={form.type} onChange={F('type')}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Od *</label><input className="input" type="date" value={form.from} onChange={F('from')} /></div><div className="input-group"><label>Do *</label><input className="input" type="date" value={form.to} onChange={F('to')} /></div></div>
        <div className="input-group"><label>Uwagi</label><input className="input" value={form.note} onChange={F('note')} placeholder="Opcjonalnie..." /></div>
      </Modal>
    </div>
  );
}
