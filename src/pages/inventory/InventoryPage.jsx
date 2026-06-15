import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiPlay, FiCheck, FiUserPlus, FiInfo, FiLayers } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

// Zintegrowany moduł Inwentaryzacji (widok Managera Magazynu).
// Umożliwia planowanie inwentaryzacji (pełne/częściowe/ślepe), zlecanie ich magazynierom (Mobile),
// zatwierdzanie spisu z natury oraz weryfikację raportów z różnicami.
export default function InventoryPage() {
  const { products, categories, employees, inventories, saveInventory } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [assignInv, setAssignInv] = useState(null);
  const [detailsInv, setDetailsInv] = useState(null);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [form, setForm] = useState({ type: 'partial', scope: '', blind: false });
  const [activeInv, setActiveInv] = useState(null);
  const [counts, setCounts] = useState([]);

  function createInventory() {
    const initialItems = products.map(p => ({
      sku: p.sku,
      name: p.name,
      product_id: p.id,
      system_qty: p.stock_qty || 0,
      counted_qty: null
    }));

    const inv = {
      id: crypto.randomUUID(),
      number: `INW/2026/03/${String(inventories.length + 1).padStart(3, '0')}`,
      type: form.type,
      scope: form.scope,
      status: 'planned',
      blind: form.blind,
      items: initialItems,
      count: 0,
      diff: 0,
      date: new Date().toISOString().split('T')[0],
      assigned_to: null,
      assigned_users: [],
      assigned_name: 'Nieprzypisany'
    };
    saveInventory(inv);
    toast.success(`Utworzono zlecenie inwentaryzacji ${inv.number}`);
    setShowCreate(false);
    setForm({ type: 'partial', scope: '', blind: false });
  }

  function openAssignModal(inv) {
    setAssignInv(inv);
    setSelectedEmps(inv.assigned_users || (inv.assigned_to ? [inv.assigned_to] : []));
    setShowAssign(true);
  }

  function confirmAssignment() {
    if (selectedEmps.length === 0) {
      toast.error('Wybierz przynajmniej jednego pracownika');
      return;
    }
    const emps = employees.filter(e => selectedEmps.includes(e.id));
    if (emps.length === 0) return;

    saveInventory({
      ...assignInv,
      assigned_to: emps[0].id, // backward compatibility
      assigned_users: emps.map(e => e.id),
      assigned_name: emps.map(e => e.name).join(', '),
      status: 'assigned'
    });
    toast.success(`Zlecono inwentaryzację ${assignInv.number} pracownikom: ${emps.map(e => e.name).join(', ')}`);
    setShowAssign(false);
  }

  function openDetails(inv) {
    setDetailsInv(inv);
    setShowDetails(true);
  }

  function startInventory(inv) {
    saveInventory({ ...inv, status: 'in_progress' });
    startCounting(inv);
  }

  function startCounting(inv) {
    setActiveInv(inv);
    const initialCounts = inv.items && inv.items.length > 0
      ? inv.items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          sku: item.sku,
          system_qty: inv.blind ? null : item.system_qty,
          counted_qty: item.counted_qty !== null ? String(item.counted_qty) : ''
        }))
      : products.map(p => ({
          product_id: p.id,
          name: p.name,
          sku: p.sku,
          system_qty: inv.blind ? null : p.stock_qty,
          counted_qty: ''
        }));
    setCounts(initialCounts);
    setShowCount(true);
  }

  function updateCount(i, val) { 
    setCounts(prev => prev.map((c, idx) => idx === i ? { ...c, counted_qty: val } : c)); 
  }

  function completeInventory() {
    const counted = counts.filter(c => c.counted_qty !== '');
    if (counted.length === 0) { toast.error('Wprowadź co najmniej jeden wynik'); return; }

    const updatedItems = activeInv.items.map(item => {
      const c = counts.find(x => x.product_id === item.product_id);
      return {
        ...item,
        counted_qty: c && c.counted_qty !== '' ? parseFloat(c.counted_qty) : null
      };
    });

    const diffs = updatedItems.reduce((sum, item) => {
      if (item.counted_qty !== null) {
        return sum + (item.counted_qty - item.system_qty);
      }
      return sum;
    }, 0);

    const updatedInv = {
      ...activeInv,
      status: 'completed',
      items: updatedItems,
      count: updatedItems.filter(i => i.counted_qty !== null).length,
      diff: diffs
    };

    saveInventory(updatedInv);
    toast.success(`Inwentaryzacja zakończona — ${updatedInv.count} pozycji przeliczonych`);
    setShowCount(false);
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inwentaryzacja</h1>
          <p>Spis z natury — tryb ślepy, częściowy, pełny</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <FiPlay size={16} /> Nowa inwentaryzacja
        </button>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-card">
          <span className="stat-label">Oczekują zlecenia</span>
          <span className="stat-value text-muted">{inventories.filter(i => i.status === 'planned').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">W trakcie / Zlecone</span>
          <span className="stat-value text-warning">{inventories.filter(i => i.status === 'in_progress' || i.status === 'assigned').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Zakończone</span>
          <span className="stat-value text-success">{inventories.filter(i => i.status === 'completed').length}</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nr inwentaryzacji</th>
              <th>Typ / Zakres</th>
              <th>Pracownik odpowiedzialny</th>
              <th>Tryb</th>
              <th>Postęp</th>
              <th>Różnice</th>
              <th>Status</th>
              <th style={{ width: 120, textAlign: 'right' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {inventories.map(inv => {
              const totalItems = Array.isArray(inv.items) ? inv.items.length : 0;
              const progressPct = totalItems > 0 ? (inv.count / totalItems) * 100 : 0;

              return (
                <tr key={inv.id}>
                  <td>
                    <div className="font-mono text-sm" style={{ fontWeight: 600 }}>{inv.number}</div>
                    <div className="text-xs text-muted">{inv.date}</div>
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-ghost">
                        {inv.type === 'full' ? 'Pełna' : inv.type === 'partial' ? 'Częściowa' : 'Cykliczna'}
                      </span>
                    </div>
                    <div className="text-xs mt-4">{inv.scope || 'Cały magazyn'}</div>
                  </td>
                  <td>
                    {inv.assigned_name !== 'Nieprzypisany' ? (
                      <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <div className="avatar-xs" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                          {inv.assigned_name?.split(' ').map(w => w[0]).join('')}
                        </div>
                        <span className="text-sm">{inv.assigned_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">Nieprzypisany</span>
                    )}
                  </td>
                  <td>
                    {inv.blind ? <span className="badge badge-warning">Ślepy</span> : <span className="badge badge-ghost">Normalny</span>}
                  </td>
                  <td>
                    <div className="text-sm">{inv.count}/{totalItems}</div>
                    <div style={{ width: 60, height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 4 }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }}></div>
                    </div>
                  </td>
                  <td style={{ color: inv.diff !== 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {inv.status === 'completed' ? (inv.diff > 0 ? `+${inv.diff}` : inv.diff) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.status === 'completed' ? 'badge-success' :
                      inv.status === 'in_progress' ? 'badge-warning' :
                      inv.status === 'assigned' ? 'badge-info' :
                      'badge-ghost'
                    }`}>
                      {inv.status === 'completed' ? 'Zakończona' :
                        inv.status === 'in_progress' ? 'W trakcie' :
                        inv.status === 'assigned' ? 'Zlecona' :
                        'Oczekuje zlecenia'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {inv.status === 'planned' && (
                      <button className="btn btn-primary btn-sm" onClick={() => openAssignModal(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FiUserPlus size={13} /> Zleć
                      </button>
                    )}
                    {(inv.status === 'assigned' || inv.status === 'in_progress') && (
                      <span className="text-xs text-muted" style={{ fontStyle: 'italic', marginRight: 8 }}>
                        W realizacji (mobile)
                      </span>
                    )}
                    {inv.status === 'completed' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetails(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FiInfo size={13} /> Szczegóły
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {inventories.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Brak zleceń inwentaryzacji. Kliknij "Nowa inwentaryzacja", aby utworzyć.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={showCreate} 
        onClose={() => setShowCreate(false)} 
        title="Utwórz nowe zlecenie inwentaryzacji" 
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={createInventory}>Utwórz zlecenie</button>
          </>
        }
      >
        <div className="grid-2 mb-16" style={{ gap: 16 }}>
          <div className="input-group">
            <label>Typ</label>
            <select className="select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="full">Pełna</option>
              <option value="partial">Częściowa</option>
              <option value="cyclic">Cykliczna</option>
            </select>
          </div>
          <div className="input-group">
            <label>Zakres (opis)</label>
            <input className="input" value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} placeholder="np. Elektronarzędzia" />
          </div>
        </div>
        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="blind-mode" checked={form.blind} onChange={e => setForm(p => ({ ...p, blind: e.target.checked }))} />
          <label htmlFor="blind-mode" style={{ margin: 0, cursor: 'pointer' }}>Tryb ślepy (pracownik nie widzi stanów systemowych)</label>
        </div>
      </Modal>

      <Modal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        title={`Zleć inwentaryzację ${assignInv?.number}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={confirmAssignment}>Zatwierdź i zleć</button>
          </>
        }
      >
        <div className="input-group">
          <label>Wybierz pracowników odpowiedzialnych</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            {employees.filter(e => e.active).map(e => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={selectedEmps.includes(e.id)}
                  onChange={(ev) => {
                    if (ev.target.checked) setSelectedEmps(prev => [...prev, e.id]);
                    else setSelectedEmps(prev => prev.filter(id => id !== e.id));
                  }}
                />
                {e.name} ({e.role})
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Wyniki inwentaryzacji ${detailsInv?.number}`}
        size="modal-lg"
        footer={<button className="btn btn-primary" onClick={() => setShowDetails(false)}>Zamknij podgląd</button>}
      >
        <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="stat-card" style={{ padding: 12 }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Zakres spisu</span>
            <span className="stat-value" style={{ fontSize: '1.2rem', marginTop: 4 }}>{detailsInv?.scope || 'Cały magazyn'}</span>
          </div>
          <div className="stat-card" style={{ padding: 12 }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Odpowiedzialny</span>
            <span className="stat-value text-info" style={{ fontSize: '1.2rem', marginTop: 4 }}>{detailsInv?.assigned_name}</span>
          </div>
          <div className="stat-card" style={{ padding: 12 }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Bilans różnic</span>
            <span className={`stat-value ${detailsInv?.diff !== 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '1.2rem', marginTop: 4 }}>
              {detailsInv?.diff > 0 ? `+${detailsInv?.diff}` : detailsInv?.diff} szt.
            </span>
          </div>
        </div>

        <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produkt</th>
                <th style={{ textAlign: 'center' }}>Stan systemowy</th>
                <th style={{ textAlign: 'center' }}>Stan faktyczny</th>
                <th style={{ textAlign: 'center' }}>Różnica</th>
              </tr>
            </thead>
            <tbody>
              {detailsInv?.items && detailsInv.items.map((item, idx) => {
                const diff = item.counted_qty !== null ? item.counted_qty - item.system_qty : null;
                return (
                  <tr key={idx}>
                    <td className="font-mono text-sm">{item.sku}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.system_qty} szt.</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {item.counted_qty !== null ? `${item.counted_qty} szt.` : '—'}
                    </td>
                    <td style={{ 
                      textAlign: 'center', 
                      color: diff !== null && diff !== 0 ? 'var(--danger)' : 'var(--success)', 
                      fontWeight: 600 
                    }}>
                      {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal 
        isOpen={showCount} 
        onClose={() => setShowCount(false)} 
        title={`Spis z natury — ${activeInv?.number}`} 
        size="modal-lg" 
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCount(false)}>Przerwij</button>
            <button className="btn btn-success" onClick={completeInventory}>
              <FiCheck size={14} /> Zakończ i porównaj
            </button>
          </>
        }
      >
        <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produkt</th>
                {!activeInv?.blind && <th style={{ textAlign: 'center' }}>Stan syst.</th>}
                <th style={{ textAlign: 'center' }}>Przeliczono</th>
                {!activeInv?.blind && <th style={{ textAlign: 'center' }}>Różnica</th>}
              </tr>
            </thead>
            <tbody>
              {counts.map((c, i) => {
                const diff = c.counted_qty !== '' ? (parseFloat(c.counted_qty) || 0) - (c.system_qty || 0) : null;
                return (
                  <tr key={i}>
                    <td className="font-mono text-sm">{c.sku}</td>
                    <td>{c.name}</td>
                    {!activeInv?.blind && <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{c.system_qty}</td>}
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        className="input" 
                        type="number" 
                        value={c.counted_qty} 
                        onChange={e => updateCount(i, e.target.value)} 
                        style={{ width: 100, textAlign: 'center' }} 
                      />
                    </td>
                    {!activeInv?.blind && (
                      <td style={{ 
                        textAlign: 'center', 
                        color: diff !== null && diff !== 0 ? 'var(--danger)' : 'var(--text-muted)', 
                        fontWeight: diff !== null && diff !== 0 ? 600 : 400 
                      }}>
                        {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
