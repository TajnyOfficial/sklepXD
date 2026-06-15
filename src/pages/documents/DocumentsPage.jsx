import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, generateDocNumber } from '../../utils/helpers';
import {
  FiFileText, FiSearch, FiDownload, FiMail, FiPrinter,
  FiEye, FiPlus, FiTrash2, FiXCircle
} from 'react-icons/fi';
import Modal from '../../components/Modal';
import { InvoiceDownloadBtn } from '../../components/Invoice/InvoiceDownloadBtn';
import toast from 'react-hot-toast';

// Stałe
const TYPE_MAP = { receipt: 'Paragon', invoice: 'Faktura VAT', proforma: 'Proforma', wz: 'WZ', kp: 'KP', kw: 'KW' };
const TYPE_PREFIX = { receipt: 'PAR', invoice: 'FV', proforma: 'PRO', wz: 'WZ', kp: 'KP', kw: 'KW' };
const TYPE_BADGE = { receipt: 'badge-ghost', invoice: 'badge-primary', proforma: 'badge-info', wz: 'badge-warning', kp: 'badge-success', kw: 'badge-danger' };
const VAT_RATES = ['23', '8', '5', '0', 'zw'];

// Wartości domyślne formularza — pełna struktura faktury
function emptyDoc(profile) {
  return {
    type: 'invoice',
    date_issue: new Date().toISOString().split('T')[0],
    date_sale: new Date().toISOString().split('T')[0],
    date_due: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    payment_method: 'transfer',
    seller: {
      name: 'Sklep Sp. z o.o.',
      address: 'ul. Przykładowa 1, 00-001 Warszawa',
      nip: '1234567890',
      bank: 'Bank Polski S.A.',
      account: 'PL 12 1020 1010 0000 0000 1234 5678',
    },
    buyer: { name: '', address: '', nip: '' },
    items: [{ name: '', qty: '1', unit: 'szt', price_net: '', vat_rate: '23' }],
  };
}

// Komponent wiersza pozycji
function LineItemRow({ item, index, onChange, onRemove, canRemove }) {
  const net = (parseFloat(item.qty) || 0) * (parseFloat(item.price_net) || 0);
  const vat = ['zw'].includes(item.vat_rate) ? 0 : net * (parseFloat(item.vat_rate) / 100);
  const gross = net + vat;

  return (
    <tr>
      <td style={{ paddingRight: 6, color: 'var(--text-muted)', fontSize: '0.8rem', verticalAlign: 'middle' }}>{index + 1}</td>
      <td>
        <input
          className="input"
          style={{ fontSize: '0.85rem' }}
          placeholder="Nazwa towaru / usługi"
          value={item.name}
          onChange={e => onChange(index, 'name', e.target.value)}
        />
      </td>
      <td>
        <input
          className="input"
          style={{ width: 60, textAlign: 'right', fontSize: '0.85rem' }}
          type="number" min="0" step="0.001"
          value={item.qty}
          onChange={e => onChange(index, 'qty', e.target.value)}
        />
      </td>
      <td>
        <select className="select" style={{ fontSize: '0.8rem' }} value={item.unit} onChange={e => onChange(index, 'unit', e.target.value)}>
          {['szt', 'kg', 'm', 'm²', 'L', 'op', 'kpl', 'usł'].map(u => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td>
        <input
          className="input"
          style={{ width: 90, textAlign: 'right', fontSize: '0.85rem' }}
          type="number" min="0" step="0.01"
          placeholder="0.00"
          value={item.price_net}
          onChange={e => onChange(index, 'price_net', e.target.value)}
        />
      </td>
      <td>
        <select className="select" style={{ fontSize: '0.8rem', width: 64 }} value={item.vat_rate} onChange={e => onChange(index, 'vat_rate', e.target.value)}>
          {VAT_RATES.map(r => <option key={r} value={r}>{r === 'zw' ? 'zw.' : `${r}%`}</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatCurrency(net)}</td>
      <td style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600 }}>{formatCurrency(gross)}</td>
      <td>
        {canRemove && (
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(index)} title="Usuń pozycję">
            <FiXCircle size={14} style={{ color: 'var(--danger)' }} />
          </button>
        )}
      </td>
    </tr>
  );
}

// Centralne Archiwum Dokumentów (Paragony, WZ, Faktury). Oferuje zaawansowany kreator nowych faktur oraz podgląd stylizowany na kartkę A4 (Premium Sheet View)
export default function DocumentsPage() {
  const { documents, saveDocument, customers, profile } = useStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [form, setForm] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  function handlePreview(doc) {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
  }

  // Filtrowanie
  const filtered = documents.filter(d => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (search && !d.id.toLowerCase().includes(search.toLowerCase()) &&
      !d.customer?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Obsługa formularza
  function handleAdd() {
    setForm(emptyDoc(profile));
    setShowModal(true);
  }

  function updateItem(index, field, value) {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  }

  function addItem() {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', qty: '1', unit: 'szt', price_net: '', vat_rate: '23' }]
    }));
  }

  function removeItem(index) {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.buyer?.name?.trim()) {
      toast.error('Uzupełnij dane nabywcy');
      return;
    }
    if (!form.items?.length || form.items.every(i => !i.name?.trim())) {
      toast.error('Dodaj co najmniej jedną pozycję na fakturze');
      return;
    }

    const docCount = documents.filter(d => d.type === form.type).length + 1;
    const totalGross = form.items.reduce((sum, item) => {
      const net = (parseFloat(item.qty) || 0) * (parseFloat(item.price_net) || 0);
      const vat = ['zw'].includes(item.vat_rate) ? 0 : net * (parseFloat(item.vat_rate) / 100);
      return sum + net + vat;
    }, 0);

    const newDoc = {
      ...form,
      id: generateDocNumber(TYPE_PREFIX[form.type], docCount),
      customer: form.buyer?.name || '—',
      total: totalGross,
      date: form.date_issue,
      seller: form.seller?.name || profile?.full_name || 'Administrator',
    };

    try {
      await saveDocument(newDoc);
      toast.success(`Dokument ${newDoc.id} został dodany i zapisany w bazie`);
      setShowModal(false);
    } catch (err) {
      toast.error(`Błąd zapisu: ${err.message || 'Sprawdź połączenie z bazą'}`);
    }
  }

  function handleViewPdf(doc) {
    setPdfDoc(doc);
    setShowPdfModal(true);
  }

  // Render
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dokumenty sprzedażowe</h1>
          <p>Paragony, faktury VAT, proformy, WZ, KP, KW</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary"><FiDownload size={16} /> Eksportuj</button>
          <button className="btn btn-primary" onClick={handleAdd}><FiPlus size={16} /> Nowy dokument</button>
        </div>
      </div>

      <div className="flex gap-12 mb-16" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Szukaj po numerze lub kontrahencie..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Wszystkie typy</option>
          {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nr dokumentu</th><th>Typ</th><th>Kontrahent</th><th>Kwota brutto</th><th>Data</th><th>Wystawił</th><th>Akcje</th></tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{d.id}</td>
                <td><span className={`badge ${TYPE_BADGE[d.type]}`}>{TYPE_MAP[d.type]}</span></td>
                <td>{d.customer}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(d.total)}</td>
                <td className="text-sm text-muted">{d.date}</td>
                <td className="text-sm">{d.seller}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" title="Podgląd dokumentu" onClick={() => handlePreview(d)}>
                      <FiEye size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Pobierz PDF" onClick={() => handleViewPdf(d)}>
                      <FiDownload size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Drukuj" onClick={() => handlePreview(d)}><FiPrinter size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>Brak dokumentów</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nowy dokument" size="modal-lg" footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {form && form.type === 'invoice' && (
            <InvoiceDownloadBtn invoiceData={form} />
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>Zapisz dokument</button>
          </div>
        </div>
      }>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Typ dokumentu</label>
                <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Data wystawienia</label>
                <input type="date" className="input" value={form.date_issue} onChange={e => setForm({ ...form, date_issue: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Data sprzedaży</label>
                <input type="date" className="input" value={form.date_sale} onChange={e => setForm({ ...form, date_sale: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Termin płatności</label>
                <input type="date" className="input" value={form.date_due} onChange={e => setForm({ ...form, date_due: e.target.value })} />
              </div>
            </div>

            <div className="input-group">
              <label>Forma płatności</label>
              <select className="select" style={{ maxWidth: 220 }} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                {[['cash', 'Gotówka'], ['card', 'Karta'], ['transfer', 'Przelew bankowy'], ['credit', 'Kredyt']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Sprzedawca</div>
                {[['name', 'Nazwa'], ['address', 'Adres'], ['nip', 'NIP'], ['bank', 'Bank'], ['account', 'Nr konta']].map(([field, label]) => (
                  <div key={field} className="input-group" style={{ marginBottom: 8 }}>
                    <label>{label}</label>
                    <input className="input" value={form.seller?.[field] || ''} onChange={e => setForm({ ...form, seller: { ...form.seller, [field]: e.target.value } })} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Nabywca *</div>
                {[['name', 'Nazwa *'], ['address', 'Adres'], ['nip', 'NIP']].map(([field, label]) => (
                  <div key={field} className="input-group" style={{ marginBottom: 8 }}>
                    <label>{label}</label>
                    {field === 'name' ? (
                      <>
                        <input
                          list="customers-doc-list"
                          className="input"
                          placeholder="Wpisz lub wybierz klienta"
                          value={form.buyer?.[field] || ''}
                          onChange={e => setForm({ ...form, buyer: { ...form.buyer, [field]: e.target.value } })}
                        />
                        <datalist id="customers-doc-list">
                          {customers.map(c => <option key={c.id} value={c.company_name || c.name} />)}
                        </datalist>
                      </>
                    ) : (
                      <input className="input" value={form.buyer?.[field] || ''} onChange={e => setForm({ ...form, buyer: { ...form.buyer, [field]: e.target.value } })} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Pozycje na fakturze *
              </div>
              <div className="table-container" style={{ marginBottom: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>Lp.</th>
                      <th>Nazwa towaru / usługi</th>
                      <th style={{ width: 70, textAlign: 'right' }}>Ilość</th>
                      <th style={{ width: 70 }}>Jed.</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Cena netto</th>
                      <th style={{ width: 72, textAlign: 'center' }}>VAT</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Wart. netto</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Wart. brutto</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <LineItemRow
                        key={i}
                        item={item}
                        index={i}
                        onChange={updateItem}
                        onRemove={removeItem}
                        canRemove={form.items.length > 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addItem}>
                <FiPlus size={14} /> Dodaj pozycję
              </button>
            </div>

          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        title={`Pobierz PDF — ${pdfDoc?.id}`}
        footer={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pdfDoc && <InvoiceDownloadBtn invoiceData={pdfDoc} />}
            <button className="btn btn-secondary" onClick={() => setShowPdfModal(false)}>Zamknij</button>
          </div>
        }
      >
        {pdfDoc && (
          <div style={{ padding: '8px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['Nr dokumentu', pdfDoc.id],
                ['Typ', TYPE_MAP[pdfDoc.type]],
                ['Kontrahent', pdfDoc.customer || pdfDoc.buyer?.name],
                ['Kwota brutto', formatCurrency(pdfDoc.total)],
                ['Data', pdfDoc.date],
                ['Wystawił', pdfDoc.seller],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', width: '40%' }}>{label}</td>
                  <td style={{ padding: '8px 0', fontWeight: 500, fontSize: '0.9rem' }}>{value || '—'}</td>
                </tr>
              ))}
            </table>
            <p style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Kliknij przycisk poniżej aby wygenerować i pobrać plik PDF na dysk.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Podgląd dokumentu — ${previewDoc?.id}`}
        size="modal-lg"
        footer={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
            {previewDoc && <InvoiceDownloadBtn invoiceData={previewDoc} />}
            <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>Zamknij</button>
          </div>
        }
      >
        {previewDoc && (
          <div className="document-sheet" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-primary)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiFileText /> {TYPE_MAP[previewDoc.type]?.toUpperCase()}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Nr: {previewDoc.id}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div>Data wystawienia: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{previewDoc.date}</span></div>
                <div>Miejsce wystawienia: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Warszawa</span></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div style={{ padding: 16, background: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Sprzedawca
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>Sklep Sp. z o.o.</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>ul. Przykładowa 1</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>00-001 Warszawa</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>NIP: 1234567890</div>
              </div>

              <div style={{ padding: 16, background: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Nabywca
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{previewDoc.buyer?.name || previewDoc.customer || 'Klient detaliczny'}</div>
                {previewDoc.buyer?.address && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>{previewDoc.buyer.address}</div>
                )}
                {previewDoc.buyer?.nip && previewDoc.buyer.nip !== '------' && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>NIP: {previewDoc.buyer.nip}</div>
                )}
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-primary)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>Lp.</th>
                    <th style={{ padding: '8px 4px' }}>Nazwa towaru / usługi</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Ilość</th>
                    <th style={{ padding: '8px 4px' }}>Jedn.</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Cena netto</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>VAT</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Wartość netto</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Wartość brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewDoc.items || []).map((item, idx) => {
                    const qty = parseFloat(item.qty) || 1;
                    const priceNet = parseFloat(item.price_net) || (parseFloat(item.price) / 1.23) || 0;
                    const vatRate = item.vat_rate || '23';
                    const net = qty * priceNet;
                    const vatMultiplier = vatRate === 'zw' ? 0 : parseFloat(vatRate) / 100;
                    const gross = net * (1 + vatMultiplier);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '10px 4px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 4px', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right' }}>{qty}</td>
                        <td style={{ padding: '10px 4px' }}>{item.unit || 'szt'}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right' }}>{formatCurrency(priceNet)}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'center' }}>{vatRate === 'zw' ? 'zw.' : `${vatRate}%`}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right' }}>{formatCurrency(net)}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(gross)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start', borderTop: '2px solid var(--border-primary)', paddingTop: 16 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div>Sposób płatności: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {previewDoc.payment_method === 'cash' ? 'Gotówka' :
                    previewDoc.payment_method === 'card' ? 'Karta' :
                      previewDoc.payment_method === 'transfer' ? 'Przelew bankowy' : 'Kredyt'}
                </span></div>
                {previewDoc.seller && (
                  <div style={{ marginTop: 4 }}>Wystawca: <span style={{ color: 'var(--text-primary)' }}>{previewDoc.seller}</span></div>
                )}
              </div>
              <div style={{ textAlign: 'right', minWidth: 200 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Razem netto: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {formatCurrency((previewDoc.items || []).reduce((sum, item) => {
                      const qty = parseFloat(item.qty) || 1;
                      const priceNet = parseFloat(item.price_net) || (parseFloat(item.price) / 1.23) || 0;
                      return sum + (qty * priceNet);
                    }, 0))}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-light)' }}>
                  DO ZAPŁATY: <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(previewDoc.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
