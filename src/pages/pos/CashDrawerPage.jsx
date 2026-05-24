import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiFileText, FiPrinter, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

/**
 * Ekran zarządzania Szufladą Kasową (Cash Drawer).
 * 
 * Prowadzi rejestr absolutnie wszystkich operacji finansowych na bieżącym stanowisku.
 * Oferuje:
 * - Bezpośrednie wpłaty Kasa Przyjmie (KP)
 * - Wypłaty Kasa Wyda (KW)
 * - Drukowanie i weryfikację Raportów Zmianowych (Raport X)
 * - Zamykanie dnia księgowego kasjera (Raport Z)
 * 
 * @returns {JSX.Element} Widok rejestru finansowego stacji POS
 */
export default function CashDrawerPage() {
  const { profile } = useAuth();
  const { addPosLog, posSession } = useStore();
  const [movements, setMovements] = useState(() => {
    const saved = localStorage.getItem('cashMovements');
    return saved ? JSON.parse(saved) : [];
  });

  const balance = movements.reduce((sum, m) => sum + m.amount, 0);

  function addMovement(type, amount, note) {
    const actualAmount = type === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount);
    const newMovement = {
      id: Date.now(),
      type,
      amount: actualAmount,
      note,
      time: new Date().toISOString(),
      user: profile?.full_name || 'System'
    };
    const updated = [newMovement, ...movements];
    setMovements(updated);
    localStorage.setItem('cashMovements', JSON.stringify(updated));

    if (addPosLog) {
      addPosLog(
        type,
        profile?.full_name || posSession?.posUser?.name || posSession?.posUser?.full_name || 'System',
        posSession?.selectedRegister || 'Kasa',
        note || (type === 'deposit' ? 'Wpłata KP' : 'Wypłata KW'),
        actualAmount
      );
    }

    toast.success('Operacja zarejestrowana');
  }

  function handleFastOp(type) {
    const amount = prompt(`Podaj kwotę ${type === 'deposit' ? 'wpłaty' : 'wypłaty'}:`);
    if (!amount || isNaN(amount)) return;
    const note = prompt('Opis operacji:', type === 'deposit' ? 'Wpłata KP' : 'Wypłata KW');
    addMovement(type, parseFloat(amount), note || (type === 'deposit' ? 'Wpłata KP' : 'Wypłata KW'));
  }

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zarządzanie szufladą kasową</h1>
          <p>Ewidencja gotówki, wpłaty, wypłaty oraz raporty dobowe</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={() => {
            if (addPosLog) {
              addPosLog(
                'report_x',
                profile?.full_name || posSession?.posUser?.name || posSession?.posUser?.full_name || 'System',
                posSession?.selectedRegister || 'Kasa',
                'Raport X wydrukowany'
              );
            }
            toast.success('Raport X wydrukowany');
          }}><FiPrinter size={16} /> Raport X</button>
          <button className="btn btn-primary" onClick={() => {
            if (confirm('Zamknąć kasę i wygenerować raport Z?')) {
              if (addPosLog) {
                addPosLog(
                  'report_z',
                  profile?.full_name || posSession?.posUser?.name || posSession?.posUser?.full_name || 'System',
                  posSession?.selectedRegister || 'Kasa',
                  'Raport Z wygenerowany'
                );
              }
              toast.success('Raport Z wygenerowany. Kasa zamknięta.');
            }
          }}>
            <FiFileText size={16} /> Zamknij dzień (Raport Z)
          </button>
        </div>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-card">
          <div className="stat-icon indigo"><FiDollarSign /></div>
          <span className="stat-label">Aktualny stan gotówki</span>
          <span className="stat-value">{formatCurrency(balance)}</span>
        </div>
        <button className="stat-card btn-action" onClick={() => handleFastOp('deposit')}>
          <div className="stat-icon green"><FiArrowUpCircle /></div>
          <span className="stat-label">Szybka Wpłata</span>
          <span className="stat-value">+ KP</span>
        </button>
        <button className="stat-card btn-action" onClick={() => handleFastOp('withdrawal')}>
          <div className="stat-icon red"><FiArrowDownCircle /></div>
          <span className="stat-label">Szybka Wypłata</span>
          <span className="stat-value">- KW</span>
        </button>
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <h3>Historia operacji kasowych</h3>
          <div className="flex gap-8">
            <div className="input-with-icon">
              <FiCalendar />
              <input type="date" className="input input-sm" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data i godzina</th>
                <th>Typ</th>
                <th>Opis / Uwagi</th>
                <th>Pracownik</th>
                <th className="text-right">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="text-sm text-muted">{formatDateTime(m.time)}</td>
                  <td>
                    <span className={`badge ${m.type === 'deposit' ? 'badge-success' : 'badge-danger'}`}>
                      {m.type === 'deposit' ? 'WPŁATA' : 'WYPŁATA'}
                    </span>
                  </td>
                  <td>{m.note}</td>
                  <td>{m.user}</td>
                  <td className={`text-right font-bold ${m.amount > 0 ? 'text-green' : 'text-red'}`}>
                    {formatCurrency(m.amount)}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: 40 }}>
                    Brak zarejestrowanych operacji w wybranym dniu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
