import { createClient } from '@supabase/supabase-js';

// Adres URL projektu Supabase pobierany ze zmiennych środowiskowych Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Anonimowy klucz publiczny Supabase pobierany ze zmiennych środowiskowych Vite
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Obiekt klienta Supabase służący do komunikacji z bazą danych i obsługi autoryzacji.
// Został skonfigurowany tak, aby automatycznie odświeżać tokeny i zapisywać sesję w pamięci przeglądarki.
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
 * Funkcja weryfikująca i inicjalizująca sesję użytkownika w Supabase.
 * 
 * Zastosowanie:
 * Funkcja ta jest wywoływana, aby upewnić się, że aplikacja posiada aktywne połączenie autoryzowane.
 * Wykorzystuje logowanie anonimowe (Anonymous Auth), które nadaje użytkownikowi rolę "anon",
 * co jest wymagane do poprawnego działania reguł RLS (Row Level Security) w bazie danych.
 * 
 * Działanie:
 * 1. Weryfikuje, czy URL do Supabase jest poprawny (zabezpiecza przed wykonaniem w lokalnym trybie demo).
 * 2. Pobiera aktualną sesję z klienta Supabase.
 * 3. Jeśli sesja nie istnieje, podejmuje próbę anonimowego logowania i loguje wynik operacji w konsoli.
 * 4. Jeśli sesja istnieje, informuje w konsoli o aktywnej sesji wraz z rolą użytkownika.
 */
export async function ensureSupabaseSession() {
  if (!supabaseUrl?.includes('supabase.co')) return;

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
