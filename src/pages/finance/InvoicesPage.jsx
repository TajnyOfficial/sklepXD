import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiFileText, FiPlus, FiDownload, FiEye, FiMail, FiTrash2, FiPrinter } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { InvoiceDownloadBtn } from '../../components/Invoice/InvoiceDownloadBtn';

const EMPTY = { customer: '', nip: '', net: '', vat_rate: '23', due_days: '14', items: [{ name: '', qty: '1', price: '' }] };

/**
 * Widok modułu InvoicesPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Invoices.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony InvoicesPage
 */
export default function InvoicesPage() {
  const { shopSettings, documents = [], saveDocument, updateDocumentStatus, addPosLog, profile } = useStore();
  const invoices = documents.filter(d => d.type === 'invoice' || d.id?.startsWith('FV') || d.document_number?.startsWith('FV')).map(d => ({
    ...d,
    id: d.id,
    number: d.document_number || d.id,
    customer: d.buyer?.name || d.customer,
    nip: d.buyer?.nip || d.nip,
    net: d.net_amount || d.net || 0,
    vat: d.vat_amount || d.vat || 0,
    gross: d.gross_amount || d.gross || d.total || 0,
    status: d.status || 'unpaid',
    date: d.issue_date || d.date,
    due: d.due_date || d.due,
    items: d.items || []
  }));
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewInv, setViewInv] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1', price: '' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }
  function removeItem(i) { setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); }

  async function handleSave() {
    if (!form.customer) { toast.error('Podaj kontrahenta'); return; }
    const validItems = form.items.filter(i => i.name && i.price);
    if (validItems.length === 0) { toast.error('Dodaj pozycje'); return; }
    const net = validItems.reduce((s, i) => s + parseFloat(i.price) * parseInt(i.qty || 1), 0);
    const vatRate = parseFloat(form.vat_rate) / 100;
    const vat = net * vatRate;
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + parseInt(form.due_days));
    const docData = { 
      id: `FV/2026/03/${String(invoices.length + 1).padStart(3, '0')}`,
      type: 'invoice',
      customer: form.customer, 
      nip: form.nip, 
      net: Math.round(net * 100) / 100, 
      vat: Math.round(vat * 100) / 100, 
      total: Math.round((net + vat) * 100) / 100, 
      status: 'unpaid', 
      date: today.toISOString().split('T')[0], 
      date_due: due.toISOString().split('T')[0], 
      items: validItems,
      buyer: { name: form.customer, nip: form.nip }
    };
    
    try {
      await saveDocument(docData);
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('create', userLabel, 'Admin', `Wystawiono nową fakturę: ${docData.id} dla ${docData.customer}`);
      toast.success(`Faktura ${docData.id} wystawiona`);
      setShowModal(false); setForm(EMPTY);
    } catch(e) {
      toast.error('Błąd zapisu faktury: ' + e.message);
    }
  }

  async function markPaid(id) { 
    try {
      await updateDocumentStatus(id, 'paid'); 
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('update', userLabel, 'Admin', `Opłacono fakturę`);
      toast.success('Oznaczono jako opłaconą'); 
    } catch(e) {
      toast.error('Błąd: ' + e.message);
    }
  }
  function sendEmail(inv) { toast.success(`E-mail wysłany do: ${inv.customer}`); }

  // Mapowanie danych z tabeli do formatu faktury
  const getInvoiceData = (inv) => ({
    ...inv,
    seller: {
      name: shopSettings.name,
      address: shopSettings.address,
      nip: shopSettings.nip,
      bankAccount: shopSettings.bankAccount
    },
    buyer: {
      name: inv.customer,
      nip: inv.nip || '',
      address: inv.buyer?.address || '—'
    },
    dateIssue: new Date().toISOString().split('T')[0], // data wystawienia = dziś
    dateSale: inv.date, // data sprzedaży = z dokumentu
    dueDate: inv.date, // termin płatności = data sprzedaży (wg życzenia)
    paymentMethod: inv.payment_method || 'Przelew',
    items: inv.items || [
      { name: 'Towar/Usługa (zestawienie)', qty: 1, unitPriceNet: inv.net, vatRate: 23, unit: 'usł.' }
    ]
  });
  async function handleDelete(inv) { 
    if (!confirm(`Anulować fakturę ${inv.number}?`)) return; 
    try {
      await updateDocumentStatus(inv.id, 'cancelled');
      const userLabel = profile ? profile.full_name : 'System';
      addPosLog('update', userLabel, 'Admin', `Anulowano fakturę ${inv.number}`);
      toast.success('Faktura anulowana');
    } catch(e) {}
  }
  function exportCSV() {
    const csv = 'Nr;Kontrahent;NIP;Netto;VAT;Brutto;Status;Data;Termin\n' + invoices.map(i => `${i.number};${i.customer};${i.nip};${i.net};${i.vat};${i.gross};${i.status};${i.date};${i.due}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'faktury.csv'; link.click();
    toast.success('Eksport CSV pobrany');
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Faktury</h1><p>Fakturowanie, korekty, archiwum cyfrowe</p></div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={exportCSV}><FiDownload size={16} /> Eksportuj CSV</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true); }}><FiPlus size={16} /> Nowa faktura</button>
        </div>
      </div>
      <div className="grid-4 mb-24">
        <div className="stat-card"><span className="stat-label">Faktury (miesiąc)</span><span className="stat-value">{invoices.length}</span></div>
        <div className="stat-card"><span className="stat-label">Opłacone</span><span className="stat-value text-success">{invoices.filter(i => i.status === 'paid').length}</span></div>
        <div className="stat-card"><span className="stat-label">Nieopłacone</span><span className="stat-value text-warning">{invoices.filter(i => i.status === 'unpaid').length}</span></div>
        <div className="stat-card"><span className="stat-label">Po terminie</span><span className="stat-value text-danger">{invoices.filter(i => i.status === 'overdue').length}</span></div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Nr faktury</th><th>Kontrahent</th><th>NIP</th><th>Netto</th><th>VAT</th><th>Brutto</th><th>Termin</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{inv.number}</td>
                <td>{inv.customer}</td>
                <td className="font-mono text-sm text-muted">{inv.nip}</td>
                <td>{formatCurrency(inv.net)}</td>
                <td className="text-muted">{formatCurrency(inv.vat)}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(inv.gross)}</td>
                <td className="text-sm text-muted">{inv.due}</td>
                <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>{inv.status === 'paid' ? 'Opłacona' : inv.status === 'overdue' ? 'Po terminie' : 'Nieopłacona'}</span></td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setViewInv(inv); setShowView(true); }}><FiEye size={14} /></button>
                  <InvoiceDownloadBtn 
                    invoiceData={getInvoiceData(inv)} 
                    className="btn btn-ghost btn-sm"
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => sendEmail(inv)}><FiMail size={14} /></button>
                  {inv.status !== 'paid' && <button className="btn btn-success btn-sm" onClick={() => markPaid(inv.id)}>Opłać</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(inv)}><FiTrash2 size={14} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowa faktura VAT" size="modal-lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>Wystaw fakturę</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Kontrahent *</label><input className="input" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} placeholder="Nazwa firmy" /></div><div className="input-group"><label>NIP</label><input className="input" value={form.nip} onChange={e => setForm(p => ({ ...p, nip: e.target.value }))} /></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Stawka VAT (%)</label><select className="select" value={form.vat_rate} onChange={e => setForm(p => ({ ...p, vat_rate: e.target.value }))}><option value="23">23%</option><option value="8">8%</option><option value="5">5%</option><option value="0">0% (zw.)</option></select></div><div className="input-group"><label>Termin płatności (dni)</label><input className="input" type="number" value={form.due_days} onChange={e => setForm(p => ({ ...p, due_days: e.target.value }))} /></div></div>
        <h4 className="mb-8">Pozycje</h4>
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-8 mb-8" style={{ alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 3 }}><label>Nazwa</label><input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Ilość</label><input className="input" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>Cena netto</label><input className="input" type="number" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} /></div>
            {form.items.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}>✕</button>}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}><FiPlus size={14} /> Dodaj pozycję</button>
      </Modal>

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Faktura ${viewInv?.number}`} footer={<><InvoiceDownloadBtn invoiceData={viewInv ? getInvoiceData(viewInv) : null} /><button className="btn btn-secondary" onClick={() => setShowView(false)}>Zamknij</button></>}>
        {viewInv && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Nr faktury', viewInv.number], ['Kontrahent', viewInv.customer], ['NIP', viewInv.nip], ['Netto', formatCurrency(viewInv.net)], ['VAT', formatCurrency(viewInv.vat)], ['Brutto', formatCurrency(viewInv.gross)], ['Data wystawienia', viewInv.date], ['Termin płatności', viewInv.due], ['Status', viewInv.status === 'paid' ? 'Opłacona ✅' : viewInv.status === 'overdue' ? 'Po terminie ⚠️' : 'Nieopłacona']].map(([l, v]) => (
            <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
          ))}
        </div>}
      </Modal>
    </div>
  );
}
