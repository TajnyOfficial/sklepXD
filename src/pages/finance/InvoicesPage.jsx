import { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiFileText, FiPlus, FiDownload, FiEye, FiMail, FiTrash2, FiPrinter } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const INIT_INVOICES = [
  { id: '1', number: 'FV/2026/03/001', customer: 'Budmax Sp. z o.o.', nip: '5213456789', net: 2349.59, vat: 540.41, gross: 2890.00, status: 'paid', date: '2026-03-12', due: '2026-03-26' },
  { id: '2', number: 'FV/2026/03/002', customer: 'ElektroMont S.A.', nip: '1234567890', net: 4609.76, vat: 1060.24, gross: 5670.00, status: 'unpaid', date: '2026-03-11', due: '2026-03-25' },
  { id: '3', number: 'FV/2026/03/003', customer: 'Remont-Expert Jan Kowal', nip: '7891234560', net: 939.84, vat: 216.16, gross: 1156.00, status: 'paid', date: '2026-03-11', due: '2026-03-18' },
  { id: '4', number: 'FV/2026/02/022', customer: 'Dom i Ogród Sp.j.', nip: '9876543210', net: 2780.49, vat: 639.51, gross: 3420.00, status: 'overdue', date: '2026-02-20', due: '2026-03-06' },
];
const EMPTY = { customer: '', nip: '', net: '', vat_rate: '23', due_days: '14', items: [{ name: '', qty: '1', price: '' }] };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(INIT_INVOICES);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewInv, setViewInv] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', qty: '1', price: '' }] })); }
  function updateItem(i, f, v) { setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) })); }
  function removeItem(i) { setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); }

  function handleSave() {
    if (!form.customer) { toast.error('Podaj kontrahenta'); return; }
    const validItems = form.items.filter(i => i.name && i.price);
    if (validItems.length === 0) { toast.error('Dodaj pozycje'); return; }
    const net = validItems.reduce((s, i) => s + parseFloat(i.price) * parseInt(i.qty || 1), 0);
    const vatRate = parseFloat(form.vat_rate) / 100;
    const vat = net * vatRate;
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + parseInt(form.due_days));
    const inv = { id: crypto.randomUUID(), number: `FV/2026/03/${String(invoices.length + 1).padStart(3, '0')}`, customer: form.customer, nip: form.nip, net: Math.round(net * 100) / 100, vat: Math.round(vat * 100) / 100, gross: Math.round((net + vat) * 100) / 100, status: 'unpaid', date: today.toISOString().split('T')[0], due: due.toISOString().split('T')[0], items: validItems };
    setInvoices(prev => [inv, ...prev]);
    toast.success(`Faktura ${inv.number} wystawiona`);
    setShowModal(false); setForm(EMPTY);
  }

  function markPaid(id) { setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i)); toast.success('Oznaczono jako opłaconą'); }
  function sendEmail(inv) { toast.success(`E-mail wysłany do: ${inv.customer}`); }
  function printInvoice(inv) {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${inv.number}</title><style>body{font-family:Arial;padding:40px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ccc;padding:8px}th{background:#f5f5f5}.text-right{text-align:right}</style></head><body><h1>FAKTURA VAT</h1><h2>${inv.number}</h2><p>Data: ${inv.date} | Termin: ${inv.due}</p><p><strong>Nabywca:</strong> ${inv.customer}${inv.nip ? ` | NIP: ${inv.nip}` : ''}</p><table><tr><td>Netto:</td><td class="text-right">${formatCurrency(inv.net)}</td></tr><tr><td>VAT:</td><td class="text-right">${formatCurrency(inv.vat)}</td></tr><tr><td><strong>Brutto:</strong></td><td class="text-right"><strong>${formatCurrency(inv.gross)}</strong></td></tr></table><p>Status: ${inv.status === 'paid' ? 'OPŁACONA' : 'DO ZAPŁATY'}</p></body></html>`);
    win.document.close(); win.print();
  }
  function handleDelete(inv) { if (!confirm(`Usunąć fakturę ${inv.number}?`)) return; setInvoices(prev => prev.filter(i => i.id !== inv.id)); toast.success('Faktura usunięta'); }
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
                  <button className="btn btn-ghost btn-sm" onClick={() => printInvoice(inv)}><FiPrinter size={14} /></button>
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

      <Modal isOpen={showView} onClose={() => setShowView(false)} title={`Faktura ${viewInv?.number}`} footer={<><button className="btn btn-secondary" onClick={() => printInvoice(viewInv)}>Drukuj</button><button className="btn btn-primary" onClick={() => setShowView(false)}>Zamknij</button></>}>
        {viewInv && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Nr faktury', viewInv.number], ['Kontrahent', viewInv.customer], ['NIP', viewInv.nip], ['Netto', formatCurrency(viewInv.net)], ['VAT', formatCurrency(viewInv.vat)], ['Brutto', formatCurrency(viewInv.gross)], ['Data wystawienia', viewInv.date], ['Termin płatności', viewInv.due], ['Status', viewInv.status === 'paid' ? 'Opłacona ✅' : viewInv.status === 'overdue' ? 'Po terminie ⚠️' : 'Nieopłacona']].map(([l, v]) => (
            <div key={l} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}><span className="text-sm text-muted">{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
          ))}
        </div>}
      </Modal>
    </div>
  );
}
