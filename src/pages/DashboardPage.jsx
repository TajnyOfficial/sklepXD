import { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { PERMISSIONS } from '../utils/rbac';
import {
  FiShoppingCart, FiPackage, FiDollarSign, FiUsers,
  FiAlertTriangle, FiTruck, FiTrendingUp, FiClock,
  FiArrowUpRight, FiArrowDownRight, FiBell, FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Ekran powitalny panelu administracyjnego (Dashboard) wyświetlający dzisiejsze statystyki i ostrzeżenia magazynowe
export default function DashboardPage() {
  // Odczytanie z głównego stanu sklepu list: produktów, transakcji z kasy POS oraz dokumentów, a także helpera do sprawdzania braków na magazynie
  const { products, transactions, documents, getLowStockProducts, categories, saveProduct } = useStore();

  // Pobranie profilu aktualnego użytkownika wraz z funkcją weryfikującą dostęp na bazie ról (RBAC)
  const { profile, can } = useAuth();

  // Stan do obsługi wpisywania cen bezpośrednio w alertach
  const [priceValues, setPriceValues] = useState({});

  // Filtrowanie wszystkich transakcji tylko do tych wygenerowanych dzisiaj w celu stworzenia statystyk dobowych
  const todayTransactions = transactions.filter(t => {
    if (!t.created_at) return false;
    const localTxDate = new Date(t.created_at).toLocaleDateString('en-CA');
    const localToday = new Date().toLocaleDateString('en-CA');
    return localTxDate === localToday;
  });

  // Zsumowanie łącznego dochodu (Obrót dzisiaj) z przefiltrowanych transakcji dobowych
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);

  // Odczyt ilości wszystkich zarejestrowanych zwrotów towarowych z bazy dokumentów
  const totalReturns = documents ? documents.filter(d => d.type === 'return').length : 0;

  // Pobranie tablicy produktów, których stan magazynowy jest poniżej minimum
  const lowStock = getLowStockProducts();

  // Wyszukiwanie produktów z kategorii "Wyprzedaż" bez ustalonej ceny sprzedaży (null lub 0)
  const outletCategory = categories.find(c => c.name.toLowerCase() === 'wyprzedaż');
  const alertProducts = products.filter(p =>
    p.category_id === outletCategory?.id && (p.sell_price === null || p.sell_price === 0 || isNaN(p.sell_price))
  );

  async function handleSavePrice(p) {
    const val = parseFloat(priceValues[p.id]);
    if (!val || val <= 0) {
      toast.error('Wpisz poprawną, dodatnią cenę sprzedaży');
      return;
    }

    try {
      const updatedProduct = {
        ...p,
        sell_price: val
      };
      await saveProduct(updatedProduct, p.id);
      toast.success(`Cena dla "${p.name}" została ustalona na ${formatCurrency(val)}`);

      // Czyścimy pole wejściowe
      setPriceValues(prev => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
    } catch (err) {
      toast.error('Błąd zapisu ceny: ' + err.message);
    }
  }

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

        {/* // Zamieniona sekcja ostatnich transakcji ALERTY OGÓLNE */}
        <div className="card">
          <div className="flex-between mb-16">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiBell size={18} style={{ color: 'var(--primary)' }} />
              Alerty ogólne (Wymagane akcje)
            </h3>
            <span className="badge badge-danger" style={{ fontWeight: 700 }}>{alertProducts.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertProducts.length > 0 ? (
              alertProducts.map(p => (
                <div key={p.id} className="p-12 animate-fadeIn" style={{
                  background: 'var(--danger-bg, rgba(239, 68, 68, 0.05))',
                  borderRadius: 12,
                  border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.15))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <FiAlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        Wymagane ustalenie ceny sprzedaży!
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Nowo przyjęty produkt outletowy <strong>{p.name}</strong> (SKU: {p.sku}) z kategorii <em>Wyprzedaż</em> nie posiada określonej ceny sprzedaży.
                      </p>
                    </div>
                  </div>

                  {/* // Szybkie uzupełnianie ceny bezpośrednio z Dashboardu */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid var(--border-light)'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ustal cenę sprzedaży (PLN):</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      className="input"
                      value={priceValues[p.id] || ''}
                      onChange={e => setPriceValues(prev => ({ ...prev, [p.id]: e.target.value }))}
                      style={{ width: 100, height: 32, padding: '4px 8px', fontSize: '0.9rem', fontWeight: 700 }}
                    />
                    <button
                      className="btn btn-success"
                      onClick={() => handleSavePrice(p)}
                      style={{
                        padding: '6px 12px',
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <FiCheck size={14} /> Zapisz
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted p-20" style={{ background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                <FiBell size={24} style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Brak oczekujących alertów. Wszystkie produkty wyprzedażowe posiadają przypisane ceny.</p>
              </div>
            )}
          </div>
        </div>

        {/* // Low stock alerts */}
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
                  border: ` 1px solid ${p.stock_qty <= 0 ? 'var(--danger)' : 'var(--warning)'}`
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