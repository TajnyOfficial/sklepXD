import { useState, useEffect } from 'react';
import { FiMessageSquare, FiPlus, FiEdit, FiTrash2, FiBookmark } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY = { title: '', content: '', priority: 'normal' };

// Wewnętrzna "Tablica Ogłoszeń" komunikacji korporacyjnej dla pracowników. Obsługuje przypinanie ważnych postów i oznaczanie priorytetów
export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, author:profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Błąd pobierania ogłoszeń');
    } finally {
      setIsLoading(false);
    }
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(a) { setEditing(a); setForm({ title: a.title, content: a.content, priority: a.priority }); setShowModal(true); }
  
  async function handleSave() {
    if (!form.title || !form.content) { toast.error('Wypełnij tytuł i treść'); return; }
    
    const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const row = { 
      title: form.title, 
      content: form.content, 
      priority: form.priority, 
      is_pinned: editing?.is_pinned || false,
      author_id: isValidUuid(profile?.id) ? profile.id : null
    };

    try {
      if (editing) { 
        const { data, error } = await supabase.from('announcements').update(row).eq('id', editing.id).select('*, author:profiles(full_name)').single();
        if (error) throw error;
        setItems(prev => prev.map(a => a.id === editing.id ? data : a)); 
        toast.success('Ogłoszenie zaktualizowane'); 
      } else { 
        const { data, error } = await supabase.from('announcements').insert(row).select('*, author:profiles(full_name)').single();
        if (error) throw error;
        setItems(prev => [data, ...prev]); 
        toast.success('Ogłoszenie dodane'); 
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(`Błąd zapisu ogłoszenia: ${err.message || 'sprawdź konsolę'}`);
    }
  }
  
  async function togglePin(id) { 
    const ann = items.find(a => a.id === id);
    if (!ann) return;
    try {
      const { data, error } = await supabase.from('announcements').update({ is_pinned: !ann.is_pinned }).eq('id', id).select('*, author:profiles(full_name)').single();
      if (error) throw error;
      setItems(prev => prev.map(a => a.id === id ? data : a)); 
      toast.success('Zmieniono przypięcie'); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd zmiany przypięcia');
    }
  }
  
  async function handleDelete(a) { 
    if (!confirm(`Usunąć ogłoszenie "${a.title}"?`)) return; 
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', a.id);
      if (error) throw error;
      setItems(prev => prev.filter(x => x.id !== a.id)); 
      toast.success('Ogłoszenie usunięte'); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd usunięcia ogłoszenia');
    }
  }
  
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const sorted = [...items].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Tablica ogłoszeń</h1><p>Komunikacja wewnętrzna — ważne informacje</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowe ogłoszenie</button>
      </div>
      
      {isLoading ? (
        <div className="p-24 text-center">Ładowanie ogłoszeń...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.length === 0 ? (
            <div className="card text-center text-muted p-24">Brak ogłoszeń</div>
          ) : (
            sorted.map(a => (
              <div key={a.id} className="card" style={{ border: ` 1px solid ${a.priority === 'high' ? 'var(--danger)' : a.priority === 'low' ? 'var(--text-muted)' : 'var(--accent)'}` }}>
                <div className="flex-between mb-8">
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    {a.is_pinned && <FiBookmark size={14} style={{ color: 'var(--accent-light)' }} />}
                    <h3 style={{ margin: 0 }}>{a.title}</h3>
                    <span className={`badge ${a.priority === 'high' ? 'badge-danger' : a.priority === 'low' ? 'badge-ghost' : 'badge-info'}`}>{a.priority === 'high' ? 'Pilne' : a.priority === 'low' ? 'Niski' : 'Normalny'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePin(a.id)} title="Przypnij"><FiBookmark size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}><FiEdit size={14} /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(a)}><FiTrash2 size={14} /></button>
                  </div>
                </div>
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.content}</p>
                <div className="text-xs text-muted">
                  {a.author?.full_name || 'System'} • {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Opublikuj'}</button></>}>
        <div className="input-group mb-16"><label>Tytuł *</label><input className="input" value={form.title} onChange={F('title')} /></div>
        <div className="input-group mb-16"><label>Priorytet</label><select className="select" value={form.priority} onChange={F('priority')}><option value="high">Pilne</option><option value="normal">Normalny</option><option value="low">Niski</option></select></div>
        <div className="input-group"><label>Treść *</label><textarea className="input" rows={5} value={form.content} onChange={F('content')} style={{ resize: 'vertical' }} /></div>
      </Modal>
    </div>
  );
}
