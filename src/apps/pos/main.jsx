import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import POSApp from '../POSApp';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <POSApp />
  </StrictMode>
);
