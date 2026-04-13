import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { initRUM } from './lib/rum';
import './index.css';

if (typeof window !== 'undefined' && import.meta.env.PROD) {
  initRUM({
    serviceName: 'observability-os',
    endpoint: '/api/rum',
    sampleRate: 100,
    enableTracking: import.meta.env.DEV === false,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);
