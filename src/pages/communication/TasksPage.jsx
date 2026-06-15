import { useState, useEffect } from 'react';
import { FiCheckSquare, FiPlus, FiEdit, FiTrash2, FiCheck, FiCamera } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';

const PRIORITIES = { urgent: '🔴 Pilne', high: '🟠 Wysokie', normal: '🔵 Normalne', low: '⚪ Niski' };
const STATUSES = { pending: 'Oczekuje', in_progress: 'W trakcie', completed: 'Zakończone', cancelled: 'Anulowane' };
const EMPTY = { title: '', description: '', priority: 'normal', assigned: '', requires_photo: false, due: '' };

// Narzędzie Task Managementu (Todo) dla zespołu sklepu. Zapis i odczyt z bazy danych Supabase.
export default function TasksPage() {
  const { profile } = useAuth();
  const { employees } = useStore();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Błąd pobierania zadań');
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(t) { 
    setEditing(t); 
    setForm({ 
      title: t.title, 
      description: t.description || '', 
      priority: t.priority || 'normal', 
      assigned: t.assigned_to || '', 
      requires_photo: t.requires_photo || false, 
      due: t.due_at ? t.due_at.split('T')[0] : '' 
    }); 
    setShowModal(true); 
  }

  async function handleSave() {
    if (!form.title) { toast.error('Podaj tytuł zadania'); return; }
    
    const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const row = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      assigned_to: isValidUuid(form.assigned) ? form.assigned : null,
      assigned_by: isValidUuid(profile?.id) ? profile.id : null,
      requires_photo: form.requires_photo,
      due_at: form.due ? new Date(form.due).toISOString() : null,
      status: editing?.status || 'pending'
    };

    try {
      if (editing) { 
        const { data, error } = await supabase.from('tasks').update(row).eq('id', editing.id).select().single();
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === editing.id ? data : t)); 
        toast.success('Zadanie zaktualizowane'); 
      } else { 
        const { data, error } = await supabase.from('tasks').insert(row).select().single();
        if (error) throw error;
        setTasks(prev => [data, ...prev]); 
        toast.success('Zadanie utworzone'); 
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(`Błąd zapisu zadania: ${err.message || 'sprawdź konsolę'}`);
    }
  }

  async function changeStatus(id, status) { 
    try {
      const updateData = { status };
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      
      const { data, error } = await supabase.from('tasks').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === id ? data : t)); 
      toast.success(`Status: ${STATUSES[status]}`); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd zmiany statusu');
    }
  }

  async function handleDelete(t) { 
    if (!confirm(`Usunąć "${t.title}"?`)) return; 
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', t.id);
      if (error) throw error;
      setTasks(prev => prev.filter(x => x.id !== t.id)); 
      toast.success('Zadanie usunięte'); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd usuwania');
    }
  }

  async function uploadPhoto(id) { 
    try {
      const { data, error } = await supabase.from('tasks').update({ photo_url: 'uploaded_dummy.jpg' }).eq('id', id).select().single();
      if (error) throw error;
      toast.success('📸 Zdjęcie „Dowód wykonania" zostało dodane'); 
      setTasks(prev => prev.map(t => t.id === id ? data : t)); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd dodawania zdjęcia');
    }
  }

  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  function getAssigneeName(uuid) {
    if (!uuid) return 'Nieprzypisane';
    const emp = employees.find(e => e.id === uuid);
    return emp ? emp.full_name || emp.name : 'Nieznany';
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Zadania</h1><p>Delegowanie, śledzenie postępu, foto-dowód</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowe zadanie</button>
      </div>
      
      <div className="page-tabs">{[['all', 'Wszystkie'], ['pending', 'Oczekujące'], ['in_progress', 'W trakcie'], ['completed', 'Zakończone']].map(([k, v]) => <button key={k} className={`page-tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{v} ({k === 'all' ? tasks.length : tasks.filter(t => t.status === k).length})</button>)}</div>
      
      {isLoading ? (
        <div className="p-24 text-center">Ładowanie zadań...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div className="card text-center text-muted p-24">Brak zadań w wybranej kategorii</div>
          ) : (
            filtered.map(t => (
              <div key={t.id} className="card" style={{ border: ` 1px solid ${t.priority === 'urgent' ? 'var(--danger)' : t.priority === 'high' ? 'var(--warning)' : t.priority === 'low' ? 'var(--text-muted)' : 'var(--accent)'}` }}>
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
                  <span>👤 {getAssigneeName(t.assigned_to)}</span>
                  {t.due_at && <span>📅 Termin: {new Date(t.due_at).toLocaleDateString()}</span>}
                  <span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'in_progress' ? 'badge-warning' : 'badge-ghost'}`}>{STATUSES[t.status]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj zadanie' : 'Nowe zadanie'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Utwórz'}</button></>}>
        <div className="input-group mb-16"><label>Tytuł *</label><input className="input" value={form.title} onChange={F('title')} /></div>
        <div className="input-group mb-16"><label>Opis</label><textarea className="input" rows={3} value={form.description} onChange={F('description')} style={{ resize: 'vertical' }} /></div>
        
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Priorytet</label>
            <select className="select" value={form.priority} onChange={F('priority')}>
              <option value="urgent">Pilne</option>
              <option value="high">Wysokie</option>
              <option value="normal">Normalne</option>
              <option value="low">Niskie</option>
            </select>
          </div>
          <div className="input-group">
            <label>Przypisz do</label>
            <select className="select" value={form.assigned} onChange={F('assigned')}>
              <option value="">Nieprzypisane</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="input-row">
          <div className="input-group"><label>Termin</label><input className="input" type="date" value={form.due} onChange={F('due')} /></div>
          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
            <input type="checkbox" id="req-photo" checked={form.requires_photo} onChange={e => setForm(p => ({ ...p, requires_photo: e.target.checked }))} />
            <label htmlFor="req-photo" style={{ margin: 0 }}>Wymagaj foto-dowodu</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
