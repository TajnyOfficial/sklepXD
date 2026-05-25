import { useState } from 'react';
import { FiMessageSquare, FiPlus, FiEdit, FiTrash2, FiBookmark } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [];
const EMPTY = { title: '', content: '', priority: 'normal' };

/* Wewnętrzna "Tablica Ogłoszeń" komunikacji korporacyjnej dla pracowników. Obsługuje przypinanie ważnych postów i oznaczanie priorytetów */
export default function AnnouncementsPage() {
  const [items, setItems] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(a) { setEditing(a); setForm({ title: a.title, content: a.content, priority: a.priority }); setShowModal(true); }
  function handleSave() {
    if (!form.title || !form.content) { toast.error('Wypełnij tytuł i treść'); return; }
    const ann = { id: editing?.id || crypto.randomUUID(), title: form.title, content: form.content, priority: form.priority, pinned: editing?.pinned || false, author: 'Bieżący użytkownik', date: new Date().toISOString().split('T')[0] };
    if (editing) { setItems(prev => prev.map(a => a.id === editing.id ? ann : a)); toast.success('Ogłoszenie zaktualizowane'); }
    else { setItems(prev => [ann, ...prev]); toast.success('Ogłoszenie dodane'); }
    setShowModal(false);
  }
  function togglePin(id) { setItems(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a)); toast.success('Zmieniono przypięcie'); }
  function handleDelete(a) { if (!confirm(`Usunąć ogłoszenie "${a.title}"?`)) return; setItems(prev => prev.filter(x => x.id !== a.id)); toast.success('Ogłoszenie usunięte'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const sorted = [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Tablica ogłoszeń</h1><p>Komunikacja wewnętrzna — ważne informacje</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowe ogłoszenie</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(a => (
          <div key={a.id} className="card" style={{ border: ` 1px solid ${a.priority === 'high' ? 'var(--danger)' : a.priority === 'low' ? 'var(--text-muted)' : 'var(--accent)'}` }}>
            <div className="flex-between mb-8">
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                {a.pinned && <FiBookmark size={14} style={{ color: 'var(--accent-light)' }} />}
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                <span className={`badge ${a.priority === 'high' ? 'badge-danger' : a.priority === 'low' ? 'badge-ghost' : 'badge-info'}`}>{a.priority === 'high' ? 'Pilne' : a.priority === 'low' ? 'Niski' : 'Normalny'}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => togglePin(a.id)} title="Przypnij"><FiBookmark size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}><FiEdit size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a)}><FiTrash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.content}</p>
            <div className="text-xs text-muted">{a.author} • {a.date}</div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Opublikuj'}</button></>}>
        <div className="input-group mb-16"><label>Tytuł *</label><input className="input" value={form.title} onChange={F('title')} /></div>
        <div className="input-group mb-16"><label>Priorytet</label><select className="select" value={form.priority} onChange={F('priority')}><option value="high">Pilne</option><option value="normal">Normalny</option><option value="low">Niski</option></select></div>
        <div className="input-group"><label>Treść *</label><textarea className="input" rows={5} value={form.content} onChange={F('content')} style={{ resize: 'vertical' }} /></div>
      </Modal>
    </div>
  );
}
