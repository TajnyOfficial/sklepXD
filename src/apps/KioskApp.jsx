// =============================================================================
// KioskApp — Standalone terminal rejestracji czasu pracy
// URL: /kiosk/
// Bez AuthProvider, bez logowania, bez sidebar
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from '../contexts/StoreContext';
import { AuthProvider } from '../contexts/AuthContext';
import KioskPage from '../pages/kiosk/KioskPage';

export default function KioskApp() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter basename="/kiosk">
          <Routes>
            <Route path="/" element={<KioskPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '12px',
                fontSize: '0.9rem',
              },
            }}
          />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
