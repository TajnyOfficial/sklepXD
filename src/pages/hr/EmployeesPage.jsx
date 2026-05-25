import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiUsers, FiPlus, FiEdit, FiTrash2, FiPhone, FiMail, FiKey, FiRefreshCw, FiToggleLeft, FiToggleRight, FiCalendar, FiDollarSign, FiFileText, FiDownload } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Mapowanie: klucz DB → etykieta UI
const ROLE_LABELS = {
  admin: 'Administrator',
  shift_manager: 'Kierownik Zmiany',
  sales_manager: 'Kierownik Sprzedaży',
  warehouse_manager: 'Kierownik Magazynu',
  sanitation_manager: 'Kierownik Serwisu',
  cashier: 'Kasjer',
  warehouse_worker: 'Magazynier',
  cleaner: 'Pracownik Sprzątający',
};

const ROLE_KEYS = {
  'Administrator': 'admin',
  'Kierownik Zmiany': 'shift_manager',
  'Kierownik Sprzedaży': 'sales_manager',
  'Kierownik Magazynu': 'warehouse_manager',
  'Kierownik Serwisu': 'sanitation_manager',
  'Kasjer': 'cashier',
  'Magazynier': 'warehouse_worker',
  'Pracownik Sprzątający': 'cleaner',
};

const ROLE_COLORS = {
  admin: '#ef4444',
  shift_manager: '#f97316',
  sales_manager: '#8b5cf6',
  warehouse_manager: '#3b82f6',
  sanitation_manager: '#06b6d4',
  cashier: '#10b981',
  warehouse_worker: '#6366f1',
  cleaner: '#64748b',
};

const ROLES_LIST = Object.keys(ROLE_KEYS);
const EMPTY = { name: '', role: 'Kasjer', phone: '', email: '', hired: '', hourly: '28', active: true, pin: '', system_login: '', system_password: '' };

function generatePin() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0]).slice(-4).padStart(4, '0');
}

function normalizeEmployee(e) {
  return {
    ...e,
    name: e.name || e.full_name || '—',
    role: e.role || 'cashier',
    phone: e.phone || null,
    email: e.email || null,
    system_login: e.system_login || null,
    system_password: e.system_password || null,
    hired: e.hired || e.hired_at || null,
    hourly: e.hourly ?? e.hourly_rate ?? 0,
    active: e.active ?? e.is_active ?? true,
    pin: e.pin || e.demo_pin || null,
  };
}

/* Zaawansowany moduł zarządzania bazą personelu: role (RBAC), stawki godzinowe, kody PIN (do Kiosku) oraz obsługa cyfrowych "Akt Osobowych" (skany umów z Supabase) */
export default function EmployeesPage() {
  /* Pobranie narzędzi do manipulacji danymi pracownika z globalnego kontekstu */
  const { employees, saveEmployee, deleteEmployee, toggleEmployeeActive, isSupabase } = useStore();
  
  /* Rozbudowane stany UI kontrolujące modale (edycja/usuwanie), filtry (np. pokaż zarchiwizowanych) oraz formularze */
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showInactive, setShowInactive] = useState(false);
  
  const [activeTab, setActiveTab] = useState(0); // 0 = Dane, 1 = Akta
  const [employeeFiles, setEmployeeFiles] = useState([]);
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('contract');

  const normalized = employees.map(normalizeEmployee);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setActiveTab(0);
    setShowModal(true);
  }

  /* Inicjalizacja modalu edycji - ładuje dane pracownika oraz wykonuje asynchroniczne zapytanie do Supabase w celu pobrania przypisanych do niego plików (Akt) */
  async function openEdit(emp) {
    setEditing(emp);
    setForm({
      name: emp.name || emp.full_name || '',
      role: ROLE_LABELS[emp.role] || emp.role || 'Kasjer',
      phone: emp.phone || '',
      email: emp.email || '',
      system_login: emp.system_login || '',
      system_password: emp.system_password || '',
      hired: emp.hired || emp.hired_at || '',
      hourly: String(emp.hourly ?? emp.hourly_rate ?? 28),
      active: emp.active ?? emp.is_active ?? true,
      pin: emp.pin || emp.demo_pin || '',
    });
    setActiveTab(0);
    setShowModal(true);
    
    if (isSupabase && emp.id) {
      try {
        const { data, error } = await supabase.from('employee_files').select('*').eq('profile_id', emp.id);
        if (!error && data) {
          setEmployeeFiles(data);
        }
      } catch(e) {
        console.warn('Failed to fetch employee files', e);
      }
    }
  }

  /* Główne przesłanie formularza: waliduje PIN, upewnia się że podano nazwisko i zleca zapis/update do bazy */
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Podaj imię i nazwisko'); return; }
    if (form.pin && (form.pin.length !== 4 || !/^\d+$/.test(form.pin))) {
      toast.error('PIN musi mieć dokładnie 4 cyfry'); return;
    }
    try {
      await saveEmployee(form, editing?.id || null);
      toast.success(editing ? 'Pracownik zaktualizowany' : 'Pracownik dodany');
      setShowModal(false);
    } catch (err) {
      toast.error(`Błąd zapisu: ${err.message || 'Sprawdź połączenie'}`);
    }
  }

  function handleDeleteClick(emp) {
    setDeleteModal(emp);
  }

  /* Bezpieczna metoda usuwania: nie kasuje rekordu, a jedynie odcina dostęp i chowa z list (tzw. Soft Delete / Archiwizacja) */
  async function handleArchive(emp) {
    try {
      if (emp.active) {
        await toggleEmployeeActive(emp.id);
      }
      toast.success('Pracownik został zarchiwizowany (zmieniono status na nieaktywny)');
      setDeleteModal(null);
    } catch (err) {
      toast.error(`Błąd archiwizacji: ${err.message}`);
    }
  }

  /* Trwałe i bezpowrotne usunięcie danych osobowych pracownika z bazy, zgodne z wymogami RODO (jeśli nie chcemy archiwizować) */
  async function handlePermanentDelete(emp) {
    if (!confirm(`Czy na pewno chcesz bezpowrotnie usunąć pracownika "${emp.name}" i wszystkie jego dane? Tej operacji nie można cofnąć.`)) return;
    try {
      const res = await deleteEmployee(emp.id);
      if (!res || !res.archived) {
        toast.success('Pracownik trwale usunięty');
      }
      setDeleteModal(null);
    } catch (err) {
      toast.error(`Błąd usunięcia: ${err.message}`);
    }
  }

  async function handleToggle(id) {
    try {
      await toggleEmployeeActive(id);
      toast.success('Status zmieniony');
    } catch (err) {
      toast.error(`Błąd: ${err.message}`);
    }
  }

  async function handleAddFile() {
    if (!isSupabase) return toast.error('Wymagane połączenie z Supabase');
    if (!newFileName || !newFileUrl) return toast.error('Podaj nazwę i URL pliku');
    if (!editing) return toast.error('Zapisz pracownika najpierw');

    try {
      const row = {
        profile_id: editing.id,
        file_name: newFileName,
        file_url: newFileUrl,
        document_type: newFileType
      };
      const { data, error } = await supabase.from('employee_files').insert(row).select().single();
      if (error) throw error;
      setEmployeeFiles(prev => [data, ...prev]);
      setNewFileName('');
      setNewFileUrl('');
      toast.success('Dokument dodany');
    } catch(e) {
      toast.error('Błąd: ' + e.message);
    }
  }

  async function handleDeleteFile(fileId) {
    if (!confirm('Usunąć ten dokument?')) return;
    try {
      const { error } = await supabase.from('employee_files').delete().eq('id', fileId);
      if (error) throw error;
      setEmployeeFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('Usunięto');
    } catch(e) {
      toast.error('Błąd: ' + e.message);
    }
  }

  const F = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const activeCount = normalized.filter(e => e.active).length;
  const displayEmployees = showInactive ? normalized : normalized.filter(e => e.active);

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pracownicy</h1>
          <p>{normalized.length} wszystkich · {activeCount} aktywnych</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setShowInactive(!showInactive)}
            style={{ fontWeight: 600, color: showInactive ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {showInactive ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />} 
            Pokaż zarchiwizowanych
          </button>
          <button className="btn btn-primary" onClick={openAdd} id="btn-add-employee">
            <FiPlus size={16} /> Dodaj pracownika
          </button>
        </div>
      </div>

      {normalized.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <FiUsers size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Brak pracowników</p>
          <p style={{ fontSize: '0.85rem' }}>Dodaj pierwszego pracownika klikając przycisk powyżej</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
          {displayEmployees.map(emp => {
            const roleKey = emp.role;
            const roleLabel = ROLE_LABELS[roleKey] || roleKey;
            const color = ROLE_COLORS[roleKey] || 'var(--accent)';
            const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

            return (
              <div
                key={emp.id}
                className="card"
                style={{
                  opacity: emp.active ? 1 : 0.55,
                  border: ` 1px solid ${color}`,
                  transition: 'opacity 0.2s',
                }}
              >
                <div className="flex-between mb-12">
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${color}88, ${color})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#fff', fontSize: '0.9rem', flexShrink: 0,
                      
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{emp.name}</div>
                      <div className="text-xs" style={{ color, marginTop: 2 }}>{roleLabel}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)} title="Edytuj">
                      <FiEdit size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteClick(emp)} title="Usuń" style={{ color: 'var(--danger)' }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {emp.phone && (
                    <div className="flex gap-8 text-muted" style={{ alignItems: 'center' }}>
                      <FiPhone size={11} /> <span>{emp.phone}</span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex gap-8 text-muted" style={{ alignItems: 'center' }}>
                      <FiMail size={11} /> <span>{emp.email}</span>
                    </div>
                  )}
                  {emp.hired && (
                    <div className="flex gap-8 text-muted" style={{ alignItems: 'center' }}>
                      <FiCalendar size={11} /> <span>od {emp.hired}</span>
                    </div>
                  )}
                  {(emp.hourly > 0) && (
                    <div className="flex gap-8 text-muted" style={{ alignItems: 'center' }}>
                      <FiDollarSign size={11} /> <span>{emp.hourly} zł/h</span>
                    </div>
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiKey size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs text-muted">
                      {emp.pin
                        ? <span style={{ letterSpacing: '0.1em' }}>{'•'.repeat(Math.min(emp.pin.length, 8))}</span>
                        : <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>brak PIN</span>
                      }
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(emp.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 20,
                      border: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 600,
                      background: emp.active ? 'var(--success-bg, #d1fae5)' : 'var(--danger-bg, #fee2e2)',
                      color: emp.active ? '#065f46' : '#991b1b',
                      transition: 'all 0.2s',
                    }}
                    title={emp.active ? 'Kliknij aby dezaktywować' : 'Kliknij aby aktywować'}
                  >
                    {emp.active
                      ? <><FiToggleRight size={14} /> Aktywny</>
                      : <><FiToggleLeft size={14} /> Nieaktywny</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edytuj pracownika' : 'Nowy pracownik'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz zmiany' : 'Dodaj'}</button>
          </>
        }
      >
        <div className="tabs mb-16" style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <button className={`tab-btn ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 0 ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 0 ? 600 : 400 }}>Dane pracownika</button>
          {editing && <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 1 ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 1 ? 600 : 400 }}>Akta osobowe</button>}
        </div>

        {activeTab === 0 && (
          <div>
            <div className="input-row mb-16">
              <div className="input-group">
                <label>Imię i nazwisko *</label>
                <input className="input" value={form.name} onChange={F('name')} placeholder="Jan Kowalski" />
              </div>
              <div className="input-group">
                <label>Stanowisko</label>
                <select className="select" value={form.role} onChange={F('role')}>
                  {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="input-row mb-16">
              <div className="input-group">
                <label>Telefon</label>
                <input className="input" value={form.phone} onChange={F('phone')} placeholder="501 234 567" />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input className="input" type="email" value={form.email} onChange={F('email')} placeholder="jan@firma.pl" />
              </div>
            </div>

            <h4 className="mb-8" style={{ marginTop: 16 }}>Dostęp do systemu</h4>
            <div className="input-row mb-16">
              <div className="input-group">
                <label>Login systemowy</label>
                <input className="input" value={form.system_login} onChange={F('system_login')} placeholder="np. jkowalski" />
              </div>
              <div className="input-group">
                <label>Hasło systemowe</label>
                <input className="input" type="text" value={form.system_password} onChange={F('system_password')} placeholder="***" />
              </div>
            </div>

            <div className="input-row mb-16">
              <div className="input-group">
                <label>Data zatrudnienia</label>
                <input className="input" type="date" value={form.hired} onChange={F('hired')} />
              </div>
              <div className="input-group">
                <label>Stawka godzinowa (zł)</label>
                <input className="input" type="number" min="0" step="0.5" value={form.hourly} onChange={F('hourly')} />
              </div>
            </div>

            <div className="input-group mb-16">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiKey size={13} /> PIN dostępu (4 cyfry)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={F('pin')}
                  placeholder="np. 1234"
                  style={{ letterSpacing: '0.2em', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setForm(p => ({ ...p, pin: generatePin() }))}
                  title="Generuj losowy PIN"
                  style={{ flexShrink: 0 }}
                >
                  <FiRefreshCw size={14} /> Generuj
                </button>
              </div>
              {form.pin && (
                <div className="text-xs mt-4" style={{ color: 'var(--warning)' }}>
                  ⚠️ Zanotuj PIN — pracownik będzie go potrzebował do logowania w kiosku
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Status</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" name="active" checked={form.active === true} onChange={() => setForm(p => ({ ...p, active: true }))} />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Aktywny</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" name="active" checked={form.active === false} onChange={() => setForm(p => ({ ...p, active: false }))} />
                  <span style={{ color: 'var(--text-muted)' }}>Nieaktywny</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <div className="card mb-16" style={{ background: 'var(--bg-highlight)', padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Nowy dokument</div>
              <div className="input-row mb-8">
                <div className="input-group">
                  <input className="input select-sm" placeholder="Nazwa pliku np. Umowa o pracę" value={newFileName} onChange={e => setNewFileName(e.target.value)} />
                </div>
                <div className="input-group">
                  <select className="select select-sm" value={newFileType} onChange={e => setNewFileType(e.target.value)}>
                    <option value="contract">Umowa</option>
                    <option value="medical">Badania lekarskie</option>
                    <option value="training">Szkolenie BHP</option>
                    <option value="other">Inne</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-8">
                <input className="input select-sm" placeholder="URL dokumentu..." style={{ flex: 1 }} value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} />
                <button className="btn btn-secondary btn-sm" onClick={handleAddFile}><FiPlus /> Dodaj</button>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Nazwa</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employeeFiles.map(f => (
                    <tr key={f.id}>
                      <td>
                        <span className="badge badge-ghost">
                          {f.document_type === 'contract' ? 'Umowa' : 
                           f.document_type === 'medical' ? 'Badania' : 
                           f.document_type === 'training' ? 'BHP' : 'Inne'}
                        </span>
                      </td>
                      <td>
                        <a href={f.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none' }}>
                          <FiFileText /> {f.file_name}
                        </a>
                      </td>
                      <td className="text-xs text-muted">{f.uploaded_at?.split('T')[0]}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteFile(f.id)}><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                  {employeeFiles.length === 0 && (
                    <tr><td colSpan="4" className="text-center p-20 text-muted">Brak dokumentów</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Opcje usuwania pracownika"
        footer={
          <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Anuluj</button>
        }
      >
        {deleteModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Wybierz, co chcesz zrobić z pracownikiem <strong>{deleteModal.name}</strong>:
            </p>
            
            <div 
              style={{ border: '1px solid var(--border-light)', padding: 16, borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => handleArchive(deleteModal)}
            >
              <h4 style={{ color: 'var(--warning)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiToggleLeft /> Archiwizuj (Zalecane)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Pracownik straci dostęp do systemu i Kiosku, ale jego dane, przepracowane godziny i historia sprzedaży zostaną zachowane w archiwum.
              </p>
            </div>

            <div 
              style={{ border: '1px solid var(--danger-border, #991b1b)', padding: 16, borderRadius: 12, background: 'var(--danger-bg, #fee2e2)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => handlePermanentDelete(deleteModal)}
            >
              <h4 style={{ color: '#991b1b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiTrash2 /> Usuń trwale z danymi
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', opacity: 0.8, margin: 0 }}>
                Pracownik zostanie bezpowrotnie skasowany ze wszystkimi powiązanymi danymi z bazy. Tej operacji nie można cofnąć.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
