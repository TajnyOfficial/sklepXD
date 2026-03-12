import { useState } from 'react';
import { FiMapPin, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const DEMO = [
  { id: '1', sector: 'A', rack: '1', shelf: '1-4', description: 'Śruby, złączki, kołki', items: 15 },
  { id: '2', sector: 'A', rack: '2', shelf: '1-3', description: 'Chemia budowlana', items: 8 },
  { id: '3', sector: 'B', rack: '1', shelf: '1-5', description: 'Farby i lakiery', items: 12 },
  { id: '4', sector: 'B', rack: '2', shelf: '1-4', description: 'Akcesoria malarskie', items: 20 },
  { id: '5', sector: 'C', rack: '1', shelf: '1-3', description: 'Elektronarzędzia', items: 6 },
  { id: '6', sector: 'C', rack: '2', shelf: '1-5', description: 'Materiały budowlane', items: 18 },
  { id: '7', sector: 'D', rack: '1', shelf: '1-3', description: 'Elektryka i instalacje', items: 14 },
];

const EMPTY = { sector: '', rack: '', shelf: '', description: '' };

export default function LocationsPage() {
  const [locations, setLocations] = useState(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(l) { setEditing(l); setForm({ sector: l.sector, rack: l.rack, shelf: l.shelf, description: l.description }); setShowModal(true); }
  function handleSave() {
    if (!form.sector) { toast.error('Podaj sektor'); return; }
    const loc = { ...form, id: editing?.id || crypto.randomUUID(), items: editing?.items || 0 };
    if (editing) { setLocations(prev => prev.map(l => l.id === editing.id ? loc : l)); toast.success('Lokalizacja zaktualizowana'); }
    else { setLocations(prev => [...prev, loc]); toast.success('Lokalizacja dodana'); }
    setShowModal(false);
  }
  function handleDelete(l) { if (!confirm(`Usunąć lokalizację ${l.sector}-${l.rack}?`)) return; setLocations(prev => prev.filter(x => x.id !== l.id)); toast.success('Lokalizacja usunięta'); }
  const F = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Lokalizacje magazynowe</h1><p>Sektor / Regał / Półka — adresacja towaru</p></div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus size={16} /> Nowa lokalizacja</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {locations.map(l => (
          <div key={l.id} className="card">
            <div className="flex-between mb-8">
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-light)', fontWeight: 700 }}>{l.sector}</div>
                <div><div style={{ fontWeight: 600 }}>Regał {l.rack}</div><div className="text-xs text-muted">Półki: {l.shelf}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(l)}><FiEdit size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(l)}><FiTrash2 size={14} /></button>
              </div>
            </div>
            <div className="text-sm text-muted">{l.description}</div>
            <div className="text-xs mt-8"><span className="badge badge-ghost">{l.items} produktów</span></div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj lokalizację' : 'Nowa lokalizacja'} footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Anuluj</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</button></>}>
        <div className="input-row mb-16"><div className="input-group"><label>Sektor *</label><input className="input" value={form.sector} onChange={F('sector')} placeholder="A, B, C..." /></div><div className="input-group"><label>Regał</label><input className="input" value={form.rack} onChange={F('rack')} placeholder="1, 2, 3..." /></div></div>
        <div className="input-row mb-16"><div className="input-group"><label>Półki</label><input className="input" value={form.shelf} onChange={F('shelf')} placeholder="1-4" /></div><div className="input-group"><label>Opis</label><input className="input" value={form.description} onChange={F('description')} placeholder="Co przechowujemy" /></div></div>
      </Modal>
    </div>
  );
}
