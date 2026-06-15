import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, PERMISSIONS } from '../../utils/rbac';
import { 
  FiShield, FiCheck, FiX, FiEdit, FiTrash2, FiPlus, 
  FiChevronDown, FiChevronUp, FiSave, FiAlertCircle 
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const PERMISSION_GROUPS = {
  'Sprzedaż (POS)': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('POS_') || k === 'KIOSK_ACCESS'),
  'Zamówienia': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('ORDERS_')),
  'Zwroty': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('RETURNS_')),
  'Klienci': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('CUSTOMERS_')),
  'Dokumenty': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('DOCS_')),
  'Magazyn i Dostawy': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('PRODUCTS_') || k.startsWith('STOCK_') || k.startsWith('TRANSFERS_') || k.startsWith('LABELS_') || k.startsWith('DELIVERIES_') || k.startsWith('INVENTORY_')),
  'Finanse': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('FINANCE_') || k.startsWith('MARGINS_')),
  'HR i Czas pracy': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('HR_')),
  'Administracja': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('ADMIN_')),
  'Komunikacja': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('TASKS_') || k.startsWith('ANNOUNCEMENTS_')),
};

const PERMISSION_LABELS = {
  'pos.access': 'Dostęp do panelu POS',
  'pos.sell': 'Realizacja sprzedaży i kasowanie',
  'pos.discount': 'Udzielanie rabatów podstawowych',
  'pos.discount_high': 'Udzielanie rabatów wysokich (>10%)',
  'pos.park': 'Parkowanie (zawieszanie) paragonów',
  'pos.void': 'Stornowanie pozycji i paragonów',
  'pos.cash_drawer': 'Ręczne otwieranie szuflady kasowej',
  'pos.xz_report': 'Generowanie raportów X/Z',
  'orders.view': 'Podgląd listy zamówień',
  'orders.manage': 'Tworzenie i edycja zamówień',
  'orders.reserve': 'Rezerwowanie towarów pod zamówienia',
  'returns.view': 'Podgląd zwrotów i reklamacji',
  'returns.create': 'Rejestrowanie nowych zwrotów',
  'returns.approve': 'Akceptacja zwrotów i wypłata gotówki',
  'customers.view': 'Podgląd bazy klientów',
  'customers.manage': 'Dodawanie i edycja klientów',
  'customers.credit': 'Zarządzanie limitem kupieckim',
  'docs.view': 'Podgląd dokumentów i faktur',
  'docs.create': 'Generowanie dokumentów i faktur',
  'docs.delete': 'Usuwanie dokumentów z systemu',
  'products.view': 'Podgląd katalogu produktów',
  'products.manage': 'Dodawanie i edycja produktów',
  'stock.view': 'Podgląd stanów magazynowych',
  'stock.adjust': 'Ręczna korekta stanów (korektor)',
  'deliveries.view': 'Podgląd dostaw towaru',
  'deliveries.manage': 'Tworzenie i edycja dostaw',
  'deliveries.approve': 'Zatwierdzanie dostaw na magazyn',
  'inventory.view': 'Podgląd zleceń inwentaryzacji',
  'inventory.manage': 'Tworzenie i zarządzanie inwentaryzacjami',
  'labels.print': 'Drukowanie etykiet i cenówek',
  'transfers.manage': 'Obsługa przesunięć międzymagazynowych MM',
  'finance.view': 'Podgląd raportów finansowych',
  'finance.manage': 'Konfiguracja kont i rozliczeń',
  'finance.export': 'Eksport danych do księgowości',
  'finance.lock': 'Zamykanie okresów obrachunkowych',
  'margins.view': 'Podgląd marż i cen zakupu',
  'hr.own_time': 'Podgląd własnego czasu pracy',
  'hr.view': 'Podgląd kadr i listy płac',
  'hr.manage': 'Zarządzanie pracownikami (dodawanie/edycja)',
  'hr.schedule': 'Tworzenie i edycja grafiku zmian',
  'hr.payroll': 'Wyliczanie wynagrodzeń i premii',
  'admin.roles': 'Zarządzanie rolami i uprawnieniami (RBAC)',
  'admin.settings': 'Zmiana ustawień globalnych sklepu',
  'admin.audit': 'Podgląd logów audytu (bezpieczeństwo)',
  'admin.security': 'Zarządzanie kluczami i sesjami',
  'admin.crisis': 'Wywoływanie procedur kryzysowych',
  'tasks.view': 'Podgląd przypisanych zadań',
  'tasks.create': 'Przydzielanie zadań pracownikom',
  'tasks.complete': 'Oznaczanie zadań jako wykonane',
  'announcements.view': 'Podgląd tablicy ogłoszeń',
  'announcements.create': 'Publikowanie ogłoszeń sklepowych',
  'kiosk.access': 'Dostęp do kiosku RCP (kod PIN)'
};

// Zaawansowany panel administracyjny do kompleksowego zarządzania Rolami (RBAC) i dynamicznego przypisywania poszczególnych uprawnień w systemie
export default function RolesPage() {
  // Funkcja z kontekstu pozwalająca na globalne zaktualizowanie macierzy ról i uprawnień w głównej bazie danych (Supabase)
  const { updateRolePermissions } = useStore();

  // Lokalne kopie słowników: definicje kluczy ról, ludzkie nazwy ról, oraz aktualne mapowania uprawnień do danej roli
  const [roles, setRoles] = useState(() => ({ ...ROLES }));
  const [labels, setLabels] = useState(() => ({ ...ROLE_LABELS }));
  const [permissions, setPermissions] = useState(() => {
    const copy = {};
    for (const r in ROLE_PERMISSIONS) {
      copy[r] = [...ROLE_PERMISSIONS[r]];
    }
    return copy;
  });

  // Identyfikator roli, której "karta" jest w danej chwili otwarta w celu podglądu szczegółów i pól wyboru
  const [expandedRole, setExpandedRole] = useState(null);
  
  // Stany obsługujące nakładki modalne (Modal) używane do tworzenia nowej roli (wpisywanie nazwy i kodu)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');

  // Stany obsługujące nakładki modalne (Modal) używane do edytowania istniejącej roli
  const [editRoleKey, setEditRoleKey] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');

  // Tablica ról wbudowanych w system, które objęte są ścisłą ochroną (nie można ich usunąć, a admin ma nałożoną niemodyfikowalność)
  const criticalRoles = ['admin', 'shift_manager', 'cashier'];

  // Handler służący do odznaczania/zaznaczania i asynchronicznego zapisywania pojedynczego uprawnienia dla określonej roli
  async function handleTogglePermission(roleKey, permValue) {
    if (roleKey === 'admin') {
      toast.error('Rola Administratora posiada pełne i niemodyfikowalne uprawnienia.');
      return;
    }

    const currentPerms = permissions[roleKey] || [];
    let updated;
    if (currentPerms.includes(permValue)) {
      updated = currentPerms.filter(p => p !== permValue);
    } else {
      updated = [...currentPerms, permValue];
    }

    const updatedPermissions = {
      ...permissions,
      [roleKey]: updated
    };

    setPermissions(updatedPermissions);
    await updateRolePermissions(roles, labels, updatedPermissions);
    toast.success('Uprawnienie zaktualizowane pomyślnie!', { duration: 1500 });
  }

  // Helper pozwalający za pomocą jednego kliknięcia nadać/zabrać cały zestaw uprawnień danej kategorii tematycznej
  async function handleToggleAllInGroup(roleKey, groupName, permList) {
    if (roleKey === 'admin') {
      toast.error('Rola Administratora posiada pełne i niemodyfikowalne uprawnienia.');
      return;
    }

    const currentPerms = permissions[roleKey] || [];
    const groupPermValues = permList.map(([_, v]) => v);
    const hasAll = groupPermValues.every(v => currentPerms.includes(v));

    let updated;
    if (hasAll) {
      // Remove all in this group
      updated = currentPerms.filter(p => !groupPermValues.includes(p));
    } else {
      // Add all in this group that are not already present
      const toAdd = groupPermValues.filter(v => !currentPerms.includes(v));
      updated = [...currentPerms, ...toAdd];
    }

    const updatedPermissions = {
      ...permissions,
      [roleKey]: updated
    };

    setPermissions(updatedPermissions);
    await updateRolePermissions(roles, labels, updatedPermissions);
    toast.success(`Grupa "${groupName}" zaktualizowana!`, { duration: 1500 });
  }

  // Funkcja odpowiedzialna za rejestrację całkowicie nowej, niestandardowej roli w systemie i odświeżenie konfiguracji
  async function handleAddRole(e) {
    e.preventDefault();
    const code = newRoleCode.trim().toLowerCase().replace(/\s+/g, '_');
    const name = newRoleName.trim();

    if (!code || !name) {
      toast.error('Wszystkie pola są wymagane.');
      return;
    }

    if (roles[code.toUpperCase()] || Object.values(roles).includes(code)) {
      toast.error('Rola o takim kodzie już istnieje.');
      return;
    }

    const updatedRoles = {
      ...roles,
      [code.toUpperCase()]: code
    };

    const updatedLabels = {
      ...labels,
      [code]: name
    };

    const updatedPermissions = {
      ...permissions,
      [code]: []
    };

    setRoles(updatedRoles);
    setLabels(updatedLabels);
    setPermissions(updatedPermissions);

    await updateRolePermissions(updatedRoles, updatedLabels, updatedPermissions);
    
    setShowAddModal(false);
    setNewRoleName('');
    setNewRoleCode('');
    setExpandedRole(code);
    toast.success(`Rola "${name}" została pomyślnie dodana!`);
  }

  // Funkcja odpowiedzialna za edycję etykiety dla wybranej wariacji roli (nie dotyka kodu bazowego)
  async function handleEditRole(e) {
    e.preventDefault();
    const name = editRoleName.trim();
    if (!name) return;

    const updatedLabels = {
      ...labels,
      [editRoleKey]: name
    };

    setLabels(updatedLabels);
    await updateRolePermissions(roles, updatedLabels, permissions);

    setEditRoleKey(null);
    setEditRoleName('');
    toast.success('Nazwa roli zaktualizowana!');
  }

  // Funkcja obsługująca bezpieczne usunięcie wybranej roli z systemu, pomijająca krytyczne definicje wbudowane (criticalRoles)
  async function handleDeleteRole(roleKey) {
    if (criticalRoles.includes(roleKey)) {
      toast.error(`Rola systemowa "${labels[roleKey]}" nie może zostać usunięta.`);
      return;
    }

    if (!confirm(`Czy na pewno chcesz bezpowrotnie usunąć rolę "${labels[roleKey]}"?`)) {
      return;
    }

    const updatedRoles = { ...roles };
    const upperKey = Object.keys(roles).find(k => roles[k] === roleKey);
    if (upperKey) {
      delete updatedRoles[upperKey];
    }

    const updatedLabels = { ...labels };
    delete updatedLabels[roleKey];

    const updatedPermissions = { ...permissions };
    delete updatedPermissions[roleKey];

    setRoles(updatedRoles);
    setLabels(updatedLabels);
    setPermissions(updatedPermissions);

    await updateRolePermissions(updatedRoles, updatedLabels, updatedPermissions);
    
    if (expandedRole === roleKey) {
      setExpandedRole(null);
    }
    toast.success('Rola usunięta pomyślnie.');
  }

  return (
    <div className="page animate-fadeIn">
      
      <div className="page-header flex-between" style={{ marginBottom: 24, borderBottom: '1px solid var(--border-primary)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiShield size={28} style={{ color: 'var(--primary)' }} /> Role i Uprawnienia (RBAC)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Dynamiczne konfigurowanie dostępu użytkowników do modułów, raportów i akcji systemowych.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ padding: '10px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <FiPlus size={16} /> Nowa Rola
        </button>
      </div>

      <div style={{
        background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28
      }}>
        <FiAlertCircle size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <strong>Wskazówka:</strong> Kliknij na wybraną rolę poniżej, aby rozwinąć grupy uprawnień. Zmiany uprawnień i nowo dodane role są natychmiast synchronizowane w bazie danych Supabase i aktywowane dla wszystkich zalogowanych pracowników w czasie rzeczywistym.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.values(roles).map(roleKey => {
          const roleLabel = labels[roleKey] || roleKey;
          const rolePermsCount = (permissions[roleKey] || []).length;
          const isExpanded = expandedRole === roleKey;
          const isCritical = criticalRoles.includes(roleKey);

          return (
            <div 
              key={roleKey}
              style={{
                background: 'var(--bg-card)', border: `1.5px solid ${isExpanded ? 'var(--primary)' : 'var(--border-primary)'}`,
                borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div 
                onClick={() => setExpandedRole(isExpanded ? null : roleKey)}
                style={{
                  padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'var(--bg-tertiary)' : 'transparent',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FiShield size={22} style={{ color: roleKey === 'admin' ? 'var(--warning)' : 'var(--primary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {roleLabel}
                      {roleKey === 'admin' && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 20 }}>Pełne uprawnienia</span>
                      )}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>code: {roleKey}</span>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-light)' }}></span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {rolePermsCount} {rolePermsCount === 1 ? 'uprawnienie' : [2, 3, 4].includes(rolePermsCount % 10) && ![12, 13, 14].includes(rolePermsCount % 100) ? 'uprawnienia' : 'uprawnień'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                  <button 
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => {
                      setEditRoleKey(roleKey);
                      setEditRoleName(roleLabel);
                    }}
                    title="Zmień nazwę roli"
                  >
                    <FiEdit size={15} />
                  </button>
                  
                  {!isCritical && (
                    <button 
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteRole(roleKey)}
                      title="Usuń rolę"
                      style={{ color: 'var(--danger)' }}
                    >
                      <FiTrash2 size={15} />
                    </button>
                  )}

                  <div style={{ color: 'var(--text-muted)', marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <FiChevronUp size={22} style={{ color: 'var(--primary)' }} /> : <FiChevronDown size={22} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ 
                  borderTop: '1px solid var(--border-primary)', padding: '24px 28px', background: 'var(--bg-primary)',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  {roleKey === 'admin' ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      <FiShield size={48} style={{ color: 'var(--warning)', marginBottom: 12, opacity: 0.8 }} />
                      <p style={{ fontSize: '0.85rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
                        Administrator posiada pełny i absolutny dostęp do wszystkich funkcji systemu, baz danych i ustawień bezpieczeństwa. Tych uprawnień nie można modyfikować.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                      {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermList]) => {
                        const groupPermValues = groupPermList.map(([_, v]) => v);
                        const hasAll = groupPermValues.every(v => (permissions[roleKey] || []).includes(v));

                        return (
                          <div 
                            key={groupName} 
                            style={{
                              background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', 
                              padding: 16, display: 'flex', flexDirection: 'column'
                            }}
                          >
                            <div style={{ 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                              borderBottom: '1px solid var(--border-light)', paddingBottom: 10, marginBottom: 12 
                            }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{groupName}</span>
                              <button
                                onClick={() => handleToggleAllInGroup(roleKey, groupName, groupPermList)}
                                style={{
                                  background: 'none', border: 'none', color: hasAll ? 'var(--danger)' : 'var(--success)',
                                  fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: 0
                                }}
                              >
                                {hasAll ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                              {groupPermList.map(([permKey, permVal]) => {
                                const has = (permissions[roleKey] || []).includes(permVal);
                                const label = PERMISSION_LABELS[permVal] || permVal;

                                return (
                                  <label 
                                    key={permKey}
                                    style={{
                                      display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                                      userSelect: 'none', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                                      background: has ? 'var(--bg-tertiary)' : 'transparent',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={has}
                                      onChange={() => handleTogglePermission(roleKey, permVal)}
                                      style={{ marginTop: 2, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                    <div>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: has ? 'var(--text-heading)' : 'var(--text-primary)' }}>{label}</div>
                                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{permVal}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <form 
            onSubmit={handleAddRole}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
              padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiShield size={20} style={{ color: 'var(--primary)' }} /> Dodaj Nową Rolę
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 20 }}>
              Stwórz nową rolę i przydziel jej określone uprawnienia w widoku szczegółów po zapisaniu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Nazwa wyświetlana (np. Kierownik Zmiany)</label>
                <input 
                  type="text"
                  required
                  placeholder="Kierownik Zmiany"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Unikalny kod (np. shift_manager)</label>
                <input 
                  type="text"
                  required
                  placeholder="shift_manager"
                  value={newRoleCode}
                  onChange={e => setNewRoleCode(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewRoleName('');
                  setNewRoleCode('');
                }}
                style={{ flex: 1, padding: 12 }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: 12 }}
              >
                Dodaj Rolę
              </button>
            </div>
          </form>
        </div>
      )}

      {editRoleKey && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <form 
            onSubmit={handleEditRole}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
              padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiEdit size={20} style={{ color: 'var(--primary)' }} /> Zmień Nazwę Roli
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 20 }}>
              Zmień nazwę wyświetlaną dla roli: <strong>{editRoleKey}</strong>.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Nazwa wyświetlana</label>
              <input 
                type="text"
                required
                value={editRoleName}
                onChange={e => setEditRoleName(e.target.value)}
                className="input"
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditRoleKey(null);
                  setEditRoleName('');
                }}
                style={{ flex: 1, padding: 12 }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: 12 }}
              >
                Zapisz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
