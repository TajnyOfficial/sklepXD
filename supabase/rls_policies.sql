-- ═══════════════════════════════════════════════════════════════
-- OSTATECZNA NAPRAWA UPRAWNIEŃ (URGENT FIX)
-- ═══════════════════════════════════════════════════════════════
-- Problem: Tabele stworzone przez skrypt nie mają nadanych 
-- uprawnień SQL dla ról anon/authenticated.
-- ═══════════════════════════════════════════════════════════════

-- 1. Nadaj uprawnienia do schematu
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Nadaj pełne uprawnienia do WSZYSTKICH tabel i sekwencji
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 3. Upewnij się, że RLS nie blokuje (wszystko otwarte dla zalogowanych)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', t);
        EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
