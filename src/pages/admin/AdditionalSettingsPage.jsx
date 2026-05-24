import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

export default function AdditionalSettingsPage() {
  const { categories, saveCategory, deleteCategory } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', sort_order: '0' });

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

  async function handleSave() {
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

  // Sortowanie po sort_order, a następnie alfabetycznie
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dodatkowe Ustawienia</h1>
          <p>Zarządzanie kategoriami i innymi słownikami systemowymi</p>
        </div>
      </div>

      <div className="card mb-24">
        <div className="flex-between mb-16">
          <h3>Kategorie Produktów</h3>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus size={14} /> Nowa kategoria
          </button>
        </div>
        
        <div className="table-container">
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
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat)} title="Usuń">
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

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingCategory ? 'Edytuj kategorię' : 'Dodaj kategorię'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>Zapisz</button>
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
    </div>
  );
}
