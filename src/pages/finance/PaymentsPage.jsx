import { formatCurrency } from '../../utils/helpers';
import { FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiCalendar, FiBell } from 'react-icons/fi';

const RECEIVABLES = [];

const PAYABLES = [];

/* Ekran kontroli przepływów pieniężnych (Cash Flow) monitorujący należności od klientów i zobowiązania wobec dostawców */
export default function PaymentsPage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Płatności i rozrachunki</h1><p>Należności, zobowiązania, monitorowanie Cash Flow</p></div>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><div className="stat-icon green"><FiArrowUpCircle /></div><span className="stat-label">Należności (do odebrania)</span><span className="stat-value">{formatCurrency(RECEIVABLES.reduce((s, r) => s + r.amount, 0))}</span></div>
        <div className="stat-card"><div className="stat-icon red"><FiArrowDownCircle /></div><span className="stat-label">Zobowiązania (do zapłaty)</span><span className="stat-value">{formatCurrency(PAYABLES.reduce((s, p) => s + p.amount, 0))}</span></div>
        <div className="stat-card"><div className="stat-icon amber"><FiBell /></div><span className="stat-label">Po terminie</span><span className="stat-value">{RECEIVABLES.filter(r => r.daysLeft < 0).length + PAYABLES.filter(p => p.daysLeft < 0).length}</span></div>
      </div>
      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <h3 className="mb-16" style={{ color: 'var(--success)' }}><FiArrowUpCircle size={18} style={{ marginRight: 8 }} />Należności</h3>
          <div className="table-container">
            <table><thead><tr><th>Klient</th><th>Faktura</th><th>Kwota</th><th>Termin</th><th></th></tr></thead>
              <tbody>{RECEIVABLES.map(r => (
                <tr key={r.id}>
                  <td>{r.customer}</td><td className="font-mono text-sm">{r.invoice}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                  <td><span className={`badge ${r.daysLeft < 0 ? 'badge-danger' : 'badge-ghost'}`}>{r.due} {r.daysLeft < 0 && `(${Math.abs(r.daysLeft)} dni po terminie)`}</span></td>
                  <td><button className="btn btn-ghost btn-sm"><FiBell size={14} /> Monit</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-16" style={{ color: 'var(--danger)' }}><FiArrowDownCircle size={18} style={{ marginRight: 8 }} />Zobowiązania</h3>
          <div className="table-container">
            <table><thead><tr><th>Odbiorca</th><th>Dokument</th><th>Kwota</th><th>Termin</th></tr></thead>
              <tbody>{PAYABLES.map(p => (
                <tr key={p.id}>
                  <td>{p.supplier}</td><td className="text-sm">{p.invoice}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td><span className={`badge ${p.daysLeft <= 3 ? 'badge-danger' : p.daysLeft <= 7 ? 'badge-warning' : 'badge-ghost'}`}>{p.due} ({p.daysLeft} dni)</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
