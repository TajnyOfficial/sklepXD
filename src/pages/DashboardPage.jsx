import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { PERMISSIONS } from '../utils/rbac';
import {
  FiShoppingCart, FiPackage, FiDollarSign, FiUsers,
  FiAlertTriangle, FiTruck, FiTrendingUp, FiClock,
  FiArrowUpRight, FiArrowDownRight
} from 'react-icons/fi';

/**
 * Ekran powitalny panelu administracyjnego (Dashboard).
 * 
 * Prezentuje kluczowe statystyki z całego dnia roboczego:
 * - Dzienny obrót, ilość zrealizowanych transakcji POS.
 * - Alerty dotyczące niskich stanów magazynowych (z możliwością kliknięcia).
 * - Ostatnie operacje sprzedażowe (podgląd na żywo).
 * - Zależny od ról (widoczność sekcji kontrolowana przez RBAC).
 * 
 * @returns {JSX.Element} Widok ekranu głównego (Dashboard)
 */
export default function DashboardPage() {
  const { products, transactions, documents, getLowStockProducts } = useStore();
  const { profile, can } = useAuth();

  const todayTransactions = transactions.filter(t => {
    if (!t.created_at) return false;
    const localTxDate = new Date(t.created_at).toLocaleDateString('en-CA');
    const localToday = new Date().toLocaleDateString('en-CA');
    return localTxDate === localToday;
  });

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
  const totalReturns = documents ? documents.filter(d => d.type === 'return').length : 0;
  const lowStock = getLowStockProducts();

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Witaj, {profile?.full_name} 👋</p>
        </div>
        <div className="page-header-right">
          <span className="text-sm text-muted">
            <FiClock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      {can(PERMISSIONS.POS_ACCESS) && (
        <div className="grid-4 mb-24">
          <div className="stat-card">
            <div className="stat-icon indigo"><FiShoppingCart /></div>
            <span className="stat-label">Obrót dziś</span>
            <span className="stat-value">{formatCurrency(todayRevenue)}</span>
            <span className="stat-change positive">
              <FiArrowUpRight size={14} /> Dzisiejsza sprzedaż
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon green"><FiTrendingUp /></div>
            <span className="stat-label">Transakcje dziś</span>
            <span className="stat-value">{todayTransactions.length}</span>
            <span className="stat-change positive">
              <FiArrowUpRight size={14} /> Dzisiejsza sprzedaż
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon red"><FiArrowDownRight /></div>
            <span className="stat-label">Ilość zwrotów</span>
            <span className="stat-value">{totalReturns}</span>
            <span className="stat-change text-muted">
              Wszystkie zarejestrowane
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon amber"><FiPackage /></div>
            <span className="stat-label">Produkty w ofercie</span>
            <span className="stat-value">{products.length}</span>
            <span className="stat-change negative">
              <FiArrowDownRight size={14} /> {lowStock.length} niski stan
            </span>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Recent transactions */}
        {can(PERMISSIONS.POS_ACCESS) && (
          <div className="card">
            <div className="flex-between mb-16">
              <h3>Ostatnie transakcje</h3>
              <button className="btn btn-ghost btn-sm">Zobacz wszystkie</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nr</th>
                    <th>Kwota</th>
                    <th>Płatność</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 4).map((t, i) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>#{t.id}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(t.total)}</td>
                      <td>
                        <span className="badge badge-ghost">
                          {t.payments?.[0]?.method === 'cash' ? 'Gotówka' :
                            t.payments?.[0]?.method === 'card' ? 'Karta' : 'Przelew'}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{formatDateTime(t.created_at)}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted" style={{ padding: 40 }}>
                        Brak transakcji
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Low stock alerts */}
        <div className="card">
          <div className="flex-between mb-16">
            <h3>
              <FiAlertTriangle size={16} style={{ color: 'var(--warning)', marginRight: 8, verticalAlign: 'middle' }} />
              Alerty magazynowe
            </h3>
            <span className="badge badge-warning">{lowStock.length}</span>
          </div>
          {lowStock.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowStock.slice(0, 6).map(p => (
                <div key={p.id} className="flex-between" style={{
                  padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `3px solid ${p.stock_qty <= 0 ? 'var(--danger)' : 'var(--warning)'}`
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</div>
                    <div className="text-xs text-muted">SKU: {p.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 700,
                      color: p.stock_qty <= 0 ? 'var(--danger)' : 'var(--warning)',
                      fontSize: '0.9rem'
                    }}>
                      {p.stock_qty} {p.unit}
                    </div>
                    <div className="text-xs text-muted">min: {p.min_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <FiPackage size={32} />
              <h3>Wszystko w normie</h3>
              <p>Brak produktów z niskim stanem magazynowym</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
