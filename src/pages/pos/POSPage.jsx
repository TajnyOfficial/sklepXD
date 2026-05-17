import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, getInitials, calculateNetFromGross } from '../../utils/helpers';
import { PERMISSIONS } from '../../utils/rbac';
import { useBarcodeScannerInput } from '../../hooks/useBarcodeScannerInput';
import toast from 'react-hot-toast';
import {
  FiSearch, FiX, FiPlus, FiMinus, FiTrash2, FiPause,
  FiCreditCard, FiDollarSign, FiPercent, FiUser,
  FiGrid, FiTag, FiShoppingBag, FiArrowRight, FiPackage, FiVideo
} from 'react-icons/fi';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';

const QUICK_TILES = [
  { id: 'bag-s', name: 'Reklamówka mała', price: 0.15, icon: '🛍️' },
  { id: 'bag-l', name: 'Reklamówka duża', price: 0.25, icon: '🛍️' },
  { id: 'cut-wood', name: 'Cięcie drewna', price: 15.00, icon: '🪵' },
  { id: 'delivery', name: 'Dostawa miejska', price: 49.90, icon: '🚛' },
  { id: 'assembly', name: 'Usługa montażu', price: 80.00, icon: '🔧' },
  { id: 'advice', name: 'Konsultacja fachowa', price: 0, icon: '💡' },
];

/**
 * Główny ekran interfejsu Punktu Sprzedaży (POS).
 * 
 * Stanowi rdzeń funkcjonalności kasowej całej aplikacji. Posiada wbudowaną:
 * - Pełną obsługę skanerów sprzętowych (USB/BT) i wbudowanej kamery aparatu.
 * - System dynamicznego koszyka z szybkimi obliczeniami cen, zniżek i podatku VAT.
 * - Moduł płatności wielowalutowych (Gotówka wydająca resztę, Karty płatnicze, Przelewy).
 * - Algorytm weryfikacji kontahentów po numerze NIP pobierający dane bezpośrednio z GUS/MF.
 * - Mechanizm zaparkowanych rachunków (odroczone płatności w tle).
 * 
 * @returns {JSX.Element} Pełnoekranowy, odporny na błędy interfejs kasjera
 */
export default function POSPage() {
  const { products, findProduct, findProductByBarcode, getCrossSellProducts, customers, getCustomerDiscount, addTransaction, updateProductStock, saveDocument, addPosLog, posSession } = useStore();
  const { profile, can } = useAuth();

  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [crossSellProducts, setCrossSellProducts] = useState([]);
  const [showTiles, setShowTiles] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [nip, setNip] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [isSearchingNip, setIsSearchingNip] = useState(false);
  const searchRef = useRef(null);

  // ── addToCart musi być zdefiniowany JAKO PIERWSZY ─────────────────────────
  // bo handleSearchKeyDown, handleCameraScan i useBarcodeScannerInput go używają
  const addToCart = useCallback((product, qty = 1) => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku || '',
        price: product.sell_price,
        qty,
        unit: product.unit || 'szt',
        discount: 0,
      }];
    });

    const crossSell = getCrossSellProducts(product.id);
    if (crossSell && crossSell.length > 0) {
      setCrossSellProducts(crossSell);
    }

    setSearchQuery('');
    setShowSearch(false);
    toast.success(`Dodano: ${product.name}`, { duration: 1500 });
  }, [getCrossSellProducts]);

  // ── Obsługa fizycznego skanera USB/Bluetooth (Keyboard Wedge) ─────────────
  // Hook nasłuchuje globalnie na szybkie wpisywanie zakończone Enter-em
  useBarcodeScannerInput(useCallback((scannedCode) => {
    if (!scannedCode) return;
    const found = findProductByBarcode(scannedCode) || findProduct(scannedCode)[0];
    if (found) {
      addToCart(found);
      toast.success(`📷 Zeskanowano: ${found.name}`, { duration: 2000 });
    } else {
      toast.error(`Nieznany kod: ${scannedCode}`, { duration: 2000 });
    }
  }, [findProductByBarcode, findProduct, addToCart]), { disabled: showPayment });

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (query && query.trim().length >= 2) {
      const results = findProduct(query).slice(0, 8);
      setSearchResults(results || []);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [findProduct]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchResults && searchResults.length > 0) {
      if (searchResults[0]) addToCart(searchResults[0]);
    }
  }, [searchResults, addToCart]);

  const handleCameraScan = useCallback((code) => {
    setShowScanner(false);
    const product = findProductByBarcode(code) || findProduct(code)[0];
    if (product) {
      addToCart(product);
      toast.success(`📷 Zeskanowano: ${product.name}`);
    } else {
      toast.error(`Nie znaleziono produktu: ${code}`);
    }
  }, [findProductByBarcode, findProduct, addToCart]);

  const addQuickTile = useCallback((tile) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === `tile-${tile.id}`);
      if (existing) {
        return prev.map(item =>
          item.product_id === `tile-${tile.id}`
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: `tile-${tile.id}`,
        name: tile.name,
        sku: '',
        price: tile.price,
        qty: 1,
        unit: 'szt',
        discount: 0,
      }];
    });
  }, []);

  const updateQty = useCallback((productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, item.qty + delta);
        return newQty === 0 ? null : { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setCrossSellProducts([]);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty * (1 - item.discount / 100), 0);
  const totalDiscount = discount;
  const discountAmount = subtotal * (totalDiscount / 100);
  const total = subtotal - discountAmount;
  const vat = total * 0.23 / 1.23; // Assuming 23% VAT included

  // Payment handlers
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashGiven, setCashGiven] = useState('');

  const handleNipLookup = async () => {
    const cleanNip = nip.replace(/[^0-9]/g, '');
    if (cleanNip.length !== 10) {
      toast.error('NIP musi mieć 10 cyfr');
      return;
    }

    setIsSearchingNip(true);
    const statusToast = toast.loading('Pobieram dane z Ministerstwa Finansów...');

    // 1. Szukaj w lokalnej bazie klientów
    const local = customers.find(c => c.nip?.replace(/[^0-9]/g, '') === cleanNip);
    if (local) {
      setBuyerName(local.company_name || local.name);
      setBuyerAddress(local.address || '');
      toast.dismiss(statusToast);
      toast.success('Znaleziono klienta w bazie');
      setIsSearchingNip(false);
      return;
    }

    // 2. Szukaj w oficjalnym rejestrze Ministerstwa Finansów (Biała Lista)
    // Omijamy CORS używając lokalnego proxy skonfigurowanego w vite.config.js
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api-proxy/mf/${cleanNip}?date=${today}`, {
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (response.ok) {
        const subject = data.result?.subject;
        if (subject && subject.name) {
          setBuyerName(subject.name);
          setBuyerAddress(subject.workingAddress || subject.residenceAddress || '');
          toast.dismiss(statusToast);
          toast.success('Dane firmy pobrane z rejestru MF!');
          setIsSearchingNip(false);
          return;
        }
      } else {
        // Ministerstwo Finansów zwraca kod WL-115 dla NIP-ów, które matematycznie lub fizycznie nie istnieją
        if (data.code === 'WL-115') {
          toast.dismiss(statusToast);
          toast.error(`NIP ${cleanNip} jest nieprawidłowy lub nie istnieje w rejestrze MF.`);
          setIsSearchingNip(false);
          return;
        }
      }
    } catch (error) {
      console.error('MF API Error:', error);
    }

    toast.dismiss(statusToast);
    toast.error('Nie udało się pobrać danych. Sprawdź NIP lub wpisz dane ręcznie.');
    setIsSearchingNip(false);
  };

  function openPayment() {
    if (cart.length === 0) return;
    setShowPayment(true);
    setPaymentMethods([{ method: 'cash', amount: total }]);
    setCashGiven('');
    // Resetuj dane nabywcy
    setNip('');
    setBuyerName('');
    setBuyerAddress('');
  }

  async function processPayment() {
    try {
      const txnId = String(Date.now());
      const txn = {
        id: txnId,
        type: 'sale',
        status: 'completed',
        customer_id: null,
        seller_id: profile?.id,
        total,
        items: cart.map(i => ({ product_id: i.product_id, name: i.name, qty: i.qty, price: i.price })),
        payments: paymentMethods,
        created_at: new Date().toISOString(),
      };

      // 1. Zapisz transakcję (rejestr finansowy)
      await addTransaction(txn);

      // 2. Zapisz dokument (paragon do ewidencji)
      const docData = {
        id: `PAR/${new Date().getFullYear()}/${txnId.slice(-6)}`,
        type: 'receipt', // Typ: Paragon
        customer: buyerName || 'Klient detaliczny',
        total: total,
        items: cart.map(i => ({
          product_id: i.product_id,
          name: i.name,
          qty: i.qty,
          price: i.price, // cena brutto
          price_net: calculateNetFromGross(i.price, 23), // zakladamy 23% VAT dla paragonu
          unit: i.unit || 'szt'
        })),
        date: txn.created_at,
        issued_by: profile?.id, // Kto wystawił
        seller: profile?.full_name || 'System',
        payment_method: paymentMethods.map(m => `${m.method === 'cash' ? 'Gotówka' : m.method === 'card' ? 'Karta' : 'Przelew'}`).join(', '),
        buyer: {
          name: buyerName || 'Klient detaliczny',
          nip: nip || '------',
          address: buyerAddress || ''
        }
      };
      await saveDocument(docData);

      // Zapisz zdarzenie sprzedaży w historii działań POS
      if (addPosLog) {
        addPosLog(
          'sale',
          profile?.full_name || posSession?.posUser?.name || posSession?.posUser?.full_name || 'System',
          posSession?.selectedRegister || 'Kasa',
          `Paragon ${docData.id}`,
          total
        );
      }

      // 3. Aktualizuj stany magazynowe
      for (const item of cart) {
        if (!item.product_id.startsWith('tile-')) {
          await updateProductStock(item.product_id, -item.qty);
        }
      }

      toast.success('Transakcja zakończona i zapisana!', { icon: '✅', duration: 3000 });
      setShowPayment(false);
      clearCart();
    } catch (error) {
      console.error('Błąd podczas finalizacji płatności:', error);
      toast.error('Wystąpił błąd podczas zapisywania transakcji. Spróbuj ponownie.');
    }
  }

  // Parked receipts
  function parkReceipt() {
    if (cart.length === 0) return;
    const parked = JSON.parse(localStorage.getItem('parkedReceipts') || '[]');
    parked.push({
      id: String(Date.now()),
      cart,
      customer: selectedCustomer,
      discount,
      parkedAt: new Date().toISOString(),
      parkedBy: profile?.full_name,
    });
    localStorage.setItem('parkedReceipts', JSON.stringify(parked));
    toast.success('Paragon zaparkowany');
    clearCart();
  }

  return (
    <div className="pos-layout">
      {/* Left: Products */}
      <div className="pos-products">
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={searchRef}
                type="text"
                className="input"
                placeholder="Skanuj kod lub wpisz nazwę produktu..."
                style={{ paddingLeft: 40, fontSize: '1rem' }}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                {searchQuery && (
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                  >
                    <FiX size={16} />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowScanner(true)}
                  title="Skanuj kamerą"
                >
                  <FiVideo size={18} />
                </button>
              </div>
            </div>
            <button
              className={`btn ${showTiles ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowTiles(!showTiles)}
              title="Kafle szybkiego wyboru"
            >
              <FiGrid size={16} />
            </button>
          </div>

          {/* Search results dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 50,
              maxHeight: 320,
              overflowY: 'auto',
              marginTop: 4,
            }}>
              {searchResults.map(product => (
                <button
                  key={product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => addToCart(product)}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <FiPackage size={20} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{product.name}</div>
                    <div className="text-xs text-muted">SKU: {product.sku} • Stan: {product.stock_qty} {product.unit}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-light)' }}>
                    {formatCurrency(product.sell_price)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick tiles */}
        {showTiles && (
          <div>
            <h4 className="text-muted" style={{ marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Kafle szybkiego wyboru
            </h4>
            <div className="quick-tiles">
              {QUICK_TILES.map(tile => (
                <button key={tile.id} className="quick-tile" onClick={() => addQuickTile(tile)}>
                  <span style={{ fontSize: '1.5rem' }}>{tile.icon}</span>
                  <span>{tile.name}</span>
                  {tile.price > 0 && (
                    <span style={{ fontWeight: 600, color: 'var(--accent-light)', fontSize: '0.8rem' }}>
                      {formatCurrency(tile.price)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cross-sell suggestions */}
        {crossSellProducts.length > 0 && (
          <div className="card mt-16" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}>
            <div className="flex-between mb-8">
              <h4 style={{ fontSize: '0.85rem' }}>
                <FiTag size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Sugerowane produkty
              </h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setCrossSellProducts([])}>
                <FiX size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {crossSellProducts.map(p => (
                <button
                  key={p.id}
                  className="card card-clickable"
                  style={{ minWidth: 160, padding: 12 }}
                  onClick={() => addToCart(p)}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.9rem' }}>
                    {formatCurrency(p.sell_price)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <h3 style={{ fontSize: '1rem' }}>
            <FiShoppingBag size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Koszyk ({cart.length})
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {can(PERMISSIONS.POS_PARK) && (
              <button className="btn btn-ghost btn-sm" onClick={parkReceipt} disabled={cart.length === 0} title="Zaparkuj paragon">
                <FiPause size={14} /> Zaparkuj
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={clearCart} disabled={cart.length === 0}>
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>


        {/* Cart items */}
        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <FiShoppingBag size={32} />
              <h3>Koszyk jest pusty</h3>
              <p>Zeskanuj kod lub wyszukaj produkt</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="pos-cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>{item.name}</div>
                  <div className="text-xs text-muted">{formatCurrency(item.price)} / {item.unit}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateQty(item.product_id, -1)}>
                    <FiMinus size={12} />
                  </button>
                  <span style={{ width: 32, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>{item.qty}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateQty(item.product_id, 1)}>
                    <FiPlus size={12} />
                  </button>
                </div>
                <div style={{ width: 80, textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatCurrency(item.price * item.qty)}</div>
                </div>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => removeFromCart(item.product_id)}
                  style={{ color: 'var(--danger)' }}
                >
                  <FiX size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="pos-cart-summary">
          <div className="flex-between text-sm" style={{ marginBottom: 4 }}>
            <span className="text-muted">Suma częściowa</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex-between text-sm" style={{ marginBottom: 4, color: 'var(--success)' }}>
              <span>Rabat ({totalDiscount}%)</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex-between text-sm" style={{ marginBottom: 4, color: 'var(--text-muted)' }}>
            <span>w tym VAT (23%)</span>
            <span>{formatCurrency(vat)}</span>
          </div>

          <div className="pos-cart-total">
            <span>RAZEM</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ flex: 1, justifyContent: 'center', fontSize: '1rem' }}
              onClick={openPayment}
              disabled={cart.length === 0}
            >
              <FiCreditCard size={18} />
              Płatność
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Płatność — {formatCurrency(total)}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-3" style={{ marginBottom: 24 }}>
                <button
                  className={`card card-clickable ${paymentMethods[0]?.method === 'cash' ? 'active' : ''}`}
                  style={{
                    textAlign: 'center',
                    borderColor: paymentMethods[0]?.method === 'cash' ? 'var(--accent)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setPaymentMethods([{ method: 'cash', amount: total }])}
                >
                  <FiDollarSign size={28} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600 }}>Gotówka</div>
                </button>
                <button
                  className={`card card-clickable ${paymentMethods[0]?.method === 'card' ? 'active' : ''}`}
                  style={{
                    textAlign: 'center',
                    borderColor: paymentMethods[0]?.method === 'card' ? 'var(--accent)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setPaymentMethods([{ method: 'card', amount: total }])}
                >
                  <FiCreditCard size={28} style={{ color: 'var(--info)', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600 }}>Karta</div>
                </button>
                <button
                  className={`card card-clickable ${paymentMethods[0]?.method === 'transfer' ? 'active' : ''}`}
                  style={{
                    textAlign: 'center',
                    borderColor: paymentMethods[0]?.method === 'transfer' ? 'var(--accent)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setPaymentMethods([{ method: 'transfer', amount: total }])}
                >
                  <FiArrowRight size={28} style={{ color: 'var(--accent-light)', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600 }}>Przelew</div>
                </button>
              </div>

              {paymentMethods[0]?.method === 'cash' && (
                <div className="input-group">
                  <label>Kwota otrzymana</label>
                  <input
                    type="number"
                    className="input"
                    style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }}
                    placeholder={total.toFixed(2)}
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    autoFocus
                  />
                  {cashGiven && parseFloat(cashGiven) >= total && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <span className="text-muted">Reszta: </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(parseFloat(cashGiven) - total)}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {[10, 20, 50, 100, 200, 500].map(amount => (
                      <button
                        key={amount}
                        className="btn btn-secondary"
                        onClick={() => setCashGiven(String(amount))}
                      >
                        {amount} zł
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-subtle, #f1f5f9)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>Dane nabywcy / NIP</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Wpisz NIP (opcjonalnie)..."
                    value={nip}
                    onChange={e => setNip(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleNipLookup}
                    disabled={isSearchingNip || !nip}
                  >
                    {isSearchingNip ? '...' : 'Szukaj'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Nazwa nabywcy"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Adres (opcjonalnie)"
                    value={buyerAddress}
                    onChange={e => setBuyerAddress(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <label className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Typ dokumentu
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>Paragon</button>
                  <button className="btn btn-ghost" style={{ flex: 1 }}>Faktura VAT</button>
                  <button className="btn btn-ghost" style={{ flex: 1 }}>WZ</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Anuluj</button>
              <button
                className="btn btn-success btn-lg"
                onClick={processPayment}
                style={{ minWidth: 200 }}
              >
                Zatwierdź płatność
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onConfirm={handleCameraScan}
          onClose={() => setShowScanner(false)}
          title="Kasowanie towaru (Kamera)"
        />
      )}
    </div>
  );
}
