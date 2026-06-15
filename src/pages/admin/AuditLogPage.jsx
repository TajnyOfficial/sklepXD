import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatDateTime } from '../../utils/helpers';
import { 
  FiActivity, FiSearch, FiFilter, FiUser, FiEdit, FiTrash2, 
  FiDollarSign, FiPackage, FiLock, FiPlus, FiCpu, FiEye, FiClock, FiGrid
} from 'react-icons/fi';
import Modal from '../../components/Modal';

const TYPE_ICONS = {
  login: <FiLock size={14} style={{ color: 'var(--success)' }} />,
  logout: <FiLock size={14} style={{ color: 'var(--text-muted)' }} />,
  create: <FiPlus size={14} style={{ color: 'var(--accent)' }} />,
  update: <FiEdit size={14} style={{ color: 'var(--info)' }} />,
  delete: <FiTrash2 size={14} style={{ color: 'var(--danger)' }} />,
  security: <FiLock size={14} style={{ color: 'var(--warning)' }} />,
  price: <FiDollarSign size={14} style={{ color: 'var(--warning)' }} />,
  stock: <FiPackage size={14} style={{ color: 'var(--accent)' }} />,
  approval: <FiUser size={14} style={{ color: 'var(--success)' }} />,
  edit: <FiEdit size={14} style={{ color: 'var(--text-muted)' }} />,
  delivery: <FiPackage size={14} style={{ color: 'var(--warning)' }} />,
};

const ACTION_LABELS = {
  login: 'Logowanie',
  logout: 'Wylogowanie',
  create: 'Dodanie obiektu',
  update: 'Modyfikacja',
  delete: 'Usunięcie',
  security: 'Bezpieczeństwo',
  price: 'Zmiana ceny',
  stock: 'Korekta stanu',
  approval: 'Akceptacja',
  edit: 'Edycja',
  delivery: 'Dostawa',
};

// Widok prezentujący listę chronionych logów systemowych śledzących aktywności takie jak logowania czy krytyczne zmiany danych
export default function AuditLogPage() {
  // Zbiór wszystkich pobranych zdarzeń (logów audytowych) ze StoreContext
  const { posLogs } = useStore();
  
  // Lokalne filtry wyszukiwarki: dowolny tekst oraz kategoria typu zdarzenia
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Stan do obsługi podglądu szczegółów konkretnego logu
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Tablica logów odfiltrowana zgodnie z aktualnymi nastawami wyszukiwarki tekstowej i filtra po typie (np. 'login')
  const filtered = posLogs.filter(log => {
    // 1. Search text filter
    const matchesSearch = 
      !search || 
      (log.details && log.details.toLowerCase().includes(search.toLowerCase())) || 
      (log.user && log.user.toLowerCase().includes(search.toLowerCase())) ||
      (log.type && log.type.toLowerCase().includes(search.toLowerCase()));

    // 2. Action type filter
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && log.type === filterType;
  });

  function openLogDetails(log) {
    setSelectedLog(log);
    setShowDetails(true);
  }

  return (
    <div className="page animate-fadeIn">
      
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border-primary)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiActivity size={28} style={{ color: 'var(--primary)' }} /> Logi Audytu Bezpieczeństwa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Przejrzysty rejestr wszystkich rzeczywistych operacji, zdarzeń kasowych, zmian cenowych i logowań pracowników w sklepie.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
        padding: '16px 20px', marginBottom: 24
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            className="input" 
            placeholder="Szukaj w szczegółach lub po użytkowniku..." 
            style={{ 
              width: '100%', paddingLeft: 42, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
              background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
            }} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiFilter size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="all">Wszystkie akcje</option>
            <option value="login">Zalogowanie</option>
            <option value="logout">Wylogowanie</option>
            <option value="create">Dodanie obiektów</option>
            <option value="update">Modyfikacje</option>
            <option value="delete">Usunięcia</option>
            <option value="stock">Korekta stanu / Magazyn</option>
            <option value="security">Bezpieczeństwo / Blokady</option>
          </select>
        </div>

        <span style={{
          fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--primary-light)',
          padding: '6px 12px', borderRadius: 20, fontWeight: 700, marginLeft: 'auto'
        }}>
          Znaleziono: {filtered.length} logów
        </span>
      </div>

      <div className="table-container" style={{ 
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', 
        overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
              <th style={{ padding: '16px 20px', width: 48 }}>Typ</th>
              <th style={{ padding: '16px 20px', width: 140 }}>Akcja</th>
              <th style={{ padding: '16px 20px', width: 100 }}>System</th>
              <th style={{ padding: '16px 20px', width: 180 }}>Pracownik</th>
              <th style={{ padding: '16px 20px' }}>Szczegółowy opis zdarzenia</th>
              <th style={{ padding: '16px 20px', width: 180, textAlign: 'right' }}>Sygnatura czasowa</th>
              <th style={{ padding: '16px 20px', width: 80, textAlign: 'right' }}>Szczegóły</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  <FiActivity size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <div>Brak zarejestrowanych działań spełniających kryteria.</div>
                </td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr 
                  key={log.id} 
                  style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {TYPE_ICONS[log.type] || <FiCpu size={14} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {ACTION_LABELS[log.type] || log.type}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '0.68rem', padding: '3px 8px', borderRadius: 20, fontWeight: 700,
                      background: log.register?.toLowerCase() === 'pos' ? 'rgba(59,130,246,0.12)' : log.register?.toLowerCase() === 'mobile' ? 'rgba(16,185,129,0.12)' : 'var(--accent-light)',
                      color: log.register?.toLowerCase() === 'pos' ? 'var(--info)' : log.register?.toLowerCase() === 'mobile' ? 'var(--success)' : 'var(--accent)'
                    }}>
                      {log.register || 'SYSTEM'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiUser size={13} style={{ color: 'var(--text-muted)' }} />
                      {log.user}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div style={{ maxWidth: 450, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                      {log.details}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.time)}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openLogDetails(log)} title="Pokaż szczegóły">
                      <FiEye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Szczegóły wpisu w logach audytu"
        footer={<button className="btn btn-primary" onClick={() => setShowDetails(false)}>Zamknij</button>}
      >
        {selectedLog && (
          <div>
            <div className="flex-between mb-16 p-12" style={{ background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ACTION_LABELS[selectedLog.type] || selectedLog.type}</div>
                  <span className="text-xs text-muted">ID logu: {selectedLog.id}</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem', padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                background: selectedLog.register?.toLowerCase() === 'pos' ? 'rgba(59,130,246,0.12)' : 'var(--accent-light)',
                color: selectedLog.register?.toLowerCase() === 'pos' ? 'var(--info)' : 'var(--accent)'
              }}>
                {selectedLog.register || 'SYSTEM'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span className="text-sm text-muted">Użytkownik</span>
                <span style={{ fontWeight: 600 }}>{selectedLog.user}</span>
              </div>
              <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span className="text-sm text-muted">Sygnatura czasowa</span>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{formatDateTime(selectedLog.time)}</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                <span className="text-sm text-muted display-block mb-4">Pełny opis systemowy</span>
                <p style={{ margin: 0, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {selectedLog.details}
                </p>
              </div>

              {selectedLog.rawDetails?.extra && (
                <div style={{ marginTop: 12, borderTop: '2px dashed var(--border-light)', paddingTop: 16 }}>
                  <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    <FiPackage /> Szczegółowe metadane ruchu towarowego:
                  </h4>
                  <div style={{ 
                    background: 'var(--bg-tertiary)', padding: 14, borderRadius: 10, 
                    border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 
                  }}>
                    <div className="flex-between">
                      <span className="text-xs text-muted">Nazwa pozycji (encja)</span>
                      <strong style={{ fontSize: '0.85rem' }}>{selectedLog.rawDetails.extra.entity_name}</strong>
                    </div>
                    {selectedLog.rawDetails.extra.sku && (
                      <div className="flex-between">
                        <span className="text-xs text-muted">SKU / Kod</span>
                        <span className="font-mono text-xs" style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                          {selectedLog.rawDetails.extra.sku}
                        </span>
                      </div>
                    )}
                    <div className="flex-between">
                      <span className="text-xs text-muted">Typ operacji</span>
                      <span className={`badge ${selectedLog.rawDetails.extra.qty_change > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                        {selectedLog.rawDetails.extra.op_type || (selectedLog.rawDetails.extra.qty_change > 0 ? 'Wniesienie' : 'Wyniesienie')}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span className="text-xs text-muted">Ruch ilościowy</span>
                      <strong style={{ color: selectedLog.rawDetails.extra.qty_change > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {selectedLog.rawDetails.extra.qty_change > 0 ? `+${selectedLog.rawDetails.extra.qty_change}` : selectedLog.rawDetails.extra.qty_change} szt.
                      </strong>
                    </div>
                    <div className="flex-between">
                      <span className="text-xs text-muted">Bilans ilości</span>
                      <span className="font-mono text-xs text-muted">
                        {selectedLog.rawDetails.extra.qty_before} szt. &rarr; <strong>{selectedLog.rawDetails.extra.qty_after} szt.</strong>
                      </span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                      <span className="text-xs text-muted display-block mb-4">Uzasadnienie (Komentarz wpisany ręcznie)</span>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                        &ldquo;{selectedLog.rawDetails.extra.comment || 'Brak komentarza'}&rdquo;
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
