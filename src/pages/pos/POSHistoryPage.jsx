import { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import {
  FiClock, FiUser, FiMonitor, FiDollarSign,
  FiFileText, FiLogIn, FiLogOut, FiArrowUpCircle, FiArrowDownCircle
} from 'react-icons/fi';

// Zbiór identyfikatorów określających, jakie dokładnie operacje uważa się za zdarzenia "typowe" dla pracy na kasie (np. raport X, wpłata KP)
const POS_LOG_TYPES = new Set(['login', 'logout', 'deposit', 'withdrawal', 'sale', 'report_x', 'report_z', 'cash_in', 'cash_out']);

// Komponent wyświetlający listę zdarzeń przypisanych tylko i wyłącznie do punktu sprzedaży (historia paragonów, szuflad)
export default function POSHistoryPage() {
  // Pobranie całego rejestru zdarzeń kasowych i przygotowanie stanu filtru widoku (np. 'wszystkie', 'tylko logowania')
  const { posLogs = [] } = useStore();
  const [filter, setFilter] = useState('all');

  // Mechanizm oddzielający zaawansowane logi systemowe (np. zmiana ról admina) od prostych zdarzeń sprzętowych POS
  const posOnlyLogs = posLogs.filter(log => {
    const type = (log.type || '').toLowerCase();
    // Przyjmij log jeśli: jest typem POS, lub rejestr wygląda jak kasa, lub typ to login/logout na urządzeniu kasowym
    const isKassa = log.register && (
      log.register.toLowerCase().startsWith('kasa') ||
      log.register === 'POS'
    );
    const isPosType = POS_LOG_TYPES.has(type);
    return isPosType || isKassa;
  });

  // Przykładowe dane jeśli brak logów
  const displayLogs = posOnlyLogs.length > 0 ? posOnlyLogs : [
    { id: 1, type: 'login', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), details: 'Rozpoczęcie sesji' },
    { id: 2, type: 'deposit', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), amount: 200, details: 'Wpłata początkowa' },
    { id: 3, type: 'sale', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 45).toISOString(), amount: 156.40, details: 'Paragon PAR/2026/0001' },
    { id: 4, type: 'withdrawal', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), amount: -50, details: 'Wypłata KP - zwrot dla dostawcy' },
    { id: 5, type: 'report_z', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 10).toISOString(), details: 'Raport Z wygenerowany' },
    { id: 6, type: 'logout', user: 'Jan Kowalski', register: 'Kasa 1', time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), details: 'Zakończenie sesji' },
  ];

  const filteredLogs = displayLogs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'session') return ['login', 'logout'].includes(log.type);
    if (filter === 'cash') return ['deposit', 'withdrawal', 'sale', 'cash_in', 'cash_out'].includes(log.type);
    if (filter === 'report') return ['report_x', 'report_z'].includes(log.type);
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'login': return <FiLogIn className="text-blue" />;
      case 'logout': return <FiLogOut className="text-muted" />;
      case 'deposit': return <FiArrowUpCircle className="text-green" />;
      case 'withdrawal': return <FiArrowDownCircle className="text-red" />;
      case 'sale': return <FiShoppingCart className="text-indigo" />;
      case 'report_x':
      case 'report_z': return <FiFileText className="text-orange" />;
      default: return <FiClock />;
    }
  };

  const getLabel = (type) => {
    switch (type) {
      case 'login': return 'Logowanie';
      case 'logout': return 'Wylogowanie';
      case 'deposit': return 'Wpłata';
      case 'withdrawal': return 'Wypłata';
      case 'sale': return 'Sprzedaż';
      case 'report_x': return 'Raport X';
      case 'report_z': return 'Raport Z';
      default: return type;
    }
  };

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Historia operacji POS</h1>
          <p>Logi aktywności na poszczególnych stanowiskach i szufladach</p>
        </div>
        <div className="page-header-right">
          <div className="flex gap-8">
            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>Wszystkie</button>
            <button className={`btn ${filter === 'session' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('session')}>Sesje</button>
            <button className={`btn ${filter === 'cash' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('cash')}>Gotówka</button>
            <button className={`btn ${filter === 'report' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('report')}>Raporty</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Czas</th>
                <th>Operacja</th>
                <th>Pracownik</th>
                <th>Stanowisko</th>
                <th>Szczegóły</th>
                <th className="text-right">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className="text-sm text-muted font-mono">{formatDateTime(log.time)}</td>
                  <td>
                    <div className="flex gap-8 items-center font-medium">
                      {getIcon(log.type)}
                      {getLabel(log.type)}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-8 items-center">
                      <FiUser size={14} className="text-muted" />
                      {log.user}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-8 items-center">
                      <FiMonitor size={14} className="text-muted" />
                      {log.register}
                    </div>
                  </td>
                  <td className="text-sm">{log.details}</td>
                  <td className={`text-right font-bold ${log.amount > 0 ? 'text-green' : log.amount < 0 ? 'text-red' : ''}`}>
                    {log.amount ? formatCurrency(log.amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Mock for icon mapping
function FiShoppingCart(props) {
  return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
}
