import { useState } from 'react';
import { formatDateTime } from '../../utils/helpers';
import { FiActivity, FiSearch, FiFilter, FiUser, FiEdit, FiTrash2, FiDollarSign, FiPackage, FiLock } from 'react-icons/fi';

const DEMO_LOGS = [
  { id: 1, action: 'Zmiana ceny', entity: 'Farba akrylowa biała 10L Dekoral', user: 'Katarzyna Dąbrowska', details: '139.99 → 149.99 PLN', type: 'price', time: '2026-03-12T14:30:00Z' },
  { id: 2, action: 'Usunięto zamówienie', entity: 'ZAM-2026/007', user: 'Anna Nowak', details: 'Powód: duplikat', type: 'delete', time: '2026-03-12T13:15:00Z' },
  { id: 3, action: 'Korekta stanu magazynowego', entity: 'Śruba M10x60 nierdzewna', user: 'Tomasz Lewandowski', details: '90 → 85 szt (bez PZ/WZ)', type: 'stock', time: '2026-03-12T11:00:00Z' },
  { id: 4, action: 'Logowanie pomyślne', entity: 'System', user: 'Jan Kowalski', details: 'IP: 192.168.1.100', type: 'security', time: '2026-03-12T08:00:00Z' },
  { id: 5, action: 'Próba logowania — błędny PIN', entity: 'System', user: 'Nieznany', details: 'PIN: ****', type: 'security', time: '2026-03-12T07:55:00Z' },
  { id: 6, action: 'Rabat > 15%', entity: 'PAR/2026/03/008', user: 'Piotr Wiśniewski', details: '20% rabat — zatwierdzony przez Annę Nowak', type: 'approval', time: '2026-03-11T16:20:00Z' },
  { id: 7, action: 'Edycja faktury', entity: 'FV/2026/02/022', user: 'Katarzyna Dąbrowska', details: 'Zmiana terminu płatności', type: 'edit', time: '2026-03-11T10:00:00Z' },
  { id: 8, action: 'Dostawa PZ przyjęta z rozbieżnościami', entity: 'PZ/2026/03/003', user: 'Maria Zielińska', details: 'Brak 2 szt., uszkodzenie 1 szt.', type: 'delivery', time: '2026-03-10T09:30:00Z' },
];

const TYPE_ICONS = {
  price: <FiDollarSign size={14} style={{ color: 'var(--warning)' }} />,
  delete: <FiTrash2 size={14} style={{ color: 'var(--danger)' }} />,
  stock: <FiPackage size={14} style={{ color: 'var(--accent-light)' }} />,
  security: <FiLock size={14} style={{ color: 'var(--info)' }} />,
  approval: <FiUser size={14} style={{ color: 'var(--success)' }} />,
  edit: <FiEdit size={14} style={{ color: 'var(--text-secondary)' }} />,
  delivery: <FiPackage size={14} style={{ color: 'var(--warning)' }} />,
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const filtered = DEMO_LOGS.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Logi audytu</h1><p>Rejestr zmian: kto, co i kiedy zmienił w systemie</p></div>
      </div>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Szukaj w logach..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th></th><th>Akcja</th><th>Obiekt</th><th>Użytkownik</th><th>Szczegóły</th><th>Czas</th></tr></thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td>{TYPE_ICONS[log.type]}</td>
                <td style={{ fontWeight: 500 }}>{log.action}</td>
                <td className="text-sm">{log.entity}</td>
                <td className="text-sm"><FiUser size={12} style={{ marginRight: 4 }} />{log.user}</td>
                <td className="text-sm text-muted">{log.details}</td>
                <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
