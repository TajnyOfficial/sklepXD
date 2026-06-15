import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiSave, FiKey, FiMessageCircle, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdditionalSettingsPage() {
  const { shopSettings, updateShopSettings } = useStore();

  // Integrations management
  const [integrations, setIntegrations] = useState({
    ksef: '',
    sms: '',
    bank: ''
  });

  useEffect(() => {
    if (shopSettings?.integrations) {
      setIntegrations(shopSettings.integrations);
    }
  }, [shopSettings]);

  async function handleSaveIntegrations() {
    try {
      await updateShopSettings({
        ...shopSettings,
        integrations
      });
      toast.success('Ustawienia integracji zapisane');
    } catch (err) {
      toast.error(`Błąd: ${err.message}`);
    }
  }

  const F_INT = (field) => (e) => setIntegrations(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dodatkowe Ustawienia</h1>
          <p>Konfiguracja integracji (KSeF, SMS, Banki)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        // Integracje
        <div className="card">
          <div className="flex-between mb-16">
            <h3>Integracje zewnętrzne</h3>
            <button className="btn btn-primary btn-sm" onClick={handleSaveIntegrations}>
              <FiSave size={14} /> Zapisz integracje
            </button>
          </div>

          <div className="input-group mb-16">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiKey /> Token KSeF (Krajowy System e-Faktur)</label>
            <input
              className="input font-mono text-sm"
              type="password"
              value={integrations.ksef}
              onChange={F_INT('ksef')}
              placeholder="Wprowadź token autoryzacyjny KSeF..."
            />
          </div>

          <div className="input-group mb-16">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiMessageCircle /> Bramka SMS (API Key)</label>
            <input
              className="input font-mono text-sm"
              type="password"
              value={integrations.sms}
              onChange={F_INT('sms')}
              placeholder="Klucz API bramki SMS (np. SMSAPI)..."
            />
          </div>

          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiBriefcase /> Integracja Bankowa (Open Banking API)</label>
            <input
              className="input font-mono text-sm"
              type="password"
              value={integrations.bank}
              onChange={F_INT('bank')}
              placeholder="Wprowadź token API dla Twojego banku..."
            />
          </div>
        </div>

      </div>
    </div>
  );
}
