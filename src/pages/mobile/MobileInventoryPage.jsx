
import { useState } from 'react';
import { useStore } from '../../contexts/StoreContext';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';
import toast from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';

// Karta zlecenia na liście
function TaskCard({ task, onClick }) {
  const done = task.items && Array.isArray(task.items) ? task.items.filter(i => i.counted_qty !== null).length : 0;
  const total = task.items && Array.isArray(task.items) ? task.items.length : 0;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const statusColors = {
    assigned: { bg: 'var(--bg-card)', border: 'var(--border-primary)', badge: 'var(--text-secondary)', label: 'Zlecona' },
    in_progress: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', badge: 'var(--warning)', label: 'W trakcie' },
    completed: { bg: 'var(--success-bg)', border: 'var(--success-border)', badge: 'var(--success)', label: 'Zakończona' },
  };
  const sc = statusColors[task.status] || statusColors.assigned;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: sc.bg, border: `1.5px solid ${sc.border}`,
        borderRadius: 16, padding: '16px 20px',
        cursor: 'pointer', marginBottom: 10,
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.number}</div>
          <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem', marginTop: 2 }}>{task.scope}</div>
        </div>
        <span style={{
          background: sc.badge, color: 'var(--bg-primary)',
          fontSize: '0.65rem', fontWeight: 700,
          padding: '3px 8px', borderRadius: 20,
        }}>{sc.label}</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
        Pozycji: {done}/{total}
      </div>
      <div style={{ height: 4, background: 'var(--border-primary)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </button>
  );
}

// Widok aktywnego zadania
function ActiveTaskView({ task, onBack, onUpdate, onUpdateStatus }) {
  const { findProductByBarcode, findProduct } = useStore();
  const [showScanner, setShowScanner] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleScanResult(code) {
    setShowScanner(false);
    // Szukaj produktu po kodzie kreskowym
    const product = findProductByBarcode(code) || findProduct(code)[0];
    if (!product) {
      toast.error(`Nieznany kod: ${code}`);
      return;
    }
    // Znajdź pasującą pozycję w zleceniu
    const idx = task.items.findIndex(i => i.sku === product.sku);
    if (idx === -1) {
      toast.error(`Produkt "${product.name}" nie należy do tego zlecenia`);
      return;
    }
    setActiveItemIdx(idx);
    toast.success(`Znaleziono: ${product.name}`, { duration: 2000 });
  }

  function updateCount(idx, val) {
    onUpdate(idx, val === '' ? null : parseFloat(val) || 0);
  }

  const done = task.items && Array.isArray(task.items) ? task.items.filter(i => i.counted_qty !== null).length : 0;
  const total = task.items && Array.isArray(task.items) ? task.items.length : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', color: 'var(--text-heading)' }}>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1.3rem' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{task.number}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{task.scope}</div>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{done}/{total}</span>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={() => setShowScanner(true)}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            border: 'none', borderRadius: 14,
            color: '#fff', fontWeight: 700, fontSize: '0.95rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📷</span>
          Skanuj kod produktu
        </button>
      </div>

      <div style={{ padding: '0 20px', paddingBottom: 100 }}>
        {task.items && Array.isArray(task.items) && task.items.map((item, idx) => {
          const counted = item.counted_qty;
          const isDone = counted !== null;
          const diff = isDone && !task.blind ? counted - (item.system_qty || 0) : null;
          const isActive = activeItemIdx === idx;

          return (
            <div
              key={item.sku}
              style={{
                background: isActive ? 'var(--accent-bg)' : isDone ? 'var(--success-bg)' : 'var(--bg-primary)',
                border: `1.5px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--success-border)' : 'var(--bg-card)'}`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 8,
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveItemIdx(idx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sku}</div>
                {isDone && diff !== null && (
                  <span style={{ fontSize: '0.72rem', color: diff !== 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                    {diff > 0 ? `+${diff}` : diff} szt.
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{item.name}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stan: {item.system_qty} szt.</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Przelicz"
                  value={counted ?? ''}
                  onChange={e => updateCount(idx, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: 'var(--bg-card)',
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-primary)'}`,
                    borderRadius: 8, color: 'var(--text-heading)',
                    fontSize: '1rem', outline: 'none',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>szt.</span>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 24, marginBottom: 10 }}>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, var(--success-border), var(--success))',
              border: 'none', borderRadius: 16,
              color: '#fff', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            ✓  Zakończ inwentaryzację
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--border-primary)',
            borderRadius: 24, padding: '24px 20px', width: '100%', maxWidth: 360,
            textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>Potwierdź wykonanie</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 24 }}>
              {done < total ? (
                <>
                  Przeliczyłeś jedynie <strong>{done}</strong> z <strong>{total}</strong> pozycji. Pozostałe zostaną oznaczone jako nieprzeliczone. Czy na pewno chcesz zakończyć i zatwierdzić tę inwentaryzację?
                </>
              ) : (
                <>
                  Czy na pewno chcesz zakończyć i zatwierdzić inwentaryzację <strong>{task.number}</strong>? Wyniki zostaną zapisane w bazie danych, a zadanie zostanie zablokowane.
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: 12, background: 'var(--border-primary)', border: 'none',
                  borderRadius: 12, color: 'var(--text-heading)', fontWeight: 600, fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  if (onUpdateStatus) {
                    onUpdateStatus('completed');
                  }
                  onBack();
                  toast.success(`Inwentaryzacja ${task.number} zakończona!`);
                }}
                style={{
                  flex: 1, padding: 12, background: 'linear-gradient(135deg, var(--success), var(--success-border))', border: 'none',
                  borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Tak, zatwierdź
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Główny widok Magazyniera (PWA) obsługujący inwentaryzacje. Oferuje skanowanie kodów przez aparat, walidację zliczanych ilości oraz zamykanie zleceń
export default function MobileInventoryPage() {
  const { employees, mobileSession, inventories, saveInventory } = useStore();
  const [activeTaskId, setActiveTaskId] = useState(null);

  const activeTask = inventories.find(t => t.id === activeTaskId);
  const userId = mobileSession?.mobileUser?.id;
  const userName = mobileSession?.mobileUser?.name || mobileSession?.mobileUser?.full_name || 'Użytkownik';

  function openTask(task) {
    if (task.status === 'assigned') {
      saveInventory({ ...task, status: 'in_progress' });
    }
    setActiveTaskId(task.id);
  }

  function updateItemCount(taskId, itemIdx, val) {
    const task = inventories.find(t => t.id === taskId);
    if (!task) return;

    const updatedItems = task.items.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, counted_qty: val };
      }
      return item;
    });

    const doneCount = updatedItems.filter(i => i.counted_qty !== null).length;

    const updatedTask = {
      ...task,
      items: updatedItems,
      status: 'in_progress',
      count: doneCount
    };

    saveInventory(updatedTask);
  }

  function updateTaskStatus(taskId, newStatus) {
    const task = inventories.find(t => t.id === taskId);
    if (!task) return;
    saveInventory({ ...task, status: newStatus });
  }

  // Widok aktywnego zadania
  if (activeTask) {
    return (
      <ActiveTaskView
        task={activeTask}
        onBack={() => setActiveTaskId(null)}
        onUpdate={(itemIdx, val) => updateItemCount(activeTask.id, itemIdx, val)}
        onUpdateStatus={(newStatus) => updateTaskStatus(activeTask.id, newStatus)}
      />
    );
  }

  // Lista zleceń
  const userTasks = inventories.filter(t => 
    (t.assigned_to && t.assigned_to === userId) ||
    (t.assigned_name && t.assigned_name.toLowerCase() === userName.toLowerCase())
  );
  const activeTasks = userTasks.filter(t => t.status !== 'completed');
  const completedTasks = userTasks.filter(t => t.status === 'completed');

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', color: 'var(--text-heading)', paddingBottom: 80 }}>
      <MobileHeader title="Sklep Mobile" subtitle="Moduł inwentaryzacji" />
      <div style={{ padding: '20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{activeTasks.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Do wykonania</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{completedTasks.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Zakończone</div>
          </div>
        </div>

        {activeTasks.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              Twoje zlecenia
            </div>
            {activeTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
            ))}
          </>
        )}

        {completedTasks.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>
              Zakończone
            </div>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => { }} />
            ))}
          </>
        )}

        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--border-primary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
            <div style={{ fontWeight: 600 }}>Brak przypisanych zleceń</div>
            <div style={{ fontSize: '0.8rem', marginTop: 8 }}>Skontaktuj się z kierownikiem</div>
          </div>
        )}
      </div>
    </div>
  );
}
