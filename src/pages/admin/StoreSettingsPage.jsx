import { useState } from 'react';
import { FiSettings, FiSave, FiUpload, FiMapPin, FiCreditCard, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function StoreSettingsPage() {
  const [store, setStore] = useState({
    name: 'Sklep Budowlany "Pod Młotkiem"',
    nip: '5213456789',
    address: 'ul. Budowlana 15, 00-100 Warszawa',
    phone: '22 123 45 67',
    email: 'sklep@podmłotkiem.pl',
    bankAccount: 'PL61 1090 1014 0000 0712 1981 2874',
    vatRates: [
      { name: 'Standardowy', rate: 23, code: 'A' },
      { name: 'Obniżony', rate: 8, code: 'B' },
      { name: 'Super obniżony', rate: 5, code: 'C' },
      { name: 'Zwolniony', rate: 0, code: 'D' },
    ],
  });

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Ustawienia sklepu</h1><p>Profil firmy, VAT, integracje</p></div>
        <button className="btn btn-primary" onClick={() => toast.success('Zapisano!')}><FiSave size={16} /> Zapisz</button>
      </div>
      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <h3 className="mb-16"><FiSettings size={18} style={{ marginRight: 8 }} />Dane firmy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group"><label>Nazwa firmy</label><input className="input" value={store.name} onChange={e => setStore({...store, name: e.target.value})} /></div>
            <div className="input-group"><label>NIP</label><input className="input" value={store.nip} onChange={e => setStore({...store, nip: e.target.value})} /></div>
            <div className="input-group"><label>Adres</label><input className="input" value={store.address} onChange={e => setStore({...store, address: e.target.value})} /></div>
            <div className="input-group"><label>Telefon</label><input className="input" value={store.phone} /></div>
            <div className="input-group"><label>E-mail</label><input className="input" value={store.email} /></div>
            <div className="input-group"><label>Nr konta bankowego</label><input className="input font-mono" value={store.bankAccount} /></div>
            <div className="input-group"><label>Logo firmy</label><button className="btn btn-secondary"><FiUpload size={14} /> Wczytaj logo</button></div>
          </div>
        </div>
        <div>
          <div className="card mb-16">
            <h3 className="mb-16">Stawki VAT</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Nazwa</th><th>Stawka</th><th>Kod fiskalny</th></tr></thead>
                <tbody>
                  {store.vatRates.map((v, i) => (
                    <tr key={i}><td>{v.name}</td><td style={{ fontWeight: 600 }}>{v.rate}%</td><td className="font-mono">{v.code}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card mb-16">
            <h3 className="mb-16"><FiMapPin size={16} style={{ marginRight: 8 }} />Lokalizacje (Multi-store)</h3>
            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500 }}>Sklep główny — ul. Budowlana 15</div>
              <div className="text-xs text-muted">Aktywny • 5 pracowników</div>
            </div>
          </div>
          <div className="card">
            <h3 className="mb-16"><FiCreditCard size={16} style={{ marginRight: 8 }} />Integracje</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Terminal płatniczy', 'System SMS', 'KSeF (e-faktura)', 'Drukarka fiskalna', 'Drukarka bonowa'].map(name => (
                <div key={name} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-sm">{name}</span>
                  <span className="badge badge-ghost">Nie skonfigurowano</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
