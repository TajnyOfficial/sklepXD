import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Importy aplikacji składowych
import App from './App.jsx';
import KioskApp from './apps/KioskApp';
import POSApp from './apps/POSApp';
import MobileApp from './apps/MobileApp';

// Funkcja wykrywająca, którą aplikację uruchomić na podstawie URL
function RootGateway() {
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

  // Domyślnie główna aplikacja (zarządzanie)
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

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
