import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../contexts/StoreContext';
import { FiShoppingBag, FiSearch, FiPlus, FiEdit, FiTrash2, FiCheck, FiTruck, FiClock } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY_ORDER = {
  order_number: '',
  type: 'click_collect',
  status: 'new',
  customer_id: '',
  total: 0,
  deposit_amount: 0,
  pickup_date: '',
  note: ''
};

/* Moduł do zarządzania zamówieniami zewnętrznymi (Click&Collect, Rezerwacje) z obsługą zaliczek i statusów realizacji */
export default function OrdersPage() {
  /* Pobranie listy klientów i flagi połączenia z Supabase ze StoreContext (zamówienia korzystają prosto z DB) */
  const { customers, isSupabase } = useStore();
  
  /* Lokalne stany przechowujące pobrane zamówienia, parametry filtrowania oraz ustawienia modala edycji */
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ORDER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [isSupabase]);

  /* Zdalne pobranie najnowszych zamówień z tabeli 'orders' w Supabase z sortowaniem od najnowszych */
  async function fetchOrders() {
    if (!isSupabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      toast.error('Błąd ładowania zamówień: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  /* Tablica zamówień przefiltrowana przez aktualnie wpisane w wyszukiwarkę słowo (po nazwie klienta lub numerze zamówienia) */
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const cust = customers.find(c => c.id === o.customer_id);
    const custName = cust ? (cust.name || cust.company_name || '').toLowerCase() : '';
    return o.order_number.toLowerCase().includes(q) || custName.includes(q);
  });

  /* Wyzerowanie formularza i przygotowanie automatycznego numeru dla nowo tworzonego zamówienia */
  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_ORDER, order_number: `ZAM/${Date.now()}` });
    setShowModal(true);
  }

  /* Załadowanie istniejącego zamówienia do formatki edycyjnej (z parsowaniem dat) */
  function openEdit(order) {
    setEditing(order);
    setForm({
      ...order,
      pickup_date: order.pickup_date ? order.pickup_date.split('T')[0] : ''
    });
    setShowModal(true);
  }

  /* Wygenerowanie poprawnego payloadu i insert/update rekordu zamówienia w bazie Supabase na podstawie wypełnionych danych */
  async function handleSave() {
    if (!isSupabase) return toast.error('Wymagane połączenie z Supabase');
    try {
      const row = {
        order_number: form.order_number,
        type: form.type,
        status: form.status,
        customer_id: form.customer_id || null,
        total: parseFloat(form.total) || 0,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        pickup_date: form.pickup_date || null,
        note: form.note || null
      };

      if (editing) {
        const { error } = await supabase.from('orders').update(row).eq('id', editing.id);
        if (error) throw error;
        toast.success('Zamówienie zaktualizowane');
      } else {
        const { error } = await supabase.from('orders').insert(row);
        if (error) throw error;
        toast.success('Zamówienie dodane');
      }
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(`Błąd zapisu: ${err.message}`);
    }
  }

  /* Procedura trwałego kasowania wybranego zamówienia z potwierdzeniem akcji użytkownika */
  async function handleDelete(orderId) {
    if (!confirm('Usunąć to zamówienie?')) return;
    if (!isSupabase) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      toast.success('Zamówienie usunięte');
      fetchOrders();
    } catch (err) {
      toast.error(`Błąd usunięcia: ${err.message}`);
    }
  }

  /* Szybka, jedno-polowa aktualizacja statusu (np. z 'Nowe' na 'Gotowe') bezpośrednio z poziomu tabelki (w locie) */
  async function handleStatusChange(orderId, newStatus) {
    if (!isSupabase) return;
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      toast.success('Zmieniono status');
      fetchOrders();
    } catch (err) {
      toast.error(`Błąd zmiany statusu: ${err.message}`);
    }
  }

  const F = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zamówienia / Click & Collect</h1>
          <p>Zarządzanie zamówieniami internetowymi i rezerwacjami</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <FiPlus size={16} /> Nowe zamówienie
        </button>
      </div>

      <div className="flex gap-12 mb-16" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: 400 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Szukaj po numerze lub kliencie..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-20 text-muted">Ładowanie...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Numer</th>
                <th>Klient</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Suma</th>
                <th>Zaliczka</th>
                <th>Odbiór</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const cust = customers.find(c => c.id === o.customer_id);
                const custName = cust ? (cust.company_name || cust.name) : 'Brak przypisania';

                return (
                  <tr key={o.id}>
                    <td className="font-mono font-bold">{o.order_number}</td>
                    <td>{custName}</td>
                    <td>
                      <span className="badge badge-ghost">
                        {o.type === 'click_collect' ? 'Click & Collect' : o.type === 'reservation' ? 'Rezerwacja' : 'Ręczne'}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`select select-sm ${o.status === 'completed' ? 'border-success text-success' : ''}`}
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        style={{ width: 'auto' }}
                      >
                        <option value="new">Nowe</option>
                        <option value="unpaid">Nieopłacone</option>
                        <option value="picking">Kompletowane</option>
                        <option value="ready">Gotowe do odbioru</option>
                        <option value="partial">Wydanie częściowe</option>
                        <option value="completed">Zakończone (Wydane)</option>
                        <option value="cancelled">Anulowane</option>
                      </select>
                    </td>
                    <td className="font-bold">{o.total} zł</td>
                    <td className="text-muted">{o.deposit_amount} zł</td>
                    <td>{o.pickup_date || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(o)}><FiEdit size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(o.id)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }} className="text-muted">Brak zamówień</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj zamówienie' : 'Nowe zamówienie'} size="modal-md" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-group mb-16">
          <label>Numer zamówienia *</label>
          <input className="input font-mono" value={form.order_number} onChange={F('order_number')} />
        </div>

        <div className="input-row mb-16">
          <div className="input-group">
            <label>Typ zamówienia</label>
            <select className="select" value={form.type} onChange={F('type')}>
              <option value="click_collect">Click & Collect</option>
              <option value="reservation">Rezerwacja towaru</option>
              <option value="manual">Zamówienie ręczne (tel)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Status</label>
            <select className="select" value={form.status} onChange={F('status')}>
              <option value="new">Nowe</option>
              <option value="ready">Gotowe do odbioru</option>
              <option value="partial">Wydanie częściowe</option>
              <option value="completed">Wydane w całości</option>
            </select>
          </div>
        </div>

        <div className="input-group mb-16">
          <label>Przypisany Klient</label>
          <select className="select" value={form.customer_id || ''} onChange={F('customer_id')}>
            <option value="">— Bez przypisania —</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.company_name || c.name} {c.nip ? `(${c.nip})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="input-row mb-16">
          <div className="input-group">
            <label>Całkowita kwota (zł)</label>
            <input className="input" type="number" step="0.01" value={form.total} onChange={F('total')} />
          </div>
          <div className="input-group">
            <label>Zaliczka / Zadatek (zł)</label>
            <input className="input" type="number" step="0.01" value={form.deposit_amount} onChange={F('deposit_amount')} />
          </div>
        </div>

        <div className="input-group mb-16">
          <label>Planowana data odbioru</label>
          <input className="input" type="date" value={form.pickup_date} onChange={F('pickup_date')} />
        </div>

        <div className="input-group mb-16">
          <label>Notatki / Uwagi</label>
          <textarea className="input" value={form.note} onChange={F('note')} rows="3"></textarea>
        </div>
      </Modal>
    </div>
  );
}
