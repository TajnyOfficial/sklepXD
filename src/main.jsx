import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Importy poszczególnych modułów aplikacji (sub-aplikacji)
import App from './App.jsx';
import KioskApp from './apps/KioskApp';
import POSApp from './apps/POSApp';
import MobileApp from './apps/MobileApp';

/* Główna brama routingu decydująca, którą z sub-aplikacji (Kiosk, POS, Mobile, Panel) załadować na podstawie URL */
function RootGateway() {
  /* Aktualna ścieżka z paska adresu przeglądarki */
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

  // Fallback dla głównej aplikacji panelu administracyjnego
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Inicjalizacja głównego korzenia (root) aplikacji React 18+
// Renderuje bramę RootGateway otoczoną StrictMode oraz globalnym Toasterem do powiadomień
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
