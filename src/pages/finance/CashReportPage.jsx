import { formatCurrency } from '../../utils/helpers';
import { FiDollarSign, FiPrinter } from 'react-icons/fi';

/**
 * Widok modułu CashReportPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z CashReport.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony CashReportPage
 */
export default function CashReportPage() {
  const data = { opening: 500, sales_cash: 633.78, deposits: 100, withdrawals: 200, closing: 1033.78, physical: 1030.00 };
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Raporty kasowe</h1><p>Stan kasy fizycznej, zgodność z systemem</p></div>
        <button className="btn btn-primary"><FiPrinter size={16} /> Drukuj raport</button>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 className="mb-16">Raport kasowy — {new Date().toLocaleDateString('pl-PL')}</h3>
        {[
          ['Saldo otwarcia', data.opening, 'var(--text-primary)'],
          ['+ Sprzedaż gotówkowa', data.sales_cash, 'var(--success)'],
          ['+ Wpłaty (KP)', data.deposits, 'var(--success)'],
          ['- Wypłaty (KW)', data.withdrawals, 'var(--danger)'],
          ['= Stan systemowy', data.closing, 'var(--accent-light)'],
          ['Stan fizyczny (przeliczono)', data.physical, 'var(--text-heading)'],
        ].map(([label, val, color], i) => (
          <div key={i} className="flex-between" style={{ padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--border-light)' : 'none' }}>
            <span className={i === 5 ? 'font-bold' : ''}>{label}</span>
            <span style={{ fontWeight: i >= 4 ? 700 : 500, fontSize: i >= 4 ? '1.125rem' : '1rem', color }}>{formatCurrency(val)}</span>
          </div>
        ))}
        <div className="flex-between mt-16" style={{ padding: '12px 16px', background: Math.abs(data.closing - data.physical) < 5 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontWeight: 600 }}>Różnica</span>
          <span style={{ fontWeight: 700, color: Math.abs(data.closing - data.physical) < 5 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(data.closing - data.physical)}
          </span>
        </div>
      </div>
    </div>
  );
}
