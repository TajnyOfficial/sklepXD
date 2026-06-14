import { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiUpload, FiMapPin, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useStore } from '../../contexts/StoreContext';
import Modal from '../../components/Modal';

/* Komponent pozwalający na aktualizację globalnych ustawień konfiguracyjnych i profilu całego systemu (np. NIP, VAT, nazwa) oraz kategorii */
export default function StoreSettingsPage() {
  /* Odczytanie bieżących ustawień firmy wraz z funkcją zlecającą ich docelowy zapis/nadpis w bazie danych Supabase */
  const { shopSettings, updateShopSettings, categories, saveCategory, deleteCategory } = useStore();
  
  /* Lokalny stan formularza służący do przetrzymywania "szkicu" zmian przed pomyślnym zatwierdzeniem przyciskiem Zapisz */
  const [store, setStore] = useState(shopSettings);

  // Category management
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', sort_order: '0' });

  // VAT management
  const [showVatModal, setShowVatModal] = useState(false);
  const [vatForm, setVatForm] = useState({ name: '', rate: 23, code: 'A' });
  const [editingVatIndex, setEditingVatIndex] = useState(null);

  useEffect(() => {
    if (shopSettings) {
      setStore(shopSettings);
    }
  }, [shopSettings]);

  if (!store) {
    return <div className="page p-24">Wczytywanie ustawień...</div>;
  }

  /* Obsługa akcji zatwierdzenia i przesłania ustawień konfiguracyjnych z powrotem do funkcji aktualizacyjnej w StoreContext */
  function handleSave() {
    updateShopSettings(store);
    toast.success('Ustawienia sklepu zostały zapisane!');
  }

  function openAdd() {
    setEditingCategory(null);
    setForm({ name: '', sort_order: '0' });
    setShowModal(true);
  }

  function openEdit(cat) {
    setEditingCategory(cat);
    setForm({ name: cat.name, sort_order: String(cat.sort_order || 0) });
    setShowModal(true);
  }

  function openAddVat() {
    setEditingVatIndex(null);
    setVatForm({ name: '', rate: 23, code: 'A' });
    setShowVatModal(true);
  }

  function openEditVat(v, index) {
    setEditingVatIndex(index);
    setVatForm(v);
    setShowVatModal(true);
  }

  function handleSaveVat() {
    const updated = [...(store.vatRates || [])];
    if (editingVatIndex !== null) {
      updated[editingVatIndex] = vatForm;
    } else {
      updated.push(vatForm);
    }
    setStore({ ...store, vatRates: updated });
    setShowVatModal(false);
  }

  function handleDeleteVat(index) {
    if (!confirm('Czy na pewno usunąć tę stawkę VAT?')) return;
    const updated = (store.vatRates || []).filter((_, i) => i !== index);
    setStore({ ...store, vatRates: updated });
  }

  async function handleSaveCategory() {
    if (!form.name.trim()) {
      toast.error('Nazwa kategorii nie może być pusta');
      return;
    }
    try {
      await saveCategory({ name: form.name, sort_order: form.sort_order }, editingCategory?.id);
      toast.success(editingCategory ? 'Zaktualizowano kategorię' : 'Dodano nową kategorię');
      setShowModal(false);
    } catch (err) {
      toast.error(`Błąd: ${err.message}`);
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Czy na pewno chcesz usunąć kategorię "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      toast.success('Kategoria została usunięta');
    } catch (err) {
      toast.error(`Błąd usunięcia (być może kategoria jest w użyciu): ${err.message}`);
    }
  }

  const sortedCategories = [...(categories || [])].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Ustawienia sklepu</h1><p>Profil firmy, VAT, kategorie</p></div>
        <button className="btn btn-primary" onClick={handleSave}><FiSave size={16} /> Zapisz</button>
      </div>
      <div className="grid-2" style={{ gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 className="mb-16"><FiSettings size={18} style={{ marginRight: 8 }} />Dane firmy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>Nazwa firmy</label><input className="input" style={{height: 36}} value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} /></div>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>NIP</label><input className="input" style={{height: 36}} value={store.nip} onChange={e => setStore({ ...store, nip: e.target.value })} /></div>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>Adres</label><input className="input" style={{height: 36}} value={store.address} onChange={e => setStore({ ...store, address: e.target.value })} /></div>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>Telefon</label><input className="input" style={{height: 36}} value={store.phone || ''} onChange={e => setStore({ ...store, phone: e.target.value })} /></div>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>E-mail</label><input className="input" style={{height: 36}} value={store.email || ''} onChange={e => setStore({ ...store, email: e.target.value })} /></div>
              <div className="input-group"><label style={{marginBottom: 4, fontSize: '0.8rem'}}>Nr konta</label><input className="input font-mono" style={{height: 36}} value={store.bankAccount || ''} onChange={e => setStore({ ...store, bankAccount: e.target.value })} /></div>
              <div className="input-group" style={{marginTop: 4}}><button className="btn btn-secondary btn-sm"><FiUpload size={14} /> Wczytaj logo</button></div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-16"><FiMapPin size={16} style={{ marginRight: 8 }} />Lokalizacje (Multi-store)</h3>
            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500 }}>Sklep główny — ul. Budowlana 15</div>
              <div className="text-xs text-muted">Aktywny • 5 pracowników</div>
            </div>
          </div>
        </div>
        <div>
          <div className="card mb-16">
            <div className="flex-between mb-16">
              <h3>Stawki VAT</h3>
              <button className="btn btn-secondary btn-sm" onClick={openAddVat}>
                <FiPlus size={14} /> Dodaj stawkę
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Nazwa</th><th>Stawka</th><th>Kod fiskalny</th><th style={{ width: 80 }}>Akcje</th></tr></thead>
                <tbody>
                  {(store.vatRates || []).map((v, i) => (
                    <tr key={i}>
                      <td>{v.name}</td>
                      <td style={{ fontWeight: 600 }}>{v.rate}%</td>
                      <td className="font-mono">{v.code}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditVat(v, i)}><FiEdit size={14} /></button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteVat(i)}><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="flex-between mb-16">
              <h3>Kategorie Produktów</h3>
              <button className="btn btn-secondary btn-sm" onClick={openAdd}>
                <FiPlus size={14} /> Nowa kategoria
              </button>
            </div>

            <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nazwa kategorii</th>
                    <th>Kolejność sortowania</th>
                    <th style={{ width: 100 }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.length > 0 ? (
                    sortedCategories.map(cat => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 500 }}>{cat.name}</td>
                        <td className="text-muted">{cat.sort_order || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cat)} title="Edytuj">
                              <FiEdit size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat)} title="Usuń" style={{ color: 'var(--danger)' }}>
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-24">Brak dodanych kategorii</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edytuj kategorię' : 'Dodaj kategorię'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSaveCategory}>Zapisz</button>
          </>
        }
      >
        <div className="input-group mb-16">
          <label>Nazwa kategorii *</label>
          <input
            className="input"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="np. Elektronarzędzia"
            autoFocus
          />
        </div>
        <div className="input-group">
          <label>Kolejność wyświetlania (im niższa wartość, tym wyżej)</label>
          <input
            className="input"
            type="number"
            value={form.sort_order}
            onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showVatModal}
        onClose={() => setShowVatModal(false)}
        title={editingVatIndex !== null ? 'Edytuj stawkę VAT' : 'Dodaj stawkę VAT'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowVatModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSaveVat}>Zatwierdź</button>
          </>
        }
      >
        <div className="input-group mb-16">
          <label>Nazwa *</label>
          <input className="input" value={vatForm.name} onChange={e => setVatForm(p => ({ ...p, name: e.target.value }))} placeholder="np. VAT 23%" autoFocus />
        </div>
        <div className="input-group mb-16">
          <label>Wartość w %</label>
          <input className="input" type="number" value={vatForm.rate} onChange={e => setVatForm(p => ({ ...p, rate: Number(e.target.value) }))} />
        </div>
        <div className="input-group">
          <label>Kod fiskalny (A-G)</label>
          <input className="input" maxLength={1} style={{ textTransform: 'uppercase' }} value={vatForm.code} onChange={e => setVatForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
        </div>
      </Modal>
    </div>
  );
}
