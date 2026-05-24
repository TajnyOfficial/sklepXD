import { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { FiPlus, FiCamera, FiEdit, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const INIT = [
  { id: '1', category: 'Zaopatrzenie', supplier: 'Hurtownia Śrub Polskie', desc: 'FZ/2026/03/001 — Śruby i złączki', amount: 2450.00, vat: 563.50, date: '2026-03-12', paid: true },
  { id: '2', category: 'Stałe opłaty', supplier: 'PGE Energia', desc: 'Faktura za energię 02/2026', amount: 1850.00, vat: 425.50, date: '2026-03-05', paid: true },
  { id: '3', category: 'Stałe opłaty', supplier: 'Właściciel lokalu', desc: 'Czynsz marzec 2026', amount: 4500.00, vat: 1035.00, date: '2026-03-01', paid: true },
  { id: '4', category: 'Marketing', supplier: 'Drukarnia Express', desc: 'Gazetka promocyjna marzec', amount: 680.00, vat: 156.40, date: '2026-03-08', paid: false },
  { id: '5', category: 'Serwis urządzeń', supplier: 'IT-Serwis Sp. z o.o.', desc: 'Serwis drukarki fiskalnej', amount: 350.00, vat: 80.50, date: '2026-03-10', paid: true },
  { id: '6', category: 'Zaopatrzenie', supplier: 'Dekoral Dystrybucja', desc: 'FZ/2026/03/003 — Farby i lakiery', amount: 4200.00, vat: 966.00, date: '2026-03-14', paid: false },
];
const CATS = ['Zaopatrzenie', 'Stałe opłaty', 'Marketing', 'Serwis urządzeń', 'Wynagrodzenia', 'Podatki', 'Inne'];
const EMPTY = { category: 'Zaopatrzenie', supplier: '', desc: '', amount: '', vat_rate: '23', date: new Date().toISOString().split('T')[0] };

/**
 * Widok modułu ExpensesPage.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z Expenses.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony ExpensesPage
 */
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(INIT);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(e) { setEditing(e); setForm({ category: e.category, supplier: e.supplier, desc: e.desc, amount: String(e.amount), vat_rate: e.vat ? String(Math.round(e.vat / e.amount * 100)) : '23', date: e.date }); setShowModal(true); }
  function handleSave() {
    if (!form.supplier || !form.amount) { toast.error('Wypełnij dostawcę i kwotę'); return; }
    const amt = parseFloat(form.amount); const vat = amt * (parseFloat(form.vat_rate) / 100);
    const exp = { id: editing?.id || crypto.randomUUID(), category: form.category, supplier: form.supplier, desc: form.desc, amount: amt, vat: Math.round(vat * 100) / 100, date: form.date, paid: editing?.paid || false };
    if (editing) { setExpenses(prev => prev.map(e => e.id === editing.id ? exp : e)); toast.success('Koszt zaktualizowany'); }
    else { setExpenses(prev => [exp, ...prev]); toast.success('Koszt dodany'); }
    setShowModal(false);
  }
  function togglePaid(id) { setExpenses(prev => prev.map(e => e.id === id ? { ...e, paid: !e.paid } : e)); toast.success('Status płatności zmieniony'); }
  function handleDelete(e) { if (!confirm(`Usunąć "${e.desc}"?`)) return; setExpenses(prev => prev.filter(x => x.id !== e.id)); toast.success('Koszt usunięty'); }
  function handleOCR() { toast('📸 Funkcja OCR — zeskanuj fakturę aparatem aby automatycznie wczytać dane', { duration: 3000, icon: '📷' }); openAdd(); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Koszty i wydatki</h1><p>Rejestr faktur kosztowych z kategoryzacją</p></div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={handleOCR}><FiCamera size={16} /> OCR — Skanuj</button>
          <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Dodaj koszt</button>
        </div>
      </div>
      <div className="grid-2 mb-24" style={{ gap: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}><span className="stat-label">Koszty łącznie (miesiąc)</span><span className="stat-value">{formatCurrency(total)}</span></div>
        <div className="card">
          <h4 className="mb-8">Podział na kategorie</h4>
          {[...new Set(expenses.map(e => e.category))].map(cat => {
            const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
            return (<div key={cat} className="flex-between mb-8"><span className="text-sm">{cat}</span><div className="flex gap-8" style={{ alignItems: 'center' }}><div className="progress-bar" style={{ width: 120 }}><div className="progress-bar-fill" style={{ width: `${(catTotal / total) * 100}%` }} /></div><span className="text-sm font-bold">{formatCurrency(catTotal)}</span></div></div>);
          })}
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Kategoria</th><th>Dostawca</th><th>Opis</th><th>Netto</th><th>VAT</th><th>Data</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td><span className="badge badge-ghost">{e.category}</span></td>
                <td>{e.supplier}</td><td className="text-sm">{e.desc}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td><td className="text-muted">{formatCurrency(e.vat)}</td>
                <td className="text-sm text-muted">{e.date}</td>
                <td><button className={`badge ${e.paid ? 'badge-success' : 'badge-warning'}`} onClick={() => togglePaid(e.id)} style={{ cursor: 'pointer', border: 'none' }}>{e.paid ? 'Opłacona' : 'Do zapłaty'}</button></td>
                <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}><FiEdit size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e)}><FiTrash2 size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj koszt' : 'Nowy koszt'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Kategoria</label><select className="select" value={form.category} onChange={F('category')}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="input-group"><label>Data</label><input className="input" type="date" value={form.date} onChange={F('date')} /></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Dostawca / Odbiorca *</label><input className="input" value={form.supplier} onChange={F('supplier')} /></div></div>
        <div className="input-group mb-16"><label>Opis</label><input className="input" value={form.desc} onChange={F('desc')} placeholder="Nr faktury, opis..." /></div>
        <div className="input-row"><div className="input-group"><label>Kwota netto *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={F('amount')} /></div><div className="input-group"><label>Stawka VAT (%)</label><select className="select" value={form.vat_rate} onChange={F('vat_rate')}><option value="23">23%</option><option value="8">8%</option><option value="5">5%</option><option value="0">0%</option></select></div></div>
      </Modal>
    </div>
  );
}
