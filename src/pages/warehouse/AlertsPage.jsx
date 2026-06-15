import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency } from '../../utils/helpers';
import { FiAlertTriangle, FiShoppingCart, FiCheck, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Moduł alertów magazynowych monitorujący produkty poniżej minimum z możliwością szybkiego generowania i druku zamówień
export default function AlertsPage() {
  // Pobranie produktów i wyłonienie tablicy tylko tych, które przekroczyły próg minimalny (braków)
  const { products, categories } = useStore();
  const lowStock = products.filter(p => p.stock_qty <= p.min_stock && p.min_stock > 0);
  
  // Lokalny stan przechowujący zbiór identyfikatorów produktów zaznaczonych przez użytkownika do zamówienia/wydruku
  const [selected, setSelected] = useState(lowStock.map(p => p.id));

  function toggle(id) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function selectAll() { setSelected(lowStock.map(p => p.id)); }
  function selectNone() { setSelected([]); }

  // Funkcja obliczająca ile sztuk brakuje (do max_stock) i generująca dokument HTML z gotową listą zakupową do druku
  function generatePurchaseList() {
    const items = lowStock.filter(p => selected.includes(p.id));
    if (items.length === 0) { toast.error('Zaznacz produkty do zamówienia'); return; }
    const html = items.map(p => {
      const toOrder = Math.max(0, (p.max_stock || p.min_stock * 2) - p.stock_qty);
      return `<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.stock_qty} ${p.unit}</td><td>${p.min_stock}</td><td style="font-weight:bold;color:red">${toOrder} ${p.unit}</td><td>${formatCurrency(p.purchase_price * toOrder)}</td></tr>`;
    }).join('');
    const total = items.reduce((s, p) => s + p.purchase_price * Math.max(0, (p.max_stock || p.min_stock * 2) - p.stock_qty), 0);
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Lista zakupów</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}</style></head><body><h2>Lista zakupów — ${new Date().toLocaleDateString('pl-PL')}</h2><table><thead><tr><th>SKU</th><th>Produkt</th><th>Stan</th><th>Min.</th><th>Do zamówienia</th><th>Koszt</th></tr></thead><tbody>${html}</tbody><tfoot><tr><td colspan="5" style="text-align:right;font-weight:bold">RAZEM:</td><td style="font-weight:bold">${formatCurrency(total)}</td></tr></tfoot></table></body></html>`);
    win.document.close();
    win.print();
    toast.success(`Lista zakupów wygenerowana (${items.length} pozycji)`);
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Alerty magazynowe</h1><p>Produkty poniżej minimalnego stanu</p></div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={generatePurchaseList}><FiPrinter size={16} /> Drukuj listę zakupów ({selected.length})</button>
          <button className="btn btn-primary" onClick={generatePurchaseList}><FiShoppingCart size={16} /> Generuj zamówienie</button>
        </div>
      </div>
      <div className="grid-3 mb-24">
        <div className="stat-card" style={{ border: ' 1px solid var(--danger)' }}><span className="stat-label">Poniżej minimum</span><span className="stat-value">{lowStock.length}</span></div>
        <div className="stat-card"><span className="stat-label">Szac. koszt uzupełnienia</span><span className="stat-value">{formatCurrency(lowStock.reduce((s, p) => s + p.purchase_price * Math.max(0, (p.max_stock || p.min_stock * 2) - p.stock_qty), 0))}</span></div>
        <div className="stat-card"><span className="stat-label">Zaznaczono</span><span className="stat-value">{selected.length} / {lowStock.length}</span></div>
      </div>
      {lowStock.length === 0 ? (
        <div className="empty-state"><FiCheck size={48} /><h3>Brak alertów!</h3><p>Wszystkie produkty mają wystarczający stan magazynowy.</p></div>
      ) : (
        <>
          <div className="flex gap-8 mb-8"><button className="btn btn-ghost btn-sm" onClick={selectAll}>Zaznacz wszystkie</button><button className="btn btn-ghost btn-sm" onClick={selectNone}>Odznacz wszystkie</button></div>
          <div className="table-container">
            <table>
              <thead><tr><th style={{ width: 40 }}></th><th>SKU</th><th>Produkt</th><th>Kategoria</th><th>Stan</th><th>Minimum</th><th>Brak</th><th>Koszt uzupełnienia</th></tr></thead>
              <tbody>
                {lowStock.map(p => {
                  const cat = categories.find(c => c.id === p.category_id);
                  const deficit = Math.max(0, p.min_stock - p.stock_qty);
                  const toOrder = Math.max(0, (p.max_stock || p.min_stock * 2) - p.stock_qty);
                  return (
                    <tr key={p.id} onClick={() => toggle(p.id)} style={{ cursor: 'pointer' }}>
                      <td><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                      <td className="font-mono text-sm">{p.sku}</td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td><span className="badge badge-ghost">{cat?.name || '—'}</span></td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{p.stock_qty} {p.unit}</td>
                      <td>{p.min_stock}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-{deficit}</td>
                      <td>{formatCurrency(p.purchase_price * toOrder)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
