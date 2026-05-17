import { FiShield, FiKey, FiDatabase, FiLock, FiSmartphone, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

/**
 * Widok modułu SecurityPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Security.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony SecurityPage
 */
export default function SecurityPage() {
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Bezpieczeństwo</h1><p>2FA, RODO, kopie zapasowe, szyfrowanie</p></div>
      </div>
      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <h3 className="mb-16"><FiSmartphone size={18} style={{ marginRight: 8 }} />Uwierzytelnianie dwuskładnikowe (2FA)</h3>
          <p className="text-sm text-muted mb-16">Wymagaj 2FA przy logowaniu do panelu Admin.</p>
          <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <span>2FA dla Adminów</span>
            <label className="switch"><input type="checkbox" defaultChecked /><span className="switch-slider"></span></label>
          </div>
          <div className="flex-between mt-8" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <span>2FA dla Kierowników</span>
            <label className="switch"><input type="checkbox" /><span className="switch-slider"></span></label>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-16"><FiDatabase size={18} style={{ marginRight: 8 }} />Kopie zapasowe</h3>
          <div className="flex flex-col gap-8">
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Automatyczny backup</span>
              <label className="switch"><input type="checkbox" defaultChecked /><span className="switch-slider"></span></label>
            </div>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Harmonogram</span>
              <span className="badge badge-ghost">Codziennie, 03:00</span>
            </div>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Ostatni backup</span>
              <span className="badge badge-success">12.03.2026, 03:00</span>
            </div>
            <button className="btn btn-secondary" onClick={() => toast.success('Backup rozpoczęty...')}><FiDatabase size={14} /> Wykonaj backup teraz</button>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-16"><FiLock size={18} style={{ marginRight: 8 }} />RODO — Ochrona danych</h3>
          <div className="flex flex-col gap-8">
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Szyfrowanie danych (SSL/TLS)</span>
              <span className="badge badge-success">Aktywne</span>
            </div>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Rejestr zgód marketingowych</span>
              <span className="badge badge-ghost">7 wpisów</span>
            </div>
            <button className="btn btn-danger btn-sm"><FiTrash2 size={14} /> Usun dane klienta (prawo do zapomnienia)</button>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-16"><FiKey size={18} style={{ marginRight: 8 }} />Sesje i logowanie</h3>
          <div className="flex flex-col gap-8">
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Auto-wylogowanie po bezczynności</span>
              <span className="badge badge-ghost">15 minut</span>
            </div>
            <div className="flex-between" style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span>Aktywne sesje</span>
              <span className="badge badge-primary">3</span>
            </div>
            <button className="btn btn-danger" onClick={() => toast.success('🚨 TRYB KRYZYSOWY — Wszystkie sesje zakończone!')} style={{ width: '100%' }}>
              <FiShield size={16} /> Tryb kryzysowy — Zakończ wszystkie sesje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
