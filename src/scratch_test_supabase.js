import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfvohrvnwycjkjaftzwy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmdm9ocnZud3ljamtqYWZ0end5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDc1NjYsImV4cCI6MjA4ODkyMzU2Nn0.oLsPxbbL_AF-AxQRQbeEkY6ey6oz9sQR2YyYSuheFZQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log("Signing in anonymously...");
  await supabase.auth.signInAnonymously();

  console.log("Testing insert on transactions...");
  const row = {
    transaction_number: `TXN-${Date.now()}`,
    type: 'sale',
    status: 'completed',
    customer_id: null,
    seller_id: null,
    total: 15.00,
    note: JSON.stringify({ items: [], payments: [{ method: 'cash', amount: 15.00 }] })
  };

  const { data, error } = await supabase.from('transactions').insert(row).select();
  console.log("Transaction insert result:", { data, error });

  if (data && data[0]) {
    await supabase.from('transactions').delete().eq('id', data[0].id);
    console.log("Cleaned up transaction!");
  }
}

run();
