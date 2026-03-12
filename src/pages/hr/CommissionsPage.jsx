import { formatCurrency } from '../../utils/helpers';
import { FiDollarSign, FiTrendingUp, FiTarget, FiAward } from 'react-icons/fi';

const DEMO = [
  { name: 'Katarzyna Dąbrowska', sales: 32500, indiv: 975.00, team: 500, category: 200, total: 1675.00 },
  { name: 'Piotr Wiśniewski', sales: 24800, indiv: 744.00, team: 500, category: 150, total: 1394.00 },
  { name: 'Anna Nowak', sales: 18200, indiv: 546.00, team: 500, category: 100, total: 1146.00 },
];

export default function CommissionsPage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Prowizje</h1><p>Indywidualne, zespołowe, asortymentowe — okres: marzec 2026</p></div>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card"><div className="stat-icon indigo"><FiDollarSign /></div><span className="stat-label">Prowizje łącznie</span><span className="stat-value">{formatCurrency(DEMO.reduce((s, d) => s + d.total, 0))}</span></div>
        <div className="stat-card"><div className="stat-icon green"><FiTarget /></div><span className="stat-label">Cel sklepu</span><span className="stat-value">{formatCurrency(100000)}</span></div>
        <div className="stat-card"><div className="stat-icon amber"><FiTrendingUp /></div><span className="stat-label">Realizacja</span><span className="stat-value">75.5%</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Sprzedawca</th><th>Obrót</th><th>Prowizja indyw. (3%)</th><th>Premia zespołowa</th><th>Bonus asortymentowy</th><th>Łącznie</th></tr></thead>
          <tbody>
            {DEMO.map(d => (
              <tr key={d.name}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td>{formatCurrency(d.sales)}</td>
                <td>{formatCurrency(d.indiv)}</td>
                <td>{formatCurrency(d.team)}</td>
                <td>{formatCurrency(d.category)}</td>
                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
