import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiPrinter, FiSave, FiAlertCircle } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CashReportPage() {
  // Stany aplikacji
  const [isLoading, setIsLoading] = useState(true);
  const [ops, setOps] = useState([]);
  const [dailySales, setDailySales] = useState(0);
  const [physicalAmount, setPhysicalAmount] = useState('');
  const [historyReports, setHistoryReports] = useState([]);
  
  // Stany formularza
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'KP', amount: '', description: '' });

  // Pobieranie danych przy starcie
  useEffect(() => { 
    fetchData(); 
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Równoległe, bezpieczne pobieranie danych z 3 tabel
      const [opsResponse, salesResponse, reportsResponse] = await Promise.all([
        supabase.from('cash_operations').select('*').eq('date', today).order('created_at', { ascending: false }),
        supabase.from('documents').select('gross_amount').eq('sale_date', today),
        supabase.from('cash_reports').select('*').order('created_at', { ascending: false })
      ]);

      // Weryfikacja błędów (bez wywalania aplikacji)
      if (opsResponse.error) console.error("Błąd cash_operations:", opsResponse.error);
      if (salesResponse.error) console.error("Błąd documents:", salesResponse.error);
      if (reportsResponse.error) console.error("Błąd cash_reports:", reportsResponse.error);

      // Zabezpieczone przypisanie danych (jeśli null, dajemy pustą tablicę [])
      const safeOps = opsResponse.data || [];
      const safeSales = salesResponse.data || [];
      const safeReports = reportsResponse.data || [];

      setOps(safeOps);
      setHistoryReports(safeReports);
      
      // Bezpieczne sumowanie sprzedaży
      const totalSales = safeSales.reduce((sum, doc) => sum + (Number(doc.gross_amount) || 0), 0);
      setDailySales(totalSales);

    } catch (error) {
      toast.error('Krytyczny błąd pobierania danych.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const previousReports = historyReports.filter(r => r.report_date !== todayStr);
  const openingBalance = historyReports.length > 0 
    ? Number(historyReports[0].closing_balance) || 0 
    : 0;
  const depositsKP = ops.filter(o => o.type === 'KP').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const withdrawalsKW = ops.filter(o => o.type === 'KW').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  
  const closingSystem = openingBalance + dailySales + depositsKP - withdrawalsKW;
  const safePhysicalAmount = Number(physicalAmount) || 0; 
  const cashDifference = safePhysicalAmount - closingSystem;

  // --- DODAWANIE OPERACJI (KP / KW) ---
  async function handleSaveOperation() {
    const amountVal = Number(form.amount);
    if (!amountVal || amountVal <= 0) { 
      toast.error('Wpisz poprawną kwotę większą od zera'); 
      return; 
    }

    const newOp = {
      date: new Date().toISOString().split('T')[0],
      type: form.type,
      amount: Number(amountVal.toFixed(2)),
      description: form.description || 'Brak opisu'
    };

    try {
      const { error } = await supabase.from('cash_operations').insert([newOp]);
      if (error) throw error;
      
      toast.success(`Zaksięgowano dowód ${form.type}`); 
      setShowModal(false); 
      setForm({ type: 'KP', amount: '', description: '' });
      fetchData(); 
    } catch (err) {
      toast.error('Błąd zapisu operacji: ' + err.message);
    }
  }

  // --- GENEROWANIE RAPORTU ---
  async function handleGenerateReport() {
    if (safePhysicalAmount <= 0) {
      if(!confirm("Stan kasy wynosi 0. Czy na pewno chcesz zamknąć dzień?")) return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const exists = historyReports.find(r => r.report_date === today);
    if (exists) {
      if(!confirm("Raport z dzisiaj już istnieje. Zastąpić go lub wygenerować nowy?")) return;
    }

    const reportData = {
      report_type: 'Dzienny',
      report_date: today,
      opening_balance: Number(openingBalance.toFixed(2)),
      closing_balance: Number(closingSystem.toFixed(2)),
      physical_count: Number(safePhysicalAmount.toFixed(2)),
      difference: Number(cashDifference.toFixed(2)),
      total_sales_cash: Number(dailySales.toFixed(2)),
      total_sales_card: 0, 
      total_sales_transfer: 0,
      total_deposits: Number(depositsKP.toFixed(2)),
      total_withdrawals: Number(withdrawalsKW.toFixed(2)),
      transaction_count: ops.length
    };

    const toastId = toast.loading('Generowanie raportu kasowego...');
    try {
      const { error } = await supabase.from('cash_reports').insert([reportData]);
      if (error) throw error;
      
      toast.success('Dzień zamknięty! Raport został wygenerowany.', { id: toastId });
      fetchData(); 
    } catch (err) {
      toast.error('Błąd generowania raportu: ' + err.message, { id: toastId });
    }
  }

  if (isLoading) {
    return <div className="page" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh'}}><h3>Ładowanie księgi kasowej...</h3></div>;
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Księga Kasowa</h1>
          <p>Dzienny bilans kasy, wpłaty, wypłaty i archiwum raportów</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={() => { setForm({type: 'KP', amount: '', description: ''}); setShowModal(true); }}>+ Wpłata (KP)</button>
          <button className="btn btn-danger" onClick={() => { setForm({type: 'KW', amount: '', description: ''}); setShowModal(true); }}>- Wypłata (KW)</button>
          <button className="btn btn-primary" onClick={handleGenerateReport}><FiSave size={16} /> Zamknij dzień</button>
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 24, alignItems: 'start' }}>
        
        {/* PANEL: DZIENNY BILANS */}
        <div className="card">
          <h3 className="mb-16">Dzienny bilans kasy — {new Date().toLocaleDateString('pl-PL')}</h3>
          {[
            ['Saldo otwarcia', openingBalance, 'var(--text-primary)'],
            ['+ Sprzedaż (z dokumentów)', dailySales, 'var(--success)'],
            ['+ Wpłaty gotówkowe (KP)', depositsKP, 'var(--success)'],
            ['- Wypłaty gotówkowe (KW)', withdrawalsKW, 'var(--danger)'],
            ['= Saldo systemowe kasy', closingSystem, 'var(--accent-light)'],
          ].map(([label, val, color], i) => (
            <div key={i} className="flex-between" style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none' }}>
              <span>{label}</span>
              <span style={{ fontWeight: i >= 4 ? 700 : 500, fontSize: i >= 4 ? '1.1em' : '1em', color }}>{formatCurrency(val)}</span>
            </div>
          ))}
          
          <div className="mt-16 p-16" style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <label className="text-sm font-bold" style={{display: 'block', marginBottom: '8px'}}>Przeliczona gotówka (Stan fizyczny kasy):</label>
            <input 
              className="input" 
              type="number" 
              style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '100%' }}
              value={physicalAmount}
              onChange={e => setPhysicalAmount(e.target.value)} 
              placeholder="0.00"
            />
          </div>

          <div className="flex-between mt-16" style={{ padding: '16px', background: Math.abs(cashDifference) < 1 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: '8px' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Math.abs(cashDifference) >= 1 && <FiAlertCircle />} Różnica kasowa
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.2em', color: Math.abs(cashDifference) < 1 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(cashDifference)}
            </span>
          </div>
        </div>

        {/* PANEL: DZISIEJSZE OPERACJE */}
        <div className="table-container card">
          <h3 className="mb-16">Dzisiejsze operacje (Wpłaty/Wypłaty)</h3>
          {ops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Brak dodatkowych operacji na dzisiejszej zmianie.
            </div>
          ) : (
            <table>
              <thead><tr><th>Typ</th><th>Opis / Cel</th><th>Kwota</th></tr></thead>
              <tbody>
                {ops.map(o => (
                  <tr key={o.id}>
                    <td><span className={`badge ${o.type === 'KP' ? 'badge-success' : 'badge-danger'}`}>{o.type}</span></td>
                    <td className="text-sm">{o.description}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(Number(o.amount) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PANEL: ARCHIWUM RAPORTÓW */}
      <h3 className="mb-16 flex items-center gap-8"><FiPrinter /> Archiwum wygenerowanych raportów</h3>
      <div className="table-container card">
        {historyReports.length === 0 ? (
          <p className="text-muted text-sm text-center p-4">Brak raportów w bazie. Kliknij "Zamknij dzień", aby wygenerować pierwszy raport.</p>
        ) : (
          <table>
            <thead><tr><th>Data raportu</th><th>Otwarcie</th><th>Sprzedaż</th><th>KP / KW</th><th>Zgodność</th><th>Zamknięcie</th></tr></thead>
            <tbody>
              {historyReports.map(r => (
                <tr key={r.id}>
                  <td className="font-bold">{r.report_date}</td>
                  <td>{formatCurrency(Number(r.opening_balance) || 0)}</td>
                  <td className="text-success">{formatCurrency(Number(r.total_sales_cash) || 0)}</td>
                  <td>
                    <span className="text-success">+{formatCurrency(Number(r.total_deposits) || 0)}</span> / <span className="text-danger">-{formatCurrency(Number(r.total_withdrawals) || 0)}</span>
                  </td>
                  <td>
                    <span className={`badge ${Math.abs(Number(r.difference) || 0) < 1 ? 'badge-success' : 'badge-danger'}`}>
                      {Math.abs(Number(r.difference) || 0) < 1 ? 'Zgodna ✅' : `Różnica: ${formatCurrency(Number(r.difference) || 0)}`}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(Number(r.closing_balance) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DO DODAWANIA OPERACJI */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={form.type === 'KP' ? 'Dowód Wpłaty: Kasa Przyjmie (KP)' : 'Dowód Wypłaty: Kasa Wyda (KW)'} 
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSaveOperation}>Zatwierdź dokument</button>
          </>
        }
      >
        <div className="input-group mb-16">
          <label>Kwota gotówki (PLN)</label>
          <input 
            className="input" 
            type="number" 
            step="0.01" 
            value={form.amount} 
            onChange={e => setForm({...form, amount: e.target.value})} 
            placeholder="0.00" 
            style={{fontSize: '1.2em', fontWeight: 'bold'}}
          />
        </div>
        <div className="input-group">
          <label>Opis / Cel operacji</label>
          <input 
            className="input" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder={form.type === 'KP' ? "np. Wpłata własna, zwrot zaliczki..." : "np. Zakup materiałów, wypłata dla szefa..."} 
          />
        </div>
      </Modal>

    </div>
  );
}