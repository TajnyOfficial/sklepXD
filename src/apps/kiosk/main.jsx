// Inicjalizacja środowiska Kiosku w osobnym korzeniu React.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import KioskApp from '../KioskApp';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KioskApp />
  </StrictMode>
);
