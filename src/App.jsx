import { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import toast from 'react-hot-toast';
import { ROLE_LABELS } from './utils/rbac';
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

/**
 * Obiekt (Mapa) przypisujący nazwy ikon w postaci tekstowej do komponentów biblioteki react-icons.
 * Zastosowanie: Dynamiczne renderowanie ikon w panelu nawigacyjnym na podstawie 
 * konfiguracji dostępów i ról użytkownika zdefiniowanych w systemie (np. rbac).
 */
const ICON_MAP = {
  FiHome, FiShoppingCart, FiClipboard, FiRotateCcw, FiUsers,
  FiFileText, FiPackage, FiTruck, FiCheckSquare, FiDollarSign,
  FiClock, FiMessageSquare, FiSettings, FiGrid, FiVideo
};

/**
 * Komponent bocznego paska nawigacyjnego (Sidebar).
 * 
 * Funkcjonalności:
 * - Generuje dynamiczne drzewo nawigacji na podstawie tablicy `navItems`.
 * - Obsługuje zwijanie i rozwijanie sekcji (wielopoziomowe menu).
 * - Prezentuje szybkie linki do osobnych aplikacji (Kiosk, Mobile, Kasa).
 * - Renderuje profil zalogowanego użytkownika (inicjały, ranga) wraz z opcją wylogowania.
 * 
 * @param {Object} props - Właściwości komponentu
 * @param {Array} props.navItems - Struktura nawigacji (obiekty ze ścieżkami i ikonami)
 * @param {boolean} props.collapsed - Stan zwinięcia całego paska (zminimalizowany / pełny)
 * @param {Function} props.onToggle - Funkcja wywoływana przy żądaniu przełączenia stanu zwinięcia
 */
function Sidebar({ navItems, collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = useCallback((id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

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

/**
 * Komponent górnego paska narzędziowego (TopBar).
 * 
 * Znajduje się na samej górze interfejsu (nagłówek).
 * Zawiera:
 * - Globalną, zunifikowaną wyszukiwarkę systemową.
 * - Moduł powiadomień i dzwonek alertów (ze wskaźnikiem nieprzeczytanych powiadomień).
 * - Przycisk włączania tzw. "Trybu kryzysowego".
 * 
 * @param {Object} props - Właściwości komponentu
 * @param {Function} props.onMenuToggle - Funkcja do przełączania widoczności paska bocznego (na urządzeniach mobilnych)
 */
function TopBar({ onMenuToggle }) {
  const { profile } = useAuth();

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button className="topbar-btn" onClick={onMenuToggle} style={{ display: 'none' }}>
          <FiMenu size={20} />
        </button>
        <div className="topbar-search">
          <FiSearch />
          <input type="text" placeholder="Szukaj produktów, klientów, zamówień..." />
        </div>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn">
          <FiBell size={18} />
          <span className="notification-dot"></span>
        </button>
        <button className="topbar-btn" title="Tryb kryzysowy" style={{ color: 'var(--text-muted)' }}>
          <FiAlertTriangle size={18} />
        </button>
      </div>
    </header>
  );
}

/**
 * Główny kontener (Layout) całej aplikacji dla zalogowanego pracownika.
 * 
 * Opis:
 * Jest to "szkielet", który umieszcza pasek boczny (`Sidebar`) i pasek górny (`TopBar`), 
 * a w ich środku (jako zawartość główna `app-content`) osadza router React (`Routes`).
 * Właśnie w tym komponencie zdefiniowane są wszystkie **Drogi (Routes)** i ścieżki
 * prowadzące do poszczególnych widoków całego systemu klasy ERP (finanse, magazyn, pracownicy).
 */
function AppLayout() {
  const { navItems } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        <TopBar onMenuToggle={() => setSidebarCollapsed(p => !p)} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<Navigate to="/pos/history" replace />} />
            <Route path="/pos/history" element={<POSHistoryPage />} />

            {/* Returns */}
            <Route path="/returns" element={<ReturnsPage />} />

            {/* Documents */}
            <Route path="/documents" element={<DocumentsPage />} />

            {/* Warehouse */}
            <Route path="/warehouse/products" element={<ProductCatalogPage />} />
            <Route path="/warehouse/stock" element={<StockOverviewPage />} />
            <Route path="/warehouse/locations" element={<LocationsPage />} />
            <Route path="/warehouse/alerts" element={<AlertsPage />} />
            <Route path="/warehouse/transfers" element={<TransfersPage />} />

            {/* Deliveries */}
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/deliveries/suppliers" element={<SuppliersPage />} />
            <Route path="/deliveries/schedule" element={<DeliverySchedulePage />} />

            {/* Inventory */}
            <Route path="/inventory" element={<InventoryPage />} />

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

            {/* Communication */}
            <Route path="/communication/announcements" element={<AnnouncementsPage />} />
            <Route path="/communication/tasks" element={<TasksPage />} />

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

/**
 * Główny komponent wejściowy dla platformy administracyjnej i zarządzania biznesem.
 * 
 * Działanie:
 * 1. Sprawdza status uwierzytelnienia z kontekstu `AuthContext`.
 * 2. Prezentuje ekran ładowania podczas autoryzacji sesji.
 * 3. Jeżeli użytkownik nie jest autoryzowany -> wczytuje widok logowania (`LoginPage`).
 * 4. Jeżeli logowanie przebiegło pomyślnie -> osadza `StoreProvider` z głównymi danymi 
 *    stanu aplikacji, po czym ładuje docelowy układ `AppLayout`.
 */
export default function App() {
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
