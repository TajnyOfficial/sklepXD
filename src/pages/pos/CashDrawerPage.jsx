import { useState } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiFileText, FiPrinter, FiCalendar } from 'react-icons/fi';

export default function CashDrawerPage() {
  const [movements] = useState([
    { id: 1, type: 'open', amount: 500, note: 'Otwarcie kasy', time: '2026-03-12T08:00:00Z', user: 'Anna Nowak' },
    { id: 2, type: 'sale', amount: 459, note: 'Sprzedaż #001', time: '2026-03-12T10:15:00Z', user: 'Piotr Wiśniewski' },
    { id: 3, type: 'sale', amount: 174.78, note: 'Sprzedaż #002', time: '2026-03-12T11:30:00Z', user: 'Piotr Wiśniewski' },
    { id: 4, type: 'withdrawal', amount: -200, note: 'Wypłata na drobne', time: '2026-03-12T12:00:00Z', user: 'Anna Nowak' },
    { id: 5, type: 'deposit', amount: 100, note: 'Wpłata bilonu', time: '2026-03-12T14:00:00Z', user: 'Anna Nowak' },
  ]);

  const balance = movements.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zarządzanie szufladą kasową</h1>
          <p>Ewidencja gotówki, wpłaty, wypłaty oraz raporty dobowe</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary"><FiPrinter size={16} /> Raport X</button>
          <button className="btn btn-primary"><FiFileText size={16} /> Raport Z (zamknięcie)</button>
        </div>
      </div>

      <div className="grid-4 mb-24">
        <div className="stat-card">
          <div className="stat-icon green"><FiDollarSign /></div>
          <span className="stat-label">Stan kasy</span>
          <span className="stat-value">{formatCurrency(balance)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo"><FiArrowUpCircle /></div>
          <span className="stat-label">Wpłaty dziś</span>
          <span className="stat-value">{formatCurrency(movements.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0))}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FiArrowDownCircle /></div>
          <span className="stat-label">Wypłaty dziś</span>
          <span className="stat-value">{formatCurrency(Math.abs(movements.filter(m => m.amount < 0).reduce((s, m) => s + m.amount, 0)))}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><FiCalendar /></div>
          <span className="stat-label">Transakcje gotówkowe</span>
          <span className="stat-value">{movements.filter(m => m.type === 'sale').length}</span>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <h3 className="mb-16">Szybkie operacje</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <FiArrowUpCircle size={18} style={{ color: 'var(--success)' }} /> Wpłata do kasy (KP)
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <FiArrowDownCircle size={18} style={{ color: 'var(--danger)' }} /> Wypłata z kasy (KW)
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <FiDollarSign size={18} style={{ color: 'var(--warning)' }} /> Otwórz szufladę
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-16">Historia operacji</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Czas</th><th>Operacja</th><th>Kwota</th><th>Pracownik</th></tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td className="text-sm">{formatDateTime(m.time)}</td>
                    <td>{m.note}</td>
                    <td style={{ fontWeight: 600, color: m.amount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {m.amount >= 0 ? '+' : ''}{formatCurrency(m.amount)}
                    </td>
                    <td className="text-sm text-muted">{m.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
