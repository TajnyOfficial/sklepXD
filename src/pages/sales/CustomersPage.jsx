import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiUsers, FiSearch, FiPlus, FiEdit, FiTrash2, FiMail, FiPhone } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY_CUSTOMER = { 
  type: 'person', 
  name: '', 
  company_name: '', 
  nip: '', 
  phone: '', 
  email: '', 
  price_group: 'regular', 
  credit_limit: '0' 
};

/* Interfejs CRM służący do zarządzania bazą kontrahentów (firmy i klienci detaliczni), przypisywania limitów i grup rabatowych */
export default function CustomersPage() {
  /* Odczytanie globalnej bazy klientów oraz funkcji modyfikujących ze StoreContext */
  const { customers, saveCustomer, deleteCustomer } = useStore();
  
  /* Lokalne stany interfejsu obsługujące wyszukiwanie tekstowe oraz cykl życia nakładki modalnej (dodawanie/edycja) */
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);

  /* Dynamicznie filtrowana lista klientów na podstawie zapytania wpisanego w pole wyszukiwarki (szuka po NIP, nazwie, emailu) */
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.company_name && c.company_name.toLowerCase().includes(q)) || 
      (c.nip && c.nip.includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  /* Przygotowanie pustego formularza i otwarcie modala w trybie tworzenia nowego klienta */
  function openAdd() {
    setEditing(null);
    setForm(EMPTY_CUSTOMER);
    setShowModal(true);
  }

  /* Załadowanie danych wybranego klienta do formularza i otwarcie modala w trybie edycji */
  function openEdit(customer) {
    setEditing(customer);
    setForm({
      ...customer,
      credit_limit: String(customer.credit_limit || 0)
    });
    setShowModal(true);
  }

  /* Walidacja podstawowych pól i asynchroniczne przesłanie danych z formularza do globalnego stanu / Supabase */
  async function handleSave() {
    if (!form.name && !form.company_name) {
      toast.error('Podaj imię/nazwisko lub nazwę firmy');
      return;
    }
    try {
      await saveCustomer(form, editing?.id || null);
      toast.success(editing ? 'Klient zaktualizowany' : 'Klient dodany');
      setShowModal(false);
    } catch (err) {
      toast.error(`Błąd zapisu: ${err.message}`);
    }
  }

  /* Weryfikacja intencji użytkownika, a następnie bezpowrotne usunięcie rekordu z bazy klientów */
  async function handleDelete(customer) {
    if (!confirm(`Usunąć klienta "${customer.name || customer.company_name}"?`)) return;
    try {
      await deleteCustomer(customer.id);
      toast.success('Klient usunięty');
    } catch (err) {
      toast.error(`Błąd usunięcia: ${err.message}`);
    }
  }

  const F = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Klienci (CRM)</h1>
          <p>Zarządzanie bazą klientów detalicznych i hurtowych</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <FiPlus size={16} /> Nowy klient
        </button>
      </div>

      <div className="flex gap-12 mb-16" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: 400 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Szukaj po nazwie, NIP, e-mail..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-muted">Znaleziono: {filtered.length}</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Nazwa / Imię i Nazwisko</th>
              <th>Kontakt</th>
              <th>Grupa cenowa</th>
              <th>Limit kupiecki</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <span className={`badge ${c.type === 'company' ? 'badge-primary' : 'badge-ghost'}`}>
                    {c.type === 'company' ? 'Firma' : 'Osoba'}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>
                  {c.type === 'company' ? (
                    <div>
                      <div>{c.company_name}</div>
                      <div className="text-xs text-muted">NIP: {c.nip} | {c.name}</div>
                    </div>
                  ) : (
                    c.name
                  )}
                </td>
                <td className="text-sm">
                  {c.phone && <div className="flex gap-4 items-center"><FiPhone size={12}/> {c.phone}</div>}
                  {c.email && <div className="flex gap-4 items-center"><FiMail size={12}/> {c.email}</div>}
                </td>
                <td>
                  {c.price_group === 'regular' ? 'Detal' : 
                   c.price_group === 'loyal' ? 'Stały' : 
                   c.price_group === 'wholesale' ? 'Hurt' : 'Wykonawca'}
                </td>
                <td>{c.credit_limit} zł</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><FiEdit size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }} className="text-muted">Brak wyników</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj klienta' : 'Nowy klient'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-group mb-16">
          <label>Typ klienta</label>
          <select className="select" value={form.type} onChange={F('type')}>
            <option value="person">Osoba fizyczna</option>
            <option value="company">Firma</option>
          </select>
        </div>

        {form.type === 'company' && (
          <div className="input-row mb-16">
            <div className="input-group">
              <label>Nazwa firmy *</label>
              <input className="input" value={form.company_name} onChange={F('company_name')} placeholder="np. Bud-Max Sp. z o.o." />
            </div>
            <div className="input-group">
              <label>NIP</label>
              <input className="input" value={form.nip} onChange={F('nip')} placeholder="1234567890" />
            </div>
          </div>
        )}

        <div className="input-group mb-16">
          <label>{form.type === 'company' ? 'Osoba kontaktowa' : 'Imię i nazwisko *'}</label>
          <input className="input" value={form.name} onChange={F('name')} placeholder="Jan Kowalski" />
        </div>

        <div className="input-row mb-16">
          <div className="input-group">
            <label>Telefon</label>
            <input className="input" value={form.phone} onChange={F('phone')} placeholder="np. 500 100 200" />
          </div>
          <div className="input-group">
            <label>E-mail</label>
            <input className="input" type="email" value={form.email} onChange={F('email')} placeholder="jan@example.com" />
          </div>
        </div>

        <div className="input-row mb-16">
          <div className="input-group">
            <label>Grupa cenowa</label>
            <select className="select" value={form.price_group} onChange={F('price_group')}>
              <option value="regular">Detaliczna (0%)</option>
              <option value="loyal">Stały klient (5%)</option>
              <option value="contractor">Wykonawca (10%)</option>
              <option value="wholesale">Hurtowa (15%)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Limit kupiecki (zł)</label>
            <input className="input" type="number" min="0" value={form.credit_limit} onChange={F('credit_limit')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
