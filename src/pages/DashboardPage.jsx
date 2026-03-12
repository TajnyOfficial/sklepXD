import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { PERMISSIONS } from '../utils/rbac';
import {
  FiShoppingCart, FiPackage, FiDollarSign, FiUsers,
  FiAlertTriangle, FiTruck, FiTrendingUp, FiClock,
  FiArrowUpRight, FiArrowDownRight
} from 'react-icons/fi';

export default function DashboardPage() {
  const { products, transactions, customers, getLowStockProducts } = useStore();
  const { profile, can } = useAuth();

  const todayTransactions = transactions.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.created_at?.startsWith(today);
  });

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
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
              <FiArrowUpRight size={14} /> +12.5% vs wczoraj
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon green"><FiTrendingUp /></div>
            <span className="stat-label">Transakcje dziś</span>
            <span className="stat-value">{todayTransactions.length}</span>
            <span className="stat-change positive">
              <FiArrowUpRight size={14} /> +3 vs wczoraj
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue"><FiUsers /></div>
            <span className="stat-label">Klienci</span>
            <span className="stat-value">{customers.length}</span>
            <span className="stat-change positive">
              <FiArrowUpRight size={14} /> +2 ten tydzień
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
                  {transactions.slice(0, 5).map((t, i) => (
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

      {/* Quick Actions */}
      <div className="card mt-24">
        <h3 className="mb-16">Szybkie akcje</h3>
        <div className="quick-tiles">
          {can(PERMISSIONS.POS_ACCESS) && (
            <a href="/pos/register" className="quick-tile" style={{ textDecoration: 'none' }}>
              <FiShoppingCart />
              Nowa sprzedaż
            </a>
          )}
          {can(PERMISSIONS.DELIVERIES_VIEW) && (
            <a href="/deliveries" className="quick-tile" style={{ textDecoration: 'none' }}>
              <FiTruck />
              Nowa dostawa
            </a>
          )}
          {can(PERMISSIONS.CUSTOMERS_MANAGE) && (
            <a href="/customers" className="quick-tile" style={{ textDecoration: 'none' }}>
              <FiUsers />
              Dodaj klienta
            </a>
          )}
          {can(PERMISSIONS.PRODUCTS_MANAGE) && (
            <a href="/warehouse/products" className="quick-tile" style={{ textDecoration: 'none' }}>
              <FiPackage />
              Dodaj produkt
            </a>
          )}
          {can(PERMISSIONS.FINANCE_VIEW) && (
            <a href="/finance/analytics" className="quick-tile" style={{ textDecoration: 'none' }}>
              <FiDollarSign />
              Raport finansowy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
