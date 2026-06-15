import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Importy poszczególnych modułów aplikacji
import App from './App.jsx';
import KioskApp from './apps/KioskApp';
import POSApp from './apps/POSApp';
import MobileApp from './apps/MobileApp';

// Główny router kierujący ruch do odpowiedniej aplikacji na podstawie prefiksu w URL (Kiosk, POS, Mobile, Panel).
function RootGateway() {
  // Pobranie bieżącej ścieżki z adresu przeglądarki.
  const path = window.location.pathname;

  if (path.startsWith('/kiosk')) {
    return <KioskApp />;
  }
  
  if (path.startsWith('/pos')) {
    return <POSApp />;
  }
  
  if (path.startsWith('/mobile')) {
    return <MobileApp />;
  }

  // Domyślna aplikacja (Panel Administracyjny) ładująca się dla wszystkich innych ścieżek.
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Inicjalizacja React 18: renderowanie RootGateway ze StrictMode i globalnym systemem powiadomień Toaster.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootGateway />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1a1c28',
          color: '#e8eaed',
          border: '1px solid #2a2d3e',
          borderRadius: '8px',
          fontSize: '0.875rem',
        },
      }}
    />
  </StrictMode>
);
