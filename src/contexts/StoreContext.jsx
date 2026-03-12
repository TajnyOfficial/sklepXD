import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const StoreContext = createContext(null);

// Demo seed data
const DEMO_PRODUCTS = [
  { id: '1', name: 'Śruba M8x40 ocynkowana', sku: 'SRU-M8-40', category_id: '1', unit: 'szt', purchase_price: 0.35, sell_price: 0.89, min_stock: 500, stock_qty: 1250, barcodes: ['5901234567890'] },
  { id: '2', name: 'Śruba M10x60 nierdzewna', sku: 'SRU-M10-60', category_id: '1', unit: 'szt', purchase_price: 1.20, sell_price: 2.99, min_stock: 200, stock_qty: 85, barcodes: ['5901234567891'] },
  { id: '3', name: 'Farba akrylowa biała 10L Dekoral', sku: 'FAR-AK-B10', category_id: '2', unit: 'szt', purchase_price: 89.00, sell_price: 149.99, min_stock: 20, stock_qty: 45, barcodes: ['5901234567892'] },
  { id: '4', name: 'Farba lateksowa szara 5L Śnieżka', sku: 'FAR-LT-SZ5', category_id: '2', unit: 'szt', purchase_price: 54.00, sell_price: 89.90, min_stock: 15, stock_qty: 32, barcodes: ['5901234567893'] },
  { id: '5', name: 'Wiertarka udarowa Bosch GSB 13RE', sku: 'NAR-WU-B13', category_id: '3', unit: 'szt', purchase_price: 289.00, sell_price: 459.00, min_stock: 5, stock_qty: 12, barcodes: ['5901234567894'] },
  { id: '6', name: 'Szlifierka kątowa Makita GA5030', sku: 'NAR-SK-M50', category_id: '3', unit: 'szt', purchase_price: 199.00, sell_price: 329.00, min_stock: 3, stock_qty: 8, barcodes: ['5901234567895'] },
  { id: '7', name: 'Pędzel płaski 75mm Hardy', sku: 'AKC-PE-75', category_id: '4', unit: 'szt', purchase_price: 8.50, sell_price: 16.90, min_stock: 30, stock_qty: 67, barcodes: ['5901234567896'] },
  { id: '8', name: 'Wałek malarski 25cm z rączką', sku: 'AKC-WA-25', category_id: '4', unit: 'szt', purchase_price: 12.00, sell_price: 24.90, min_stock: 25, stock_qty: 41, barcodes: ['5901234567897'] },
  { id: '9', name: 'Folia malarska 4x5m', sku: 'AKC-FM-45', category_id: '4', unit: 'szt', purchase_price: 3.50, sell_price: 7.99, min_stock: 50, stock_qty: 120, barcodes: ['5901234567898'] },
  { id: '10', name: 'Cement portlandzki 25kg Górażdże', sku: 'BUD-CP-25', category_id: '5', unit: 'szt', purchase_price: 18.50, sell_price: 29.99, min_stock: 40, stock_qty: 95, barcodes: ['5901234567899'] },
  { id: '11', name: 'Klej do płytek Ceresit CM11 25kg', sku: 'BUD-KP-CM25', category_id: '5', unit: 'szt', purchase_price: 24.00, sell_price: 39.90, min_stock: 30, stock_qty: 55, barcodes: ['5901234567900'] },
  { id: '12', name: 'Rura PVC kanalizacyjna fi110 3m', sku: 'INS-RP-110', category_id: '6', unit: 'szt', purchase_price: 22.00, sell_price: 38.50, min_stock: 15, stock_qty: 28, barcodes: ['5901234567901'] },
  { id: '13', name: 'Kabel YDYp 3x2.5 100m', sku: 'ELE-KA-325', category_id: '7', unit: 'szt', purchase_price: 180.00, sell_price: 289.00, min_stock: 10, stock_qty: 22, barcodes: ['5901234567902'] },
  { id: '14', name: 'Gniazdko podtynkowe podwójne', sku: 'ELE-GN-P2', category_id: '7', unit: 'szt', purchase_price: 8.90, sell_price: 18.50, min_stock: 50, stock_qty: 180, barcodes: ['5901234567903'] },
  { id: '15', name: 'Reklamówka duża 30L', sku: 'ACC-RE-30', category_id: '8', unit: 'szt', purchase_price: 0.05, sell_price: 0.25, min_stock: 1000, stock_qty: 3500, barcodes: [] },
  { id: '16', name: 'Usługa cięcia drewna', sku: 'USL-CD-01', category_id: '9', unit: 'usł', purchase_price: 0, sell_price: 15.00, min_stock: 0, stock_qty: 9999, barcodes: [] },
  { id: '17', name: 'Usługa dostawy miejskiej', sku: 'USL-DM-01', category_id: '9', unit: 'usł', purchase_price: 0, sell_price: 49.90, min_stock: 0, stock_qty: 9999, barcodes: [] },
  { id: '18', name: 'Silikon sanitarny biały 280ml', sku: 'CHE-SS-B28', category_id: '10', unit: 'szt', purchase_price: 9.50, sell_price: 18.99, min_stock: 40, stock_qty: 88, barcodes: ['5901234567904'] },
  { id: '19', name: 'Klej montażowy Mamut 290ml', sku: 'CHE-KM-M29', category_id: '10', unit: 'szt', purchase_price: 14.00, sell_price: 27.90, min_stock: 25, stock_qty: 42, barcodes: ['5901234567905'] },
  { id: '20', name: 'Zamek wpuszczany 72/55', sku: 'ZAM-WP-7255', category_id: '11', unit: 'szt', purchase_price: 25.00, sell_price: 49.90, min_stock: 10, stock_qty: 18, barcodes: ['5901234567906'] },
  { id: '21', name: 'Klamka drzwiowa satyna', sku: 'ZAM-KL-SAT', category_id: '11', unit: 'kpl', purchase_price: 35.00, sell_price: 69.90, min_stock: 8, stock_qty: 14, barcodes: ['5901234567907'] },
  { id: '22', name: 'Deska podłogowa dębowa 1m²', sku: 'POD-DD-1M', category_id: '12', unit: 'm²', purchase_price: 85.00, sell_price: 149.90, min_stock: 30, stock_qty: 75, barcodes: ['5901234567908'] },
  { id: '23', name: 'Panel podłogowy dąb naturalny AC5', sku: 'POD-PP-DN', category_id: '12', unit: 'm²', purchase_price: 29.00, sell_price: 52.90, min_stock: 100, stock_qty: 250, barcodes: ['5901234567909'] },
  { id: '24', name: 'Wkręt do drewna 4x50 (200szt)', sku: 'SRU-WD-450', category_id: '1', unit: 'op', purchase_price: 12.00, sell_price: 22.90, min_stock: 30, stock_qty: 65, barcodes: ['5901234567910'] },
  { id: '25', name: 'Kołek rozporowy 10x60 (50szt)', sku: 'SRU-KR-1060', category_id: '1', unit: 'op', purchase_price: 15.00, sell_price: 28.90, min_stock: 25, stock_qty: 48, barcodes: ['5901234567911'] },
];

const DEMO_CATEGORIES = [
  { id: '1', name: 'Śruby i złączki', parent_id: null },
  { id: '2', name: 'Farby i lakiery', parent_id: null },
  { id: '3', name: 'Elektronarzędzia', parent_id: null },
  { id: '4', name: 'Akcesoria malarskie', parent_id: null },
  { id: '5', name: 'Materiały budowlane', parent_id: null },
  { id: '6', name: 'Instalacje wod-kan', parent_id: null },
  { id: '7', name: 'Elektryka', parent_id: null },
  { id: '8', name: 'Opakowania', parent_id: null },
  { id: '9', name: 'Usługi', parent_id: null },
  { id: '10', name: 'Chemia budowlana', parent_id: null },
  { id: '11', name: 'Okucia i zamki', parent_id: null },
  { id: '12', name: 'Podłogi', parent_id: null },
];

const DEMO_CUSTOMERS = [
  { id: '1', type: 'company', name: 'Budmax Sp. z o.o.', company_name: 'Budmax Sp. z o.o.', nip: '5213456789', phone: '501100200', email: 'zamowienia@budmax.pl', price_group: 'wholesale', credit_limit: 50000, credit_used: 12500 },
  { id: '2', type: 'company', name: 'Remont-Expert Jan Kowal', company_name: 'Remont-Expert', nip: '7891234560', phone: '600300400', email: 'jan@remont-expert.pl', price_group: 'contractor', credit_limit: 20000, credit_used: 3200 },
  { id: '3', type: 'person', name: 'Marek Zieliński', phone: '512345678', email: 'marek.z@gmail.com', price_group: 'regular', credit_limit: 0, credit_used: 0 },
  { id: '4', type: 'person', name: 'Ewa Kamińska', phone: '698765432', email: 'ewa.k@wp.pl', price_group: 'loyal', credit_limit: 0, credit_used: 0 },
  { id: '5', type: 'company', name: 'ElektroMont S.A.', company_name: 'ElektroMont S.A.', nip: '1234567890', phone: '221234567', email: 'biuro@elektromont.pl', price_group: 'wholesale', credit_limit: 100000, credit_used: 45000 },
  { id: '6', type: 'person', name: 'Krzysztof Nowicki', phone: '505123456', email: null, price_group: 'regular', credit_limit: 0, credit_used: 0 },
  { id: '7', type: 'company', name: 'Dom i Ogród Sp.j.', company_name: 'Dom i Ogród Sp.j.', nip: '9876543210', phone: '717654321', email: 'sklep@diogrod.pl', price_group: 'contractor', credit_limit: 30000, credit_used: 8900 },
];

const DEMO_SUPPLIERS = [
  { id: '1', name: 'Hurtownia Śrub Polskie', nip: '1111111111', contact: { phone: '221111111', email: 'zamow@srubpol.pl' }, rating: 4.5 },
  { id: '2', name: 'Dekoral Dystrybucja', nip: '2222222222', contact: { phone: '222222222', email: 'handel@dekoral.pl' }, rating: 4.8 },
  { id: '3', name: 'Bosch Professional Polska', nip: '3333333333', contact: { phone: '223333333', email: 'zamowienia@bosch.pl' }, rating: 4.9 },
  { id: '4', name: 'Mega-Bud Materiały Budowlane', nip: '4444444444', contact: { phone: '224444444', email: 'hurt@megabud.pl' }, rating: 3.8 },
  { id: '5', name: 'ElektroHurt24', nip: '5555555555', contact: { phone: '225555555', email: 'sklep@elektrohurt24.pl' }, rating: 4.2 },
];

const DEMO_TRANSACTIONS = [
  { id: '1', type: 'sale', status: 'completed', customer_id: '3', seller_id: '3', total: 459.00, items: [{ product_id: '5', name: 'Wiertarka udarowa Bosch GSB 13RE', qty: 1, price: 459.00 }], payments: [{ method: 'card', amount: 459.00 }], created_at: '2026-03-12T10:15:00Z' },
  { id: '2', type: 'sale', status: 'completed', customer_id: null, seller_id: '3', total: 174.78, items: [{ product_id: '3', name: 'Farba akrylowa biała 10L Dekoral', qty: 1, price: 149.99 }, { product_id: '7', name: 'Pędzel płaski 75mm Hardy', qty: 1, price: 16.90 }, { product_id: '9', name: 'Folia malarska 4x5m', qty: 1, price: 7.99 }], payments: [{ method: 'cash', amount: 200.00, change: 25.22 }], created_at: '2026-03-12T11:30:00Z' },
  { id: '3', type: 'sale', status: 'completed', customer_id: '1', seller_id: '6', total: 2890.00, items: [{ product_id: '10', name: 'Cement portlandzki 25kg Górażdże', qty: 40, price: 29.99 }, { product_id: '11', name: 'Klej do płytek Ceresit CM11 25kg', qty: 30, price: 39.90 }], payments: [{ method: 'transfer', amount: 2890.00 }], created_at: '2026-03-12T09:00:00Z' },
  { id: '4', type: 'sale', status: 'completed', customer_id: '4', seller_id: '3', total: 52.90, items: [{ product_id: '23', name: 'Panel podłogowy dąb naturalny AC5', qty: 1, price: 52.90 }], payments: [{ method: 'cash', amount: 52.90 }], created_at: '2026-03-11T16:45:00Z' },
  { id: '5', type: 'sale', status: 'completed', customer_id: '2', seller_id: '6', total: 1156.00, items: [{ product_id: '13', name: 'Kabel YDYp 3x2.5 100m', qty: 4, price: 289.00 }], payments: [{ method: 'transfer', amount: 1156.00 }], created_at: '2026-03-11T14:20:00Z' },
];

const PRICE_GROUPS = {
  regular: { label: 'Klient detaliczny', discount: 0 },
  loyal: { label: 'Stały klient', discount: 5 },
  contractor: { label: 'Wykonawca', discount: 10 },
  wholesale: { label: 'Cena hurtowa', discount: 15 },
};

const CROSS_SELL_MAP = {
  '3': ['7', '8', '9'],  // farba -> pędzel, wałek, folia
  '4': ['7', '8', '9'],  // farba -> pędzel, wałek, folia
  '5': ['24', '25'],      // wiertarka -> wkręty, kołki
  '6': ['24'],             // szlifierka -> wkręty
  '10': ['11'],            // cement -> klej
  '13': ['14'],            // kabel -> gniazdko
  '22': ['23'],            // deska -> panel
};

export function StoreProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    try {
      // Try Supabase first
      const { data: prods } = await supabase.from('products').select('*');
      if (prods && prods.length > 0) {
        setProducts(prods);
        const { data: cats } = await supabase.from('categories').select('*');
        setCategories(cats || []);
        const { data: custs } = await supabase.from('customers').select('*');
        setCustomers(custs || []);
        const { data: supps } = await supabase.from('suppliers').select('*');
        setSuppliers(supps || []);
        const { data: txns } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
        setTransactions(txns || []);
      } else {
        throw new Error('No data');
      }
    } catch {
      // Fallback to demo data
      setProducts(DEMO_PRODUCTS);
      setCategories(DEMO_CATEGORIES);
      setCustomers(DEMO_CUSTOMERS);
      setSuppliers(DEMO_SUPPLIERS);
      setTransactions(DEMO_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  }

  const findProduct = useCallback((query) => {
    const q = query.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcodes && p.barcodes.some(b => b.includes(q)))
    );
  }, [products]);

  const findProductByBarcode = useCallback((barcode) => {
    return products.find(p => p.barcodes && p.barcodes.includes(barcode));
  }, [products]);

  const getCrossSellProducts = useCallback((productId) => {
    const ids = CROSS_SELL_MAP[productId] || [];
    return ids.map(id => products.find(p => p.id === id)).filter(Boolean);
  }, [products]);

  const getCustomerDiscount = useCallback((customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 0;
    return PRICE_GROUPS[customer.price_group]?.discount || 0;
  }, [customers]);

  const getLowStockProducts = useCallback(() => {
    return products.filter(p => p.stock_qty <= p.min_stock && p.min_stock > 0);
  }, [products]);

  const addTransaction = useCallback((transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  const updateProductStock = useCallback((productId, change) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock_qty: Math.max(0, p.stock_qty + change) } : p
    ));
  }, []);

  const value = {
    products,
    categories,
    customers,
    suppliers,
    transactions,
    loading,
    priceGroups: PRICE_GROUPS,
    findProduct,
    findProductByBarcode,
    getCrossSellProducts,
    getCustomerDiscount,
    getLowStockProducts,
    addTransaction,
    updateProductStock,
    setProducts,
    setCustomers,
    setSuppliers,
    setTransactions,
    refreshData: loadData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export default StoreContext;
