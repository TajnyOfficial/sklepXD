import { useState } from 'react';
import { FiCheckSquare, FiPlus, FiEdit, FiTrash2, FiCheck, FiCamera } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [];
const PRIORITIES = { urgent: '🔴 Pilne', high: '🟠 Wysokie', normal: '🔵 Normalne', low: '⚪ Niski' };
const STATUSES = { pending: 'Oczekuje', in_progress: 'W trakcie', completed: 'Zakończone', cancelled: 'Anulowane' };
const EMPTY = { title: '', description: '', priority: 'normal', assigned: '', requires_photo: false, due: '' };

export default function TasksPage() {
  const [tasks, setTasks] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState('all');

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(t) { setEditing(t); setForm({ title: t.title, description: t.description, priority: t.priority, assigned: t.assigned, requires_photo: t.requires_photo, due: t.due }); setShowModal(true); }
  function handleSave() {
    if (!form.title) { toast.error('Podaj tytuł zadania'); return; }
    const task = { id: editing?.id || crypto.randomUUID(), ...form, status: editing?.status || 'pending', photo_url: editing?.photo_url || null, created: editing?.created || new Date().toISOString().split('T')[0] };
    if (editing) { setTasks(prev => prev.map(t => t.id === editing.id ? task : t)); toast.success('Zadanie zaktualizowane'); }
    else { setTasks(prev => [task, ...prev]); toast.success('Zadanie utworzone'); }
    setShowModal(false);
  }
  function changeStatus(id, status) { setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t)); toast.success(`Status: ${STATUSES[status]}`); }
  function handleDelete(t) { if (!confirm(`Usunąć "${t.title}"?`)) return; setTasks(prev => prev.filter(x => x.id !== t.id)); toast.success('Zadanie usunięte'); }
  function uploadPhoto(id) { toast.success('📸 Zdjęcie „Dowód wykonania" zostało dodane'); setTasks(prev => prev.map(t => t.id === id ? { ...t, photo_url: 'uploaded' } : t)); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Zadania</h1><p>Delegowanie, śledzenie postępu, foto-dowód</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowe zadanie</button>
      </div>
      <div className="page-tabs">{[['all', 'Wszystkie'], ['pending', 'Oczekujące'], ['in_progress', 'W trakcie'], ['completed', 'Zakończone']].map(([k, v]) => <button key={k} className={`page-tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{v} ({k === 'all' ? tasks.length : tasks.filter(t => t.status === k).length})</button>)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(t => (
          <div key={t.id} className="card" style={{ borderLeft: `4px solid ${t.priority === 'urgent' ? 'var(--danger)' : t.priority === 'high' ? 'var(--warning)' : t.priority === 'low' ? 'var(--text-muted)' : 'var(--accent)'}` }}>
            <div className="flex-between mb-4">
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <h4 style={{ margin: 0, textDecoration: t.status === 'completed' ? 'line-through' : 'none', opacity: t.status === 'completed' ? 0.6 : 1 }}>{t.title}</h4>
                <span className="badge badge-ghost">{PRIORITIES[t.priority]}</span>
                {t.requires_photo && <span className="badge badge-info"><FiCamera size={10} /> Foto</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {t.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => changeStatus(t.id, 'in_progress')}>Rozpocznij</button>}
                {t.status === 'in_progress' && <><button className="btn btn-success btn-sm" onClick={() => changeStatus(t.id, 'completed')}><FiCheck size={14} /> Zakończ</button>{t.requires_photo && !t.photo_url && <button className="btn btn-ghost btn-sm" onClick={() => uploadPhoto(t.id)}><FiCamera size={14} /></button>}</>}
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><FiEdit size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t)}><FiTrash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm text-muted mb-4">{t.description}</p>
            <div className="text-xs text-muted flex gap-12">
              <span>👤 {t.assigned || 'Nieprzypisane'}</span>
              {t.due && <span>📅 Termin: {t.due}</span>}
              <span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'in_progress' ? 'badge-warning' : 'badge-ghost'}`}>{STATUSES[t.status]}</span>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj zadanie' : 'Nowe zadanie'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Utwórz'}</button></>}>
        <div className="input-group mb-16"><label>Tytuł *</label><input className="input" value={form.title} onChange={F('title')} /></div>
        <div className="input-group mb-16"><label>Opis</label><textarea className="input" rows={3} value={form.description} onChange={F('description')} style={{ resize: 'vertical' }} /></div>
        <div className="input-row mb-16"><div className="input-group"><label>Priorytet</label><select className="select" value={form.priority} onChange={F('priority')}><option value="urgent">Pilne</option><option value="high">Wysokie</option><option value="normal">Normalne</option><option value="low">Niskie</option></select></div><div className="input-group"><label>Przypisz do</label><input className="input" value={form.assigned} onChange={F('assigned')} placeholder="Imię pracownika" /></div></div>
        <div className="input-row"><div className="input-group"><label>Termin</label><input className="input" type="date" value={form.due} onChange={F('due')} /></div><div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}><input type="checkbox" id="req-photo" checked={form.requires_photo} onChange={e => setForm(p => ({ ...p, requires_photo: e.target.checked }))} /><label htmlFor="req-photo" style={{ margin: 0 }}>Wymagaj foto-dowodu</label></div></div>
      </Modal>
    </div>
  );
}
