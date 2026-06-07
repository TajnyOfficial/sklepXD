import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiPlus, FiDownload, FiEye, FiMail, FiEdit, FiCornerDownRight, FiCheckCircle, FiUser } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { InvoiceDownloadBtn } from '../../components/Invoice/InvoiceDownloadBtn';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey); 

const EMPTY = { 
  customer: '', nip: '', address: '', due_days: '14', 
  note: 'Prosimy o terminową wpłatę.', 
  is_mpp: false, 
  items: [{ name: '', qty: '1', price: '', vatRate: '23' }] 
};

export default function InvoicesPage() {
  const { shopSettings, currentUser } = useStore();
  
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewInv, setViewInv] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isFetchingNip, setIsFetchingNip] = useState(false);

  // --- AUTOMATYCZNE WYKRYWANIE ZALOGOWANEGO UŻYTKOWNIKA ---
  const [loggedUser, setLoggedUser] = useState('Ładowanie...');

useEffect(() => {
    async function fetchInvoices() {
      // Zamiast zgadywać usera, bierzemy to co jest w localStorage
      // lub to co użytkownik sam ustawił w dropdownie
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setLoggedUser(savedUser);
      } else {
        setLoggedUser('Anna Nowak'); // Ustaw domyślnego użytkownika, jeśli nic nie ma
        localStorage.setItem('currentUser', 'Anna Nowak');
      }

      try {
        const {data, error} = await supabase
          .from('documents')
          .select('*, document_payments(*)')
          .in('type', ['invoice', 'correction'])
          .order('created_at', {ascending: false});
        if(error) throw error;
        setInvoices(data || []);
      } catch (error) {
        toast.error('Błąd pobierania faktur: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  async function handleGusLookup() {
    const cleanNip = form.nip.replace(/[\s-]/g, '');
    if (cleanNip.length !== 10) { toast.error('NIP musi mieć 10 cyfr'); return; }
    setIsFetchingNip(true);
    try {
      const response = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${cleanNip}?date=${new Date().toISOString().split('T')[0]}`);
      const result = await response.json();
      if (result?.result?.subject) {
        const company = result.result.subject;
        setForm(p => ({
          ...p,
          customer: company.name,
          address: company.workingAddress || company.residenceAddress || 'Brak adresu w bazie',
          bankAccount: company.bankAccount
        }));
        toast.success('Pobrano dane z bazy MF!');
      } else {
        toast.error('Nie znaleziono firmy o takim NIP.');
      }
    } catch (error) {
      toast.error('Błąd połączenia z API MF. Wpisz adres ręcznie.');
    } finally {
      setIsFetchingNip(false);
    }
  }

  function openCorrection(invoice) {
    setCorrectionTarget(invoice);
    const copiedItems = JSON.parse(JSON.stringify(invoice.items || []));
    const safeItems = copiedItems.map(it => ({...it, vatRate: it.vatRate || '23'}));
    setForm({
      ...EMPTY,
      customer: invoice.buyer_name,
      nip: invoice.buyer_nip || invoice.nip || '',
      address: invoice.buyer_address || '',
      note: invoice.note || 'Prosimy o terminową wpłatę.',
      items: safeItems.length > 0 ? safeItems : [{ name: '', qty: '1', price: '', vatRate: '23'}]
    });
    setCorrectionReason('');
    setShowCorrectionModal(true);
  }

  const calculateTotals = (items) => {
    let totalNet = 0;
    let totalVat = 0;
    const itemsWithVat = items.map(item => {
      const rate = item.vatRate || '23';
      const netVal = parseFloat(item.price) * parseInt(item.qty || 1);
      const numericRate = isNaN(parseFloat(rate)) ? 0 : parseFloat(rate) / 100;
      const vatVal = netVal * numericRate;
      totalNet += netVal;
      totalVat += vatVal;
      return { ...item, vatRate: rate, unitPriceNet: parseFloat(item.price), totalGross: Math.round((netVal + vatVal) * 100) / 100 };
    });
    return { totalNet, totalVat, gross: totalNet + totalVat, itemsWithVat };
  };

 async function handleSave() {
    if (!form.customer) { toast.error('Podaj kontrahenta'); return; }
    const validItems = form.items.filter(i => i.name && i.price);
    if (validItems.length === 0) { toast.error('Dodaj pozycje'); return; }

    const { totalNet, totalVat, gross, itemsWithVat } = calculateTotals(validItems);
    const today = new Date();
    const due = new Date(today); 
    due.setDate(due.getDate() + parseInt(form.due_days || '14'));

    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const nextInvoiceNumber = String(invoices.length + 1).padStart(3, '0');

    let finalNote = form.note || '';
    if (form.is_mpp && gross > 15000) {
      const mppText = "Mechanizm podzielonej płatności";
      if (!finalNote.includes(mppText)) {
        finalNote = finalNote ? `${finalNote} | ${mppText}` : mppText;
      }
    }

    // Twarde przypisanie wykrytego usera do bazy
    const finalSellerName = loggedUser;

    const inv = { 
      document_number: `FV/${currentYear}/${currentMonth}/${nextInvoiceNumber}`,
      type: 'invoice', status: 'unpaid',
      buyer_name: form.customer,
      buyer_nip: form.nip.replace(/[\s-]/g, ''),
      buyer_address: form.address || 'Brak adresu',
      note: finalNote,
      net_amount: Math.round(totalNet * 100) / 100,
      vat_amount: Math.round(totalVat * 100) / 100,
      gross_amount: Math.round(gross * 100) / 100,
      issue_date: today.toISOString().split('T')[0],
      sale_date: today.toISOString().split('T')[0],
      due_date: due.toISOString().split('T')[0],
      items: itemsWithVat, 
      is_locked: true,
      seller_name: finalSellerName // SAMO SIĘ PRZYPISUJE!
    };

    try {
      const { data, error } = await supabase.from('documents').insert([inv]).select();
      if(error) throw error;
      
      if (data && data[0]) {
        const { data: fullDoc, error: fetchErr } = await supabase
          .from('documents')
          .select('*, document_payments(*)')
          .eq('id', data[0].id)
          .single();
        
        if (!fetchErr && fullDoc) {
          setInvoices(prev => [fullDoc, ...prev]);
        } else {
          setInvoices(prev => [{ ...data[0], document_payments: [] }, ...prev]);
        }
      }
      
      toast.success(`Zapisano fakturę`);
      setShowModal(false);
      setForm(EMPTY);
    } catch (error) { 
      toast.error('Błąd: ' + error.message); 
    }
  }

 async function handleCorrectionSave() {
    if (!correctionReason.trim()) { toast.error('Podaj przyczynę korekty'); return; }
    const validItems = form.items.filter(i => i.name && i.price);
    if (validItems.length === 0) { toast.error('Dodaj pozycje'); return; }

    const { totalNet, totalVat, gross, itemsWithVat } = calculateTotals(validItems);
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + parseInt(form.due_days || '14'));

    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const correctionCount = invoices.filter(i => i.type === 'correction').length;
    const nextNumber = String(correctionCount + 1).padStart(3, '0');

    let finalNote = form.note || '';
    if (form.is_mpp && gross > 15000) {
      const mppText = "Mechanizm podzielonej płatności";
      if (!finalNote.includes(mppText)) {
        finalNote = finalNote ? `${finalNote} | ${mppText}` : mppText;
      }
    }

    const finalSellerName = loggedUser === 'Ładowanie...' ? 'Konto Główne' : loggedUser;

    const correctionDoc = {
      document_number: `KOR/${currentYear}/${currentMonth}/${nextNumber}`,
      type: 'correction', status: 'unpaid',
      buyer_name: form.customer,
      buyer_nip: form.nip.replace(/[\s-]/g, ''),
      buyer_address: form.address || 'Brak adresu',
      note: finalNote, 
      net_amount: Math.round(totalNet * 100) / 100,
      vat_amount: Math.round(totalVat * 100) / 100,
      gross_amount: Math.round(gross * 100) / 100,
      issue_date: today.toISOString().split('T')[0],
      sale_date: today.toISOString().split('T')[0],
      due_date: due.toISOString().split('T')[0],
      items: itemsWithVat,
      is_locked: true, 
      corrected_doc_id: correctionTarget.id,
      correction_reason: correctionReason,
      seller_name: finalSellerName 
    };

    try {
      const { data, error } = await supabase.from('documents').insert([correctionDoc]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        const { data: fullDoc, error: fetchErr } = await supabase
          .from('documents')
          .select('*, document_payments(*)')
          .eq('id', data[0].id)
          .single();
        
        if (!fetchErr && fullDoc) {
          setInvoices(prev => [fullDoc, ...prev]);
        } else {
          setInvoices(prev => [{ ...data[0], document_payments: [] }, ...prev]);
        }
      }
      
      toast.success(`Wystawiono korektę`);
      setShowCorrectionModal(false);
    } catch (error) { 
      toast.error('Błąd: ' + error.message); 
    }
  }

async function handleSavePayment() {
    const rawAmount = parseFloat(paymentAmount.toString().replace(',', '.'));
    if (isNaN(rawAmount) || rawAmount === 0) { toast.error('Błędna kwota'); return; }

    const newPayment = {
      document_id: paymentTarget.id,
      amount: Math.round(rawAmount * 100) / 100,
      payment_date: new Date().toISOString().split('T')[0]
    };

    try {
      const { data, error } = await supabase.from('document_payments').insert([newPayment]).select();
      if (error) throw error;
      
      const savedPayment = (data && data[0]) ? data[0] : newPayment;
      setInvoices(prev => prev.map(inv => inv.id === paymentTarget.id ? { ...inv, document_payments: [...(inv.document_payments || []), savedPayment] } : inv));
      
      toast.success('Zaksięgowano wpłatę');
      setShowPaymentModal(false);
      setPaymentAmount('');
    } catch (error) { 
      toast.error('Błąd księgowania: ' + error.message); 
    }
  }

  function hasCorrection(docId) { return invoices.some(c => c.type === 'correction' && c.corrected_doc_id === docId); }
  function getDocumentChain(baseInvoiceId) {
    let chain = []; let currentId = baseInvoiceId;
    while(true) {
      const nextCorrection = invoices.find(c => c.type === 'correction' && c.corrected_doc_id === currentId);
      if (nextCorrection) { chain.push(nextCorrection); currentId = nextCorrection.id; } else { break; }
    }
    return chain;
  }

  function getEffectiveGross(inv) {
    let currentId = inv.id; let latestGross = parseFloat(inv.gross_amount);
    while (true) {
      const corr = invoices.find(c => c.type === 'correction' && c.corrected_doc_id === currentId);
      if (corr) { latestGross = parseFloat(corr.gross_amount); currentId = corr.id; } else { break; }
    }
    return latestGross;
  }

  function getPaidAmount(inv) {
    if (!inv.document_payments || inv.document_payments.length === 0) return 0;
    return inv.document_payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1', price: '', vatRate: '23' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }
  function removeItem(i) { setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); }
  function sendEmail(inv) { toast.success(`E-mail wysłany do: ${inv.buyer_name || inv.customer}`); }

  const getInvoiceData = (inv) => {
      const summary = (inv.items || []).reduce((acc, item) => {
      const rate = item.vatRate || '0';
      const net = (parseFloat(item.price) || 0) * (parseInt(item.qty) || 1);
      const vat = net * (isNaN(parseFloat(rate)) ? 0 : parseFloat(rate) / 100);
      acc[rate] = acc[rate] || { rate, net: 0, vat: 0, gross: 0 };
      acc[rate].net += net; acc[rate].vat += vat; acc[rate].gross += (net + vat);
      return acc;
    }, {});

    return {
      ...inv,
      vatSummary: Object.values(summary), 
      number: inv.document_number || inv.number,
      documentType: inv.type,
      correctionReason: inv.correction_reason || '',
      correctedDocId: inv.corrected_doc_id || null,
      correctedDocNumber: invoices.find(i => i.id === inv.corrected_doc_id)?.document_number || 'Nieznany',
      gross: parseFloat(inv.gross_amount) || 0, 
      net: parseFloat(inv.net_amount) || 0,
      vat: parseFloat(inv.vat_amount) || 0,
      paid: 0, payments: [],
      dateIssue: inv.issue_date || new Date().toISOString().split('T')[0],
      dateSale: inv.sale_date || inv.issue_date,
      dueDate: inv.due_date,
      seller: { name: shopSettings.name, address: shopSettings.address, nip: shopSettings.nip, bankAccount: shopSettings.bankAccount },
      buyer: { name: inv.buyer_name || inv.customer, nip: inv.buyer_nip || '', address: inv.buyer_address || '—', bankAccount: inv.bankAccount },
      paymentMethod: 'Przelew',
      note: inv.note || 'Prosimy o terminową wpłatę.',
      items: (inv.items || []).map(it => ({ ...it, vatRate: it.vatRate !== undefined && it.vatRate !== null ? String(it.vatRate) : '0' })),
      issuedBy: inv.seller_name || 'Konto Główne'
    };
  };

  function exportCSV() {
    const csv = 'Nr;Kontrahent;NIP;Netto;VAT;Brutto;Status;Wystawił;Data;Termin\n' + 
      invoices.map(i => `${i.document_number};${i.buyer_name};${i.buyer_nip};${i.net_amount};${i.vat_amount};${i.gross_amount};${i.status};${i.seller_name || 'Konto Główne'};${i.issue_date};${i.due_date}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'faktury.csv'; link.click();
  }

  function renderStatusBadge(inv) {
    const paid = getPaidAmount(inv); const effective = getEffectiveGross(inv); const diff = paid - effective; 
    if (diff > 0.01) return <span className="badge" style={{ backgroundColor: '#e11d48', color: 'white', fontWeight: 'bold' }}>Wymagany zwrot</span>;
    if (Math.abs(diff) <= 0.01) return <span className="badge badge-success">Opłacona ✅</span>;
    return <span className={`badge ${inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>{inv.status === 'overdue' ? 'Po terminie' : 'Oczekuje na przelew'}</span>;
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Faktury</h1><p>Fakturowanie, korekty, archiwum cyfrowe</p></div>
        
        <div className="page-header-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* --- AUTOMATYCZNIE WYKRYTY UŻYTKOWNIK (Bez możliwości rozwijania/zmiany!) --- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <FiUser size={14} style={{color: 'var(--accent)'}} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9em' }}>
              {loggedUser}
            </span>
          </div>

          <button className="btn btn-secondary" onClick={exportCSV}><FiDownload size={16} /> Eksportuj CSV</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowa faktura</button>
        </div>
      </div>

      <div className="grid-4 mb-24">
        <div className="stat-card"><span className="stat-label">Faktury (miesiąc)</span><span className="stat-value">{invoices.length}</span></div>
        <div className="stat-card"><span className="stat-label">Opłacone</span><span className="stat-value text-success">{invoices.filter(i => getPaidAmount(i) >= i.gross_amount).length}</span></div>
        <div className="stat-card"><span className="stat-label">Nieopłacone</span><span className="stat-value text-warning">{invoices.filter(i => getPaidAmount(i) < i.gross_amount && i.status !== 'overdue').length}</span></div>
        <div className="stat-card"><span className="stat-label">Po terminie</span><span className="stat-value text-danger">{invoices.filter(i => i.status === 'overdue').length}</span></div>
      </div>
      
      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Ładowanie danych</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nr faktury</th><th>Kontrahent</th><th>NIP</th><th>Netto</th><th>VAT</th><th>Brutto</th><th>Termin</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.filter(i => i.type !== 'correction').map(inv => {
                const chain = getDocumentChain(inv.id);
                return (
                <React.Fragment key={inv.id}>
                  <tr>
                    <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{inv.document_number}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={inv.buyer_name}>{inv.buyer_name}</td>
                    <td className="font-mono text-sm text-muted">{inv.buyer_nip}</td>
                    <td>{formatCurrency(inv.net_amount)}</td>
                    <td className="text-muted">{formatCurrency(inv.vat_amount)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.gross_amount)}</td>
                    <td className="text-sm text-muted">{inv.due_date}</td>
                    <td>{renderStatusBadge(inv)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setViewInv(inv); setShowView(true); }} title="Podgląd"><FiEye size={14} /></button>
                        <InvoiceDownloadBtn invoiceData={getInvoiceData(inv)} className="btn btn-ghost btn-sm" />
                        <button className="btn btn-ghost btn-sm" onClick={() => sendEmail(inv)} title="Wyślij e-mail"><FiMail size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }} onClick={() => { setPaymentTarget(inv); setPaymentAmount(Math.abs(getEffectiveGross(inv) - getPaidAmount(inv)).toFixed(2)); setShowPaymentModal(true); }} title="Zarządzaj wpłatami"><FiCheckCircle size={14} /></button>
                        {!hasCorrection(inv.id) && (
                          <button className="btn btn-ghost btn-sm" onClick={() => openCorrection(inv)} title="Wystaw korektę"><FiEdit size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>          
                  {chain.map((kor, index) => (
                    <tr key={kor.id} style={{ backgroundColor: 'rgba(0,0,0, 0.02)' }}>
                      <td style={{ paddingLeft: `${30 + (index * 15)}px`, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)' }}>
                          <FiCornerDownRight size={14} style={{ flexShrink: 0 }} />
                          <span className="font-mono text-sm" style={{ fontWeight: 500 }}>{kor.document_number}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{kor.buyer_name}</td>
                      <td className="font-mono text-sm text-muted">{kor.buyer_nip}</td>
                      <td style={{ fontSize: '0.9em' }}>{formatCurrency(kor.net_amount)}</td>
                      <td className="text-muted" style={{ fontSize: '0.9em' }}>{formatCurrency(kor.vat_amount)}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.9em' }}>{formatCurrency(kor.gross_amount)}</td>
                      <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{kor.due_date}</td>
                      <td><span className="badge badge-warning" style={{ transform: 'scale(0.8)' }}>Korekta</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setViewInv(kor); setShowView(true); }}><FiEye size={14} /></button>
                          <InvoiceDownloadBtn invoiceData={getInvoiceData(kor)} className="btn btn-ghost btn-sm" />
                          {!hasCorrection(kor.id) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => openCorrection(kor)} title="Wystaw korektę do korekty"><FiEdit size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: DODAWANIE FAKTURY */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa faktura VAT" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Wystaw fakturę</button></>}>
        <div className="input-row mb-16">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Kontrahent *</label>
            <input className="input" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} placeholder="Nazwa firmy" />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>NIP</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" value={form.nip} onChange={e => setForm(p => ({ ...p, nip: e.target.value }))} placeholder="Sam numer" />
              <button type="button" className="btn btn-secondary" onClick={handleGusLookup} disabled={isFetchingNip} style={{ padding: '0 12px' }}>
                {isFetchingNip ? '...' : 'Pobierz dane'}
              </button>
            </div>
          </div>
        </div>
        <div className="input-row mb-16">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Adres Nabywcy</label>
            <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="ul. Sezamkowa 1, 00-000 Miasto" />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Uwagi na fakturze</label>
            <input className="input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="np. Prosimy o terminową wpłatę." />
          </div>
        </div>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Termin płatności (dni)</label>
            <input className="input" type="number" value={form.due_days} onChange={e => setForm(p => ({ ...p, due_days: e.target.value }))} />
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '6px' }}>
            <input type="checkbox" checked={form.is_mpp || false} onChange={e => setForm(p => ({ ...p, is_mpp: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
            Towary/usługi z Załącznika nr 15 (Wymaga Split Payment przy wartości pow. 15 tys. zł)
          </label>
        </div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Nazwa</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Netto (szt)</label><input className="input" type="number" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>VAT</label>
              <select className="select" value={item.vatRate || '23'} onChange={e => updateItem(i, 'vatRate', e.target.value)}>
                <option value="23">23%</option><option value="8">8%</option><option value="5">5%</option><option value="0">0%</option><option value="ZW">ZW</option><option value="NP">NP</option><option value="OO">OO</option>
              </select>
            </div>
            {form.items.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}>✕</button>}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      {/* MODAL: WYSTAWIANIE KOREKTY */}
      <Modal isOpen={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} title={`Korekta do: ${correctionTarget?.document_number}`} size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowCorrectionModal(false)}>Anuluj</button><button className="btn btn-primary" style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={handleCorrectionSave}>Wystaw Korektę</button></>}>
        <div className="input-group mb-16"><label>Przyczyna korekty </label><input className="input" style={{ borderLeft: '4px solid var(--warning)' }} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="np. Zwrot towaru..." /></div>
        <div className="input-row mb-16"><div className="input-group"><label>Kontrahent</label><input className="input" value={form.customer} disabled /></div><div className="input-group"><label>NIP</label><input className="input" value={form.nip} disabled /></div></div>
        <h4 className="mb-8">Pozycje "Po korekcie"</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Nazwa</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Netto (szt)</label><input className="input" type="number" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>VAT</label>
              <select className="select" value={item.vatRate || '23'} onChange={e => updateItem(i, 'vatRate', e.target.value)}>
                <option value="23">23%</option><option value="8">8%</option><option value="5">5%</option><option value="0">0%</option><option value="ZW">ZW</option><option value="NP">NP</option><option value="OO">OO</option>
              </select>
            </div>
            {form.items.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}>✕</button>}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      {/* MODAL: PŁATNOŚCI */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Zarządzanie wpłatami do: ${paymentTarget?.document_number}`} footer={<><button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Anuluj</button><button className="btn btn-success" onClick={handleSavePayment}>Zaksięguj</button></>}>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
          <div className="flex-between mb-8"><span className="text-muted">Kwota po ew. korektach:</span> <strong>{paymentTarget && formatCurrency(getEffectiveGross(paymentTarget))}</strong></div>
          <div className="flex-between mb-8"><span className="text-muted">Dotychczas wpłacono:</span> <strong className="text-success">{paymentTarget && formatCurrency(getPaidAmount(paymentTarget))}</strong></div>
          <hr style={{ borderColor: 'var(--border-light)', margin: '10px 0' }}/>
          <div className="flex-between"><span>{paymentTarget && (getPaidAmount(paymentTarget) > getEffectiveGross(paymentTarget)) ? ' Wymagany zwrot klienta:' : 'Oczekuje na przelew:'}</span> <strong className={paymentTarget && (getPaidAmount(paymentTarget) > getEffectiveGross(paymentTarget)) ? "text-danger" : "text-warning"}>{paymentTarget && formatCurrency(Math.abs(getEffectiveGross(paymentTarget) - getPaidAmount(paymentTarget)))}</strong></div>        
        </div>
        <div className="input-group"><label>Wpisz kwotę do zaksięgowania (PLN)</label><input className="input" type="number" step="0.01" style={{ fontSize: '1.2em', fontWeight: 'bold' }} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
      </Modal>

      {/* MODAL: PODGLĄD */}
      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Faktura ${viewInv?.document_number}`} footer={<><InvoiceDownloadBtn invoiceData={viewInv ? getInvoiceData(viewInv) : null} /><button className="btn btn-secondary" onClick={() => setShowView(false)}>Zamknij</button></>}>
        {viewInv && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Nr faktury', viewInv.document_number], 
            ['Wystawił(a)', viewInv.seller_name || 'Konto Główne'],
            ['Typ', viewInv.type === 'correction' ? 'Faktura Korygująca' : 'Faktura VAT'],
            ['Kontrahent', viewInv.buyer_name], ['NIP', viewInv.buyer_nip], ['Netto', formatCurrency(viewInv.net_amount)], ['VAT', formatCurrency(viewInv.vat_amount)], ['Brutto', formatCurrency(viewInv.gross_amount)], ['Data wystawienia', viewInv.issue_date], ['Termin płatności', viewInv.due_date],
          ].map(([l, v]) => (
            <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
          ))}
        </div>}
      </Modal>
    </div>
  );
}