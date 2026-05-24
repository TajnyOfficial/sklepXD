-- ─────────────────────────────────────────────────────────────
-- SKRYPT AKTUALIZACYJNY BAZY DANYCH (Faza 2)
-- Skopiuj ten kod i uruchom w SQL Editorze w Supabase.
-- ─────────────────────────────────────────────────────────────

-- 1. Dodanie kolumn logowania do istniejącej tabeli 'profiles'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS system_login text;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS system_password text;

-- 2. Usunięcie modułu prowizji z bazy danych 
-- (Jeżeli masz w tej tabeli ważne dane, zrób wcześniej kopię zapasową!)
DROP TABLE IF EXISTS public.commissions CASCADE;

-- UWAGA ODNOŚNIE GRAFIKU (schedules):
-- Zgłoszony przez Ciebie błąd: 'relation "schedules" already exists' 
-- oznacza, że ta tabela była już wcześniej utworzona w Twojej bazie Supabase, 
-- więc nie ma potrzeby tworzyć jej ponownie. Moje poprawki w kodzie aplikacji 
-- dostosowały się do istniejącej u Ciebie tabeli (kolumny shift_start i shift_end).
