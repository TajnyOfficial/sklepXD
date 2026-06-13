import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiPackage, FiSearch, FiPlus, FiEdit, FiEye, FiTag, FiTrash2, FiPrinter, FiVideo } from 'react-icons/fi';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const EMPTY_PRODUCT = { 
  name: '', sku: '', category_id: '', location_id: '', unit: 'szt', 
  purchase_price: '', sell_price: '', min_stock: '', stock_qty: '', 
  barcodes: '', attributes: '{}', cross_sell_products: [] 
};

/* Główna kartoteka magazynowa (PIM) obsługująca kody kreskowe, powiązania Cross-Sell i złożone atrybuty (JSON) */
export default function ProductCatalogPage() {
  /* Odczytanie kompletnego środowiska operacyjnego: asortyment, kategorie, strefy magazynowe oraz API bazy */
  const { products, categories, warehouseLocations, saveProduct, deleteProduct, isSupabase } = useStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [selectedForLabels, setSelectedForLabels] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('form'); // 'form' | 'search'
  
  // Tabs w modalu edycji (0 = Podstawowe, 1 = Warianty, 2 = Powiązane)
  const [activeTab, setActiveTab] = useState(0);

  /* Pętla odfiltrowująca produkty niepasujące do wybranej w UI kategorii lub słowa kluczowego (SKU/Nazwa) */
  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category_id !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openAdd() {
    setEditingProduct(null);
    setForm(EMPTY_PRODUCT);
    setActiveTab(0);
    setShowModal(true);
  }

  /* Otwarcie modala edycji z jednoczesnym (asynchronicznym) dociągnięciem relacji "Cross-Sell" przypisanych do tego produktu w bazie */
  async function openEdit(product) {
    setEditingProduct(product);
    setActiveTab(0);
    
    // Fetch cross-sell products
    let crossSell = [];
    if (isSupabase) {
      try {
        const { data, error } = await supabase.from('product_cross_sell').select('related_id').eq('product_id', product.id);
        if (!error && data) {
          crossSell = data.map(d => d.related_id);
        }
      } catch (e) {
        console.warn('Failed to fetch cross-sell relations', e);
      }
    }

    setForm({
      ...product,
      barcodes: product.barcodes?.join(', ') || '',
      purchase_price: String(product.purchase_price),
      sell_price: String(product.sell_price),
      min_stock: String(product.min_stock),
      stock_qty: String(product.stock_qty),
      location_id: product.location_id || '',
      attributes: product.attributes ? JSON.stringify(product.attributes, null, 2) : '{}',
      cross_sell_products: crossSell
    });
    setShowModal(true);
  }

  function openView(product) {
    setViewProduct(product);
    setShowViewModal(true);
  }

  /* Walidacja poprawności formatu JSON, wymagalności pól (np. SKU) i docelowy zapis zmian do Supabase */
  async function handleSave() {
    const isOutlet = categories.find(c => c.id === form.category_id)?.name.toLowerCase() === 'wyprzedaż';
    
    if (!form.name || !form.sku || (!isOutlet && (form.sell_price === '' || form.sell_price === null || form.sell_price === undefined))) {
      toast.error(isOutlet ? 'Wypełnij wymagane pola: Nazwa, SKU' : 'Wypełnij wymagane pola: Nazwa, SKU, Cena sprzedaży');
      return;
    }
    
    // Walidacja JSON
    try {
      if (form.attributes) JSON.parse(form.attributes);
    } catch (e) {
      toast.error('Pola Warianty muszą być prawidłowym formatem JSON');
      return;
    }

    try {
      await saveProduct(form, editingProduct?.id || null);
      toast.success(editingProduct ? 'Produkt zaktualizowany' : 'Produkt dodany i zapisany w bazie');
      setShowModal(false);
    } catch (err) {
      toast.error(`Błąd zapisu: ${err.message || 'Sprawdź połączenie'}`);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Usunąć produkt "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
      toast.success('Produkt usunięty');
    } catch (err) {
      toast.error(`Błąd usunięcia: ${err.message}`);
    }
  }

  function toggleLabel(id) {
    setSelectedForLabels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  /* Generowanie dynamicznego kodu HTML z etykietami cenowymi uwzględniającego kod EAN dla wszystkich zaznaczonych pozycji */
  function printLabels() {
    const prods = products.filter(p => selectedForLabels.includes(p.id));
    const labelHtml = prods.map(p => `<div style="border:1px solid #ccc;padding:12px;margin:4px;display:inline-block;width:200px;font-family:monospace;text-align:center"><strong>${p.name}</strong><br/>${p.sku}<br/><span style="font-size:24px;font-weight:bold">${formatCurrency(p.sell_price)}</span><br/>${p.barcodes?.[0] || '—'}</div>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Etykiety</title></head><body style="display:flex;flex-wrap:wrap">${labelHtml}</body></html>`);
    win.document.close();
    win.print();
    setShowLabelModal(false);
    setSelectedForLabels([]);
    toast.success(`Drukowanie ${prods.length} etykiet`);
  }

  /* Callback wywoływany przez komponent skanera obrazu (kamery), dodający kod do wyszukiwarki lub edytowanego produktu */
  function handleScan(code) {
    setShowScanner(false);
    if (scannerMode === 'search') {
      setSearch(code);
      toast.success(`Wyszukiwanie kodu: ${code}`);
      return;
    }
    const currentBarcodes = form.barcodes ? form.barcodes.split(',').map(b => b.trim()).filter(Boolean) : [];
    if (!currentBarcodes.includes(code)) {
      const updated = [...currentBarcodes, code].join(', ');
      setForm(prev => ({ ...prev, barcodes: updated }));
      toast.success(`Dodano kod: ${code}`);
    } else {
      toast.error('Ten kod jest już na liście');
    }
  }

  function openScanner(mode) {
    setScannerMode(mode);
    setShowScanner(true);
  }

  const F = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  function toggleCrossSell(prodId) {
    setForm(prev => {
      const current = prev.cross_sell_products || [];
      if (current.includes(prodId)) {
        return { ...prev, cross_sell_products: current.filter(id => id !== prodId) };
      } else {
        return { ...prev, cross_sell_products: [...current, prodId] };
      }
    });
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Katalog produktów</h1><p>Zarządzanie asortymentem, kodami, wariantami i cenami</p></div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={() => setShowLabelModal(true)}><FiTag size={16} /> Etykiety</button>
          <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowy produkt</button>
        </div>
      </div>

      <div className="flex gap-12 mb-16" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', gap: 8, maxWidth: 450 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Szukaj po nazwie, SKU lub kodzie..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => openScanner('search')}
            title="Szukaj skanerem"
          >
            <FiVideo size={18} />
          </button>
        </div>
        <select className="select" style={{ width: 200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Wszystkie kategorie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-muted">{filtered.length} produktów</span>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>SKU</th><th>Nazwa produktu</th><th>Kategoria</th><th>Jedn.</th><th>Cena zakupu</th><th>Cena sprzedaży</th><th>Marża</th><th>Stan</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p => {
              const cat = categories.find(c => c.id === p.category_id);
              const loc = warehouseLocations.find(l => l.id === p.location_id);
              const hasNoPrice = p.sell_price === null || p.sell_price === 0 || isNaN(p.sell_price);
              const margin = !hasNoPrice && p.purchase_price > 0 ? ((p.sell_price - p.purchase_price) / p.sell_price * 100).toFixed(1) : '—';
              
              return (
                <tr key={p.id} style={{ background: hasNoPrice ? 'rgba(239, 68, 68, 0.03)' : '' }}>
                  <td className="font-mono text-sm">{p.sku}</td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{p.name}</span>
                      {hasNoPrice && (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                          Brak ceny
                        </span>
                      )}
                      {loc && (
                        <span className="badge badge-success text-xs" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                          Sektor {loc.sector}
                        </span>
                      )}
                    </div>
                    {p.barcodes?.length > 0 && <div className="text-xs text-muted">EAN: {p.barcodes[0]}</div>}
                  </td>
                  <td><span className="badge badge-ghost">{cat?.name || '—'}</span></td>
                  <td>{p.unit}</td>
                  <td className="text-muted">{formatCurrency(p.purchase_price)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {hasNoPrice ? (
                      <span className="badge badge-danger" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700, fontSize: '0.75rem' }}>
                        BRAK CENY!
                      </span>
                    ) : (
                      formatCurrency(p.sell_price)
                    )}
                  </td>
                  <td>
                    {hasNoPrice ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className={`badge ${parseFloat(margin) > 30 ? 'badge-success' : parseFloat(margin) > 15 ? 'badge-warning' : 'badge-danger'}`}>{margin}%</span>
                    )}
                  </td>
                  <td><span style={{ fontWeight: 600, color: p.stock_qty <= p.min_stock ? 'var(--danger)' : 'var(--text-primary)' }}>{p.stock_qty}</span><span className="text-xs text-muted"> / min {p.min_stock}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(p)}><FiEye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><FiEdit size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Edytuj produkt' : 'Nowy produkt'} size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editingProduct ? 'Zapisz zmiany' : 'Dodaj produkt'}</button></>}>
        
        <div className="tabs mb-16" style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <button className={`tab-btn ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 0 ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 0 ? 600 : 400 }}>Podstawowe</button>
          <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 1 ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 1 ? 600 : 400 }}>Warianty (JSON)</button>
          <button className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 2 ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 2 ? 600 : 400 }}>Cross-Selling</button>
        </div>

        {activeTab === 0 && (
          <div>
            <div className="input-row mb-16">
              <div className="input-group"><label>Nazwa *</label><input className="input" value={form.name} onChange={F('name')} placeholder="np. Farba akrylowa biała 10L" /></div>
              <div className="input-group"><label>SKU *</label><input className="input" value={form.sku} onChange={F('sku')} placeholder="np. FAR-AK-B10" /></div>
            </div>
            <div className="input-row mb-16">
              <div className="input-group"><label>Kategoria</label>
                <select className="select" value={form.category_id} onChange={F('category_id')}>
                  <option value="">— Wybierz —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group"><label>Jednostka</label>
                <select className="select" value={form.unit} onChange={F('unit')}>
                  {['szt', 'kg', 'm', 'm²', 'L', 'op', 'kpl', 'usł'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="input-row mb-16">
              <div className="input-group"><label>Cena zakupu (netto)</label><input className="input" type="number" step="0.01" value={form.purchase_price} onChange={F('purchase_price')} /></div>
              <div className="input-group"><label>Cena sprzedaży (brutto) *</label><input className="input" type="number" step="0.01" value={form.sell_price} onChange={F('sell_price')} /></div>
            </div>
            <div className="input-row mb-16">
              <div className="input-group"><label>Stan magazynowy</label><input className="input" type="number" value={form.stock_qty} onChange={F('stock_qty')} /></div>
              <div className="input-group"><label>Minimalny stan</label><input className="input" type="number" value={form.min_stock} onChange={F('min_stock')} /></div>
            </div>
            <div className="input-row mb-16">
              <div className="input-group"><label>Lokalizacja magazynowa</label>
                <select className="select" value={form.location_id || ''} onChange={F('location_id')}>
                  <option value="">— Brak (Brak lokalizacji) —</option>
                  {warehouseLocations.map(l => {
                    const prodCount = products.filter(p => p.location_id === l.id && p.id !== editingProduct?.id).length;
                    const locText = `${l.sector} - ${l.description || 'Bez opisu strefy'} (Regał ${l.rack || '—'}, Półka ${l.shelf || '—'}) [${prodCount} prod.]`;
                    return <option key={l.id} value={l.id}>{locText}</option>;
                  })}
                </select>
              </div>
              <div className="input-group" style={{ opacity: 0, pointerEvents: 'none' }}><label>Spacer</label><input className="input" /></div>
            </div>
            <div className="input-group">
              <label>Kody kreskowe (oddzielone przecinkiem)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={form.barcodes} onChange={F('barcodes')} placeholder="5901234567890, 5901234567891" />
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  onClick={() => openScanner('form')}
                  title="Skanuj kod kreskowy"
                  style={{ padding: '0 12px' }}
                >
                  <FiVideo size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <div className="input-group mb-16">
              <label>Atrybuty wariantów (Format JSON)</label>
              <textarea 
                className="input font-mono text-sm" 
                rows="10" 
                value={form.attributes} 
                onChange={F('attributes')} 
                placeholder={'{\n  "kolor": "biały",\n  "pojemność": "10L"\n}'}
              ></textarea>
              <p className="text-xs text-muted mt-4">Wprowadź prawidłowy obiekt JSON określający atrybuty tego wariantu produktu.</p>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <p className="text-sm text-muted mb-16">Wybierz produkty komplementarne, które będą sugerowane podczas sprzedaży tego produktu.</p>
            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>Wybrany</th>
                    <th>SKU</th>
                    <th>Nazwa</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.id !== editingProduct?.id).map(p => {
                    const isSelected = form.cross_sell_products?.includes(p.id);
                    return (
                      <tr key={p.id} onClick={() => toggleCrossSell(p.id)} style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-highlight)' : '' }}>
                        <td><input type="checkbox" checked={isSelected} readOnly /></td>
                        <td className="font-mono text-xs">{p.sku}</td>
                        <td>{p.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </Modal>

      {/* Skaner kodów */}
      {showScanner && (
        <BarcodeScanner
          onConfirm={handleScan}
          onClose={() => setShowScanner(false)}
          title="Skanuj kod produktu"
        />
      )}

      {/* Modal: Podgląd produktu */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Szczegóły produktu" footer={<><button className="btn btn-secondary" onClick={() => { setShowViewModal(false); openEdit(viewProduct); }}>Edytuj</button><button className="btn btn-primary" onClick={() => setShowViewModal(false)}>Zamknij</button></>}>
        {viewProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(() => {
              const loc = warehouseLocations.find(l => l.id === viewProduct.location_id);
              const locString = loc ? `Sektor ${loc.sector} - ${loc.description || 'Bez opisu'} (Regał ${loc.rack || '—'}, Półka ${loc.shelf || '—'})` : 'Brak przypisanej lokalizacji';
              
              let attrString = 'Brak';
              if (viewProduct.attributes && Object.keys(viewProduct.attributes).length > 0) {
                attrString = Object.entries(viewProduct.attributes).map(([k, v]) => `${k}: ${v}`).join(', ');
              }

              return [
                ['Nazwa', viewProduct.name],
                ['SKU', viewProduct.sku],
                ['Kategoria', categories.find(c => c.id === viewProduct.category_id)?.name || '—'],
                ['Lokalizacja', locString],
                ['Jednostka', viewProduct.unit],
                ['Cena zakupu', formatCurrency(viewProduct.purchase_price)],
                ['Cena sprzedaży', formatCurrency(viewProduct.sell_price)],
                ['Marża', viewProduct.purchase_price > 0 ? `${((viewProduct.sell_price - viewProduct.purchase_price) / viewProduct.sell_price * 100).toFixed(1)}%` : '—'],
                ['Stan magazynowy', `${viewProduct.stock_qty} ${viewProduct.unit}`],
                ['Minimalny stan', viewProduct.min_stock],
                ['Kody kreskowe', viewProduct.barcodes?.join(', ') || 'Brak'],
                ['Atrybuty', attrString]
              ].map(([label, value]) => (
                <div key={label} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span className="text-sm text-muted">{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </Modal>

      {/* Modal: Etykiety */}
      <Modal isOpen={showLabelModal} onClose={() => setShowLabelModal(false)} title="Drukuj etykiety cenowe" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowLabelModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={printLabels} disabled={selectedForLabels.length === 0}><FiPrinter size={14} /> Drukuj ({selectedForLabels.length})</button></>}>
        <p className="text-sm text-muted mb-16">Zaznacz produkty, dla których chcesz wydrukować etykiety cenowe:</p>
        <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table>
            <thead><tr><th style={{ width: 40 }}></th><th>SKU</th><th>Nazwa</th><th>Cena</th><th>EAN</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} onClick={() => toggleLabel(p.id)} style={{ cursor: 'pointer' }}>
                  <td><input type="checkbox" checked={selectedForLabels.includes(p.id)} onChange={() => toggleLabel(p.id)} /></td>
                  <td className="font-mono text-sm">{p.sku}</td>
                  <td>{p.name}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.sell_price)}</td>
                  <td className="text-xs text-muted">{p.barcodes?.[0] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
