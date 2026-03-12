import { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { FiFileText, FiSearch, FiFilter, FiDownload, FiMail, FiPrinter, FiEye } from 'react-icons/fi';

const DEMO_DOCS = [
  { id: 'PAR/2026/03/001', type: 'receipt', customer: '—', total: 174.78, date: '2026-03-12', seller: 'Piotr Wiśniewski' },
  { id: 'FV/2026/03/001', type: 'invoice', customer: 'Budmax Sp. z o.o.', total: 2890.00, date: '2026-03-12', seller: 'Katarzyna Dąbrowska' },
  { id: 'FV/2026/03/002', type: 'invoice', customer: 'ElektroMont S.A.', total: 5670.00, date: '2026-03-11', seller: 'Katarzyna Dąbrowska' },
  { id: 'WZ/2026/03/001', type: 'wz', customer: 'Remont-Expert Jan Kowal', total: 1156.00, date: '2026-03-11', seller: 'Piotr Wiśniewski' },
  { id: 'KP/2026/03/001', type: 'kp', customer: '—', total: 500.00, date: '2026-03-12', seller: 'Anna Nowak' },
  { id: 'PRO/2026/03/001', type: 'proforma', customer: 'Dom i Ogród Sp.j.', total: 3420.00, date: '2026-03-10', seller: 'Katarzyna Dąbrowska' },
];

const TYPE_MAP = { receipt: 'Paragon', invoice: 'Faktura VAT', proforma: 'Proforma', wz: 'WZ', kp: 'KP', kw: 'KW' };
const TYPE_BADGE = { receipt: 'badge-ghost', invoice: 'badge-primary', proforma: 'badge-info', wz: 'badge-warning', kp: 'badge-success', kw: 'badge-danger' };

export default function DocumentsPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const filtered = DEMO_DOCS.filter(d => typeFilter === 'all' || d.type === typeFilter);

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dokumenty sprzedażowe</h1>
          <p>Paragony, faktury VAT, proformy, WZ, KP, KW</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary"><FiDownload size={16} /> Eksportuj</button>
          <button className="btn btn-primary"><FiFileText size={16} /> Nowy dokument</button>
        </div>
      </div>

      <div className="page-tabs">
        {[{ key: 'all', label: 'Wszystkie' }, ...Object.entries(TYPE_MAP).map(([k, v]) => ({ key: k, label: v }))].map(tab => (
          <button key={tab.key} className={`page-tab ${typeFilter === tab.key ? 'active' : ''}`} onClick={() => setTypeFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nr dokumentu</th><th>Typ</th><th>Kontrahent</th><th>Kwota</th><th>Data</th><th>Wystawił</th><th>Akcje</th></tr>
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
                    <button className="btn btn-ghost btn-sm" title="Podgląd"><FiEye size={14} /></button>
                    <button className="btn btn-ghost btn-sm" title="Drukuj"><FiPrinter size={14} /></button>
                    <button className="btn btn-ghost btn-sm" title="Wyślij e-mail"><FiMail size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
