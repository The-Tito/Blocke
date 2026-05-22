/**
 * main — punto de entrada. Aplica el tema, registra el Service Worker de
 * notificaciones y monta la app.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import './styles/index.css';
import { getTheme, applyTheme } from './lib/theme.js';
import { registerServiceWorker } from './infrastructure/notifications/notifier.js';

applyTheme(getTheme());
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
