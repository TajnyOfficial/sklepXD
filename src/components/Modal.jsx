import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

/**
 * Uniwersalny komponent okna dialogowego (Modal).
 * 
 * Służy do wyświetlania treści nad główną warstwą aplikacji.
 * Blokuje przewijanie tła (body overflow hidden) i obsługuje
 * zamykanie za pomocą klawisza "Escape" oraz kliknięcia w zaciemnione tło.
 * 
 * @param {Object} props - Właściwości komponentu
 * @param {boolean} props.isOpen - Flaga określająca widoczność modala
 * @param {Function} props.onClose - Callback uruchamiany przy próbie zamknięcia
 * @param {string} props.title - Tekst nagłówka okna
 * @param {string} [props.size=''] - Opcjonalna klasa CSS rozmiaru (np. 'modal-lg')
 * @param {React.ReactNode} props.children - Treść wewnętrzna okna
 * @param {React.ReactNode} [props.footer] - Opcjonalna zawartość stopki (np. przyciski "Zapisz", "Anuluj")
 */
export default function Modal({ isOpen, onClose, title, size = '', children, footer }) {
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
