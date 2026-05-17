import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

/**
 * Upewnia się, że aplikacja jest zalogowana w Supabase.
 * Używa Anonymous Auth — promuje połączenie z "anon" do "authenticated",
 * co pozwala politikom RLS działać poprawnie.
 */
export async function ensureSupabaseSession() {
  if (!supabaseUrl?.includes('supabase.co')) return; // tryb demo

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('❌ Supabase Auth Error:', error.message);
    } else {
      console.log('✅ Supabase Auth: Zalogowano anonimowo. Rola:', data.session?.user?.role);
    }
  } else {
    console.log('✅ Supabase Auth: Sesja aktywna. Rola:', session.user?.role);
  }
}
