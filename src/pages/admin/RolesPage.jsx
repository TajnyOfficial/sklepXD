import { ROLES, ROLE_LABELS, PERMISSIONS, getPermissionsForRole } from '../../utils/rbac';
import { FiShield, FiCheck, FiX, FiEdit } from 'react-icons/fi';

const PERMISSION_GROUPS = {
  'Sprzedaż (POS)': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('POS_')),
  'Zamówienia': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('ORDERS_')),
  'Zwroty': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('RETURNS_')),
  'Klienci': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('CUSTOMERS_')),
  'Dokumenty': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('DOCS_')),
  'Magazyn': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('PRODUCTS_') || k.startsWith('STOCK_') || k.startsWith('TRANSFERS_') || k.startsWith('LABELS_')),
  'Dostawy': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('DELIVERIES_')),
  'Inwentaryzacja': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('INVENTORY_')),
  'Finanse': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('FINANCE_') || k.startsWith('MARGINS_')),
  'HR': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('HR_')),
  'Administracja': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('ADMIN_')),
  'Komunikacja': Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('TASKS_') || k.startsWith('ANNOUNCEMENTS_')),
};

const DISPLAY_ROLES = [ROLES.ADMIN, ROLES.SHIFT_MANAGER, ROLES.SALES_MANAGER, ROLES.WAREHOUSE_MANAGER, ROLES.CASHIER, ROLES.WAREHOUSE_WORKER, ROLES.CLEANER];

export default function RolesPage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Role i uprawnienia (RBAC)</h1><p>Zarządzanie dostępem do modułów i funkcji</p></div>
        <button className="btn btn-primary"><FiShield size={16} /> Nowa rola</button>
      </div>

      <div className="table-container" style={{ fontSize: '0.75rem' }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 200, position: 'sticky', left: 0, zIndex: 2, background: 'var(--bg-tertiary)' }}>Uprawnienie</th>
              {DISPLAY_ROLES.map(role => (
                <th key={role} style={{ textAlign: 'center', minWidth: 90, fontSize: '0.65rem' }}>
                  {ROLE_LABELS[role].split('/')[0].trim().split(' ').slice(0, 2).join(' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
              <>
                <tr key={`group-${group}`}>
                  <td colSpan={DISPLAY_ROLES.length + 1} style={{ fontWeight: 700, color: 'var(--accent-light)', background: 'var(--bg-tertiary)', padding: '8px 16px' }}>{group}</td>
                </tr>
                {perms.map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1, fontSize: '0.7rem' }}>{value}</td>
                    {DISPLAY_ROLES.map(role => {
                      const has = getPermissionsForRole(role).includes(value);
                      return (
                        <td key={role} style={{ textAlign: 'center' }}>
                          {has ? <FiCheck size={14} style={{ color: 'var(--success)' }} /> : <FiX size={14} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
