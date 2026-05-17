import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, ensureSupabaseSession } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../utils/rbac';

const StoreContext = createContext(null);

const PRICE_GROUPS = {
  regular: { label: 'Klient detaliczny', discount: 0 },
  loyal: { label: 'Stały klient', discount: 5 },
  contractor: { label: 'Wykonawca', discount: 10 },
  wholesale: { label: 'Cena hurtowa', discount: 15 },
};

const CROSS_SELL_MAP = {};

export function StoreProvider({ children }) {
  const { isAuthenticated, profile } = useAuth();
  const isSupabase = !!import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [warehouseLocations, setWarehouseLocations] = useState([]);
  const [inventories, setInventories] = useState(() => {
    try {
      const saved = localStorage.getItem('store_inventories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse store_inventories:', e);
      return [];
    }
  });
  const [posLogs, setPosLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse pos_logs:', e);
      return [];
    }
  });
  const [schedules, setSchedules] = useState(() => {
    try {
      const saved = localStorage.getItem('work_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse work_schedules:', e);
      return [];
    }
  });
  const [posSession, setPosSession] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_session');
      return saved ? JSON.parse(saved) : { selectedRegister: null, posUser: null };
    } catch (e) {
      console.error('Failed to parse pos_session:', e);
      return { selectedRegister: null, posUser: null };
    }
  });

  const [mobileSession, setMobileSession] = useState(() => {
    try {
      const saved = localStorage.getItem('mobile_session');
      return saved ? JSON.parse(saved) : { mobileUser: null };
    } catch (e) {
      console.error('Failed to parse mobile_session:', e);
      return { mobileUser: null };
    }
  });
  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('shop_settings');
      return saved ? JSON.parse(saved) : {
        name: 'Sklep Budowlany "Pod Młotkiem"',
        nip: '5213456789',
        address: 'ul. Budowlana 15, 00-100 Warszawa',
        bankAccount: 'PL61 1090 1014 0000 0712 1981 2874',
        registers: ['Kasa 1', 'Kasa 2', 'Kasa 3', 'Kasa 4'],
        vatRates: [
          { name: 'VAT 23%', rate: 23, code: 'A' },
          { name: 'VAT 8%', rate: 8, code: 'B' },
          { name: 'VAT 5%', rate: 5, code: 'C' },
          { name: 'VAT 0%', rate: 0, code: 'D' },
          { name: 'Zwolniony (zw)', rate: 0, code: 'E' },
        ]
      };
    } catch (e) {
      console.error('Failed to parse shop_settings:', e);
      return {
        name: 'Sklep Budowlany "Pod Młotkiem"',
        nip: '5213456789',
        address: 'ul. Budowlana 15, 00-100 Warszawa',
        bankAccount: 'PL61 1090 1014 0000 0712 1981 2874',
        registers: ['Kasa 1', 'Kasa 2', 'Kasa 3', 'Kasa 4'],
        vatRates: [
          { name: 'VAT 23%', rate: 23, code: 'A' },
          { name: 'VAT 8%', rate: 8, code: 'B' },
          { name: 'VAT 5%', rate: 5, code: 'C' },
          { name: 'VAT 0%', rate: 0, code: 'D' },
          { name: 'Zwolniony (zw)', rate: 0, code: 'E' },
        ]
      };
    }
  });
  const [loading, setLoading] = useState(true);

  const updateShopSettings = useCallback(async (newSettings) => {
    setShopSettings(newSettings);
    localStorage.setItem('shop_settings', JSON.stringify(newSettings));

    if (isSupabase) {
      try {
        const { data: existing } = await supabase.from('store_settings').select('id').limit(1);
        const row = {
          store_name: newSettings.name,
          nip: newSettings.nip || null,
          address: newSettings.address || null,
          bank_account: newSettings.bankAccount || null,
          settings_json: {
            registers: newSettings.registers,
            vatRates: newSettings.vatRates
          }
        };
        if (existing && existing.length > 0) {
          await supabase.from('store_settings').update(row).eq('id', existing[0].id);
        } else {
          await supabase.from('store_settings').insert(row);
        }
      } catch (err) {
        console.error('Failed to save store settings to Supabase:', err);
      }
    }
  }, [isSupabase]);

  const updateRolePermissions = useCallback(async (newRoles, newLabels, newPermissions) => {
    for (const k in ROLES) delete ROLES[k];
    Object.assign(ROLES, newRoles);

    for (const k in ROLE_LABELS) delete ROLE_LABELS[k];
    Object.assign(ROLE_LABELS, newLabels);

    for (const k in ROLE_PERMISSIONS) delete ROLE_PERMISSIONS[k];
    Object.assign(ROLE_PERMISSIONS, newPermissions);

    setShopSettings(prev => ({
      ...prev,
      role_permissions: newPermissions,
      role_labels: newLabels,
      roles: newRoles
    }));

    if (isSupabase) {
      try {
        const { data: existing } = await supabase.from('store_settings').select('id, settings_json').limit(1);
        const currentJson = existing && existing[0] ? existing[0].settings_json || {} : {};
        
        const row = {
          settings_json: {
            ...currentJson,
            roles: newRoles,
            role_labels: newLabels,
            role_permissions: newPermissions
          }
        };

        if (existing && existing.length > 0) {
          await supabase.from('store_settings').update(row).eq('id', existing[0].id);
        } else {
          await supabase.from('store_settings').insert({
            store_name: shopSettings.name || 'Sklep',
            ...row
          });
        }
      } catch (err) {
        console.error('Failed to save role permissions to Supabase:', err);
      }
    }
  }, [isSupabase, shopSettings]);

  const addPosLog = useCallback(async (type, user, register, details, amount = null) => {
    const newLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      type,
      user,
      register,
      time: new Date().toISOString(),
      details,
      amount
    };
    setPosLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('pos_logs', JSON.stringify(updated));
      return updated;
    });

    if (isSupabase) {
      try {
        let dbAction = 'update';
        if (type === 'login') dbAction = 'login';
        else if (type === 'logout') dbAction = 'logout';
        else if (type === 'create') dbAction = 'create';
        else if (type === 'delete') dbAction = 'delete';
        else if (type === 'security') dbAction = 'security';

        const emp = employees.find(e => e.name === user || e.full_name === user);

        await supabase.from('audit_logs').insert({
          action: dbAction,
          entity_type: 'pos',
          description: `${user} [${register}]: ${details}`,
          details: { type, register, amount, details },
          user_name: user,
          user_id: emp ? emp.id : null
        });
      } catch (err) {
        console.error('Failed to save audit log to Supabase:', err);
      }
    }
  }, [isSupabase, employees]);

  const updatePosSession = useCallback((session) => {
    setPosSession(prev => {
      const next = { ...prev, ...session };
      localStorage.setItem('pos_session', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearPosSession = useCallback(() => {
    setPosSession({ selectedRegister: null, posUser: null });
    localStorage.removeItem('pos_session');
  }, []);

  const logoutPosUser = useCallback(() => {
    setPosSession(prev => {
      if (prev.posUser && prev.selectedRegister) {
        setTimeout(() => {
          addPosLog(
            'logout',
            prev.posUser.name || prev.posUser.full_name,
            prev.selectedRegister,
            'Zakończenie sesji'
          );
        }, 0);
      }
      const next = { ...prev, posUser: null };
      localStorage.setItem('pos_session', JSON.stringify(next));
      return next;
    });
  }, [addPosLog]);

  const updateMobileSession = useCallback((session) => {
    setMobileSession(prev => {
      const next = { ...prev, ...session };
      localStorage.setItem('mobile_session', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearMobileSession = useCallback(() => {
    setMobileSession({ mobileUser: null });
    localStorage.removeItem('mobile_session');
  }, []);

  const logoutMobileUser = useCallback(() => {
    setMobileSession(prev => {
      if (prev.mobileUser) {
        setTimeout(() => {
          addPosLog(
            'logout',
            prev.mobileUser.name || prev.mobileUser.full_name,
            'Mobile',
            'Zakończenie sesji'
          );
        }, 0);
      }
      const next = { ...prev, mobileUser: null };
      localStorage.setItem('mobile_session', JSON.stringify(next));
      return next;
    });
  }, [addPosLog]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    let supabaseWorks = false;
    try {
      await ensureSupabaseSession();
      const { error: testErr } = await supabase.from('products').select('count', { count: 'exact', head: true });
      supabaseWorks = !testErr;
    } catch {
      supabaseWorks = false;
    }

    if (!supabaseWorks) {
      console.warn('Supabase niedostępny — brak połączenia z bazą danych');
      setProducts([]);
      setCategories([]);
      setCustomers([]);
      setSuppliers([]);
      setEmployees([
        { id: 'emp-1', name: 'Jan Kowalski', full_name: 'Jan Kowalski', role: 'admin', active: true, pin: '1111' },
        { id: 'emp-2', name: 'Anna Nowak', full_name: 'Anna Nowak', role: 'shift_manager', active: true, pin: '2222' },
        { id: 'emp-3', name: 'Piotr Wiśniewski', full_name: 'Piotr Wiśniewski', role: 'cashier', active: true, pin: '3333' }
      ]);
      setTransactions([]);
      setDocuments([]);

      try {
        const savedLocs = localStorage.getItem('warehouse_locations');
        setWarehouseLocations(savedLocs ? JSON.parse(savedLocs) : []);
      } catch (e) {
        console.error('Failed to parse warehouse_locations:', e);
        setWarehouseLocations([]);
      }

      try {
        const savedInvs = localStorage.getItem('store_inventories');
        setInventories(savedInvs ? JSON.parse(savedInvs) : [
          {
            id: 'demo-inv-1',
            number: 'INW/2026/03/001',
            type: 'partial',
            scope: 'Elektronarzędzia',
            status: 'assigned',
            blind: false,
            items: [
              { sku: 'NAR-WU-B13', name: 'Wiertarka udarowa Bosch GSB 13RE', system_qty: 12, counted_qty: null },
              { sku: 'NAR-SK-M50', name: 'Szlifierka kątowa Makita GA5030', system_qty: 8, counted_qty: null }
            ],
            count: 0,
            diff: 0,
            date: new Date().toISOString().split('T')[0],
            assigned_to: 'emp-1',
            assigned_name: 'Jan Kowalski'
          }
        ]);
      } catch (e) {
        console.error('Failed to parse store_inventories:', e);
      }

      setLoading(false);
      return;
    }

    // Supabase działa — ładuj dane
    try {
      const [prodsRes, catsRes, custsRes, suppsRes, empsRes, txnsRes, attRes, docsRes, locsRes, schedsRes, settingsRes, logsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('time_entries').select('*').order('clock_in', { ascending: false }).limit(100),
        supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('warehouse_locations').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('store_settings').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

      let loadedEmps = (empsRes.data || []).map(e => ({ ...e, name: e.full_name, active: e.is_active, pin: e.pin }));
      let loadedProds = prodsRes.data || [];
      let loadedCats = catsRes.data || [];

      // Auto-seeding if database is completely empty
      if (loadedEmps.length === 0) {
        console.log("Database profiles are empty, seeding default employees...");
        try {
          const defaultRows = [
            { id: '11111111-1111-1111-1111-111111111111', full_name: 'Jan Kowalski', role: 'admin', is_active: true, pin: '1111', email: 'admin@sklep.pl' },
            { id: '22222222-2222-2222-2222-222222222222', full_name: 'Anna Nowak', role: 'shift_manager', is_active: true, pin: '2222', email: 'kierownik@sklep.pl' },
            { id: '33333333-3333-3333-3333-333333333333', full_name: 'Piotr Wiśniewski', role: 'cashier', is_active: true, pin: '3333', email: 'kasjer@sklep.pl' }
          ];
          await supabase.from('profiles').insert(defaultRows);
          const reloadRes = await supabase.from('profiles').select('*');
          if (reloadRes.data && reloadRes.data.length > 0) {
            loadedEmps = reloadRes.data.map(e => ({ ...e, name: e.full_name, active: e.is_active, pin: e.pin }));
          }
        } catch (seedErr) {
          console.error("Failed to seed default profiles:", seedErr);
        }
      }

      if (loadedCats.length === 0) {
        console.log("Database categories are empty, seeding default categories...");
        try {
          const defaultCats = [
            { id: '33333333-3333-3333-3333-333333333331', name: 'Śruby i złączki', sort_order: 1 },
            { id: '33333333-3333-3333-3333-333333333332', name: 'Farby i lakiery', sort_order: 2 },
            { id: '33333333-3333-3333-3333-333333333333', name: 'Elektronarzędzia', sort_order: 3 },
            { id: '33333333-3333-3333-3333-333333333334', name: 'Akcesoria malarskie', sort_order: 4 }
          ];
          await supabase.from('categories').insert(defaultCats);
          const reloadRes = await supabase.from('categories').select('*');
          if (reloadRes.data && reloadRes.data.length > 0) {
            loadedCats = reloadRes.data;
          }
        } catch (seedErr) {
          console.error("Failed to seed default categories:", seedErr);
        }
      }

      // Seed default VAT rates if empty
      try {
        const { data: vats } = await supabase.from('vat_rates').select('*');
        if (!vats || vats.length === 0) {
          console.log("Database VAT rates are empty, seeding...");
          const defaultVats = [
            { id: '11111111-1111-1111-1111-11111111111a', name: 'Standardowy', rate: 23, fiscal_code: 'A', is_default: true },
            { id: '22222222-2222-2222-2222-22222222222b', name: 'Obniżony', rate: 8, fiscal_code: 'B', is_default: false },
            { id: '33333333-3333-3333-3333-33333333333c', name: 'Super obniżony', rate: 5, fiscal_code: 'C', is_default: false },
            { id: '44444444-4444-4444-4444-44444444444d', name: 'Zwolniony', rate: 0, fiscal_code: 'D', is_default: false }
          ];
          await supabase.from('vat_rates').insert(defaultVats);
        }
      } catch (e) {
        console.error("Failed to seed VAT rates:", e);
      }

      if (loadedProds.length === 0) {
        console.log("Database products are empty, seeding default products...");
        try {
          const defaultProds = [
            {
              id: '55555555-5555-5555-5555-555555555551',
              name: 'Wiertarka udarowa Bosch GSB 13RE',
              sku: 'NAR-WU-B13',
              category_id: '33333333-3333-3333-3333-333333333333',
              purchase_price: 210.00,
              sell_price: 299.00,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 12,
              barcodes: ['NAR-WU-B13', '0123456789012'],
              is_active: true
            },
            {
              id: '55555555-5555-5555-5555-555555555552',
              name: 'Szlifierka kątowa Makita GA5030',
              sku: 'NAR-SK-M50',
              category_id: '33333333-3333-3333-3333-333333333333',
              purchase_price: 180.00,
              sell_price: 249.00,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 8,
              barcodes: ['NAR-SK-M50', '0123456789013'],
              is_active: true
            },
            {
              id: '55555555-5555-5555-5555-555555555553',
              name: 'Farba akrylowa biała 10L Dekoral',
              sku: 'FAR-AK-B10',
              category_id: '33333333-3333-3333-3333-333333333332',
              purchase_price: 60.00,
              sell_price: 89.00,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 45,
              barcodes: ['FAR-AK-B10', '0123456789014'],
              is_active: true
            },
            {
              id: '55555555-5555-5555-5555-555555555554',
              name: 'Farba lateksowa szara 5L Śnieżka',
              sku: 'FAR-LT-SZ5',
              category_id: '33333333-3333-3333-3333-333333333332',
              purchase_price: 45.00,
              sell_price: 69.00,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 32,
              barcodes: ['FAR-LT-SZ5', '0123456789015'],
              is_active: true
            },
            {
              id: '55555555-5555-5555-5555-555555555555',
              name: 'Pędzel płaski 75mm Hardy',
              sku: 'AKC-PE-75',
              category_id: '33333333-3333-3333-3333-333333333334',
              purchase_price: 8.50,
              sell_price: 12.50,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 67,
              barcodes: ['AKC-PE-75', '0123456789016'],
              is_active: true
            },
            {
              id: '55555555-5555-5555-5555-555555555556',
              name: 'Wałek malarski 25cm z rączką',
              sku: 'AKC-WA-25',
              category_id: '33333333-3333-3333-3333-333333333334',
              purchase_price: 16.00,
              sell_price: 24.90,
              vat_rate_id: '11111111-1111-1111-1111-11111111111a',
              stock_qty: 41,
              barcodes: ['AKC-WA-25', '0123456789017'],
              is_active: true
            }
          ];
          await supabase.from('products').insert(defaultProds);
          const reloadRes = await supabase.from('products').select('*');
          if (reloadRes.data && reloadRes.data.length > 0) {
            loadedProds = reloadRes.data;
          }
        } catch (seedErr) {
          console.error("Failed to seed default products:", seedErr);
        }
      }

      setProducts(loadedProds);
      setCategories(loadedCats);
      setCustomers(custsRes.data || []);
      setSuppliers(suppsRes.data || []);
      setWarehouseLocations(locsRes.data || []);

      // Mapuj dokumenty z bazy na format frontendowy
      const mappedDocs = (docsRes.data || []).map(d => ({
        id: d.document_number,
        type: d.type,
        customer: d.buyer_name || 'Klient detaliczny',
        total: parseFloat(d.gross_amount) || 0,
        date: d.issue_date,
        seller: loadedEmps.find(e => e.id === d.issued_by)?.full_name || 'System',
        buyer: {
          name: d.buyer_name,
          nip: d.buyer_nip,
          address: d.buyer_address
        },
        items: d.items || [],
        payment_method: d.note,
        _db_id: d.id
      }));

      setEmployees(loadedEmps);
      const mappedTxns = (txnsRes.data || []).map(t => {
        let parsed = {};
        try {
          parsed = typeof t.note === 'string' ? JSON.parse(t.note) : (t.note || {});
        } catch (e) {
          console.error('Failed to parse transaction note:', e);
        }
        return {
          ...t,
          items: parsed.items || [],
          payments: parsed.payments || []
        };
      });
      setTransactions(mappedTxns);
      setAttendance(attRes.data || []);
      setDocuments(mappedDocs);

      // --- GRAFIK (SCHEDULES) ---
      let loadedSchedules = (schedsRes.data || []).map(s => ({
        id: s.id,
        profile_id: s.profile_id,
        date: s.date,
        startTime: s.shift_start ? s.shift_start.slice(0, 5) : '08:00',
        endTime: s.shift_end ? s.shift_end.slice(0, 5) : '16:00',
        is_confirmed: s.is_confirmed,
        note: s.note
      }));
      if (loadedSchedules.length > 0) {
        setSchedules(loadedSchedules);
      } else {
        try {
          const saved = localStorage.getItem('work_schedules');
          if (saved) setSchedules(JSON.parse(saved));
        } catch {}
      }

      // --- LOGI AUDYTU (AUDIT LOGS) ---
      let loadedLogs = (logsRes.data || []).map(l => ({
        id: l.id,
        type: l.details?.type || l.action,
        user: l.user_name || 'System',
        register: l.details?.register || 'POS',
        time: l.created_at || new Date().toISOString(),
        details: l.description,
        amount: l.details?.amount || null
      }));
      if (loadedLogs.length > 0) {
        setPosLogs(loadedLogs);
      } else {
        try {
          const saved = localStorage.getItem('pos_logs');
          if (saved) setPosLogs(JSON.parse(saved));
        } catch {}
      }

      // --- USTAWIENIA SKLEPU (STORE SETTINGS) ---
      if (settingsRes.data && settingsRes.data.length > 0) {
        const s = settingsRes.data[0];
        setShopSettings({
          name: s.store_name || 'Sklep Budowlany "Pod Młotkiem"',
          nip: s.nip || '5213456789',
          address: s.address || 'ul. Budowlana 15, 00-100 Warszawa',
          bankAccount: s.bank_account || 'PL61 1090 1014 0000 0712 1981 2874',
          registers: s.settings_json?.registers || ['Kasa 1', 'Kasa 2', 'Kasa 3', 'Kasa 4'],
          vatRates: s.settings_json?.vatRates || [
            { name: 'VAT 23%', rate: 23, code: 'A' },
            { name: 'VAT 8%', rate: 8, code: 'B' },
            { name: 'VAT 5%', rate: 5, code: 'C' },
            { name: 'VAT 0%', rate: 0, code: 'D' },
            { name: 'Zwolniony (zw)', rate: 0, code: 'E' },
          ],
          role_permissions: s.settings_json?.role_permissions || null,
          role_labels: s.settings_json?.role_labels || null,
          roles: s.settings_json?.roles || null
        });

        if (s.settings_json?.role_permissions) {
          for (const k in ROLE_PERMISSIONS) delete ROLE_PERMISSIONS[k];
          Object.assign(ROLE_PERMISSIONS, s.settings_json.role_permissions);
        }
        if (s.settings_json?.role_labels) {
          for (const k in ROLE_LABELS) delete ROLE_LABELS[k];
          Object.assign(ROLE_LABELS, s.settings_json.role_labels);
        }
        if (s.settings_json?.roles) {
          for (const k in ROLES) delete ROLES[k];
          Object.assign(ROLES, s.settings_json.roles);
        }
      } else {
        try {
          const saved = localStorage.getItem('shop_settings');
          if (saved) setShopSettings(JSON.parse(saved));
        } catch {}
      }

      // --- INWENTARYZACJE ---
      let invsData = [];
      let invItemsData = [];
      try {
        const rawInvs = await supabase.from('inventories').select('*').order('created_at', { ascending: false });
        const rawItems = await supabase.from('inventory_items').select('*');
        invsData = rawInvs.data || [];
        invItemsData = rawItems.data || [];
      } catch (invErr) {
        console.warn('Failed to load inventories tables from Supabase, dropping back to offline cache:', invErr);
      }

      const mappedInvs = invsData.map(inv => {
        const matchingItems = invItemsData.filter(item => item.inventory_id === inv.id);
        const itemsList = matchingItems.map(item => {
          const prod = loadedProds.find(p => p.id === item.product_id);
          return {
            sku: prod ? prod.sku : '',
            name: prod ? prod.name : '',
            product_id: item.product_id,
            system_qty: parseFloat(item.system_qty) || 0,
            counted_qty: item.counted_qty !== null ? parseFloat(item.counted_qty) : null
          };
        });

        const emp = loadedEmps.find(e => e.id === inv.created_by);
        const frontendStatus = (inv.status === 'planned' && inv.created_by) ? 'assigned' : (inv.status === 'planned' ? 'planned' : inv.status);
        const countedItems = itemsList.filter(i => i.counted_qty !== null);
        const diffSum = countedItems.reduce((sum, i) => sum + (i.counted_qty - i.system_qty), 0);

        return {
          id: inv.id,
          number: inv.inventory_number,
          type: inv.type,
          scope: inv.scope,
          status: frontendStatus,
          blind: inv.is_blind,
          items: itemsList,
          count: countedItems.length,
          diff: diffSum,
          date: inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          assigned_to: inv.created_by,
          assigned_name: emp ? emp.name : 'Nieprzypisany'
        };
      });

      // Jeśli nie ma inwentaryzacji w bazie, wczytaj z cache localstorage
      if (mappedInvs.length === 0) {
        try {
          const savedInvs = localStorage.getItem('store_inventories');
          if (savedInvs) {
            setInventories(JSON.parse(savedInvs));
          } else {
            setInventories([]);
          }
        } catch {
          setInventories([]);
        }
      } else {
        setInventories(mappedInvs);
      }

    } catch (err) {
      console.error('Błąd ładowania danych:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshInventories() {
    if (!isSupabase) return;
    try {
      const rawInvs = await supabase.from('inventories').select('*').order('created_at', { ascending: false });
      const rawItems = await supabase.from('inventory_items').select('*');
      const invsData = rawInvs.data || [];
      const invItemsData = rawItems.data || [];

      if (invsData.length === 0) return;

      const mappedInvs = invsData.map(inv => {
        const matchingItems = invItemsData.filter(item => item.inventory_id === inv.id);
        const itemsList = matchingItems.map(item => {
          const prod = products.find(p => p.id === item.product_id);
          return {
            sku: prod ? prod.sku : '',
            name: prod ? prod.name : '',
            product_id: item.product_id,
            system_qty: parseFloat(item.system_qty) || 0,
            counted_qty: item.counted_qty !== null ? parseFloat(item.counted_qty) : null
          };
        });

        const emp = employees.find(e => e.id === inv.created_by);
        const frontendStatus = (inv.status === 'planned' && inv.created_by) ? 'assigned' : (inv.status === 'planned' ? 'planned' : inv.status);
        const countedItems = itemsList.filter(i => i.counted_qty !== null);
        const diffSum = countedItems.reduce((sum, i) => sum + (i.counted_qty - i.system_qty), 0);

        return {
          id: inv.id,
          number: inv.inventory_number,
          type: inv.type,
          scope: inv.scope,
          status: frontendStatus,
          blind: inv.is_blind,
          items: itemsList,
          count: countedItems.length,
          diff: diffSum,
          date: inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          assigned_to: inv.created_by,
          assigned_name: emp ? emp.name : 'Nieprzypisany'
        };
      });

      setInventories(mappedInvs);
    } catch (err) {
      console.warn('Real-time inventories refresh error:', err);
    }
  }

  useEffect(() => {
    if (isAuthenticated && isSupabase) {
      const interval = setInterval(() => {
        refreshInventories();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isSupabase, products, employees]);

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

  // ── Tryb Supabase vs Demo ─────────────────────────────────────────────────

  // ── PRODUKTY ─────────────────────────────────────────────────────────────
  const saveProduct = useCallback(async (productData, existingId = null) => {
    const row = {
      name: productData.name,
      sku: productData.sku,
      category_id: productData.category_id || null,
      location_id: productData.location_id || null,
      unit: productData.unit || 'szt',
      purchase_price: parseFloat(productData.purchase_price) || 0,
      sell_price: parseFloat(productData.sell_price) || 0,
      min_stock: parseInt(productData.min_stock) || 0,
      stock_qty: parseFloat(productData.stock_qty) || 0,
      barcodes: Array.isArray(productData.barcodes)
        ? productData.barcodes
        : (productData.barcodes ? String(productData.barcodes).split(',').map(b => b.trim()).filter(Boolean) : []),
    };

    let result;
    if (isSupabase) {
      if (existingId) {
        const { data, error } = await supabase.from('products').update(row).eq('id', existingId).select().single();
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === existingId ? data : p));
        result = data;
      } else {
        const { data, error } = await supabase.from('products').insert(row).select().single();
        if (error) throw error;
        setProducts(prev => [...prev, data]);
        result = data;
      }
    } else {
      const product = { ...row, id: existingId || crypto.randomUUID() };
      if (existingId) setProducts(prev => prev.map(p => p.id === existingId ? product : p));
      else setProducts(prev => [...prev, product]);
      result = product;
    }

    // Zarejestruj działanie w logach audytu
    const userLabel = profile ? profile.full_name : 'System';
    if (existingId) {
      const oldProduct = products.find(p => p.id === existingId);
      const priceChanged = oldProduct && parseFloat(oldProduct.sell_price) !== parseFloat(row.sell_price);
      const logType = priceChanged ? 'price' : 'update';
      const logDetails = priceChanged
        ? `Zmieniono cenę produktu "${row.name}": ${oldProduct.sell_price} → ${row.sell_price} PLN`
        : `Zaktualizowano produkt "${row.name}" (SKU: ${row.sku})`;
      addPosLog(logType, userLabel, 'Admin', logDetails);
    } else {
      addPosLog('create', userLabel, 'Admin', `Dodano nowy produkt: "${row.name}" (SKU: ${row.sku}, Cena: ${row.sell_price} PLN)`);
    }

    return result;
  }, [isSupabase, products, addPosLog, profile]);

  const deleteProduct = useCallback(async (productId) => {
    const prod = products.find(p => p.id === productId);
    if (isSupabase) {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));

    // Zapisz w logach
    if (prod) {
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('delete', userLabel, 'Admin', `Usunięto produkt ze sklepu: "${prod.name}" (SKU: ${prod.sku})`);
    }
  }, [isSupabase, products, addPosLog, profile]);

  const updateProductStock = useCallback(async (productId, change) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newQty = Math.max(0, (product.stock_qty || 0) + change);
    if (isSupabase) {
      await supabase.from('products').update({ stock_qty: newQty }).eq('id', productId);
    }
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: newQty } : p));

    // Zapisz w logach
    const userLabel = profile ? profile.full_name : 'System';
    addPosLog('stock', userLabel, 'Admin', `Korekta stanu magazynowego produktu "${product.name}": ${product.stock_qty} → ${newQty} szt. (${change > 0 ? '+' : ''}${change} szt.)`);
  }, [isSupabase, products, addPosLog, profile]);

  const saveWarehouseLocation = useCallback(async (locationData, existingId = null) => {
    const row = {
      sector: locationData.sector,
      rack: locationData.rack || null,
      shelf: locationData.shelf || null,
      description: locationData.description || null,
    };

    if (isSupabase) {
      if (existingId) {
        const { data, error } = await supabase.from('warehouse_locations').update(row).eq('id', existingId).select().single();
        if (error) throw error;
        setWarehouseLocations(prev => prev.map(l => l.id === existingId ? data : l));
        return data;
      } else {
        const { data, error } = await supabase.from('warehouse_locations').insert(row).select().single();
        if (error) throw error;
        setWarehouseLocations(prev => [...prev, data]);
        return data;
      }
    } else {
      const location = { ...row, id: existingId || crypto.randomUUID() };
      setWarehouseLocations(prev => {
        const next = existingId ? prev.map(l => l.id === existingId ? location : l) : [...prev, location];
        localStorage.setItem('warehouse_locations', JSON.stringify(next));
        return next;
      });
      return location;
    }
  }, [isSupabase]);

  const deleteWarehouseLocation = useCallback(async (locationId) => {
    if (isSupabase) {
      const { error } = await supabase.from('warehouse_locations').delete().eq('id', locationId);
      if (error) throw error;
    }
    setWarehouseLocations(prev => {
      const next = prev.filter(l => l.id !== locationId);
      if (!isSupabase) {
        localStorage.setItem('warehouse_locations', JSON.stringify(next));
      }
      return next;
    });
  }, [isSupabase]);

  // ── PRACOWNICY ────────────────────────────────────────────────────────────
  const saveEmployee = useCallback(async (empData, existingId = null) => {
    const roleMap = {
      'Administrator': 'admin',
      'Kierownik Zmiany': 'shift_manager',
      'Kierownik Sprzedaży': 'sales_manager',
      'Kierownik Magazynu': 'warehouse_manager',
      'Kierownik Serwisu': 'sanitation_manager',
      'Kasjer': 'cashier',
      'Magazynier': 'warehouse_worker',
      'Pracownik Sprzątający': 'cleaner'
    };

    const role = roleMap[empData.role] || empData.role;

    const row = {
      full_name: empData.name || empData.full_name,
      role: role,
      phone: empData.phone || null,
      email: empData.email || null,
      hired_at: empData.hired || empData.hired_at || null,
      hourly_rate: parseFloat(empData.hourly || empData.hourly_rate) || 0,
      is_active: empData.active ?? empData.is_active ?? true,
      pin: empData.pin || empData.demo_pin || null,
    };

    let norm;
    if (isSupabase) {
      if (existingId) {
        const { data, error } = await supabase
          .from('profiles')
          .upsert({ ...row, id: existingId }, { onConflict: 'id' })
          .select()
          .single();
        if (error) throw error;
        norm = { ...data, name: data.full_name, active: data.is_active, hired: data.hired_at, hourly: data.hourly_rate, pin: data.pin };
        setEmployees(prev => prev.map(e => e.id === existingId ? norm : e));
      } else {
        const { data, error } = await supabase.from('profiles').insert(row).select().single();
        if (error) throw error;
        norm = { ...data, name: data.full_name, active: data.is_active, hired: data.hired_at, hourly: data.hourly_rate, pin: data.pin };
        setEmployees(prev => [...prev, norm]);
      }
    } else {
      norm = { ...row, id: existingId || crypto.randomUUID(), name: row.full_name, demo_pin: row.pin, hired: row.hired_at, hourly: row.hourly_rate, active: row.is_active };
      if (existingId) setEmployees(prev => prev.map(e => e.id === existingId ? norm : e));
      else setEmployees(prev => [...prev, norm]);
    }

    // Zapisz log audytu
    const userLabel = profile ? profile.full_name : 'System';
    if (existingId) {
      addPosLog('update', userLabel, 'Admin', `Zaktualizowano dane pracownika: "${row.full_name}" (Rola: ${row.role})`);
    } else {
      addPosLog('create', userLabel, 'Admin', `Dodano nowego pracownika: "${row.full_name}" (Rola: ${row.role})`);
    }

    return norm;
  }, [isSupabase, employees, addPosLog, profile]);

  const deleteEmployee = useCallback(async (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (isSupabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', employeeId);
      if (error) throw error;
    }
    setEmployees(prev => prev.filter(e => e.id !== employeeId));

    // Zapisz log audytu
    if (emp) {
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('delete', userLabel, 'Admin', `Usunięto pracownika ze sklepu: "${emp.full_name || emp.name}"`);
    }
  }, [isSupabase, employees, addPosLog, profile]);

  const toggleEmployeeActive = useCallback(async (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    const newActive = !(emp.active ?? emp.is_active);
    if (isSupabase) {
      await supabase.from('profiles').update({ is_active: newActive }).eq('id', employeeId);
    }
    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, active: newActive, is_active: newActive } : e));

    // Zapisz log audytu
    const userLabel = profile ? profile.full_name : 'System';
    addPosLog('update', userLabel, 'Admin', `Zmieniono status aktywności pracownika "${emp.full_name || emp.name}": ${newActive ? 'Aktywny' : 'Zablokowany'}`);
  }, [isSupabase, employees, addPosLog, profile]);

  const clockInOutEmployee = useCallback(async (pin) => {
    if (!isSupabase) {
      throw new Error("Funkcja dostępna tylko w trybie Supabase");
    }

    // 1. Znajdź pracownika bezpośrednio w Supabase (bardziej niezawodne niż stan lokalny)
    const cleanedPin = String(pin).trim();
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('pin', cleanedPin)
      .eq('is_active', true)
      .single();

    if (profileErr || !profile) {
      throw new Error("Nieprawidłowy kod PIN lub pracownik nieaktywny");
    }

    const employee = { ...profile, name: profile.full_name, active: profile.is_active };

    // 2. Sprawdź czy ma otwartą sesję (clock_out IS NULL)
    const { data: openEntries, error: fetchErr } = await supabase
      .from('time_entries')
      .select('*')
      .eq('profile_id', employee.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false });

    if (fetchErr) throw fetchErr;

    const now = new Date().toISOString();

    if (openEntries && openEntries.length > 0) {
      // 3a. Wyjście (Clock Out)
      const entryId = openEntries[0].id;
      const { data: updated, error: updateErr } = await supabase
        .from('time_entries')
        .update({ clock_out: now })
        .eq('id', entryId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setAttendance(prev => prev.map(a => a.id === entryId ? updated : a));
      return { employee, type: 'clock_out', entry: updated };
    } else {
      // 3b. Wejście (Clock In)
      const { data: inserted, error: insertErr } = await supabase
        .from('time_entries')
        .insert({
          profile_id: employee.id,
          clock_in: now
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setAttendance(prev => [inserted, ...prev]);
      return { employee, type: 'clock_in', entry: inserted };
    }
  }, [isSupabase, employees]);

  // ── DOKUMENTY ─────────────────────────────────────────────────────────────
  const saveDocument = useCallback(async (docData) => {
    // Walidacja UUID dla issued_by (Supabase wymaga poprawnego formatu)
    const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
    const issuedBy = isValidUUID(docData.issued_by) ? docData.issued_by : null;

    const row = {
      document_number: docData.id,
      type: docData.type,
      status: 'issued',
      buyer_name: docData.buyer?.name || docData.customer || null,
      buyer_nip: docData.buyer?.nip || null,
      buyer_address: docData.buyer?.address || null,
      net_amount: docData.items ? docData.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price_net) || 0), 0) : 0,
      vat_amount: Math.max(0, (parseFloat(docData.total) || 0) - (docData.items ? docData.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price_net) || 0), 0) : 0)),
      gross_amount: parseFloat(docData.total) || 0,
      items: docData.items || [],
      issue_date: docData.date_issue || docData.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      sale_date: docData.date_sale || docData.date?.split('T')[0] || null,
      due_date: docData.date_due || null,
      issued_by: issuedBy,
      note: docData.payment_method || docData.note || null,
    };

    if (isSupabase) {
      const { data, error } = await supabase.from('documents').insert(row).select().single();
      if (error) {
        console.error('Supabase saveDocument error:', error);
        throw error;
      }
      const formatted = { ...docData, _db_id: data.id };
      setDocuments(prev => [formatted, ...prev]);
      return data;
    } else {
      setDocuments(prev => [docData, ...prev]);
      return docData;
    }
  }, [isSupabase]);

  // ── TRANSAKCJE ────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (transaction) => {
    const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
    const sellerId = isValidUUID(transaction.seller_id) ? transaction.seller_id : null;
    const customerId = isValidUUID(transaction.customer_id) ? transaction.customer_id : null;

    if (isSupabase) {
      const row = {
        transaction_number: transaction.id || `TXN-${Date.now()}`,
        type: transaction.type || 'sale',
        status: transaction.status || 'completed',
        customer_id: customerId,
        seller_id: sellerId,
        total: parseFloat(transaction.total) || 0,
        note: JSON.stringify({ items: transaction.items || [], payments: transaction.payments || [] }),
      };
      const { data, error } = await supabase.from('transactions').insert(row).select().single();
      if (error) {
        console.error('Supabase transaction error:', error);
      } else {
        const normalized = {
          ...data,
          items: transaction.items || [],
          payments: transaction.payments || []
        };
        setTransactions(prev => [normalized, ...prev]);
      }
    } else {
      setTransactions(prev => [transaction, ...prev]);
    }
  }, [isSupabase]);

  // ── KLIENCI ───────────────────────────────────────────────────────────────
  const saveCustomer = useCallback(async (custData, existingId = null) => {
    const row = {
      type: custData.type || 'person',
      name: custData.name,
      company_name: custData.company_name || null,
      nip: custData.nip || null,
      phone: custData.phone || null,
      email: custData.email || null,
      price_group: custData.price_group || 'regular',
      credit_limit: parseFloat(custData.credit_limit) || 0,
    };

    let result;
    if (isSupabase) {
      if (existingId) {
        const { data, error } = await supabase.from('customers').update(row).eq('id', existingId).select().single();
        if (error) throw error;
        setCustomers(prev => prev.map(c => c.id === existingId ? data : c));
        result = data;
      } else {
        const { data, error } = await supabase.from('customers').insert(row).select().single();
        if (error) throw error;
        setCustomers(prev => [...prev, data]);
        result = data;
      }
    } else {
      const cust = { ...row, id: existingId || crypto.randomUUID() };
      if (existingId) setCustomers(prev => prev.map(c => c.id === existingId ? cust : c));
      else setCustomers(prev => [...prev, cust]);
      result = cust;
    }

    // Zapisz log audytu
    const userLabel = profile ? profile.full_name : 'System';
    if (existingId) {
      addPosLog('update', userLabel, 'Admin', `Zaktualizowano dane klienta: "${row.name || row.company_name}" (Grupa: ${row.price_group})`);
    } else {
      addPosLog('create', userLabel, 'Admin', `Dodano nowego klienta do bazy: "${row.name || row.company_name}" (NIP: ${row.nip || 'Brak'})`);
    }

    return result;
  }, [isSupabase, addPosLog, profile]);

  const deleteCustomer = useCallback(async (customerId) => {
    const cust = customers.find(c => c.id === customerId);
    if (isSupabase) {
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      if (error) throw error;
    }
    setCustomers(prev => prev.filter(c => c.id !== customerId));

    // Zapisz log audytu
    if (cust) {
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('delete', userLabel, 'Admin', `Usunięto klienta z bazy danych: "${cust.name || cust.company_name}"`);
    }
  }, [isSupabase, customers, addPosLog, profile]);

  // ── INWENTARYZACJE (INVENTORIES) ──────────────────────────────────────────
  const saveInventory = useCallback(async (invData) => {
    // Mapuj status do bazy danych
    const dbStatus = invData.status === 'assigned' ? 'planned' : invData.status;

    // Jeżeli assigned_to jest mock-wartością 'emp-1', 'emp-2', itp., lub nieprawidłowym UUID, zastąpimy poprawnym UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    let correctEmpId = null;
    if (invData.assigned_to && uuidRegex.test(invData.assigned_to)) {
      correctEmpId = invData.assigned_to;
    } else if (invData.assigned_to) {
      const mockToRealMap = {
        'emp-1': '11111111-1111-1111-1111-111111111111',
        'emp-2': '22222222-2222-2222-2222-222222222222',
        'emp-3': '33333333-3333-3333-3333-333333333333'
      };
      correctEmpId = mockToRealMap[invData.assigned_to] || null;
    }

    const row = {
      id: invData.id,
      inventory_number: invData.number,
      type: invData.type,
      status: dbStatus,
      scope: invData.scope,
      is_blind: invData.blind,
      created_by: correctEmpId,
      created_at: invData.date ? new Date(invData.date).toISOString() : new Date().toISOString()
    };

    if (isSupabase) {
      try {
        const { error: invErr } = await supabase
          .from('inventories')
          .upsert(row, { onConflict: 'id' });
        if (invErr) throw invErr;

        if (invData.items && Array.isArray(invData.items)) {
          const { error: delErr } = await supabase
            .from('inventory_items')
            .delete()
            .eq('inventory_id', invData.id);
          if (delErr) throw delErr;

          const itemsToInsert = invData.items.map(item => {
            let pid = item.product_id;
            if (!pid && item.sku) {
              const matchedProd = products.find(p => p.sku === item.sku);
              pid = matchedProd ? matchedProd.id : null;
            }
            return {
              inventory_id: invData.id,
              product_id: pid,
              system_qty: item.system_qty !== undefined && item.system_qty !== null ? parseFloat(item.system_qty) : 0,
              counted_qty: item.counted_qty !== undefined && item.counted_qty !== null ? parseFloat(item.counted_qty) : null
            };
          }).filter(item => item.product_id);

          if (itemsToInsert.length > 0) {
            const { error: insErr } = await supabase
              .from('inventory_items')
              .insert(itemsToInsert);
            if (insErr) throw insErr;
          }
        } else {
          const itemsToInsert = products.map(p => ({
            inventory_id: invData.id,
            product_id: p.id,
            system_qty: p.stock_qty || 0,
            counted_qty: null
          }));

          if (itemsToInsert.length > 0) {
            const { error: insErr } = await supabase
              .from('inventory_items')
              .insert(itemsToInsert);
            if (insErr) throw insErr;
          }
        }
      } catch (err) {
        console.error('Błąd zapisu inwentaryzacji w bazie danych:', err.message);
      }
    }

    setInventories(prev => {
      const emp = employees.find(e => e.id === (correctEmpId || invData.assigned_to));
      const itemsList = invData.items && Array.isArray(invData.items) ? invData.items : products.map(p => ({
        sku: p.sku,
        name: p.name,
        product_id: p.id,
        system_qty: p.stock_qty || 0,
        counted_qty: null
      }));

      const countedItems = itemsList.filter(i => i.counted_qty !== null);
      const diffSum = countedItems.reduce((sum, i) => sum + (i.counted_qty - i.system_qty), 0);

      const assignedToId = correctEmpId || invData.assigned_to || null;
      let normStatus = invData.status;
      if (invData.status === 'planned' || invData.status === 'assigned') {
        normStatus = assignedToId ? 'assigned' : 'planned';
      }

      const normalized = {
        ...invData,
        status: normStatus,
        assigned_to: assignedToId,
        items: itemsList,
        count: countedItems.length,
        diff: diffSum,
        date: invData.date || new Date().toISOString().split('T')[0],
        assigned_name: emp ? emp.name : 'Nieprzypisany'
      };

      const exists = prev.some(i => i.id === invData.id);
      const prevInv = prev.find(i => i.id === invData.id);

      // Zapisz w logach audytu
      const userLabel = profile ? profile.full_name : 'System';
      if (!exists) {
        addPosLog('create', userLabel, 'Admin', `Utworzono nowe zlecenie inwentaryzacji #${invData.number} (Typ: ${invData.type === 'full' ? 'Pełna' : 'Częściowa'})`);
      } else if (prevInv) {
        if (prevInv.status !== normalized.status) {
          if (normalized.status === 'assigned') {
            addPosLog('update', userLabel, 'Admin', `Zlecono inwentaryzację #${invData.number} pracownikowi: "${normalized.assigned_name}"`);
          } else if (normalized.status === 'completed') {
            const completedBy = normalized.assigned_name !== 'Nieprzypisany' ? normalized.assigned_name : userLabel;
            addPosLog('update', completedBy, 'Mobile', `Zakończono inwentaryzację #${invData.number} (Przeliczono pozycji: ${normalized.count}, Różnica: ${normalized.diff} szt.)`);
          }
        }
      }

      const next = exists
        ? prev.map(i => i.id === invData.id ? normalized : i)
        : [normalized, ...prev];

      localStorage.setItem('store_inventories', JSON.stringify(next));
      return next;
    });
  }, [isSupabase, products, employees, addPosLog, profile]);

  // ── GRAFIK (SCHEDULES) ────────────────────────────────────────────────────
  const saveSchedule = useCallback(async (schedData) => {
    const row = {
      profile_id: schedData.profile_id,
      date: schedData.date,
      shift_start: schedData.startTime,
      shift_end: schedData.endTime,
      is_confirmed: schedData.is_confirmed || false,
      note: schedData.note || null
    };

    if (isSupabase) {
      try {
        if (schedData.id && typeof schedData.id === 'string' && schedData.id.length > 10) {
          const { data, error } = await supabase.from('schedules').update(row).eq('id', schedData.id).select().single();
          if (error) throw error;
          const mapped = {
            id: data.id,
            profile_id: data.profile_id,
            date: data.date,
            startTime: data.shift_start ? data.shift_start.slice(0, 5) : '08:00',
            endTime: data.shift_end ? data.shift_end.slice(0, 5) : '16:00',
            is_confirmed: data.is_confirmed,
            note: data.note
          };
          setSchedules(prev => prev.map(s => s.id === schedData.id ? mapped : s));
        } else {
          const { data, error } = await supabase.from('schedules').insert(row).select().single();
          if (error) throw error;
          const mapped = {
            id: data.id,
            profile_id: data.profile_id,
            date: data.date,
            startTime: data.shift_start ? data.shift_start.slice(0, 5) : '08:00',
            endTime: data.shift_end ? data.shift_end.slice(0, 5) : '16:00',
            is_confirmed: data.is_confirmed,
            note: data.note
          };
          setSchedules(prev => [...prev, mapped]);
        }
      } catch (err) {
        console.error('Failed to save schedule to Supabase:', err);
      }
    } else {
      const offlineId = schedData.id || String(Date.now());
      const newSched = { ...schedData, id: offlineId };
      setSchedules(prev => {
        const next = schedData.id ? prev.map(s => s.id === schedData.id ? newSched : s) : [...prev, newSched];
        localStorage.setItem('work_schedules', JSON.stringify(next));
        return next;
      });
    }

    // Zapisz w logach audytu
    const emp = employees.find(e => e.id === schedData.profile_id);
    const empName = emp ? emp.full_name || emp.name : 'nieznanego pracownika';
    const userLabel = profile ? profile.full_name : 'System';
    if (schedData.id) {
      addPosLog('update', userLabel, 'Admin', `Zaktualizowano grafik dla pracownika "${empName}" na dzień ${schedData.date}: godziny ${schedData.startTime}-${schedData.endTime}`);
    } else {
      addPosLog('create', userLabel, 'Admin', `Dodano nową zmianę w grafiku dla pracownika "${empName}" na dzień ${schedData.date} w godzinach ${schedData.startTime}-${schedData.endTime}`);
    }
  }, [isSupabase, employees, addPosLog, profile]);

  const deleteSchedule = useCallback(async (schedId) => {
    const sched = schedules.find(s => s.id === schedId);
    if (isSupabase) {
      try {
        if (typeof schedId === 'string' && schedId.length > 10) {
          const { error } = await supabase.from('schedules').delete().eq('id', schedId);
          if (error) throw error;
        }
      } catch (err) {
        console.error('Failed to delete schedule from Supabase:', err);
      }
    }
    setSchedules(prev => {
      const next = prev.filter(s => s.id !== schedId);
      localStorage.setItem('work_schedules', JSON.stringify(next));
      return next;
    });

    // Zapisz w logach
    if (sched) {
      const emp = employees.find(e => e.id === sched.profile_id);
      const empName = emp ? emp.full_name || emp.name : 'pracownika';
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('delete', userLabel, 'Admin', `Usunięto zmianę w grafiku dla pracownika "${empName}" na dzień ${sched.date}`);
    }
  }, [isSupabase, schedules, employees, addPosLog, profile]);

  // ── Stare funkcje (zachowane dla kompatybilności) ─────────────────────────
  const addDocument = saveDocument;

  const value = {
    products, customers, suppliers, employees, transactions, documents, inventories,
    loading, priceGroups: PRICE_GROUPS, categories, shopSettings, updateShopSettings, updateRolePermissions,
    // Helpers (read-only)
    findProduct, findProductByBarcode, getCrossSellProducts,
    getCustomerDiscount, getLowStockProducts,
    // Supabase-backed mutations
    saveProduct, deleteProduct, updateProductStock,
    saveEmployee, deleteEmployee, toggleEmployeeActive, clockInOutEmployee,
    saveDocument, addDocument,
    saveCustomer, deleteCustomer,
    saveInventory,
    addTransaction,
    // Attendance state
    attendance,
    // Legacy setters (demo mode / inne widoki)
    setProducts, setCategories, setCustomers, setSuppliers, setEmployees, setTransactions,
    refreshData: loadData,
    isSupabase,
    posSession, updatePosSession, clearPosSession, logoutPosUser,
    mobileSession, updateMobileSession, clearMobileSession, logoutMobileUser,
    posLogs, setPosLogs, addPosLog,
    schedules, setSchedules, saveSchedule, deleteSchedule,
    warehouseLocations, setWarehouseLocations, saveWarehouseLocation, deleteWarehouseLocation
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export default StoreContext;
