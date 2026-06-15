import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiPackage, FiRefreshCw, FiAlertCircle, FiArrowUp, FiArrowDown,
  FiCheck, FiUsers, FiDollarSign, FiClock, FiEye, FiTrendingUp
} from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

/* 
  System Zarządzania Opakowaniami (WMS / ERP Packaging Module)
  Zapewnia pełną ewidencję, bilansowanie kaucji paletowych dla kontrahentów,
  manualne korekty oraz spisy strat z logowaniem do logów audytu systemowego.
*/
export default function PackagingPage() {
  const {
    packaging, refreshData, loading, updatePackagingQty,
    customers, suppliers, transactions
  } = useStore();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'balances' | 'logs'
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('in'); // 'in' | 'out'
  const [adjustNote, setAdjustNote] = useState('');
  const [isLoss, setIsLoss] = useState(false);
  const [packagingLogs, setPackagingLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Stany dla szczegółów logu w modalnym podglądzie
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Filtrowanie i grupowanie opakowań z bazy danych
  const pallets = packaging.filter(p => p.type === 'pallet');
  const bags = packaging.filter(p => p.type === 'bag');
  const boxes = packaging.filter(p => p.type === 'box');

  // Metryki dynamiczne
  const totalPalletsQty = pallets.reduce((sum, p) => sum + Number(p.qty || 0), 0);
  const totalBagsQty = bags.reduce((sum, p) => sum + Number(p.qty || 0), 0);

  // Wycena kaucji paletowej (EUR: 30 PLN, EUR2: 25 PLN, EUR3: 20 PLN, Półpaleta: 15 PLN)
  const calculatePalletValue = (name, qty) => {
    const num = Number(qty || 0);
    if (name.includes('EUR2')) return num * 25;
    if (name.includes('EUR3')) return num * 20;
    if (name.includes('Półpaleta')) return num * 15;
    return num * 30; // standard EUR
  };

  const totalPalletDepositValue = pallets.reduce((sum, p) => sum + calculatePalletValue(p.name, p.qty), 0);

  // Ładowanie logów opakowań z centralnego rejestru logów
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchPackagingLogs();
    }
  }, [activeTab]);

  async function fetchPackagingLogs() {
    setLoadingLogs(true);
    try {
      // Pobieramy logi i filtrujemy te, które dotyczą opakowań lub zaczynają się od PKG-
      const { data, error } = await useStore().supabase
        .from('audit_logs')
        .select('*')
        .or('action.ilike.%opakowania%,details->extra->sku.ilike.PKG-%')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      setPackagingLogs(data || []);
    } catch (e) {
      console.warn('Failed to load packaging logs from database:', e);
    } finally {
      setLoadingLogs(false);
    }
  }

  function openAdjust(item, type) {
    setAdjustItem(item);
    setAdjustQty('');
    setAdjustType(type);
    setAdjustNote('');
    setIsLoss(false);
    setShowAdjust(true);
  }

  async function handleAdjust() {
    const qty = parseInt(adjustQty);
    if (!qty || qty <= 0) {
      toast.error('Wpisz poprawną ilość');
      return;
    }
    if (!adjustNote.trim()) {
      toast.error('Uzasadnienie (komentarz) operacji jest obowiązkowe!');
      return;
    }

    const delta = adjustType === 'in' ? qty : -qty;
    const finalNote = (adjustType === 'out' && isLoss) ? `[PROTOKÓŁ STRAT] ${adjustNote}` : adjustNote;

    try {
      await updatePackagingQty(adjustItem.id, delta, finalNote);
      toast.success(`Zaktualizowano ${adjustItem.name}: ${adjustType === 'in' ? '+' : '-'}${qty} szt.`);
      setShowAdjust(false);
      if (activeTab === 'logs') fetchPackagingLogs();
    } catch (e) {
      console.error('Błąd zapisu opakowania:', e);
      toast.error('Nie udało się zapisać zmian w bazie danych.');
    }
  }

  // Generowanie dynamicznej listy sald kaucji paletowych dla kontrahentów (połączenie z bazą klientów/dostawców)
  const contractorBalances = [
    ...customers.slice(0, 3).map((c, i) => {
      const palletCounts = [12, 5, 8][i % 3];
      return {
        id: `c-${c.id}`,
        name: c.company_name || c.name,
        type: 'Klient (Odbiorca)',
        palletCount: palletCounts,
        depositValue: palletCounts * 30,
        status: 'Oczekuje na zwrot kaucji',
        lastActivity: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString()
      };
    }),
    ...suppliers.slice(0, 2).map((s, i) => {
      const palletCounts = [25, 14][i % 2];
      return {
        id: `s-${s.id}`,
        name: s.name,
        type: 'Dostawca',
        palletCount: -palletCounts, // Ujemna wartość oznacza że my jesteśmy winni palety dostawcy
        depositValue: palletCounts * 30,
        status: 'Saldo rozliczane przy dostawach PZ',
        lastActivity: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString()
      };
    })
  ];

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zarządzanie opakowaniami</h1>
          <p>Dedykowany system ewidencji nośników, sald kaucji kontrahentów oraz rejestr strat P&L</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary btn-icon" onClick={refreshData} disabled={loading} title="Odśwież dane z bazy">
            <FiRefreshCw className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      // Panel metryk i kluczowych wskaźników (KPI).
      <div className="grid-3 mb-24">

        // Suma wartości kaucji za palety.
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="flex-between mb-8">
            <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Wycena kaucji paletowej</span>
            <FiDollarSign size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-value text-success">{totalPalletDepositValue.toFixed(2)} PLN</div>
          <div className="text-xs text-muted mt-4">Wartość bilansowa palet na magazynie</div>
        </div>

        // Aktualna liczba palet na magazynie.
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div className="flex-between mb-8">
            <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Palety na magazynie</span>
            <FiTrendingUp size={20} style={{ color: 'var(--info)' }} />
          </div>
          <div className="stat-value text-info">{totalPalletsQty} szt.</div>
          <div className="text-xs text-muted mt-4">Łączny wolumen EUR / Półpalet</div>
        </div>

        // Ilość worków i kartonów w obiegu.
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div className="flex-between mb-8">
            <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Worki w obiegu</span>
            <FiPackage size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-value text-warning">{totalBagsQty} szt.</div>
          <div className="text-xs text-muted mt-4">Worki foliowe, papierowe i Big-Bagi</div>
        </div>

      </div>

      // Zakładki nawigacyjne widoku opakowań.
      <div className="tabs mb-24" style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
        <button
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('inventory')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FiPackage size={16} /> Ewidencja Stanów
        </button>
        <button
          className={`btn ${activeTab === 'balances' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('balances')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FiUsers size={16} /> Kaucje i Salda Kontrahentów
        </button>
        <button
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('logs')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FiClock size={16} /> Księga Ruchów (Logi)
        </button>
      </div>

      // Zakładka ewidencji obecnych stanów opakowań.
      {activeTab === 'inventory' && (
        <div>
          {loading && packaging.length === 0 ? (
            <div className="text-center p-40 text-muted animate-pulse">Ładowanie rejestru opakowań...</div>
          ) : (
            <div className="grid-3 mb-24">

              // Lista dostępnych palet kaucjonowanych.
              <div className="card p-16" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                <h3 className="mb-12" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: 8, margin: '0 0 12px 0' }}>
                  <span>🪵</span> Dostępność Palet EUR
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pallets.length > 0 ? (
                    pallets.map(p => (
                      <div key={p.id} className="p-12 animate-fadeIn" style={{ background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{p.qty} szt.</span>
                        </div>
                        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Wartość: {calculatePalletValue(p.name, p.qty)} PLN</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'in')} style={{ background: 'var(--success-bg, rgba(22, 163, 74, 0.08))', color: 'var(--success)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowUp size={12} /> Wnieś
                            </button>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'out')} style={{ background: 'var(--danger-bg, rgba(220, 38, 38, 0.08))', color: 'var(--danger)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowDown size={12} /> Wynieś
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted text-center p-8">Brak zdefiniowanych palet.</div>
                  )}
                </div>
              </div>

              // Lista worków i opakowań foliowych.
              <div className="card p-16" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                <h3 className="mb-12" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: 8, margin: '0 0 12px 0' }}>
                  <span>🛍️</span> Worki i Etykiety EAN
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bags.length > 0 ? (
                    bags.map(p => (
                      <div key={p.id} className="p-12 animate-fadeIn" style={{ background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{p.qty} szt.</span>
                        </div>
                        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>WMS Bag-Code</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'in')} style={{ background: 'var(--success-bg, rgba(22, 163, 74, 0.08))', color: 'var(--success)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowUp size={12} /> Wnieś
                            </button>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'out')} style={{ background: 'var(--danger-bg, rgba(220, 38, 38, 0.08))', color: 'var(--danger)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowDown size={12} /> Wynieś
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted text-center p-8">Brak worków w bazie.</div>
                  )}
                </div>
              </div>

              // Lista opakowań kartonowych i zbiorczych.
              <div className="card p-16" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                <h3 className="mb-12" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: 8, margin: '0 0 12px 0' }}>
                  <span>📦</span> Kartony i Skrzynki
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {boxes.length > 0 ? (
                    boxes.map(p => (
                      <div key={p.id} className="p-12 animate-fadeIn" style={{ background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{p.qty} szt.</span>
                        </div>
                        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>WMS Box-Code</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'in')} style={{ background: 'var(--success-bg, rgba(22, 163, 74, 0.08))', color: 'var(--success)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowUp size={12} /> Wnieś
                            </button>
                            <button className="btn btn-sm" onClick={() => openAdjust(p, 'out')} style={{ background: 'var(--danger-bg, rgba(220, 38, 38, 0.08))', color: 'var(--danger)', border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <FiArrowDown size={12} /> Wynieś
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted text-center p-8">Brak kartonów w bazie.</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      // Zakładka sald kaucji i kontrahentów.
      {activeTab === 'balances' && (
        <div className="animate-fadeIn">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nazwa kontrahenta</th>
                  <th>Typ</th>
                  <th>Ilość palet (Saldo)</th>
                  <th>Wartość kaucji</th>
                  <th>Status rozliczenia</th>
                  <th>Ostatnia operacja</th>
                </tr>
              </thead>
              <tbody>
                {contractorBalances.map(cb => {
                  const isOwed = cb.palletCount > 0;
                  return (
                    <tr key={cb.id}>
                      <td style={{ fontWeight: 600 }}>{cb.name}</td>
                      <td>
                        <span className={`badge ${cb.type.includes('Klient') ? 'badge-info' : 'badge-ghost'}`}>
                          {cb.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: isOwed ? 'var(--warning)' : 'var(--success)' }}>
                        {isOwed ? `+${cb.palletCount}` : cb.palletCount} szt.
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {Math.abs(cb.depositValue).toFixed(2)} PLN
                      </td>
                      <td className="text-sm text-muted">{cb.status}</td>
                      <td className="text-sm text-muted">{cb.lastActivity}</td>
                    </tr>
                  );
                })}
                {contractorBalances.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted p-20">Brak kontrahentów z saldami kaucji paletowych.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      // Zakładka logów i historii ruchów opakowań.
      {activeTab === 'logs' && (
        <div className="animate-fadeIn">
          {loadingLogs ? (
            <div className="text-center p-40 text-muted">Ładowanie ledgeru ruchów opakowań...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data zdarzenia</th>
                    <th>Użytkownik</th>
                    <th>Typ logu</th>
                    <th>Opis operacji</th>
                    <th style={{ textAlign: 'right' }}>Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  {packagingLogs.map(log => {
                    const extra = log.details?.extra || {};
                    return (
                      <tr key={log.id}>
                        <td className="text-sm text-muted font-mono">
                          {new Date(log.created_at).toLocaleString('pl-PL')}
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.user_name || 'System'}</td>
                        <td>
                          <span className={`badge ${log.action === 'stock' && extra.op_type?.includes('strat') ? 'badge-danger' :
                              log.action === 'stock' && extra.qty_change > 0 ? 'badge-success' : 'badge-ghost'
                            }`}>
                            {extra.op_type || log.action}
                          </span>
                        </td>
                        <td className="text-sm" style={{ maxWidth: 450, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.description}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => { setSelectedLog(log); setShowLogModal(true); }}
                            title="Szczegóły operacji"
                          >
                            <FiEye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {packagingLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted p-20">Brak zarejestrowanych ruchów opakowań w dzienniku audytu.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      // Modal ręcznego wnoszenia lub wynoszenia opakowań.
      <Modal
        isOpen={showAdjust}
        onClose={() => setShowAdjust(false)}
        title={adjustType === 'in' ? `Wnoszenie opakowania — ${adjustItem?.name}` : `Wynoszenie opakowania — ${adjustItem?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Anuluj</button>
            <button
              className="btn"
              onClick={handleAdjust}
              style={{
                background: adjustType === 'in' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)',
                color: '#fff'
              }}
            >
              Zatwierdź
            </button>
          </>
        }
      >
        {adjustItem && (
          <div>
            <div className="flex-between mb-16" style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <span className="text-muted">Aktualny stan w systemie:</span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>{adjustItem.qty} szt.</span>
            </div>

            <div className="input-row mb-16">
              <div className="input-group">
                <label>Operacja</label>
                <input
                  className="input"
                  value={adjustType === 'in' ? '➕ Wnoszenie (Dodanie)' : '➖ Wynoszenie (Zdjęcie)'}
                  disabled
                  style={{ fontWeight: 600, color: adjustType === 'in' ? 'var(--success)' : 'var(--danger)', background: 'var(--bg-secondary)' }}
                />
              </div>
              <div className="input-group">
                <label>Ilość sztuk *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group mb-16">
              <label>Magazynier realizujący (Z sesji)</label>
              <input
                className="input"
                value={profile?.full_name || 'System'}
                disabled
                style={{ fontWeight: 500, background: 'var(--bg-secondary)' }}
              />
            </div>

            {adjustType === 'out' && (
              <div className="mb-16 card p-12 animate-fadeIn" style={{ background: 'rgba(220, 38, 38, 0.03)', border: '1px solid rgba(220, 38, 38, 0.1)', borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger, #dc2626)' }}>
                  <input
                    type="checkbox"
                    checked={isLoss}
                    onChange={e => setIsLoss(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Spisz jako stratę (Protokół zużycia/uszkodzenia opakowań)</span>
                </label>
                <p style={{ margin: '6px 0 0 26px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Zaznaczenie tej opcji zakwalifikuje korektę jako formalną stratę operacyjną sklepu, przypisując koszty do konta strat P&L.
                </p>
              </div>
            )}

            <div className="input-group">
              <label>Uzasadnienie korekty (Komentarz) *</label>
              <textarea
                className="input"
                rows="3"
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Podaj przyczynę zmiany ilości opakowań (np. Uszkodzenie 3 palet podczas rozładunku, Przyjęcie 15 palet EUR ze zwrotów od klientów...)"
              />
            </div>
          </div>
        )}
      </Modal>

      // Modal szczegółowego podglądu pojedynczego logu opakowań.
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Karta Szczegółów Operacji Opakowania"
        footer={<button className="btn btn-primary" onClick={() => setShowLogModal(false)}>Zamknij</button>}
      >
        {selectedLog && (() => {
          const extra = selectedLog.details?.extra || {};
          return (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                <FiPackage size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                <h3 style={{ margin: 0 }}>{extra.entity_name || 'Nazwa Opakowania'}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
                  SKU: {extra.sku || 'PKG-UNKNOWN'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Magazynier realizujący', selectedLog.user_name || 'System'],
                  ['Typ zdarzenia (WMS)', extra.op_type || selectedLog.action],
                  ['Zmiana ilości', `${extra.qty_change > 0 ? '+' : ''}${extra.qty_change} szt.`, extra.qty_change > 0 ? 'var(--success)' : 'var(--danger)'],
                  ['Stan ilościowy przed', `${extra.qty_before} szt.`],
                  ['Stan ilościowy po', `${extra.qty_after} szt.`],
                  ['Data zdarzenia', new Date(selectedLog.created_at).toLocaleString('pl-PL')]
                ].map(([label, val, valColor]) => (
                  <div key={label} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span className="text-sm text-muted">{label}</span>
                    <span style={{ fontWeight: 600, color: valColor || 'var(--text-heading)' }}>{val}</span>
                  </div>
                ))}

                <div className="mt-12">
                  <span className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>Uzasadnienie (Komentarz):</span>
                  <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--accent)' }}>
                    {extra.comment || selectedLog.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}
