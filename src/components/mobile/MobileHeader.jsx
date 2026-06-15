import { useStore } from '../../contexts/StoreContext';
import { getInitials } from '../../utils/helpers';

// Pasek nagłówkowy aplikacji mobilnej. Wyświetla dane i rolę zalogowanego pracownika.
export default function MobileHeader({ title = 'Sklep Mobile', subtitle = '' }) {
  // Odczyt sesji pracownika.
  const { mobileSession } = useStore();
  
  // Imię / Nazwisko użytkownika.
  const userName = mobileSession?.mobileUser?.name || mobileSession?.mobileUser?.full_name || 'Użytkownik';
  
  // Rola systemowa użytkownika.
  const userRole = mobileSession?.mobileUser?.role || 'Pracownik';

  return (
    <div style={{ 
      padding: '20px 20px 12px', 
      borderBottom: '1px solid var(--border-primary)', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      background: 'var(--bg-primary)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 10 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--info), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, color: '#fff',
        }}>M</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            {userName}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {userRole === 'admin' ? 'Administrator' :
              userRole === 'shift_manager' ? 'Kierownik zmiany' :
                userRole === 'warehouse_worker' ? 'Magazynier' :
                  userRole === 'warehouse_manager' ? 'Kierownik Magazynu' : 'Pracownik'}
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--info), var(--info))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, color: '#fff',
          border: '1.5px solid var(--info)'
        }}>
          {getInitials(userName)}
        </div>
      </div>
    </div>
  );
}
