import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiArrowUpCircle, FiArrowDownCircle, FiBell, FiAlertTriangle } from 'react-icons/fi';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Inicjalizacja Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PaymentsPage() {
  const [receivables, setReceivables] = useState([]); // Należności (Klienci -> My)
  const [payables, setPayables] = useState([]);       // Zobowiązania (My -> Dostawcy)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // 1. Pobieranie Faktur sprzedażowych WRAZ z wpłatami
      const { data: invData, error: invError } = await supabase
        .from('documents')
        .select('*, document_payments(*)')
        .in('type', ['invoice']); // interesują nas tylko faktury (pomijamy same korekty bez oryginałów)

      if (invError) throw invError;

      // 2. Pobieranie Kosztów WRAZ z wpłatami
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('*, document_payments(*)');

      if (expError) throw expError;

      // Obliczanie dzisiejszej daty (do sprawdzania dni po terminie)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // --- PRZETWARZANIE NALEŻNOŚCI (Sprzedaż) ---
      const mappedReceivables = (invData || []).map(inv => {
        const paid = (inv.document_payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const gross = parseFloat(inv.gross_amount || 0);
        const leftToPay = gross - paid;
        
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          id: inv.id,
          customer: inv.buyer_name,
          invoice: inv.document_number,
          grossAmount: gross,
          amountLeft: leftToPay, // Ile faktycznie zostało
          due: inv.due_date,
          daysLeft: daysLeft,
          isPaid: leftToPay <= 0.01 // Zabezpieczenie przed błędem zmiennoprzecinkowym
        };
      })
      .filter(r => !r.isPaid) // Wyrzucamy z listy faktury w pełni opłacone
      .sort((a, b) => a.daysLeft - b.daysLeft); // Najbardziej przeterminowane idą na górę tabeli

      // --- PRZETWARZANIE ZOBOWIĄZAŃ (Koszty) ---
      const mappedPayables = (expData || []).map(exp => {
        const paid = (exp.document_payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const gross = parseFloat(exp.gross_amount || 0);
        const leftToPay = gross - paid;

        const dueDate = new Date(exp.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          id: exp.id,
          supplier: exp.supplier_name || 'Brak danych',
          invoice: exp.invoice_number || 'Brak nr',
          grossAmount: gross,
          amountLeft: leftToPay, // Ile faktycznie zostało
          due: exp.due_date,
          daysLeft: daysLeft,
          isPaid: leftToPay <= 0.01
        };
      })
      .filter(p => !p.isPaid)
      .sort((a, b) => a.daysLeft - b.daysLeft);

      setReceivables(mappedReceivables);
      setPayables(mappedPayables);

    } catch (error) {
      toast.error('Błąd pobierania danych rozrachunków: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const totalReceivables = receivables.reduce((s, r) => s + r.amountLeft, 0);
  const totalPayables = payables.reduce((s, p) => s + p.amountLeft, 0);
  const overdueCount = receivables.filter(r => r.daysLeft < 0).length + payables.filter(p => p.daysLeft < 0).length;

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Płatności i rozrachunki</h1>
          <p>Należności, zobowiązania, monitorowanie Cash Flow na żywo</p>
        </div>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-card">
          <div className="stat-icon green"><FiArrowUpCircle /></div>
          <span className="stat-label">Należności (Klienci zalegają)</span>
          <span className="stat-value text-success">{formatCurrency(totalReceivables)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FiArrowDownCircle /></div>
          <span className="stat-label">Zobowiązania (Nasze długi)</span>
          <span className="stat-value text-danger">{formatCurrency(totalPayables)}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: overdueCount > 0 ? '4px solid var(--danger)' : '4px solid transparent' }}>
          <div className="stat-icon amber"><FiBell /></div>
          <span className="stat-label">Dokumenty po terminie</span>
          <span className="stat-value">{overdueCount}</span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Obliczanie rozrachunków...</div>
      ) : (
        <div className="grid-2" style={{ gap: 24 }}>
          
          <div className="card">
            <h3 className="mb-16 flex items-center" style={{ color: 'var(--success)', display: 'flex', gap: '8px' }}>
              <FiArrowUpCircle size={18} /> Czekamy na wpłatę (Należności)
            </h3>
            {receivables.length === 0 ? (
               <p className="text-muted text-sm text-center p-4">Hura! Wszyscy klienci opłacili faktury.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Klient</th><th>Faktura</th><th>Pozostało</th><th>Termin</th><th>Akcje</th></tr></thead>
                  <tbody>
                    {receivables.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500 }}>{r.customer}</td>
                        <td className="font-mono text-sm">{r.invoice}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{formatCurrency(r.amountLeft)}</div>
                          {r.amountLeft < r.grossAmount && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>z {formatCurrency(r.grossAmount)}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${r.daysLeft < 0 ? 'badge-danger' : r.daysLeft <= 3 ? 'badge-warning' : 'badge-ghost'}`}>
                            {r.due} {r.daysLeft < 0 ? `(${Math.abs(r.daysLeft)} dni po!)` : `(za ${r.daysLeft} dni)`}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => toast.success(`Wysłano monit do: ${r.customer}`)}>
                            <FiBell size={14} /> Monit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-16 flex items-center" style={{ color: 'var(--danger)', display: 'flex', gap: '8px' }}>
              <FiArrowDownCircle size={18} /> Musimy zapłacić (Zobowiązania)
            </h3>
            {payables.length === 0 ? (
               <p className="text-muted text-sm text-center p-4">Wszystkie koszty są opłacone. Brak zadłużeń.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Dostawca</th><th>Dokument</th><th>Pozostało</th><th>Termin</th></tr></thead>
                  <tbody>
                    {payables.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.supplier}</td>
                        <td className="font-mono text-sm">{p.invoice}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{formatCurrency(p.amountLeft)}</div>
                          {p.amountLeft < p.grossAmount && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>z {formatCurrency(p.grossAmount)}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${p.daysLeft < 0 ? 'badge-danger' : p.daysLeft <= 3 ? 'badge-warning' : 'badge-ghost'}`}>
                            {p.due} {p.daysLeft < 0 ? <><FiAlertTriangle style={{display: 'inline', marginBottom: '-2px'}}/> {Math.abs(p.daysLeft)} dni po!</> : `(za ${p.daysLeft} dni)`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}