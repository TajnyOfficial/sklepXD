import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

/* Uniwersalny komponent nakładki w formie okna modalnego, blokujący przewijanie strony i obsługujący Escape */
export default function Modal({ isOpen, onClose, title, size = '', children, footer }) {
  /* Referencja do tła (backdrop) używana do zamykania modala przy kliknięciu na obszar obok okienka */
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    /* Funkcja pomocnicza zamykająca okno modalne pod wpływem naciśnięcia klawisza Escape */
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><FiX size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
