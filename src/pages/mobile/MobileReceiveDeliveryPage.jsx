import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { FiArrowLeft, FiCheck, FiSearch, FiPackage, FiCamera, FiTrash2, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';

// Interfejs weryfikacji i odbierania dostawy (PZ) na urządzeniu mobilnym. Pozwala wpisać faktyczną odebraną ilość per produkt i zgłosić ewentualną rozbieżność
export default function MobileReceiveDeliveryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSupabase, mobileSession, products, addDamagedProductToOutlet } = useStore();

  const [delivery, setDelivery] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Nowe stany dla całej dostawy (Załączniki i uszkodzenia ogólne)
  const [hasDamage, setHasDamage] = useState(false);
  const [damageNote, setDamageNote] = useState('');
  const [attachments, setAttachments] = useState([]); // Array base64 strings

  useEffect(() => {
    fetchDelivery();
  }, [id, isSupabase]);

  async function fetchDelivery() {
    if (!isSupabase) return;
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, supplier:suppliers(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDelivery(data);

      // Jeżeli dostawa ma już jakieś załączniki w bazie, wczytaj je
      if (data.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      }
      if (data.has_damage) {
        setHasDamage(data.has_damage);
        setDamageNote(data.damage_note || '');
      }

      const parsedItems = Array.isArray(data.items) ? data.items : [];
      setItems(parsedItems.map(item => ({
        ...item,
        // Inicjalizujemy nowe szczegółowe pola jeśli nie istnieją
        qty_accepted_normal: item.qty_accepted_normal !== undefined ? Number(item.qty_accepted_normal) : Number(item.expected_qty || 0),
        qty_rejected_damaged: item.qty_rejected_damaged !== undefined ? Number(item.qty_rejected_damaged) : 0,
        qty_accepted_damaged: item.qty_accepted_damaged !== undefined ? Number(item.qty_accepted_damaged) : 0,
        comment_normal: item.comment_normal || '',
        comment_rejected_damaged: item.comment_rejected_damaged || '',
        comment_accepted_damaged: item.comment_accepted_damaged || ''
      })));
    } catch (err) {
      toast.error('Błąd: ' + err.message);
      navigate('/deliveries');
    } finally {
      setLoading(false);
    }
  }

  function updateItemDetail(idx, field, value) {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  }

  // Obsługa konwersji zdjęć/plików do Base64 i załączania ich
  function handleFileChange(e) {
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
      reader.onerror = () => {
        toast.error(`Błąd wczytywania pliku: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAttachment(idx) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
    toast.success('Usunięto załącznik');
  }

  async function handleConfirm() {
    if (!isSupabase) return;
    setLoading(true);
    try {
      // 1. Walidacja poprawności wpisanych ilości
      for (const item of items) {
        const sum = Number(item.qty_accepted_normal) + Number(item.qty_rejected_damaged) + Number(item.qty_accepted_damaged);
        if (sum !== Number(item.expected_qty)) {
          const confirmForce = confirm(`Dla produktu "${item.product_name}" suma ilości (${sum}) różni się od oczekiwanej (${item.expected_qty}). Czy na pewno chcesz zapisać?`);
          if (!confirmForce) {
            setLoading(false);
            return;
          }
        }
      }

      // Obliczamy czy jest ogólna rozbieżność ilościowa
      const hasDiscrepancy = items.some(item => {
        const received = Number(item.qty_accepted_normal) + Number(item.qty_accepted_damaged);
        return received !== Number(item.expected_qty);
      });

      // 2. Aktualizujemy rekord dostawy w Supabase
      const { error } = await supabase
        .from('deliveries')
        .update({
          items: items,
          status: 'received',
          received_date: new Date().toISOString().split('T')[0],
          has_discrepancy: hasDiscrepancy,
          received_by: mobileSession?.mobileUser?.id || null,
          attachments: attachments,
          has_damage: hasDamage,
          damage_note: hasDamage ? damageNote : ''
        })
        .eq('id', id);

      if (error) throw error;

      // 3. Obsługa przyjęcia uszkodzonych produktów -> Outlet / Wyprzedaż
      let outletCreatedCount = 0;
      for (const item of items) {
        const qtyDamagedAccepted = Number(item.qty_accepted_damaged);
        if (qtyDamagedAccepted > 0) {
          // Spróbujmy znaleźć oryginalny produkt w bazie
          let originalProduct = products.find(p =>
            p.name.toLowerCase().trim() === item.product_name.toLowerCase().trim() ||
            p.sku.toLowerCase().trim() === item.sku?.toLowerCase().trim()
          );

          if (!originalProduct) {
            // Jeśli nie ma w katalogu, utwórzmy profil generyczny na podstawie nazwy z PZ
            originalProduct = {
              name: item.product_name,
              sku: item.sku || `PROD-PZ-${Date.now().toString().slice(-4)}`,
              purchase_price: 0,
              unit: item.unit || 'szt',
              location_id: null
            };
          }

          // Wywołujemy globalną funkcję dodającą outlet
          await addDamagedProductToOutlet(originalProduct, qtyDamagedAccepted);
          outletCreatedCount++;
        }
      }

      if (outletCreatedCount > 0) {
        toast.success(`Dostawa odebrana. Dodano ${outletCreatedCount} towar(ów) do kategorii Wyprzedaż.`);
      } else {
        toast.success('Dostawa została pomyślnie odebrana');
      }

      navigate('/deliveries');
    } catch (err) {
      toast.error('Błąd zapisu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !delivery) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Ładowanie szczegółów...</div>;
  }

  const filteredItems = items.filter(i => {
    const q = search.toLowerCase();
    return i.product_name?.toLowerCase().includes(q) || i.ean?.includes(q) || i.sku?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', color: 'var(--text-heading)' }}>
      <MobileHeader title="Sklep Mobile" subtitle="Odbiór Dostawy" />

      <div style={{
        padding: '16px 12px', background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => navigate('/deliveries')} style={{
          background: 'transparent', border: 'none', color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, cursor: 'pointer'
        }}>
          <FiArrowLeft size={24} />
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>PZ: {delivery.delivery_number}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{delivery.supplier?.name}</div>
        </div>
      </div>

      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Szukaj produktu na liście..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 36px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)',
              borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border-light)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600 }}>Ogólne uszkodzenia & Dokumentacja</h4>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={hasDamage}
              onChange={e => setHasDamage(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span>Zgłoś zniszczenie w dostawie (np. uszkodzona paleta)</span>
          </label>

          {hasDamage && (
            <textarea
              placeholder="Opisz zniszczenie (np. Jedna paleta z cegłami była całkowicie uszkodzona, nie została przyjęta z powrotem)"
              value={damageNote}
              onChange={e => setDamageNote(e.target.value)}
              style={{
                width: '100%', padding: 10, background: 'var(--bg-tertiary)',
                border: '1px solid var(--danger-border, #fca5a5)', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 12,
                fontFamily: 'inherit'
              }}
              rows={3}
            />
          )}

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              DOŁĄCZ DOKUMENTY LUB ZDJĘCIA DOWODU DOSTAWY (BEZ LIMITU)
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{
                background: 'var(--bg-tertiary)', border: '1px dashed var(--primary)',
                borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center',
                gap: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)'
              }}>
                <FiCamera size={16} /> Dodaj pliki / Zrób zdjęcie
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {attachments.map((file, idx) => {
                  const isImage = file.type?.startsWith('image/');
                  return (
                    <div key={idx} style={{
                      position: 'relative', width: 75, height: 75,
                      borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)',
                      background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      {isImage ? (
                        <img
                          src={file.dataUrl}
                          alt="Załącznik"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <FiFileText size={28} style={{ color: 'var(--text-muted)' }} />
                      )}
                      <button
                        onClick={() => removeAttachment(idx)}
                        style={{
                          position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20,
                          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                        }}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Produkty w dostawie:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredItems.map((item, idx) => {
            const trueIndex = items.findIndex(i => i === item);

            return (
              <div key={idx} style={{
                background: 'var(--bg-card)', padding: 14, borderRadius: 12,
                border: '1px solid var(--border-light)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product_name}</div>
                  <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>Oczekiwano: {item.expected_qty} szt</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  SKU: {item.sku || '-'} | EAN: {item.ean || '-'}
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)' }}>🟢 Przyjęto normalnie:</span>
                    <input
                      type="number"
                      min="0"
                      value={item.qty_accepted_normal}
                      onChange={e => updateItemDetail(trueIndex, 'qty_accepted_normal', Number(e.target.value))}
                      style={{
                        width: 75, padding: '6px 8px', background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-light)', borderRadius: 6,
                        color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Komentarz (opcjonalnie)..."
                    value={item.comment_normal}
                    onChange={e => updateItemDetail(trueIndex, 'comment_normal', e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)', borderRadius: 6,
                      color: 'var(--text-primary)', fontSize: '0.75rem'
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning, #d97706)' }}>🟡 Przyjęto uszkodzone (Wyprzedaż):</span>
                    <input
                      type="number"
                      min="0"
                      value={item.qty_accepted_damaged}
                      onChange={e => updateItemDetail(trueIndex, 'qty_accepted_damaged', Number(e.target.value))}
                      style={{
                        width: 75, padding: '6px 8px', background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-light)', borderRadius: 6,
                        color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Komentarz (opcjonalnie)..."
                    value={item.comment_accepted_damaged}
                    onChange={e => updateItemDetail(trueIndex, 'comment_accepted_damaged', e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)', borderRadius: 6,
                      color: 'var(--text-primary)', fontSize: '0.75rem'
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)' }}>🔴 Odrzucono (nie przyjęto):</span>
                    <input
                      type="number"
                      min="0"
                      value={item.qty_rejected_damaged}
                      onChange={e => updateItemDetail(trueIndex, 'qty_rejected_damaged', Number(e.target.value))}
                      style={{
                        width: 75, padding: '6px 8px', background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-light)', borderRadius: 6,
                        color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Komentarz (opcjonalnie)..."
                    value={item.comment_rejected_damaged}
                    onChange={e => updateItemDetail(trueIndex, 'comment_rejected_damaged', e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)', borderRadius: 6,
                      color: 'var(--text-primary)', fontSize: '0.75rem'
                    }}
                  />
                </div>

              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        padding: '16px 12px', background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-primary)',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
      }}>
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '16px', background: 'var(--success, #16a34a)',
            border: 'none', borderRadius: 12, color: 'white', fontWeight: 700,
            fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            cursor: 'pointer'
          }}
        >
          <FiCheck size={20} /> Zatwierdź odbiór dostawy (PZ)
        </button>
      </div>
    </div>
  );
}
