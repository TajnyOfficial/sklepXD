import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatDateTime } from '../../utils/helpers';
import { 
  FiActivity, FiSearch, FiFilter, FiUser, FiEdit, FiTrash2, 
  FiDollarSign, FiPackage, FiLock, FiPlus, FiCpu, FiTrendingUp 
} from 'react-icons/fi';

const TYPE_ICONS = {
  login: <FiLock size={14} style={{ color: '#10b981' }} />,
  logout: <FiLock size={14} style={{ color: '#64748b' }} />,
  create: <FiPlus size={14} style={{ color: '#8b5cf6' }} />,
  update: <FiEdit size={14} style={{ color: '#3b82f6' }} />,
  delete: <FiTrash2 size={14} style={{ color: '#ef4444' }} />,
  security: <FiLock size={14} style={{ color: '#f59e0b' }} />,
  price: <FiDollarSign size={14} style={{ color: '#fbbf24' }} />,
  stock: <FiPackage size={14} style={{ color: '#a855f7' }} />,
  approval: <FiUser size={14} style={{ color: '#34d399' }} />,
  edit: <FiEdit size={14} style={{ color: '#94a3b8' }} />,
  delivery: <FiPackage size={14} style={{ color: '#f97316' }} />,
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

/**
 * Podgląd systemowych logów audytowych (Audit Trails).
 * 
 * Niezwykle ważny moduł bezpieczeństwa używany do kontroli aktywności w aplikacji.
 * Rejestruje kluczowe operacje:
 * - Kto i kiedy się logował/wylogował, używając którego urządzenia (POS/Mobile).
 * - Raporty dotyczące edycji cen towarów i krytycznych modyfikacji.
 * - Operacje przeprowadzane w szufladzie kasowej (KP, KW, X, Z).
 * - Zmiany w ustawieniach systemu.
 * 
 * Logi nie mogą być ręcznie usuwane przez użytkownika (ochrona integralności w Supabase RLS).
 * 
 * @returns {JSX.Element} Widok logów bezpieczeństwa
 */
export default function AuditLogPage() {
  const { posLogs } = useStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  return (
    <div className="page animate-fadeIn" style={{ padding: 24, color: '#f8fafc', background: '#0b0f19', minHeight: '100vh' }}>
      
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiActivity size={28} style={{ color: '#3b82f6' }} /> Logi Audytu Bezpieczeństwa
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
            Przejrzysty rejestr wszystkich rzeczywistych operacji, zdarzeń kasowych, zmian cenowych i logowań pracowników w sklepie.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        background: '#131926', border: '1.5px solid #1e293b', borderRadius: 16,
        padding: '16px 20px', marginBottom: 24
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            className="input" 
            placeholder="Szukaj w szczegółach lub po użytkowniku..." 
            style={{ 
              width: '100%', paddingLeft: 42, paddingRight: 14, paddingVertical: 10,
              background: '#0e131f', border: '1.5px solid #1e293b', borderRadius: 10,
              color: '#f8fafc', fontSize: '0.85rem', outline: 'none'
            }} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* Action Type Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiFilter size={15} style={{ color: '#64748b' }} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '10px 14px', background: '#0e131f', border: '1.5px solid #1e293b',
              borderRadius: 10, color: '#cbd5e1', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="all">Wszystkie akcje</option>
            <option value="login">Zalogowanie</option>
            <option value="logout">Wylogowanie</option>
            <option value="create">Dodanie obiektów</option>
            <option value="update">Modyfikacje</option>
            <option value="delete">Usunięcia</option>
            <option value="security">Bezpieczeństwo / Blokady</option>
          </select>
        </div>

        {/* Counter Badge */}
        <span style={{
          fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)',
          padding: '6px 12px', borderRadius: 20, fontWeight: 700, marginLeft: 'auto'
        }}>
          Znaleziono: {filtered.length} logów
        </span>
      </div>

      {/* Table Container */}
      <div className="table-container" style={{ 
        background: '#131926', border: '1.5px solid #1e293b', borderRadius: 20, 
        overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#0e131f', borderBottom: '1.5px solid #1e293b', textAlign: 'left' }}>
              <th style={{ padding: '16px 20px', width: 48 }}>Typ</th>
              <th style={{ padding: '16px 20px', width: 140 }}>Akcja</th>
              <th style={{ padding: '16px 20px', width: 100 }}>System</th>
              <th style={{ padding: '16px 20px', width: 180 }}>Pracownik</th>
              <th style={{ padding: '16px 20px' }}>Szczegółowy opis zdarzenia</th>
              <th style={{ padding: '16px 20px', width: 180, textAlign: 'right' }}>Sygnatura czasowa</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <FiActivity size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <div>Brak zarejestrowanych działań spełniających kryteria.</div>
                </td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr 
                  key={log.id} 
                  style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {TYPE_ICONS[log.type] || <FiCpu size={14} style={{ color: '#cbd5e1' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc' }}>
                    {ACTION_LABELS[log.type] || log.type}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '0.68rem', padding: '3px 8px', borderRadius: 20, fontWeight: 700,
                      background: log.register?.toLowerCase() === 'pos' ? 'rgba(59,130,246,0.12)' : log.register?.toLowerCase() === 'mobile' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)',
                      color: log.register?.toLowerCase() === 'pos' ? '#60a5fa' : log.register?.toLowerCase() === 'mobile' ? '#34d399' : '#a78bfa'
                    }}>
                      {log.register || 'SYSTEM'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiUser size={13} style={{ color: '#64748b' }} />
                      {log.user}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {log.details}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.time)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
