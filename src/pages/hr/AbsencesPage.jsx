import { useState, useEffect } from 'react';
import { FiCalendar, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const TYPES = { vacation: 'Urlop wypocz.', sick_leave: 'L4', on_demand: 'Na żądanie', personal: 'Okolicznościowy', other: 'Inny' };
const EMPTY = { profile_id: '', type: 'vacation', from: '', to: '', note: '' };

/* Moduł ewidencji nieobecności pracowniczych: urlopy, zwolnienia (L4), wnioski na żądanie. Zawiera prosty workflow akceptacji (Zatwierdź/Odrzuć) */
export default function AbsencesPage() {
  const { employees } = useStore();
  const { profile } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadAbsences();
  }, []);

  async function loadAbsences() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('absences')
        .select('*, profile:profiles!absences_profile_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAbsences(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Błąd pobierania nieobecności');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!form.profile_id || !form.from || !form.to) { toast.error('Wypełnij pracownika i daty'); return; }
    
    const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isValidUuid(form.profile_id)) { toast.error('Wybierz prawidłowego pracownika z bazy'); return; }

    const d1 = new Date(form.from), d2 = new Date(form.to);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    
    const row = {
      profile_id: form.profile_id,
      type: form.type,
      date_from: form.from,
      date_to: form.to,
      days_count: days,
      status: 'pending',
      note: form.note
    };

    try {
      const { data, error } = await supabase.from('absences').insert(row).select('*, profile:profiles!absences_profile_id_fkey(full_name)').single();
      if (error) throw error;
      setAbsences(prev => [data, ...prev]);
      toast.success('Wniosek o nieobecność złożony');
      setShowModal(false); setForm(EMPTY);
    } catch (err) {
      console.error(err);
      toast.error(`Błąd zapisu wniosku: ${err.message || 'sprawdź konsolę'}`);
    }
  }

  async function approve(id) { 
    try {
      const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const approved_by = isValidUuid(profile?.id) ? profile.id : null;
      const { data, error } = await supabase.from('absences').update({ status: 'approved', approved_by, approved_at: new Date().toISOString() }).eq('id', id).select('*, profile:profiles!absences_profile_id_fkey(full_name)').single();
      if (error) throw error;
      setAbsences(prev => prev.map(a => a.id === id ? data : a)); 
      toast.success('Wniosek zatwierdzony'); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd zmiany statusu');
    }
  }

  async function reject(id) { 
    if (!confirm('Odrzucić wniosek?')) return; 
    try {
      const isValidUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const approved_by = isValidUuid(profile?.id) ? profile.id : null;
      const { data, error } = await supabase.from('absences').update({ status: 'rejected', approved_by, approved_at: new Date().toISOString() }).eq('id', id).select('*, profile:profiles!absences_profile_id_fkey(full_name)').single();
      if (error) throw error;
      setAbsences(prev => prev.map(a => a.id === id ? data : a)); 
      toast.success('Wniosek odrzucony'); 
    } catch (err) {
      console.error(err);
      toast.error('Błąd zmiany statusu');
    }
  }

  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Nieobecności</h1><p>Urlopy, L4, wnioski o nieobecność</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowy wniosek</button>
      </div>

      {isLoading ? (
        <div className="p-24 text-center">Ładowanie nieobecności...</div>
      ) : (
        <>
          <div className="grid-3 mb-24">
            <div className="stat-card"><span className="stat-label">Oczekujące</span><span className="stat-value text-warning">{absences.filter(a => a.status === 'pending').length}</span></div>
            <div className="stat-card"><span className="stat-label">Zatwierdzone</span><span className="stat-value text-success">{absences.filter(a => a.status === 'approved').length}</span></div>
            <div className="stat-card"><span className="stat-label">Dni nieobecności (miesiąc)</span><span className="stat-value">{absences.reduce((s, a) => s + (a.days_count || 0), 0)}</span></div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Pracownik</th><th>Typ</th><th>Od</th><th>Do</th><th>Dni</th><th>Uwagi</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {absences.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.profile?.full_name || 'Nieznany'}</td>
                    <td><span className={`badge ${a.type === 'sick_leave' ? 'badge-danger' : a.type === 'on_demand' ? 'badge-warning' : 'badge-info'}`}>{TYPES[a.type]}</span></td>
                    <td className="text-sm">{a.date_from}</td><td className="text-sm">{a.date_to}</td>
                    <td style={{ fontWeight: 600 }}>{a.days_count}</td>
                    <td className="text-sm text-muted">{a.note}</td>
                    <td><span className={`badge ${a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{a.status === 'approved' ? 'Zatwierdzony' : a.status === 'rejected' ? 'Odrzucony' : 'Oczekuje'}</span></td>
                    <td>{a.status === 'pending' && <div style={{ display: 'flex', gap: 4 }}><button className="btn btn-success btn-sm" onClick={() => approve(a.id)}><FiCheck size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => reject(a.id)}><FiX size={14} /></button></div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowy wniosek o nieobecność" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Złóż wniosek</button></>}>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Pracownik *</label>
            <select className="select" value={form.profile_id} onChange={F('profile_id')}>
              <option value="" disabled>Wybierz pracownika...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
            </select>
          </div>
          <div className="input-group"><label>Typ</label><select className="select" value={form.type} onChange={F('type')}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="input-row mb-16"><div className="input-group"><label>Od *</label><input className="input" type="date" value={form.from} onChange={F('from')} /></div><div className="input-group"><label>Do *</label><input className="input" type="date" value={form.to} onChange={F('to')} /></div></div>
        <div className="input-group"><label>Uwagi</label><input className="input" value={form.note} onChange={F('note')} placeholder="Opcjonalnie..." /></div>
      </Modal>
    </div>
  );
}
