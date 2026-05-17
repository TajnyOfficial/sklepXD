/* ═══════════════════════════════════════════
   RBAC — Role-Based Access Control
   ═══════════════════════════════════════════ */

/**
 * Definicje stałych reprezentujących role systemowe (Role-Based Access Control).
 * Przypisane poszczególnym pracownikom, jednoznacznie określają ich pozycję w hierarchii.
 */
export const ROLES = {
  ADMIN: 'admin',
  SHIFT_MANAGER: 'shift_manager',
  SALES_MANAGER: 'sales_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  SANITATION_MANAGER: 'sanitation_manager',
  CASHIER: 'cashier',
  WAREHOUSE_WORKER: 'warehouse_worker',
  CLEANER: 'cleaner',
};

/**
 * Słownik (Mapa) tłumaczący wewnętrzne klucze ról na czytelne dla człowieka nazwy polskie.
 * Stosowany w interfejsie graficznym, np. w profilu zalogowanego pracownika.
 */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator / Właściciel',
  [ROLES.SHIFT_MANAGER]: 'Główny Kierownik Zmiany',
  [ROLES.SALES_MANAGER]: 'Kierownik Sprzedaży',
  [ROLES.WAREHOUSE_MANAGER]: 'Kierownik Magazynu',
  [ROLES.SANITATION_MANAGER]: 'Kierownik Serwisu',
  [ROLES.CASHIER]: 'Sprzedawca / Kasjer',
  [ROLES.WAREHOUSE_WORKER]: 'Magazynier',
  [ROLES.CLEANER]: 'Pracownik Sprzątający',
};

/**
 * Centralny rejestr wszystkich unikalnych "atomowych" uprawnień (Permissions).
 * Każde uprawnienie pozwala na wykonanie określonej akcji (np. zwrot towaru) lub dostęp do danego widoku.
 */
export const PERMISSIONS = {
  // POS & Sales
  POS_ACCESS: 'pos.access',
  POS_SELL: 'pos.sell',
  POS_DISCOUNT: 'pos.discount',
  POS_DISCOUNT_HIGH: 'pos.discount_high',
  POS_PARK: 'pos.park',
  POS_VOID: 'pos.void',
  POS_CASH_DRAWER: 'pos.cash_drawer',
  POS_XZ_REPORT: 'pos.xz_report',

  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_MANAGE: 'orders.manage',
  ORDERS_RESERVE: 'orders.reserve',

  // Returns
  RETURNS_VIEW: 'returns.view',
  RETURNS_CREATE: 'returns.create',
  RETURNS_APPROVE: 'returns.approve',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_CREDIT: 'customers.credit',

  // Documents
  DOCS_VIEW: 'docs.view',
  DOCS_CREATE: 'docs.create',
  DOCS_DELETE: 'docs.delete',

  // Warehouse
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  STOCK_VIEW: 'stock.view',
  STOCK_ADJUST: 'stock.adjust',
  DELIVERIES_VIEW: 'deliveries.view',
  DELIVERIES_MANAGE: 'deliveries.manage',
  DELIVERIES_APPROVE: 'deliveries.approve',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  LABELS_PRINT: 'labels.print',
  TRANSFERS_MANAGE: 'transfers.manage',

  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  FINANCE_EXPORT: 'finance.export',
  FINANCE_LOCK: 'finance.lock',
  MARGINS_VIEW: 'margins.view',

  // HR
  HR_OWN_TIME: 'hr.own_time',
  HR_VIEW: 'hr.view',
  HR_MANAGE: 'hr.manage',
  HR_SCHEDULE: 'hr.schedule',
  HR_PAYROLL: 'hr.payroll',

  // Admin
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SETTINGS: 'admin.settings',
  ADMIN_AUDIT: 'admin.audit',
  ADMIN_SECURITY: 'admin.security',
  ADMIN_CRISIS: 'admin.crisis',

  // Tasks & Communication
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_COMPLETE: 'tasks.complete',
  ANNOUNCEMENTS_VIEW: 'announcements.view',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  KIOSK_ACCESS: 'kiosk.access',
};

/**
 * Matryca powiązań (Mapa), która określa, jaki zestaw atomowych uprawnień przysługuje danej roli.
 * Administrator dziedziczy automatycznie pełen zakres (`Object.values(PERMISSIONS)`).
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // all permissions

  [ROLES.SHIFT_MANAGER]: [
    PERMISSIONS.POS_ACCESS, PERMISSIONS.POS_SELL, PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_DISCOUNT_HIGH, PERMISSIONS.POS_PARK, PERMISSIONS.POS_VOID,
    PERMISSIONS.POS_CASH_DRAWER, PERMISSIONS.POS_XZ_REPORT,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.ORDERS_RESERVE,
    PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE, PERMISSIONS.RETURNS_APPROVE,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.CUSTOMERS_CREDIT,
    PERMISSIONS.DOCS_VIEW, PERMISSIONS.DOCS_CREATE, PERMISSIONS.DOCS_DELETE,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.DELIVERIES_VIEW,
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.MARGINS_VIEW,
    PERMISSIONS.HR_OWN_TIME, PERMISSIONS.HR_VIEW, PERMISSIONS.HR_MANAGE,
    PERMISSIONS.HR_SCHEDULE, PERMISSIONS.HR_PAYROLL,
    PERMISSIONS.ADMIN_AUDIT, PERMISSIONS.ADMIN_CRISIS,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.KIOSK_ACCESS,
  ],

  [ROLES.SALES_MANAGER]: [
    PERMISSIONS.POS_ACCESS, PERMISSIONS.POS_SELL, PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_DISCOUNT_HIGH, PERMISSIONS.POS_PARK, PERMISSIONS.POS_VOID,
    PERMISSIONS.POS_CASH_DRAWER, PERMISSIONS.POS_XZ_REPORT,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.ORDERS_RESERVE,
    PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE, PERMISSIONS.RETURNS_APPROVE,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.CUSTOMERS_CREDIT,
    PERMISSIONS.DOCS_VIEW, PERMISSIONS.DOCS_CREATE,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.STOCK_VIEW, PERMISSIONS.MARGINS_VIEW,
    PERMISSIONS.HR_OWN_TIME, PERMISSIONS.HR_SCHEDULE,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE,
  ],

  [ROLES.WAREHOUSE_MANAGER]: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.STOCK_VIEW, PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.DELIVERIES_VIEW, PERMISSIONS.DELIVERIES_MANAGE, PERMISSIONS.DELIVERIES_APPROVE,
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.LABELS_PRINT, PERMISSIONS.TRANSFERS_MANAGE,
    PERMISSIONS.MARGINS_VIEW,
    PERMISSIONS.HR_OWN_TIME, PERMISSIONS.HR_SCHEDULE,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE,
  ],

  [ROLES.SANITATION_MANAGER]: [
    PERMISSIONS.HR_OWN_TIME, PERMISSIONS.HR_SCHEDULE,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE,
  ],

  [ROLES.CASHIER]: [
    PERMISSIONS.POS_ACCESS, PERMISSIONS.POS_SELL, PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_PARK, PERMISSIONS.POS_CASH_DRAWER,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.DOCS_VIEW, PERMISSIONS.DOCS_CREATE,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.HR_OWN_TIME,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.KIOSK_ACCESS,
  ],

  [ROLES.WAREHOUSE_WORKER]: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.DELIVERIES_VIEW, PERMISSIONS.DELIVERIES_MANAGE,
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.LABELS_PRINT, PERMISSIONS.TRANSFERS_MANAGE,
    PERMISSIONS.HR_OWN_TIME,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
  ],

  [ROLES.CLEANER]: [
    PERMISSIONS.HR_OWN_TIME,
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_COMPLETE,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
  ],
};

/**
 * Sprawdza dostępność pojedynczego uprawnienia dla określonej roli.
 * 
 * @param {string} userRole - Kod roli przypisanej użytkownikowi
 * @param {string} permission - Pojedyncze wymagane uprawnienie (np. `PERMISSIONS.POS_SELL`)
 * @returns {boolean} Prawda, jeśli rola posiada to uprawnienie
 */
export function hasPermission(userRole, permission) {
  if (!userRole) return false;
  const perms = ROLE_PERMISSIONS[userRole];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Sprawdza, czy rola posiada co najmniej jedno (dowolne) uprawnienie z podanej tablicy.
 * Wykorzystywane głównie do sprawdzania dostępu do głównych kategorii w menu.
 * 
 * @param {string} userRole - Kod roli
 * @param {Array<string>} permissions - Tablica możliwych uprawnień
 * @returns {boolean} Prawda, jeśli posiada przynajmniej jedno uprawnienie
 */
export function hasAnyPermission(userRole, permissions) {
  return permissions.some((p) => hasPermission(userRole, p));
}

export function hasAllPermissions(userRole, permissions) {
  return permissions.every((p) => hasPermission(userRole, p));
}

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function getRoleLevel(role) {
  const levels = {
    [ROLES.ADMIN]: 100,
    [ROLES.SHIFT_MANAGER]: 80,
    [ROLES.SALES_MANAGER]: 60,
    [ROLES.WAREHOUSE_MANAGER]: 60,
    [ROLES.SANITATION_MANAGER]: 60,
    [ROLES.CASHIER]: 20,
    [ROLES.WAREHOUSE_WORKER]: 20,
    [ROLES.CLEANER]: 10,
  };
  return levels[role] || 0;
}

/**
 * Zwraca dynamicznie budowane drzewo elementów nawigacyjnych (Sidebaru) na podstawie posiadanych praw.
 * Całkowicie ukrywa pozycje (oraz grupy pozycji), do których zalogowany pracownik nie ma uprawnień wglądu.
 * 
 * @param {string} userRole - Aktualna rola zalogowanego pracownika
 * @returns {Array<Object>} Oczyszczona tablica obiektów nawigacji
 */
export function getNavItems(userRole) {
  const items = [];

  items.push({ id: 'dashboard', label: 'Dashboard', icon: 'FiHome', path: '/' });

  if (hasPermission(userRole, PERMISSIONS.POS_ACCESS)) {
    items.push({
      id: 'pos',
      label: 'Sprzedaż (POS)',
      icon: 'FiShoppingCart',
      path: '/pos',
      children: [
        { id: 'pos-history', label: 'Historia działań', path: '/pos/history' },
      ],
    });
  }


  if (hasAnyPermission(userRole, [PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE])) {
    items.push({ id: 'returns', label: 'Zwroty / RMA', icon: 'FiRotateCcw', path: '/returns' });
  }


  if (hasAnyPermission(userRole, [PERMISSIONS.DOCS_VIEW])) {
    items.push({ id: 'documents', label: 'Dokumenty', icon: 'FiFileText', path: '/documents' });
  }

  if (hasAnyPermission(userRole, [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.STOCK_VIEW])) {
    items.push({
      id: 'warehouse',
      label: 'Magazyn',
      icon: 'FiPackage',
      path: '/warehouse',
      children: [
        { id: 'warehouse-products', label: 'Produkty', path: '/warehouse/products' },
        { id: 'warehouse-stock', label: 'Stany', path: '/warehouse/stock' },
        { id: 'warehouse-locations', label: 'Lokalizacje', path: '/warehouse/locations' },
        { id: 'warehouse-alerts', label: 'Alerty', path: '/warehouse/alerts' },
        { id: 'warehouse-transfers', label: 'Przesunięcia', path: '/warehouse/transfers' },
      ],
    });
  }

  if (hasAnyPermission(userRole, [PERMISSIONS.DELIVERIES_VIEW])) {
    items.push({
      id: 'deliveries',
      label: 'Dostawy',
      icon: 'FiTruck',
      path: '/deliveries',
      children: [
        { id: 'deliveries-list', label: 'Lista dostaw', path: '/deliveries' },
        { id: 'deliveries-suppliers', label: 'Dostawcy', path: '/deliveries/suppliers' },
        { id: 'deliveries-schedule', label: 'Harmonogram', path: '/deliveries/schedule' },
      ],
    });
  }

  if (hasAnyPermission(userRole, [PERMISSIONS.INVENTORY_VIEW])) {
    items.push({ id: 'inventory', label: 'Inwentaryzacja', icon: 'FiCheckSquare', path: '/inventory' });
  }

  if (hasAnyPermission(userRole, [PERMISSIONS.FINANCE_VIEW])) {
    items.push({
      id: 'finance',
      label: 'Finanse',
      icon: 'FiDollarSign',
      path: '/finance',
      children: [
        { id: 'finance-invoices', label: 'Faktury', path: '/finance/invoices' },
        { id: 'finance-expenses', label: 'Koszty', path: '/finance/expenses' },
        { id: 'finance-payments', label: 'Płatności', path: '/finance/payments' },
        { id: 'finance-cash', label: 'Raporty kasowe', path: '/finance/cash' },
        { id: 'finance-analytics', label: 'Analityka', path: '/finance/analytics' },
      ],
    });
  }

  if (hasAnyPermission(userRole, [PERMISSIONS.HR_OWN_TIME, PERMISSIONS.HR_VIEW])) {
    items.push({
      id: 'hr',
      label: 'HR / Kadry',
      icon: 'FiClock',
      path: '/hr',
      children: [
        { id: 'hr-time', label: 'Czas pracy', path: '/hr/time' },
        { id: 'hr-schedule', label: 'Grafik', path: '/hr/schedule' },
        { id: 'hr-absences', label: 'Nieobecności', path: '/hr/absences' },
        ...(hasPermission(userRole, PERMISSIONS.HR_VIEW)
          ? [
              { id: 'hr-employees', label: 'Pracownicy', path: '/hr/employees' },
            ]
          : []),
      ],
    });
  }

  items.push({
    id: 'communication',
    label: 'Komunikacja',
    icon: 'FiMessageSquare',
    path: '/communication',
    children: [
      { id: 'announcements', label: 'Ogłoszenia', path: '/communication/announcements' },
      { id: 'tasks', label: 'Zadania', path: '/communication/tasks' },
    ],
  });

  if (hasAnyPermission(userRole, [PERMISSIONS.ADMIN_ROLES, PERMISSIONS.ADMIN_SETTINGS])) {
    items.push({
      id: 'admin',
      label: 'Administracja',
      icon: 'FiSettings',
      path: '/admin',
      children: [
        { id: 'admin-roles', label: 'Role i uprawnienia', path: '/admin/roles' },
        { id: 'admin-store', label: 'Ustawienia sklepu', path: '/admin/settings' },
        { id: 'admin-audit', label: 'Logi audytu', path: '/admin/audit' },
        { id: 'admin-security', label: 'Bezpieczeństwo', path: '/admin/security' },
      ],
    });
  }

  return items;
}
