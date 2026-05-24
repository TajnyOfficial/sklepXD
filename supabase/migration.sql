-- ═══════════════════════════════════════════════════════════════
-- SKLEP POS — PostgreSQL / Supabase Migration
-- Pełny schemat bazy danych dla systemu zarządzania sklepem
-- ═══════════════════════════════════════════════════════════════
-- Uruchom w Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────
-- 0. ROZSZERZENIA
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- 1. TYPY WYLICZENIOWE (ENUM)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'admin', 'shift_manager', 'sales_manager', 'warehouse_manager',
  'sanitation_manager', 'cashier', 'warehouse_worker', 'cleaner'
);

CREATE TYPE customer_type AS ENUM ('person', 'company');

CREATE TYPE price_group AS ENUM ('regular', 'loyal', 'contractor', 'wholesale');

CREATE TYPE transaction_type AS ENUM ('sale', 'return', 'exchange', 'reservation');

CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'parked', 'partial');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'credit', 'mixed');

CREATE TYPE order_status AS ENUM ('new', 'unpaid', 'picking', 'ready', 'issued', 'partial', 'cancelled');

CREATE TYPE order_type AS ENUM ('click_collect', 'reservation', 'phone', 'manual');

CREATE TYPE return_status AS ENUM ('pending', 'approved', 'completed', 'rejected');

CREATE TYPE quarantine_type AS ENUM ('shelf', 'service', 'scrap');

CREATE TYPE delivery_status AS ENUM ('expected', 'checking', 'received', 'rejected');

CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');

CREATE TYPE inventory_type AS ENUM ('full', 'partial', 'cyclic');

CREATE TYPE inventory_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TYPE document_type AS ENUM ('receipt', 'invoice', 'proforma', 'correction', 'wz', 'kp', 'kw');

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'unpaid', 'overdue', 'cancelled');

CREATE TYPE expense_category AS ENUM ('supply', 'fixed', 'marketing', 'service', 'salary', 'tax', 'other');

CREATE TYPE absence_type AS ENUM ('vacation', 'sick_leave', 'on_demand', 'personal', 'other');

CREATE TYPE absence_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'normal', 'low');

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TYPE announcement_priority AS ENUM ('high', 'normal', 'low');

CREATE TYPE cash_operation_type AS ENUM ('open', 'sale', 'deposit', 'withdrawal', 'close', 'correction');

CREATE TYPE audit_action_type AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'approval', 'security');


-- ─────────────────────────────────────────────────────────────
-- 2. TABELE — PROFIL UŻYTKOWNIKA I SKLEP
-- ─────────────────────────────────────────────────────────────

-- Profil pracownika (powiązany z auth.users)
CREATE TABLE profiles (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'cashier',
  pin           TEXT,  -- 4-cyfrowy PIN do logowania POS
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  hired_at      DATE,
  hourly_rate   NUMERIC(10,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 0,  -- % prowizji indywidualnej
  system_login    TEXT,
  system_password TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE UNIQUE INDEX idx_profiles_pin ON profiles(pin) WHERE pin IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);

-- Cyfrowe akta osobowe
CREATE TABLE employee_files (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  document_type   TEXT DEFAULT 'other',
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employee_files_profile ON employee_files(profile_id);

-- Ustawienia sklepu
CREATE TABLE store_settings (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_name      TEXT NOT NULL DEFAULT 'Sklep',
  nip             TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  bank_account    TEXT,
  logo_url        TEXT,
  default_vat_rate NUMERIC(5,2) DEFAULT 23,
  currency        TEXT DEFAULT 'PLN',
  settings_json   JSONB DEFAULT '{}',  -- dodatkowe ustawienia
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stawki VAT
CREATE TABLE vat_rates (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  rate        NUMERIC(5,2) NOT NULL,
  fiscal_code TEXT,  -- Kod fiskalny: A, B, C, D
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 3. TABELE — KATALOG PRODUKTÓW
-- ─────────────────────────────────────────────────────────────

-- Kategorie (hierarchia)
CREATE TABLE categories (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  icon        TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Produkty
CREATE TABLE products (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  sku             TEXT NOT NULL UNIQUE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  description     TEXT,
  unit            TEXT DEFAULT 'szt',  -- szt, kg, m, m², L, op, kpl, usł
  
  -- Ceny
  purchase_price  NUMERIC(12,2) DEFAULT 0,
  sell_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate_id     UUID REFERENCES vat_rates(id),
  
  -- Stany magazynowe
  stock_qty       NUMERIC(12,3) DEFAULT 0,
  reserved_qty    NUMERIC(12,3) DEFAULT 0,
  min_stock       NUMERIC(12,3) DEFAULT 0,
  max_stock       NUMERIC(12,3) DEFAULT 0,
  
  -- Lokalizacja magazynowa
  location_id     UUID,  -- FK do warehouse_locations
  
  -- Kody kreskowe (wiele kodów na produkt)
  barcodes        TEXT[] DEFAULT '{}',
  
  -- Warianty i atrybuty
  attributes      JSONB DEFAULT '{}',  -- {"kolor": "biały", "pojemność": "10L"}
  
  -- Media
  image_url       TEXT,
  images          TEXT[] DEFAULT '{}',
  
  -- Metadane
  is_active       BOOLEAN DEFAULT TRUE,
  is_service      BOOLEAN DEFAULT FALSE,  -- usługa (brak stanu magazynowego)
  weight_kg       NUMERIC(10,3),
  dimensions_cm   JSONB,  -- {"length": 10, "width": 5, "height": 3}
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products USING gin (to_tsvector('simple', name));
CREATE INDEX idx_products_barcodes ON products USING gin (barcodes);
CREATE INDEX idx_products_low_stock ON products(stock_qty, min_stock) WHERE min_stock > 0;

-- Cross-sell / Produkty powiązane
CREATE TABLE product_cross_sell (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type   TEXT DEFAULT 'cross_sell',  -- cross_sell, substitute, accessory
  sort_order      INTEGER DEFAULT 0,
  UNIQUE(product_id, related_id)
);

-- Cenniki dedykowane (grupy cenowe)
CREATE TABLE price_overrides (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_group   price_group NOT NULL,
  sell_price    NUMERIC(12,2) NOT NULL,
  valid_from    DATE,
  valid_to      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_overrides ON price_overrides(product_id, price_group);

-- Etykiety / Tagi produktów
CREATE TABLE product_tags (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  UNIQUE(product_id, tag)
);


-- ─────────────────────────────────────────────────────────────
-- 4. TABELE — MAGAZYN
-- ─────────────────────────────────────────────────────────────

-- Lokalizacje magazynowe (sektor / regał / półka)
CREATE TABLE warehouse_locations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sector      TEXT NOT NULL,
  rack        TEXT,
  shelf       TEXT,
  description TEXT,
  capacity    INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_sector ON warehouse_locations(sector);

-- Ruchy magazynowe (historia zmian stanu)
CREATE TABLE stock_movements (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,  -- 'sale', 'delivery', 'return', 'adjustment', 'transfer', 'inventory'
  qty_change    NUMERIC(12,3) NOT NULL,  -- dodatnia = przyjęcie, ujemna = wydanie
  qty_before    NUMERIC(12,3) NOT NULL,
  qty_after     NUMERIC(12,3) NOT NULL,
  reference_id  UUID,         -- ID transakcji, dostawy, przesunięcia itp.
  reference_type TEXT,        -- 'transaction', 'delivery', 'transfer', 'inventory'
  note          TEXT,
  user_id       UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);

-- Przesunięcia międzymagazynowe (MM)
CREATE TABLE stock_transfers (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transfer_number TEXT NOT NULL UNIQUE,
  from_location   UUID REFERENCES warehouse_locations(id),
  to_location     UUID REFERENCES warehouse_locations(id),
  status          transfer_status DEFAULT 'pending',
  items           JSONB NOT NULL DEFAULT '[]',  -- [{product_id, qty, note}]
  note            TEXT,
  created_by      UUID REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 5. TABELE — KONTRAHENCI (KLIENCI I DOSTAWCY)
-- ─────────────────────────────────────────────────────────────

-- Klienci
CREATE TABLE customers (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type            customer_type NOT NULL DEFAULT 'person',
  name            TEXT NOT NULL,        -- wyświetlana nazwa
  company_name    TEXT,
  nip             TEXT,
  regon           TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  postal_code     TEXT,
  
  -- Cennik i kredyt
  price_group     price_group DEFAULT 'regular',
  credit_limit    NUMERIC(12,2) DEFAULT 0,
  credit_used     NUMERIC(12,2) DEFAULT 0,
  
  -- Marketing / RODO
  marketing_consent   BOOLEAN DEFAULT FALSE,
  consent_date        DATE,
  
  note            TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_nip ON customers(nip) WHERE nip IS NOT NULL;
CREATE INDEX idx_customers_name ON customers USING gin (to_tsvector('simple', name));
CREATE INDEX idx_customers_phone ON customers(phone);

-- Dostawcy
CREATE TABLE suppliers (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  nip             TEXT,
  address         TEXT,
  city            TEXT,
  postal_code     TEXT,
  
  -- Kontakt
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  
  -- Ocena
  rating          NUMERIC(3,1) DEFAULT 0,  -- 0-5
  delivery_days   INTEGER DEFAULT 0,       -- średni czas dostawy w dniach
  payment_terms   INTEGER DEFAULT 14,      -- termin płatności w dniach
  
  -- Harmonogram dostaw
  delivery_schedule JSONB DEFAULT '{}',  -- {"days": [1,3], "time": "08:00-10:00"}
  
  bank_account    TEXT,
  note            TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_nip ON suppliers(nip) WHERE nip IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 6. TABELE — SPRZEDAŻ I TRANSAKCJE
-- ─────────────────────────────────────────────────────────────

-- Transakcje (główna tabela sprzedaży)
CREATE TABLE transactions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  type            transaction_type NOT NULL DEFAULT 'sale',
  status          transaction_status NOT NULL DEFAULT 'pending',
  
  -- Powiązania
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  seller_id       UUID REFERENCES profiles(id),
  
  -- Kwoty
  subtotal        NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  vat_amount      NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Metadane
  note            TEXT,
  parked_at       TIMESTAMPTZ,  -- zaparkowany paragon
  parked_by       UUID REFERENCES profiles(id),
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);

-- Pozycje transakcji
CREATE TABLE transaction_items (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  
  product_name    TEXT NOT NULL,  -- kopia nazwy (na wypadek usunięcia produktu)
  product_sku     TEXT,
  qty             NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit            TEXT DEFAULT 'szt',
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  vat_rate        NUMERIC(5,2) DEFAULT 23,
  line_total      NUMERIC(12,2) NOT NULL,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transaction_items_txn ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);

-- Płatności
CREATE TABLE payments (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  method          payment_method NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  change_amount   NUMERIC(12,2) DEFAULT 0,  -- reszta (gotówka)
  reference       TEXT,  -- nr terminala, nr przelewu
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_txn ON payments(transaction_id);


-- ─────────────────────────────────────────────────────────────
-- 7. TABELE — ZAMÓWIENIA I REZERWACJE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number    TEXT NOT NULL UNIQUE,
  type            order_type NOT NULL DEFAULT 'manual',
  status          order_status NOT NULL DEFAULT 'new',
  
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  seller_id       UUID REFERENCES profiles(id),
  
  items           JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC(12,2) DEFAULT 0,
  
  -- Rezerwacja
  deposit_amount  NUMERIC(12,2) DEFAULT 0,
  pickup_date     DATE,
  expires_at      TIMESTAMPTZ,
  
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_pickup ON orders(pickup_date);


-- ─────────────────────────────────────────────────────────────
-- 8. TABELE — ZWROTY I RMA
-- ─────────────────────────────────────────────────────────────

CREATE TABLE returns (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  return_number   TEXT NOT NULL UNIQUE,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  status          return_status DEFAULT 'pending',
  quarantine      quarantine_type DEFAULT 'shelf',
  
  items           JSONB NOT NULL DEFAULT '[]',
  total_amount    NUMERIC(12,2) DEFAULT 0,
  reason          TEXT,
  note            TEXT,
  
  approved_by     UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_transaction ON returns(transaction_id);


-- ─────────────────────────────────────────────────────────────
-- 9. TABELE — DOSTAWY (PZ)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE deliveries (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  delivery_number TEXT NOT NULL UNIQUE,  -- PZ/2026/03/001
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  
  status          delivery_status DEFAULT 'expected',
  expected_date   DATE,
  received_date   DATE,
  
  -- Pozycje
  items           JSONB NOT NULL DEFAULT '[]',
  -- [{product_id, product_name, expected_qty, received_qty, unit_price, note}]
  
  total_value     NUMERIC(12,2) DEFAULT 0,
  has_discrepancy BOOLEAN DEFAULT FALSE,
  discrepancy_note TEXT,
  
  -- Dokumenty
  supplier_invoice TEXT,  -- nr faktury dostawcy
  
  received_by     UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_supplier ON deliveries(supplier_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_date ON deliveries(expected_date);


-- ─────────────────────────────────────────────────────────────
-- 10. TABELE — INWENTARYZACJA
-- ─────────────────────────────────────────────────────────────

CREATE TABLE inventories (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_number TEXT NOT NULL UNIQUE,
  type            inventory_type NOT NULL DEFAULT 'partial',
  status          inventory_status DEFAULT 'planned',
  scope           TEXT,  -- opis zakresu (np. "Elektronarzędzia")
  
  is_blind        BOOLEAN DEFAULT FALSE,  -- tryb ślepy (bez widoku stanów systemowych)
  
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pozycje inwentaryzacji
CREATE TABLE inventory_items (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_id    UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  system_qty      NUMERIC(12,3) NOT NULL,  -- stan systemowy na moment inwentaryzacji
  counted_qty     NUMERIC(12,3),           -- stan przeliczony
  difference      NUMERIC(12,3) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  
  counted_by      UUID REFERENCES profiles(id),
  counted_at      TIMESTAMPTZ,
  note            TEXT
);

CREATE INDEX idx_inventory_items ON inventory_items(inventory_id);


-- ─────────────────────────────────────────────────────────────
-- 11. TABELE — DOKUMENTY SPRZEDAŻOWE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_number TEXT NOT NULL UNIQUE,
  type            document_type NOT NULL,
  status          invoice_status DEFAULT 'issued',
  
  -- Powiązania
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Kwoty
  net_amount      NUMERIC(12,2) DEFAULT 0,
  vat_amount      NUMERIC(12,2) DEFAULT 0,
  gross_amount    NUMERIC(12,2) DEFAULT 0,
  
  -- Terminy
  issue_date      DATE DEFAULT CURRENT_DATE,
  sale_date       DATE,
  due_date        DATE,
  paid_date       DATE,
  
  -- Dane nabywcy (kopia, RODO)
  buyer_name      TEXT,
  buyer_nip       TEXT,
  buyer_address   TEXT,
  
  -- Pozycje
  items           JSONB DEFAULT '[]',
  
  -- Metadane
  issued_by       UUID REFERENCES profiles(id),
  note            TEXT,
  pdf_url         TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_date ON documents(issue_date DESC);
CREATE INDEX idx_documents_status ON documents(status);


-- ─────────────────────────────────────────────────────────────
-- 12. TABELE — FINANSE
-- ─────────────────────────────────────────────────────────────

-- Koszty / Wydatki
CREATE TABLE expenses (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category        expense_category NOT NULL DEFAULT 'other',
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  
  description     TEXT NOT NULL,
  net_amount      NUMERIC(12,2) NOT NULL,
  vat_amount      NUMERIC(12,2) DEFAULT 0,
  gross_amount    NUMERIC(12,2) NOT NULL,
  
  invoice_number  TEXT,
  invoice_date    DATE,
  due_date        DATE,
  is_paid         BOOLEAN DEFAULT FALSE,
  paid_date       DATE,
  
  receipt_url     TEXT,  -- skan / zdjęcie OCR
  
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(invoice_date DESC);
CREATE INDEX idx_expenses_paid ON expenses(is_paid);

-- Operacje kasowe (szuflada)
CREATE TABLE cash_operations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type            cash_operation_type NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,  -- dodatnia = wpłata, ujemna = wypłata
  balance_after   NUMERIC(12,2),
  
  reference_id    UUID,     -- powiązanie z transakcją
  reference_type  TEXT,     -- 'transaction', 'manual'
  
  note            TEXT,
  user_id         UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_ops_date ON cash_operations(created_at DESC);
CREATE INDEX idx_cash_ops_type ON cash_operations(type);

-- Raporty kasowe (X/Z)
CREATE TABLE cash_reports (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_type     TEXT NOT NULL,  -- 'X' lub 'Z'
  report_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  
  opening_balance NUMERIC(12,2) DEFAULT 0,
  closing_balance NUMERIC(12,2) DEFAULT 0,
  physical_count  NUMERIC(12,2),
  difference      NUMERIC(12,2),
  
  total_sales_cash     NUMERIC(12,2) DEFAULT 0,
  total_sales_card     NUMERIC(12,2) DEFAULT 0,
  total_sales_transfer NUMERIC(12,2) DEFAULT 0,
  total_deposits       NUMERIC(12,2) DEFAULT 0,
  total_withdrawals    NUMERIC(12,2) DEFAULT 0,
  
  transaction_count    INTEGER DEFAULT 0,
  
  generated_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 13. TABELE — HR / KADRY
-- ─────────────────────────────────────────────────────────────

-- Ewidencja czasu pracy
CREATE TABLE time_entries (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  clock_in        TIMESTAMPTZ NOT NULL,
  clock_out       TIMESTAMPTZ,
  
  break_minutes   INTEGER DEFAULT 0,
  
  total_minutes   INTEGER GENERATED ALWAYS AS (
    CASE WHEN clock_out IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (clock_out - clock_in))::INTEGER / 60 - break_minutes
      ELSE NULL 
    END
  ) STORED,
  
  is_overtime     BOOLEAN DEFAULT FALSE,
  note            TEXT,
  
  corrected_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_profile ON time_entries(profile_id, clock_in DESC);

-- Grafik zmian
CREATE TABLE schedules (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  date            DATE NOT NULL,
  shift_start     TIME NOT NULL,
  shift_end       TIME NOT NULL,
  
  is_confirmed    BOOLEAN DEFAULT FALSE,
  note            TEXT,
  
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_profile ON schedules(profile_id, date);

-- Nieobecności
CREATE TABLE absences (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  type            absence_type NOT NULL,
  status          absence_status DEFAULT 'pending',
  
  date_from       DATE NOT NULL,
  date_to         DATE NOT NULL,
  days_count      INTEGER NOT NULL DEFAULT 1,
  
  note            TEXT,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_absences_profile ON absences(profile_id);
CREATE INDEX idx_absences_status ON absences(status);
CREATE INDEX idx_absences_dates ON absences(date_from, date_to);

-- Prowizje
CREATE TABLE commissions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  total_sales     NUMERIC(12,2) DEFAULT 0,
  individual_rate NUMERIC(5,2) DEFAULT 3,   -- % prowizji indywidualnej
  individual_amount NUMERIC(12,2) DEFAULT 0,
  team_bonus      NUMERIC(12,2) DEFAULT 0,
  category_bonus  NUMERIC(12,2) DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0,
  
  is_paid         BOOLEAN DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_profile ON commissions(profile_id, period_start DESC);


-- ─────────────────────────────────────────────────────────────
-- 14. TABELE — KOMUNIKACJA
-- ─────────────────────────────────────────────────────────────

-- Ogłoszenia (Tablica ogłoszeń)
CREATE TABLE announcements (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  priority        announcement_priority DEFAULT 'normal',
  
  author_id       UUID REFERENCES profiles(id),
  
  is_pinned       BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_date ON announcements(created_at DESC);

-- Zadania
CREATE TABLE tasks (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        task_priority DEFAULT 'normal',
  status          task_status DEFAULT 'pending',
  
  assigned_to     UUID REFERENCES profiles(id),
  assigned_by     UUID REFERENCES profiles(id),
  
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  
  requires_photo  BOOLEAN DEFAULT FALSE,
  photo_url       TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_at);


-- ─────────────────────────────────────────────────────────────
-- 15. TABELE — AUDIT LOG
-- ─────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action          audit_action_type NOT NULL,
  entity_type     TEXT NOT NULL,  -- 'product', 'transaction', 'customer', etc.
  entity_id       UUID,
  
  description     TEXT NOT NULL,
  details         JSONB DEFAULT '{}',  -- stara/nowa wartość
  
  user_id         UUID REFERENCES profiles(id),
  user_name       TEXT,  -- kopia (na wypadek usunięcia użytkownika)
  ip_address      TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);


-- ─────────────────────────────────────────────────────────────
-- 16. TABELE — SESJE I BEZPIECZEŃSTWO
-- ─────────────────────────────────────────────────────────────

CREATE TABLE user_sessions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  ip_address      TEXT,
  user_agent      TEXT,
  
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  last_activity   TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sessions_profile ON user_sessions(profile_id, is_active);

-- Zgody RODO
CREATE TABLE gdpr_consents (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
  consent_type    TEXT NOT NULL,  -- 'marketing_email', 'marketing_sms', 'data_processing'
  is_granted      BOOLEAN DEFAULT FALSE,
  granted_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 17. FUNKCJE POMOCNICZE
-- ─────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers dla updated_at
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generuj numer dokumentu
CREATE OR REPLACE FUNCTION generate_doc_number(prefix TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  yr TEXT := TO_CHAR(NOW(), 'YYYY');
  mn TEXT := TO_CHAR(NOW(), 'MM');
  seq INTEGER;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) + 1 FROM %I WHERE created_at >= date_trunc(''month'', NOW())',
    table_name
  ) INTO seq;
  RETURN prefix || '/' || yr || '/' || mn || '/' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- 18. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Włącz RLS na wszystkich tabelach
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;

-- Polityki RLS — Podstawowe (odczyt dla zalogowanych)
-- W produkcji: rozbuduj na podstawie ról

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read products"
  ON products FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read categories"
  ON categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read customers"
  ON customers FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read suppliers"
  ON suppliers FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage transactions"
  ON transactions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage transaction_items"
  ON transaction_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage payments"
  ON payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage orders"
  ON orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage returns"
  ON returns FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage deliveries"
  ON deliveries FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage inventories"
  ON inventories FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage inventory_items"
  ON inventory_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage documents"
  ON documents FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage expenses"
  ON expenses FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage cash_operations"
  ON cash_operations FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage cash_reports"
  ON cash_reports FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage stock_movements"
  ON stock_movements FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage stock_transfers"
  ON stock_transfers FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage warehouse_locations"
  ON warehouse_locations FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage time_entries"
  ON time_entries FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage schedules"
  ON schedules FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage absences"
  ON absences FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage commissions"
  ON commissions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read announcements"
  ON announcements FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage tasks"
  ON tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read audit_logs"
  ON audit_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read store_settings"
  ON store_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read vat_rates"
  ON vat_rates FOR ALL TO authenticated USING (true);


-- ─────────────────────────────────────────────────────────────
-- 19. DANE POCZĄTKOWE (SEED DATA)
-- ─────────────────────────────────────────────────────────────

-- Ustawienia sklepu
INSERT INTO store_settings (store_name, nip, address, phone, email, bank_account)
VALUES ('Sklep Budowlany "Pod Młotkiem"', '5213456789', 'ul. Budowlana 15, 00-100 Warszawa', '22 123 45 67', 'sklep@podmłotkiem.pl', 'PL61 1090 1014 0000 0712 1981 2874');

-- Stawki VAT
INSERT INTO vat_rates (name, rate, fiscal_code, is_default) VALUES
  ('Standardowy', 23, 'A', TRUE),
  ('Obniżony', 8, 'B', FALSE),
  ('Super obniżony', 5, 'C', FALSE),
  ('Zwolniony', 0, 'D', FALSE);

-- Kategorie
INSERT INTO categories (id, name, sort_order) VALUES
  (uuid_generate_v4(), 'Śruby i złączki', 1),
  (uuid_generate_v4(), 'Farby i lakiery', 2),
  (uuid_generate_v4(), 'Elektronarzędzia', 3),
  (uuid_generate_v4(), 'Akcesoria malarskie', 4),
  (uuid_generate_v4(), 'Materiały budowlane', 5),
  (uuid_generate_v4(), 'Instalacje wod-kan', 6),
  (uuid_generate_v4(), 'Elektryka', 7),
  (uuid_generate_v4(), 'Opakowania', 8),
  (uuid_generate_v4(), 'Usługi', 9),
  (uuid_generate_v4(), 'Chemia budowlana', 10),
  (uuid_generate_v4(), 'Okucia i zamki', 11),
  (uuid_generate_v4(), 'Podłogi', 12);


-- ═══════════════════════════════════════════════════════════════
-- GOTOWE! Schemat bazy danych został utworzony.
-- 
-- Następne kroki:
-- 1. Dodaj produkty (INSERT INTO products ...)
-- 2. Dodaj klientów i dostawców
-- 3. Skonfiguruj Supabase Auth i utwórz konta pracowników
-- 4. Rozbuduj polityki RLS na podstawie ról
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- TABELE — GRAFIK PRACY
-- ─────────────────────────────────────────────────────────────
CREATE TABLE schedules (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  start_time      TEXT NOT NULL,
  end_time        TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_schedules_profile_date ON schedules(profile_id, date);
