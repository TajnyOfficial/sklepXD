-- Skrypt aktualizacyjny bazy danych dla modułów: Zadania, Ogłoszenia, Ustawienia i Stawki VAT
-- Wykonaj ten plik w swoim panelu Supabase (SQL Editor), jeśli w Twojej bazie brakuje tych tabel.

DO $$ BEGIN
    -- Typy wyliczeniowe dla zadań
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'normal', 'low');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    -- Typy wyliczeniowe dla ogłoszeń
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_priority') THEN
        CREATE TYPE announcement_priority AS ENUM ('high', 'normal', 'low');
    END IF;
END $$;

-- 1. Tabela stawek VAT (jeśli nie istnieje)
CREATE TABLE IF NOT EXISTS public.vat_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL,
  fiscal_code text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vat_rates_pkey PRIMARY KEY (id)
);

-- 2. Tabela globalnych ustawień sklepu (jeśli nie istnieje)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'Sklep'::text,
  nip text,
  address text,
  phone text,
  email text,
  bank_account text,
  logo_url text,
  default_vat_rate numeric DEFAULT 23,
  currency text DEFAULT 'PLN'::text,
  settings_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_settings_pkey PRIMARY KEY (id)
);

-- 3. Tabela ogłoszeń firmowych
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority announcement_priority DEFAULT 'normal'::announcement_priority,
  author_id uuid,
  is_pinned boolean DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);

-- 4. Tabela zadań (Task Management)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'normal'::task_priority,
  status task_status DEFAULT 'pending'::task_status,
  assigned_to uuid,
  assigned_by uuid,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  requires_photo boolean DEFAULT false,
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);

-- 5. Tabela nieobecności
CREATE TABLE IF NOT EXISTS public.absences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'pending',
  date_from date NOT NULL,
  date_to date NOT NULL,
  days_count integer NOT NULL DEFAULT 1,
  note text,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT absences_pkey PRIMARY KEY (id),
  CONSTRAINT absences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT absences_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id)
);
