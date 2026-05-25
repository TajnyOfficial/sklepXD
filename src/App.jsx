import { useState, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { StoreProvider, useStore } from './contexts/StoreContext';
import toast from 'react-hot-toast';
import { ROLE_LABELS, getNavItems } from './utils/rbac';
import { getInitials } from './utils/helpers';
import {
  FiHome, FiShoppingCart, FiClipboard, FiRotateCcw, FiUsers,
  FiFileText, FiPackage, FiTruck, FiCheckSquare, FiDollarSign,
  FiClock, FiMessageSquare, FiSettings, FiSearch, FiBell,
  FiChevronDown, FiChevronRight, FiLogOut, FiMenu, FiAlertTriangle, FiX,
  FiGrid, FiVideo
} from 'react-icons/fi';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// === POS Module ===
import POSHistoryPage from './pages/pos/POSHistoryPage';

// === Sales Module ===
import CustomersPage from './pages/sales/CustomersPage';
import OrdersPage from './pages/sales/OrdersPage';

// === Returns Module ===
import ReturnsPage from './pages/returns/ReturnsPage';

// === Documents Module ===
import DocumentsPage from './pages/documents/DocumentsPage';

// === Warehouse Module ===
import ProductCatalogPage from './pages/warehouse/ProductCatalogPage';
import StockOverviewPage from './pages/warehouse/StockOverviewPage';
import LocationsPage from './pages/warehouse/LocationsPage';
import AlertsPage from './pages/warehouse/AlertsPage';
import TransfersPage from './pages/warehouse/TransfersPage';

// === Deliveries Module ===
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import SuppliersPage from './pages/deliveries/SuppliersPage';
import DeliverySchedulePage from './pages/deliveries/DeliverySchedulePage';

// === Inventory Module ===
import InventoryPage from './pages/inventory/InventoryPage';

// === Finance Module ===
import InvoicesPage from './pages/finance/InvoicesPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import PaymentsPage from './pages/finance/PaymentsPage';
import CashReportPage from './pages/finance/CashReportPage';
import AnalyticsPage from './pages/finance/AnalyticsPage';

// === HR Module ===
import TimeTrackingPage from './pages/hr/TimeTrackingPage';
import SchedulePage from './pages/hr/SchedulePage';
import AbsencesPage from './pages/hr/AbsencesPage';
import EmployeesPage from './pages/hr/EmployeesPage';

// === Communication Module ===
import AnnouncementsPage from './pages/communication/AnnouncementsPage';
import TasksPage from './pages/communication/TasksPage';

// === Admin Module ===
import RolesPage from './pages/admin/RolesPage';
import StoreSettingsPage from './pages/admin/StoreSettingsPage';
import AdditionalSettingsPage from './pages/admin/AdditionalSettingsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SecurityPage from './pages/admin/SecurityPage';


// === Kiosk i Mobile — teraz osobne aplikacje pod /kiosk/ i /mobile/ ===
// Dostępne pod URL-ami: /kiosk/  /pos/  /mobile/
// (wbudowane multi-entry w vite.config.js)

/* Słownik mapujący tekstowe nazwy ikon z bazy danych na odpowiadające im komponenty biblioteki react-icons */
const ICON_MAP = {
  FiHome, FiShoppingCart, FiClipboard, FiRotateCcw, FiUsers,
  FiFileText, FiPackage, FiTruck, FiCheckSquare, FiDollarSign,
  FiClock, FiMessageSquare, FiSettings, FiGrid, FiVideo
};

/* Komponent renderujący boczny pasek nawigacyjny z wielopoziomowym menu, szybkimi linkami oraz profilem pracownika */
function Sidebar({ navItems, collapsed, onToggle }) {
  /* Hook służący do programowej zmiany ścieżki routingu */
  const navigate = useNavigate();
  
  /* Hook przechowujący aktualną ścieżkę w przeglądarce */
  const location = useLocation();
  
  /* Zmienne autoryzacyjne: dane zalogowanego pracownika oraz funkcja wylogowywania */
  const { profile, logout } = useAuth();
  
  /* Stan mapujący ID węzłów menu na ich rozwinięcie/zwinięcie */
  const [expandedItems, setExpandedItems] = useState({});

  /* Funkcja memoizowana do przełączania stanu rozwinięcia konkretnego elementu nadrzędnego w menu */
  const toggleExpand = useCallback((id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* Funkcja sprawdzająca czy dany element menu prowadzi do aktualnie odwiedzanej podstrony */
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">S</div>
        {!collapsed && <span className="sidebar-brand">Sklep<span>POS</span></span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = ICON_MAP[item.icon] || FiGrid;
          const active = isActive(item.path);
          const expanded = expandedItems[item.id] ?? active;

          return (
            <div key={item.id} className="sidebar-section">
              <button
                className={`sidebar-item ${active ? 'active' : ''}`}
                onClick={() => {
                  if (item.children) {
                    toggleExpand(item.id);
                  } else {
                    navigate(item.path);
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.children && (
                      expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />
                    )}
                  </>
                )}
              </button>

              {!collapsed && item.children && expanded && (
                <div className="sidebar-children">
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      className={`sidebar-child ${location.pathname === child.path ? 'active' : ''}`}
                      onClick={() => navigate(child.path)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Linki do zewnętrznych aplikacji ───────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Aplikacje</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: '🖥️ Kiosk', href: '/kiosk/' },
              { label: '🛒 Kasa', href: '/pos/' },
              { label: '📱 Mobile', href: '/mobile/' },
            ].map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 6,
                background: 'var(--bg-alt)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', textDecoration: 'none',
                cursor: 'pointer', fontWeight: 500,
              }}>{label}</a>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout} title="Wyloguj się">
          <div className="sidebar-avatar">{getInitials(profile?.full_name)}</div>
          {profile && !collapsed && (
            <div className="sidebar-user-info" style={{ flex: 1 }}>
              <div className="sidebar-user-name">{profile?.full_name || 'Użytkownik'}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[profile?.role] || 'Pracownik'}</div>
            </div>
          )}
          {!collapsed && <FiLogOut size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>
    </aside>
  );
}

/* Główny kontener strukturalny systemu dla zalogowanego użytkownika definiujący wszystkie kluczowe routingi (widoki ERP) */
function AppLayout() {
  /* Stan autoryzacji używany do odczytania roli bieżącego pracownika */
  const { profile } = useAuth();
  
  /* Pobranie globalnych ustawień w celu nasłuchiwania na ewentualne zmiany uprawnień w konfiguracji */
  const { shopSettings } = useStore();
  
  /* Zmienna memoizowana zawierająca wygenerowaną strukturę elementów nawigacji dostępnych dla danej roli */
  const navItems = useMemo(() => getNavItems(profile?.role), [profile?.role, shopSettings?.role_permissions]);

  /* Stan określający widoczność i rozmiar bocznego paska nawigacyjnego (Sidebar) */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  /* Funkcja do nawigowania programowego w ramach react-router */
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar
        navItems={navItems}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
      />
      <main className="app-main" style={{
        marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'
      }}>

        <div className="app-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<Navigate to="/sales/pos-history" replace />} />
            <Route path="/sales/pos-history" element={<POSHistoryPage />} />

            {/* Sales */}
            <Route path="/sales/orders" element={<OrdersPage />} />
            <Route path="/sales/returns" element={<ReturnsPage />} />

            {/* Contractors */}
            <Route path="/contractors/customers" element={<CustomersPage />} />
            <Route path="/contractors/suppliers" element={<SuppliersPage />} />

            {/* Warehouse */}
            <Route path="/warehouse/products" element={<ProductCatalogPage />} />
            <Route path="/warehouse/stock" element={<StockOverviewPage />} />
            <Route path="/warehouse/locations" element={<LocationsPage />} />
            <Route path="/warehouse/alerts" element={<AlertsPage />} />
            <Route path="/warehouse/transfers" element={<TransfersPage />} />
            <Route path="/warehouse/inventory" element={<InventoryPage />} />

            {/* Deliveries */}
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/deliveries/schedule" element={<DeliverySchedulePage />} />



            {/* Finance */}
            <Route path="/finance/invoices" element={<InvoicesPage />} />
            <Route path="/finance/expenses" element={<ExpensesPage />} />
            <Route path="/finance/payments" element={<PaymentsPage />} />
            <Route path="/finance/cash" element={<CashReportPage />} />
            <Route path="/finance/analytics" element={<AnalyticsPage />} />

            {/* HR */}
            <Route path="/hr/time" element={<TimeTrackingPage />} />
            <Route path="/hr/schedule" element={<SchedulePage />} />
            <Route path="/hr/absences" element={<AbsencesPage />} />
            <Route path="/hr/employees" element={<EmployeesPage />} />
            <Route path="/hr/documents" element={<DocumentsPage />} />
            <Route path="/hr/announcements" element={<AnnouncementsPage />} />
            <Route path="/hr/tasks" element={<TasksPage />} />

            {/* Admin */}
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/settings" element={<StoreSettingsPage />} />
            <Route path="/admin/additional" element={<AdditionalSettingsPage />} />
            <Route path="/admin/audit" element={<AuditLogPage />} />
            <Route path="/admin/security" element={<SecurityPage />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* Nadrzędny komponent weryfikujący sesję i decydujący pomiędzy widokiem logowania a załadowaniem reszty systemu */
export default function App() {
  /* Stany pochodzące z kontekstu autoryzacji informujące o ważności sesji oraz procesie jej wczytywania */
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  // StoreProvider owija wszystkie trasy głównej aplikacji
  // Kiosk/POS/Mobile mają własne StoreProvider w swoich entry points
  return (
    <StoreProvider>
      <Routes>
        {/* Główna aplikacja z autentykacją */}
        <Route
          path="/*"
          element={!isAuthenticated ? <LoginPage /> : <AppLayout />}
        />
      </Routes>
    </StoreProvider>
  );
}
