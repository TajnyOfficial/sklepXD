import { formatCurrency } from '../../utils/helpers';
import { FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiCalendar, FiBell } from 'react-icons/fi';

const RECEIVABLES = [
  { id: 1, customer: 'ElektroMont S.A.', invoice: 'FV/2026/03/002', amount: 5670.00, due: '2026-03-25', daysLeft: 13 },
  { id: 2, customer: 'Dom i Ogród Sp.j.', invoice: 'FV/2026/02/022', amount: 3420.00, due: '2026-03-06', daysLeft: -6 },
];

const PAYABLES = [
  { id: 1, supplier: 'Dekoral Dystrybucja', invoice: 'FZ/2026/03/003', amount: 4200.00, due: '2026-03-28', daysLeft: 16 },
  { id: 2, supplier: 'Drukarnia Express', invoice: 'FZ/2026/03/005', amount: 680.00, due: '2026-03-20', daysLeft: 8 },
  { id: 3, supplier: 'ZUS', invoice: 'Składki 03/2026', amount: 3200.00, due: '2026-03-15', daysLeft: 3 },
  { id: 4, supplier: 'Urząd Skarbowy', invoice: 'VAT-7 02/2026', amount: 4500.00, due: '2026-03-25', daysLeft: 13 },
];

/**
 * Widok modułu PaymentsPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Payments.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony PaymentsPage
 */
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
