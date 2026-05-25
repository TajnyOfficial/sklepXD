import { formatCurrency } from '../../utils/helpers';
import { FiTrendingUp, FiBarChart2, FiPieChart, FiUsers, FiDownload } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const MONTHLY_DATA = [];

const CATEGORY_MARGIN = [];

const VAT_SUMMARY = { output: 0, input: 0, toPay: 0 };

const SELLER_RANKING = [];

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#1a1c28', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>)}
    </div>
  );
};

/* Zaawansowany moduł analityczny prezentujący dane finansowe (P&L, marże, podatki) w formie interaktywnych wykresów (Recharts) */
export default function AnalyticsPage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Analityka finansowa</h1><p>P&L, marże, VAT, ranking sprzedawców</p></div>
        <button className="btn btn-secondary"><FiDownload size={16} /> Eksport JPK_V7</button>
      </div>

      {/* P&L Chart */}
      <div className="card mb-24">
        <h3 className="mb-16"><FiTrendingUp size={18} style={{ marginRight: 8 }} />Przychody vs Koszty (P&L)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={MONTHLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={v => `${v/1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" name="Przychody" fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="costs" name="Koszty" fill="#ef4444" radius={[4,4,0,0]} opacity={0.7} />
            <Bar dataKey="profit" name="Zysk" fill="#22c55e" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 24 }}>
        {/* Margin by category */}
        <div className="card">
          <h3 className="mb-16"><FiPieChart size={18} style={{ marginRight: 8 }} />Marża wg kategorii</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Kategoria</th><th>Przychód</th><th>Marża</th></tr></thead>
              <tbody>
                {CATEGORY_MARGIN.sort((a,b) => b.margin - a.margin).map((c, i) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{formatCurrency(c.revenue)}</td>
                    <td><span className={`badge ${c.margin > 40 ? 'badge-success' : c.margin > 30 ? 'badge-warning' : 'badge-danger'}`}>{c.margin.toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VAT Summary */}
        <div className="card">
          <h3 className="mb-16"><FiBarChart2 size={18} style={{ marginRight: 8 }} />Podsumowanie VAT (miesiąc)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>VAT należny (sprzedaż)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(VAT_SUMMARY.output)}</span>
            </div>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>VAT naliczony (zakupy)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(VAT_SUMMARY.input)}</span>
            </div>
            <div className="flex-between" style={{ padding: 16, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', border: ' 1px solid var(--danger)' }}>
              <span style={{ fontWeight: 600 }}>VAT do zapłaty</span>
              <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--danger)' }}>{formatCurrency(VAT_SUMMARY.toPay)}</span>
            </div>
          </div>

          <h3 className="mb-16 mt-24"><FiUsers size={18} style={{ marginRight: 8 }} />Ranking sprzedawców</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>#</th><th>Sprzedawca</th><th>Obrót</th><th>Transakcje</th><th>Śr. paragon</th></tr></thead>
              <tbody>
                {SELLER_RANKING.map((s, i) => (
                  <tr key={s.name}>
                    <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(s.sales)}</td>
                    <td>{s.transactions}</td>
                    <td>{formatCurrency(s.avgTicket)}</td>
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
