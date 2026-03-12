import { useState } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FiPlay, FiTrash2, FiClock, FiUser, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ParkedReceiptsPage() {
  const [parked, setParked] = useState(() => JSON.parse(localStorage.getItem('parkedReceipts') || '[]'));

  function restoreReceipt(id) {
    toast.success('Paragon przywrócony — przejdź do kasy');
    // In real app, this would restore the cart
  }

  function deleteReceipt(id) {
    const updated = parked.filter(r => r.id !== id);
    setParked(updated);
    localStorage.setItem('parkedReceipts', JSON.stringify(updated));
    toast.success('Paragon usunięty');
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zaparkowane paragony</h1>
          <p>Zawieszone transakcje oczekujące na dokończenie</p>
        </div>
        <span className="badge badge-warning">{parked.length} zaparkowanych</span>
      </div>

      {parked.length === 0 ? (
        <div className="empty-state">
          <FiShoppingBag size={48} />
          <h3>Brak zaparkowanych paragonów</h3>
          <p>Gdy zawiesisz transakcję na kasie, pojawi się tutaj</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {parked.map(receipt => (
            <div key={receipt.id} className="card">
              <div className="flex-between mb-8">
                <div className="flex gap-12" style={{ alignItems: 'center' }}>
                  <FiClock size={18} style={{ color: 'var(--warning)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Paragon #{receipt.id.slice(-6)}</div>
                    <div className="text-sm text-muted">{formatDateTime(receipt.parkedAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => restoreReceipt(receipt.id)}>
                    <FiPlay size={14} /> Przywróć
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteReceipt(receipt.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-sm text-muted mb-8">
                <FiUser size={12} style={{ marginRight: 4 }} />
                Zaparkował: {receipt.parkedBy}
                {receipt.customer && <> • Klient: {receipt.customer.name}</>}
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Produkt</th><th>Ilość</th><th>Cena</th><th>Wartość</th></tr>
                  </thead>
                  <tbody>
                    {receipt.cart.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.qty} {item.unit}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <span className="text-muted">Suma: </span>
                <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {formatCurrency(receipt.cart.reduce((s, i) => s + i.price * i.qty, 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
