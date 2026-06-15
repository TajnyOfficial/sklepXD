import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiPlus, FiCamera, FiEdit, FiTrash2, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Inicjalizacja Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CATS = ['Zaopatrzenie', 'Stałe opłaty', 'Marketing', 'Serwis urządzeń', 'Wynagrodzenia', 'Podatki', 'Inne'];
const EMPTY = { 
  category: 'Zaopatrzenie', 
  supplier_name: '', 
  invoice_number: '', 
  description: '',
  net_amount: '', 
  vat_rate: '23', 
  gross_amount: '',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: new Date().toISOString().split('T')[0],
  is_mpp: false
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modale i formularze
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // Zarządzanie płatnościami (częściowymi/całkowitymi) ze WSPÓLNEJ TABELI
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      // Magia Supabase: podpinamy wspólną tabelę document_payments
      const { data, error } = await supabase
        .from('expenses')
        .select('*, document_payments(*)')
        .order('invoice_date', { ascending: false });
        
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast.error('Błąd pobierania kosztów: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Zliczanie wpłat z document_payments
  function getPaidAmount(exp) {
    if (!exp.document_payments || exp.document_payments.length === 0) return 0;
    return exp.document_payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }

  function openAdd() { 
    setEditing(null); 
    setForm(EMPTY); 
    setShowModal(true); 
  }

  function openEdit(e) { 
    setEditing(e); 
    setForm({ 
      category: e.category, 
      supplier_name: e.supplier_name || '', 
      invoice_number: e.invoice_number || '', 
      description: e.description || '',
      net_amount: String(e.net_amount || ''), 
      vat_rate: e.vat_rate || '23', 
      gross_amount: String(e.gross_amount || ''),
      invoice_date: e.invoice_date || new Date().toISOString().split('T')[0],
      due_date: e.due_date || new Date().toISOString().split('T')[0],
      is_mpp: e.is_mpp || false
    }); 
    setShowModal(true); 
  }

  const handleAmountChange = (field, value) => {
    let numVal = parseFloat(value.replace(',', '.')) || 0;
    let rate = parseFloat(form.vat_rate) || 0;
    let r = rate / 100;

    if (field === 'net') {
      let gross = numVal + (numVal * r);
      setForm(p => ({ ...p, net_amount: value, gross_amount: gross > 0 ? gross.toFixed(2) : '' }));
    } else if (field === 'gross') {
      let net = numVal / (1 + r);
      setForm(p => ({ ...p, gross_amount: value, net_amount: net > 0 ? net.toFixed(2) : '' }));
    }
  };

  const handleVatChange = (newRate) => {
    let net = parseFloat(form.net_amount) || 0;
    let r = parseFloat(newRate) / 100;
    let gross = net + (net * r);
    setForm(p => ({ ...p, vat_rate: newRate, gross_amount: gross > 0 ? gross.toFixed(2) : '' }));
  };

  async function handleSave() {
    if (!form.supplier_name || !form.net_amount) { toast.error('Wypełnij dostawcę i kwotę netto'); return; }
    
    const net = parseFloat(form.net_amount);
    const gross = parseFloat(form.gross_amount);
    const vat = gross - net;

    const expData = { 
      category: form.category, 
      supplier_name: form.supplier_name, 
      invoice_number: form.invoice_number, 
      description: form.description,
      net_amount: Math.round(net * 100) / 100, 
      vat_rate: form.vat_rate,
      vat_amount: Math.round(vat * 100) / 100,
      gross_amount: Math.round(gross * 100) / 100, 
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      is_mpp: form.is_mpp
    };

    try {
      if (editing) { 
        const { data, error } = await supabase.from('expenses').update(expData).eq('id', editing.id).select();
        if (error) throw error;
        
        setExpenses(prev => prev.map(e => e.id === editing.id ? { ...data[0], document_payments: e.document_payments } : e)); 
        toast.success('Koszt zaktualizowany'); 
      } else { 
        const { data, error } = await supabase.from('expenses').insert([{ ...expData, is_paid: false }]).select();
        if (error) throw error;
        
        setExpenses(prev => [{ ...data[0], document_payments: [] }, ...prev]); 
        toast.success('Zaksięgowano fakturę kosztową'); 
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Błąd zapisu: ' + err.message);
    }
  }

  // ZAPIS WPŁATY DO WSPÓLNEJ TABELI document_payments
  async function handleSavePayment() {
    const rawAmount = parseFloat(paymentAmount.toString().replace(',', '.'));
    if (isNaN(rawAmount) || rawAmount <= 0) { toast.error('Podaj poprawną kwotę wpłaty'); return; }

    const newPayment = {
      expense_id: paymentTarget.id, // Kluczowe: wysyłamy ID kosztu zamiast ID faktury
      amount: Math.round(rawAmount * 100) / 100,
      payment_date: new Date().toISOString().split('T')[0]
    };

    try {
      const { data, error } = await supabase.from('document_payments').insert([newPayment]).select();
      if (error) throw error;
      
      const savedPayment = (data && data[0]) ? data[0] : newPayment;
      
      setExpenses(prev => prev.map(exp => {
        if (exp.id === paymentTarget.id) {
          return { ...exp, document_payments: [...(exp.document_payments || []), savedPayment] };
        }
        return exp;
      }));
      
      toast.success(`Zaksięgowano wydatek: ${formatCurrency(newPayment.amount)}`);
      setShowPaymentModal(false);
      setPaymentAmount('');
    } catch (error) { 
      toast.error('Błąd księgowania wpłaty: ' + error.message); 
    }
  }

  async function handleDelete(e) { 
    if (!confirm(`Trwale usunąć dokument ${e.invoice_number || e.supplier_name}? Wszystkie powiązane wpłaty również zostaną skasowane.`)) return; 
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', e.id);
      if (error) throw error;
      setExpenses(prev => prev.filter(x => x.id !== e.id)); 
      toast.success('Usunięto z rejestru'); 
    } catch (err) {
      toast.error('Błąd usuwania');
    }
  }

  function handleOCR() { 
    toast('Uruchamiam skaner OCR... (Wymaga podpięcia API wizyjnego)', { duration: 3000, icon: '📷' }); 
    openAdd(); 
  }

  const totalKupNet = expenses.reduce((s, e) => s + parseFloat(e.net_amount || 0), 0);
  
  const totalDebt = expenses.reduce((s, e) => {
    const leftToPay = parseFloat(e.gross_amount) - getPaidAmount(e);
    return leftToPay > 0 ? s + leftToPay : s;
  }, 0);
  
  const requiresMppAlert = (parseFloat(form.gross_amount || 0) > 15000 && form.is_mpp);

  function renderStatusBadge(exp) {
    const paid = getPaidAmount(exp);
    const gross = parseFloat(exp.gross_amount);
    
    if (paid >= gross) {
      return <span className="badge badge-success">Opłacona ✅</span>;
    } else if (paid > 0) {
      return <span className="badge" style={{ backgroundColor: '#0ea5e9', color: 'white' }}>Częściowo 🔄</span>;
    } else {
      return <span className="badge badge-warning">Do zapłaty ⏳</span>;
    }
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Koszty i wydatki</h1>
          <p>Rejestr KUP, odliczenia VAT, kontrola zobowiązań</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={handleOCR}><FiCamera size={16} /> Skanuj fakturę (OCR)</button>
          <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Dodaj dokument</button>
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="stat-label">Suma kosztów (Netto KUP)</span>
          <span className="stat-value">{formatCurrency(totalKupNet)}</span>
          <div style={{ marginTop: '10px', fontSize: '0.9em', color: 'var(--text-muted)' }}>
            Pozostało do zapłaty dostawcom: <strong style={{color: 'var(--warning)'}}>{formatCurrency(totalDebt)}</strong> (Brutto)
          </div>
        </div>
       <div className="card">
          <h4 className="mb-8">Stan opłacenia kategorii (Brutto)</h4>
          {[...new Set(expenses.map(e => e.category))].map(cat => {
            const catExpenses = expenses.filter(e => e.category === cat);
            const catGross = catExpenses.reduce((s, e) => s + parseFloat(e.gross_amount || 0), 0);
            const catPaid = catExpenses.reduce((s, e) => s + getPaidAmount(e), 0);
            
            if (catGross === 0) return null;
            const percentPaid = Math.min(100, (catPaid / catGross) * 100);

            return (
              <div key={cat} style={{ 
                display: 'grid', 
                gridTemplateColumns: '130px 1fr 180px', // Sztywne kolumny: Nazwa | Pasek | Kwoty
                alignItems: 'center', 
                gap: '15px', 
                marginBottom: '12px' 
              }}>
                
                <span className="text-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat}
                </span>
                
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${percentPaid}%`, 
                    backgroundColor: percentPaid >= 100 ? 'var(--success)' : '#8b5cf6', 
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                
                <span className="text-sm font-bold" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatCurrency(catPaid)} <span style={{color: 'var(--text-muted)', fontWeight: 'normal'}}>/ {formatCurrency(catGross)}</span>
                </span>
                
              </div>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Wczytywanie ewidencji...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Kategoria</th><th>Dostawca & Dokument</th><th>Opis / Cel</th><th>Netto</th><th>VAT</th><th>Brutto</th><th>Daty</th><th>Status płatności</th><th></th></tr></thead>
            <tbody>
              {expenses.map(e => {
                const paidAmount = getPaidAmount(e);
                const isFullyPaid = paidAmount >= parseFloat(e.gross_amount);
                
                return (
                <tr key={e.id}>
                  <td><span className="badge badge-ghost">{e.category}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.supplier_name || 'Brak danych'}</div>
                    <div className="text-sm text-muted" style={{ fontFamily: 'monospace' }}>{e.invoice_number || 'Brak nr'}</div>
                    {e.is_mpp && e.gross_amount > 15000 && <span style={{ fontSize: '10px', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>MPP Wymagane</span>}
                  </td>
                  <td className="text-sm">{e.description || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(e.net_amount)}</td>
                  <td className="text-muted text-sm">{e.vat_rate === '0' || e.vat_rate === 'ZW' || e.vat_rate === 'NP' ? e.vat_rate : `${e.vat_rate}%`}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(e.gross_amount)}</td>
                  <td className="text-sm text-muted">
                    Wystawiono: {e.invoice_date}<br/>
                    <span style={{ color: isFullyPaid ? 'inherit' : 'var(--danger)'}}>Termin: {e.due_date}</span>
                  </td>
                  <td>
                    {renderStatusBadge(e)}
                    {paidAmount > 0 && !isFullyPaid && (
                      <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)' }}>
                        Zapłacono: {paidAmount.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: isFullyPaid ? 'var(--text-muted)' : 'var(--success)' }}
                        title="Zarządzaj wpłatami (raty)"
                        onClick={() => {
                          setPaymentTarget(e);
                          setPaymentAmount(Math.max(0, parseFloat(e.gross_amount) - paidAmount).toFixed(2));
                          setShowPaymentModal(true);
                        }}
                      >
                        <FiCheckCircle size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Edytuj dokument" onClick={() => openEdit(e)}><FiEdit size={14} /></button>
                      <button className="btn btn-ghost btn-sm" title="Usuń z rejestru" onClick={() => handleDelete(e)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      // MODAL KOSZTOWY
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj dokument kosztowy' : 'Rejestracja nowej faktury zakupowej'} size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz zmiany' : 'Zaksięguj dokument'}</button></>}>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Kategoria w KUP</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Data wystawienia</label>
            <input className="input" type="date" value={form.invoice_date} onChange={e => setForm(p => ({...p, invoice_date: e.target.value}))} />
          </div>
          <div className="input-group">
            <label>Termin płatności</label>
            <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} />
          </div>
        </div>
        
        <div className="input-row mb-16">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Dostawca (Nazwa firmy) *</label>
            <input className="input" value={form.supplier_name} onChange={e => setForm(p => ({...p, supplier_name: e.target.value}))} placeholder="np. Hurtownia ABC Sp. z o.o." />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Nr faktury</label>
            <input className="input" value={form.invoice_number} onChange={e => setForm(p => ({...p, invoice_number: e.target.value}))} placeholder="np. FV/123/2026" />
          </div>
        </div>

        <div className="input-group mb-16">
          <label>Opis / Cel wydatku (Opcjonalne)</label>
          <input className="input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="np. Zakup materiałów biurowych do działu IT" />
        </div>

        <div className="input-row mb-16" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div className="input-group">
            <label>Kwota NETTO (PLN) *</label>
            <input className="input" type="number" step="0.01" value={form.net_amount} onChange={e => handleAmountChange('net', e.target.value)} placeholder="0.00" />
          </div>
          <div className="input-group" style={{ maxWidth: '100px' }}>
            <label>Stawka VAT</label>
            <select className="select" value={form.vat_rate} onChange={e => handleVatChange(e.target.value)}>
              <option value="23">23%</option>
              <option value="8">8%</option>
              <option value="5">5%</option>
              <option value="0">0%</option>
              <option value="ZW">ZW</option>
              <option value="NP">NP</option>
            </select>
          </div>
          <div className="input-group">
            <label>Kwota BRUTTO (PLN)</label>
            <input className="input" type="number" step="0.01" style={{ fontWeight: 'bold' }} value={form.gross_amount} onChange={e => handleAmountChange('gross', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="input-row" style={{ marginTop: '10px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, padding: '10px', borderRadius: '6px', backgroundColor: requiresMppAlert ? '#fef2f2' : 'transparent', border: requiresMppAlert ? '1px solid #f87171' : '1px solid transparent', width: '100%' }}>
            <input 
              type="checkbox" 
              checked={form.is_mpp} 
              onChange={e => setForm(p => ({ ...p, is_mpp: e.target.checked }))} 
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ color: requiresMppAlert ? '#dc2626' : 'inherit' }}>
              Dokument zawiera towary/usługi wrażliwe (Załącznik nr 15 ustawy o VAT)
            </span>
          </label>
        </div>
        
        {requiresMppAlert && (
          <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle size={16} /> <strong>Uwaga!</strong> Próg 15 000 zł brutto został przekroczony. Płatność za tę fakturę musi zostać zrealizowana mechanizmem podzielonej płatności (Split Payment).
          </div>
        )}

      </Modal>

      // MODAL: PŁATNOŚCI KOSZTOWE (RATY)
      <Modal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        title={`Zarządzanie wpłatami: ${paymentTarget?.supplier_name || 'Koszt'}`} 
        footer={<><button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Anuluj</button><button className="btn btn-success" onClick={handleSavePayment}>Zaksięguj przelew</button></>}
      >
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
          <div className="flex-between mb-8">
            <span className="text-muted">Wymagana wartość do zapłaty:</span> 
            <strong style={{fontSize: '1.1em'}}>{paymentTarget && formatCurrency(parseFloat(paymentTarget.gross_amount))}</strong>
          </div>
          <div className="flex-between mb-8">
            <span className="text-muted">Dotychczas wysłano (przelewy):</span> 
            <strong className="text-success">{paymentTarget && formatCurrency(getPaidAmount(paymentTarget))}</strong>
          </div>
          
          <hr style={{ borderColor: 'var(--border-light)', margin: '10px 0' }}/>
          
          <div className="flex-between">
            <span className="text-muted" style={{ fontWeight: 500 }}>
              {paymentTarget && (getPaidAmount(paymentTarget) >= parseFloat(paymentTarget.gross_amount)) ? 'Faktura opłacona w całości ✅' : 'Pozostało do zapłaty:'}
            </span> 
            <strong className={paymentTarget && (getPaidAmount(paymentTarget) >= parseFloat(paymentTarget.gross_amount)) ? "text-success" : "text-warning"}>
              {paymentTarget && formatCurrency(Math.max(0, parseFloat(paymentTarget.gross_amount) - getPaidAmount(paymentTarget)))}
            </strong>
          </div>        
        </div>
        
        {paymentTarget && (getPaidAmount(paymentTarget) < parseFloat(paymentTarget.gross_amount)) && (
          <div className="input-group">
            <label>Wpisz kwotę przelewu z konta firmowego (PLN)</label>
            <input 
              className="input" 
              type="number" 
              step="0.01" 
              style={{ fontSize: '1.2em', fontWeight: 'bold' }} 
              value={paymentAmount} 
              onChange={e => setPaymentAmount(e.target.value)} 
            />
          </div>
        )}
      </Modal>

    </div>
  );
}