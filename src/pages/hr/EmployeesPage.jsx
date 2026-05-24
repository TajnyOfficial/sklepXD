import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiUsers, FiPlus, FiEdit, FiTrash2, FiPhone, FiMail, FiKey, FiRefreshCw, FiToggleLeft, FiToggleRight, FiCalendar, FiDollarSign } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

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

// Mapowanie: etykieta UI → klucz DB
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
const EMPTY = { name: '', role: 'Kasjer', phone: '', email: '', hired: '', hourly: '28', active: true, pin: '' };

function generatePin() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0]).slice(-4).padStart(4, '0');
}

// Normalizuj pracownika niezależnie od źródła (DB vs. lokalny)
function normalizeEmployee(e) {
  return {
    ...e,
    name: e.name || e.full_name || '—',
    role: e.role || 'cashier',
    phone: e.phone || null,
    email: e.email || null,
    hired: e.hired || e.hired_at || null,
    hourly: e.hourly ?? e.hourly_rate ?? 0,
    active: e.active ?? e.is_active ?? true,
    pin: e.pin || e.demo_pin || null,
  };
}

/**
 * Panel zarządzania Personelem (HR).
 * 
 * Interfejs dla administratora i managera umożliwiający:
 * - Dodawanie, edycję i usuwanie pracowników z systemu.
 * - Nadawanie stanowisk i uprawnień systemowych (Role).
 * - Generowanie oraz przypisywanie 4-cyfrowych kodów PIN używanych do autoryzacji sprzętowej w Kiosku/POS.
 * - Włączanie/wyłączanie kont bez konieczności ich trwałego usunięcia z bazy.
 * 
 * @returns {JSX.Element} Widok panelu pracowników
 */
export default function EmployeesPage() {
  const { employees, saveEmployee, deleteEmployee, toggleEmployeeActive } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const normalized = employees.map(normalizeEmployee);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(emp) {
    setEditing(emp);
    setForm({
      name: emp.name || emp.full_name || '',
      role: ROLE_LABELS[emp.role] || emp.role || 'Kasjer',
      phone: emp.phone || '',
      email: emp.email || '',
      hired: emp.hired || emp.hired_at || '',
      hourly: String(emp.hourly ?? emp.hourly_rate ?? 28),
      active: emp.active ?? emp.is_active ?? true,
      pin: emp.pin || emp.demo_pin || '',
    });
    setShowModal(true);
  }

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

  async function handleDelete(emp) {
    if (!confirm(`Usunąć pracownika "${emp.name}"?`)) return;
    try {
      await deleteEmployee(emp.id);
      toast.success('Pracownik usunięty');
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

  const F = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const activeCount = normalized.filter(e => e.active).length;

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pracownicy</h1>
          <p>{normalized.length} pracowników · {activeCount} aktywnych</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-employee">
          <FiPlus size={16} /> Dodaj pracownika
        </button>
      </div>

      {normalized.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <FiUsers size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Brak pracowników</p>
          <p style={{ fontSize: '0.85rem' }}>Dodaj pierwszego pracownika klikając przycisk powyżej</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
          {normalized.map(emp => {
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
                  borderLeft: `3px solid ${color}`,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Nagłówek karty */}
                <div className="flex-between mb-12">
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${color}88, ${color})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#fff', fontSize: '0.9rem', flexShrink: 0,
                      boxShadow: `0 2px 8px ${color}40`,
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
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(emp)} title="Usuń" style={{ color: 'var(--danger)' }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Dane kontaktowe */}
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

                {/* Stopka: PIN + status */}
                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {/* PIN */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiKey size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs text-muted">
                      {emp.pin
                        ? <span style={{ letterSpacing: '0.1em' }}>{'•'.repeat(Math.min(emp.pin.length, 8))}</span>
                        : <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>brak PIN</span>
                      }
                    </span>
                  </div>

                  {/* Przełącznik aktywności */}
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

      {/* Modal */}
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
      </Modal>
    </div>
  );
}
