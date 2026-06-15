import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiPlus, FiCheck, FiAlertTriangle, FiEye, FiPaperclip, FiCamera, FiTrash2, FiFileText } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { supplier_id: '', expected_date: '', items: [{ product_name: '', expected_qty: '', received_qty: null }], assigned_users: [] };

// Rejestr Dostaw (PZ) - przyjmowanie towaru od dostawców. Integruje się z Supabase i pozwala na szczegółowe przyjęcie towaru oraz załączanie dokumentów
export default function DeliveriesPage() {
  const { suppliers, employees, products, addDamagedProductToOutlet, isSupabase } = useStore();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewDel, setViewDel] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // Stany do desktopowego odbioru dostawy
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingDel, setReceivingDel] = useState(null);
  const [receivingItems, setReceivingItems] = useState([]);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageNote, setDamageNote] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetchDeliveries();
  }, [isSupabase]);

  async function fetchDeliveries() {
    if (!isSupabase) return;
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (err) {
      toast.error('Błąd pobierania dostaw: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { product_name: '', expected_qty: '', received_qty: null }] }));
  }

  function updateItem(i, f, v) {
    setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }));
  }

  async function handleSave() {
    if (!form.supplier_id) { toast.error('Wybierz dostawcę'); return; }

    try {
      const { data, error } = await supabase.from('deliveries').insert({
        delivery_number: `PZ/2026/05/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        supplier_id: form.supplier_id,
        status: 'expected',
        expected_date: form.expected_date || null,
        items: form.items.filter(i => i.product_name).map(i => ({
          product_name: i.product_name,
          expected_qty: parseInt(i.expected_qty) || 0,
          received_qty: null
        })),
        assigned_users: form.assigned_users || []
      }).select().single();

      if (error) throw error;
      toast.success(`Dostawa dodana`);
      setShowModal(false);
      setForm(EMPTY);
      fetchDeliveries();
    } catch (err) {
      toast.error('Błąd: ' + err.message);
    }
  }

  // --- DESKTOP RECEIVE DELIVERY HANDLING ---
  function openReceiveDesktop(d) {
    setReceivingDel(d);
    setHasDamage(d.has_damage || false);
    setDamageNote(d.damage_note || '');
    setAttachments(d.attachments || []);

    const parsedItems = Array.isArray(d.items) ? d.items : [];
    setReceivingItems(parsedItems.map(item => ({
      ...item,
      qty_accepted_normal: item.qty_accepted_normal !== undefined ? Number(item.qty_accepted_normal) : Number(item.expected_qty || 0),
      qty_rejected_damaged: item.qty_rejected_damaged !== undefined ? Number(item.qty_rejected_damaged) : 0,
      qty_accepted_damaged: item.qty_accepted_damaged !== undefined ? Number(item.qty_accepted_damaged) : 0,
      comment_normal: item.comment_normal || '',
      comment_rejected_damaged: item.comment_rejected_damaged || '',
      comment_accepted_damaged: item.comment_accepted_damaged || ''
    })));
    setShowReceiveModal(true);
  }

  function updateReceivingItem(idx, field, value) {
    const newItems = [...receivingItems];
    newItems[idx][field] = value;
    setReceivingItems(newItems);
  }

  function handleDesktopFileChange(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: reader.result
        }]);
        toast.success(`Dodano plik: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeDesktopAttachment(idx) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
    toast.success('Załącznik usunięty');
  }

  async function handleConfirmReceive() {
    if (!isSupabase) return;
    setLoading(true);

    try {
      // Walidacja
      for (const item of receivingItems) {
        const sum = Number(item.qty_accepted_normal) + Number(item.qty_rejected_damaged) + Number(item.qty_accepted_damaged);
        if (sum !== Number(item.expected_qty)) {
          const confirmForce = confirm(`Dla produktu "${item.product_name}" suma ilości (${sum}) różni się od oczekiwanej (${item.expected_qty}). Zapisać mimo to?`);
          if (!confirmForce) { setLoading(false); return; }
        }
      }

      const hasDiscrepancy = receivingItems.some(item => {
        const received = Number(item.qty_accepted_normal) + Number(item.qty_accepted_damaged);
        return received !== Number(item.expected_qty);
      });

      const { error } = await supabase
        .from('deliveries')
        .update({
          items: receivingItems,
          status: 'received',
          received_date: new Date().toISOString().split('T')[0],
          has_discrepancy: hasDiscrepancy,
          attachments: attachments,
          has_damage: hasDamage,
          damage_note: hasDamage ? damageNote : ''
        })
        .eq('id', receivingDel.id);

      if (error) throw error;

      // Dodawanie przecenionego towaru do Outletu
      let outletCreatedCount = 0;
      for (const item of receivingItems) {
        const qtyDamaged = Number(item.qty_accepted_damaged);
        if (qtyDamaged > 0) {
          let originalProduct = products.find(p =>
            p.name.toLowerCase().trim() === item.product_name.toLowerCase().trim()
          );
          if (!originalProduct) {
            originalProduct = {
              name: item.product_name,
              sku: `PROD-PZ-${Date.now().toString().slice(-4)}`,
              purchase_price: 0,
              unit: 'szt',
              location_id: null
            };
          }
          await addDamagedProductToOutlet(originalProduct, qtyDamaged);
          outletCreatedCount++;
        }
      }

      if (outletCreatedCount > 0) {
        toast.success(`Dostawa odebrana. Dodano ${outletCreatedCount} uszkodzonych produktów do Wyprzedaży!`);
      } else {
        toast.success('Dostawa pomyślnie odebrana');
      }

      setShowReceiveModal(false);
      fetchDeliveries();
    } catch (err) {
      toast.error('Błąd zapisu dostawy: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Dostawy (PZ)</h1><p>Przyjęcia magazynowe, protokoły różnic ilościowych i kontrola uszkodzeń</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowa dostawa</button>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-card"><span className="stat-label">Oczekiwane</span><span className="stat-value text-warning">{deliveries.filter(d => d.status === 'expected').length}</span></div>
        <div className="stat-card"><span className="stat-label">W trakcie sprawdzania</span><span className="stat-value text-info">{deliveries.filter(d => d.status === 'checking').length}</span></div>
        <div className="stat-card"><span className="stat-label">Przyjęte łącznie</span><span className="stat-value text-success">{deliveries.filter(d => d.status === 'received').length}</span></div>
      </div>

      {loading && deliveries.length === 0 ? (
        <div className="text-center p-20 text-muted">Ładowanie rejestru dostaw...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nr PZ</th><th>Dostawca</th><th>Data oczekiwana</th><th>Pozycje</th><th>Rozbieżności</th><th>Status</th><th style={{ textAlign: 'right' }}>Akcje</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{d.delivery_number}</td>
                  <td>{d.supplier?.name || 'Nieznany'}</td>
                  <td className="text-sm text-muted">{d.expected_date || '-'}</td>
                  <td className="text-sm">{Array.isArray(d.items) ? d.items.length : 0} pozycji</td>
                  <td>
                    {d.has_damage && <span className="badge badge-danger mr-4" style={{ background: '#fee2e2', color: '#991b1b' }}>Uszkodzenie</span>}
                    {d.has_discrepancy ? <span className="badge badge-warning"><FiAlertTriangle size={10} /> Różnice</span> : <span className="badge badge-success">Zgodna</span>}
                  </td>
                  <td>
                    <span className={`badge ${d.status === 'received' ? 'badge-success' : d.status === 'checking' ? 'badge-info' : 'badge-warning'}`}>
                      {d.status === 'received' ? 'Przyjęta' : d.status === 'checking' ? 'Sprawdzanie' : 'Oczekiwana'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setViewDel(d); setShowView(true); }} title="Podgląd"><FiEye size={14} /></button>
                      {d.status !== 'received' && (
                        <button className="btn btn-sm btn-success" onClick={() => openReceiveDesktop(d)} style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}>
                          Odbierz
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan="7" className="text-center text-muted p-20">Brak dostaw w systemie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      // MODAL: Tworzenie nowej PZ
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa dostawa (PZ)" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Utwórz</button></>}>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Dostawca *</label>
            <select className="select" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">— Wybierz —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Spodziewana data</label>
            <input className="input" type="date" value={form.expected_date} onChange={e => setForm(p => ({ ...p, expected_date: e.target.value }))} />
          </div>
        </div>

        <h4 className="mb-8">Pozycje spodziewane</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}>
              <label>Nazwa produktu</label>
              <input className="input" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="np. Wiertarka udarowa Bosch" />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Ilość oczekiwana</label>
              <input className="input" type="number" value={item.expected_qty} onChange={e => updateItem(i, 'expected_qty', e.target.value)} />
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      // MODAL: Szczegółowy podgląd dostawy
      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Szczegóły dostawy ${viewDel?.delivery_number}`} size="modal-lg" footer={<button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button>}>
        {viewDel && (
          <div>
            <div className="grid-2 mb-16">
              {[
                ['Dostawca', viewDel.supplier?.name || 'Nieznany'],
                ['Status', viewDel.status === 'received' ? 'Odebrana / Przyjęta' : 'Oczekiwana'],
                ['Data oczekiwana', viewDel.expected_date || '—'],
                ['Data rzeczywistego przyjęcia', viewDel.received_date || '—']
              ].map(([l, v]) => (
                <div key={l} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }} className="flex-between">
                  <span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            // Informacja o ogólnym uszkodzeniu
            {viewDel.has_damage && (
              <div className="mb-16 p-12" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                <h4 style={{ color: '#991b1b', margin: '0 0 4px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiAlertTriangle /> Zgłoszone zniszczenie w dostawie (np. palety):
                </h4>
                <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.85rem' }}>{viewDel.damage_note || 'Brak opisu zniszczeń'}</p>
              </div>
            )}

            // Załączniki z dostawy
            {viewDel.attachments && viewDel.attachments.length > 0 && (
              <div className="mb-16 card p-12">
                <h4 className="mb-8" style={{ fontSize: '0.9rem', margin: '0 0 8px 0' }}><FiPaperclip /> Załączone dokumenty dostawy ({viewDel.attachments.length}):</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {viewDel.attachments.map((file, idx) => {
                    const isImg = file.type?.startsWith('image/');
                    return (
                      <a
                        key={idx}
                        href={file.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          width: 80, height: 80, border: '1px solid var(--border-light)',
                          borderRadius: 8, overflow: 'hidden', background: 'var(--bg-tertiary)',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          flexDirection: 'column', fontSize: '0.65rem', textDecoration: 'none', color: 'inherit'
                        }}
                      >
                        {isImg ? (
                          <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            <FiFileText size={24} style={{ color: 'var(--primary)', marginBottom: 4 }} />
                            <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                          </>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <h4 className="mb-8">Pozycje i weryfikacja towaru:</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nazwa produktu</th>
                    <th>Spodziewano się</th>
                    <th>Przyjęto normalnie</th>
                    <th>Przyjęto jako uszkodzone</th>
                    <th>Odrzucono (uszkodzenia)</th>
                    <th>Komentarze</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(viewDel.items) && viewDel.items.map((it, i) => {
                    const normalVal = it.qty_accepted_normal !== undefined ? it.qty_accepted_normal : (it.received_qty ?? '—');
                    const damagedVal = it.qty_accepted_damaged ?? 0;
                    const rejectedVal = it.qty_rejected_damaged ?? 0;

                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{it.product_name}</td>
                        <td style={{ fontWeight: 600 }}>{it.expected_qty}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{normalVal}</td>
                        <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{damagedVal}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{rejectedVal}</td>
                        <td className="text-xs text-muted" style={{ maxWidth: 200 }}>
                          {it.comment_normal && <div style={{ color: 'var(--success)' }}>Norm: {it.comment_normal}</div>}
                          {it.comment_accepted_damaged && <div style={{ color: 'var(--warning)' }}>Wyprzedaż: {it.comment_accepted_damaged}</div>}
                          {it.comment_rejected_damaged && <div style={{ color: 'var(--danger)' }}>Odrz: {it.comment_rejected_damaged}</div>}
                          {!it.comment_normal && !it.comment_accepted_damaged && !it.comment_rejected_damaged && '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      // MODAL: DESKTOP ODBIÓR DOSTAWY (PREMIUM)
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title={`Odbiór dostawy PZ - ${receivingDel?.delivery_number}`}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowReceiveModal(false)}>Anuluj</button>
            <button className="btn btn-success" onClick={handleConfirmReceive}>Zatwierdź i wprowadź na magazyn</button>
          </>
        }
      >
        {receivingDel && (
          <div>
            <div className="flex-between mb-16 p-12" style={{ background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <div>
                <span className="text-muted text-sm">Dostawca:</span>
                <div style={{ fontWeight: 700 }}>{receivingDel.supplier?.name}</div>
              </div>
              <div>
                <span className="text-muted text-sm">Status dostawy:</span>
                <span className="badge badge-warning">Weryfikacja stacjonarna</span>
              </div>
            </div>

            // Sekcja ogólna zniszczenia dostawy
            <div className="card p-12 mb-16" style={{ border: '1px solid var(--border-light)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Ogólna weryfikacja nośników / palet</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={hasDamage}
                  onChange={e => setHasDamage(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>Zaznacz zniszczenie w dostawie (np. uszkodzona paleta, ubytki w zbiorczym opakowaniu)</span>
              </label>

              {hasDamage && (
                <textarea
                  className="input mt-8"
                  placeholder="Opisz zniszczenie nośnika / palety, które nie zostaną zwrócone dostawcy..."
                  value={damageNote}
                  onChange={e => setDamageNote(e.target.value)}
                  rows={2}
                  style={{ fontSize: '0.85rem' }}
                />
              )}

              // Dodawanie załączników bez limitu
              <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 12, paddingTop: 12 }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  DOŁĄCZ DOKUMENTY LUB ZDJĘCIA DOWODU DOSTAWY (BEZ LIMITU)
                </span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <FiCamera /> Wybierz pliki
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleDesktopFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {attachments.map((file, idx) => {
                        const isImg = file.type?.startsWith('image/');
                        return (
                          <div key={idx} style={{
                            position: 'relative', width: 50, height: 50,
                            borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)'
                          }}>
                            {isImg ? (
                              <img src={file.dataUrl} alt="Zdj" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-tertiary)' }}><FiFileText size={18} /></div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeDesktopAttachment(idx)}
                              style={{
                                position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.9)',
                                color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16,
                                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            // Pozycje
            <h4 style={{ fontSize: '0.9rem', margin: '0 0 8px 0' }}>Weryfikacja ilości towarów:</h4>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8 }}>
              {receivingItems.map((item, idx) => (
                <div key={idx} style={{ padding: '12px 8px', borderBottom: idx < receivingItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex-between mb-8">
                    <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                    <span className="badge badge-ghost text-xs">Oczekiwano: {item.expected_qty} szt.</span>
                  </div>

                  <div className="grid-3" style={{ gap: 10 }}>

                    // Normalne
                    <div className="card p-8" style={{ background: 'rgba(22, 163, 74, 0.03)', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                      <div className="flex-between mb-4">
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>🟢 Przyjęto normalnie:</span>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 60, padding: 4, height: 28, fontSize: '0.85rem', textAlign: 'center' }}
                          value={item.qty_accepted_normal}
                          onChange={e => updateReceivingItem(idx, 'qty_accepted_normal', Number(e.target.value))}
                        />
                      </div>
                      <input
                        type="text"
                        className="input"
                        placeholder="Komentarz..."
                        style={{ height: 24, fontSize: '0.7rem', padding: 4 }}
                        value={item.comment_normal}
                        onChange={e => updateReceivingItem(idx, 'comment_normal', e.target.value)}
                      />
                    </div>

                    // Uszkodzone outlet
                    <div className="card p-8" style={{ background: 'rgba(217, 119, 6, 0.03)', border: '1px solid rgba(217, 119, 6, 0.1)' }}>
                      <div className="flex-between mb-4">
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)' }}>🟡 Przyjęto uszk. (Outlet):</span>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 60, padding: 4, height: 28, fontSize: '0.85rem', textAlign: 'center' }}
                          value={item.qty_accepted_damaged}
                          onChange={e => updateReceivingItem(idx, 'qty_accepted_damaged', Number(e.target.value))}
                        />
                      </div>
                      <input
                        type="text"
                        className="input"
                        placeholder="Komentarz..."
                        style={{ height: 24, fontSize: '0.7rem', padding: 4 }}
                        value={item.comment_accepted_damaged}
                        onChange={e => updateReceivingItem(idx, 'comment_accepted_damaged', e.target.value)}
                      />
                    </div>

                    // Odrzucone
                    <div className="card p-8" style={{ background: 'rgba(220, 38, 38, 0.03)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
                      <div className="flex-between mb-4">
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)' }}>🔴 Odrzucono:</span>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 60, padding: 4, height: 28, fontSize: '0.85rem', textAlign: 'center' }}
                          value={item.qty_rejected_damaged}
                          onChange={e => updateReceivingItem(idx, 'qty_rejected_damaged', Number(e.target.value))}
                        />
                      </div>
                      <input
                        type="text"
                        className="input"
                        placeholder="Komentarz..."
                        style={{ height: 24, fontSize: '0.7rem', padding: 4 }}
                        value={item.comment_rejected_damaged}
                        onChange={e => updateReceivingItem(idx, 'comment_rejected_damaged', e.target.value)}
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
