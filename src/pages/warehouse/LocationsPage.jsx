import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { FiMapPin, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { sector: '', rack: '', shelf: '', description: '' };

export default function LocationsPage() {
  const { warehouseLocations, saveWarehouseLocation, deleteWarehouseLocation, products } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(l) {
    setEditing(l);
    setForm({
      sector: l.sector,
      rack: l.rack || '',
      shelf: l.shelf || '',
      description: l.description || ''
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.sector) { toast.error('Podaj sektor'); return; }
    try {
      await saveWarehouseLocation(form, editing?.id || null);
      toast.success(editing ? 'Lokalizacja zaktualizowana' : 'Lokalizacja dodana');
      setShowModal(false);
    } catch (e) {
      console.error(e);
      toast.error('Błąd podczas zapisu lokalizacji');
    }
  }

  async function handleDelete(l) {
    if (!confirm(`Usunąć lokalizację ${l.sector}-${l.rack || ''}?`)) return;
    try {
      await deleteWarehouseLocation(l.id);
      toast.success('Lokalizacja usunięta');
    } catch (e) {
      console.error(e);
      toast.error('Błąd podczas usuwania lokalizacji');
    }
  }

  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Lokalizacje magazynowe</h1>
          <p>Sektor / Regał / Półka — adresacja towaru</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowa lokalizacja</button>
      </div>

      {warehouseLocations.length === 0 ? (
        <div className="empty-state text-center" style={{ padding: '64px 0', color: 'var(--text-muted)' }}>
          <FiMapPin size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
          <h3>Brak zdefiniowanych lokalizacji</h3>
          <p>Dodaj pierwszą lokalizację magazynową, aby móc przypisać do niej produkty.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {warehouseLocations.map(l => {
            const productCount = products ? products.filter(p => p.location_id === l.id).length : 0;
            return (
              <div key={l.id} className="card">
                <div className="flex-between mb-8">
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-light)',
                      fontWeight: 700
                    }}>
                      {l.sector}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>Regał {l.rack || '—'}</div>
                      <div className="text-xs text-muted">Półki: {l.shelf || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(l)}><FiEdit size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(l)}><FiTrash2 size={14} /></button>
                  </div>
                </div>
                <div className="text-sm text-muted">{l.description || 'Brak opisu strefy'}</div>
                <div className="text-xs mt-8">
                  <span className="badge badge-ghost">{productCount} produktów</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edytuj lokalizację' : 'Nowa lokalizacja'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button>
          </>
        }
      >
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Sektor *</label>
            <input className="input" value={form.sector} onChange={F('sector')} placeholder="np. A, B, C..." />
          </div>
          <div className="input-group">
            <label>Regał</label>
            <input className="input" value={form.rack} onChange={F('rack')} placeholder="np. 1, 2, 3..." />
          </div>
        </div>
        <div className="input-row mb-16">
          <div className="input-group">
            <label>Półki</label>
            <input className="input" value={form.shelf} onChange={F('shelf')} placeholder="np. 1-4, 2-5..." />
          </div>
          <div className="input-group">
            <label>Opis</label>
            <input className="input" value={form.description} onChange={F('description')} placeholder="Co tu przechowujemy" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
