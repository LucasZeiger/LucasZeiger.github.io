import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { getLegacyRedirect } from './routing';

// Preserve links shared before the migration from HashRouter.
const legacyRedirect = getLegacyRedirect(new URL(window.location.href));
if (legacyRedirect) {
  window.location.replace(legacyRedirect);
} else {

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Could not find root element to mount to');
  }

  const app = (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  if (rootElement.hasChildNodes()) {
    ReactDOM.hydrateRoot(rootElement, app);
  } else {
    ReactDOM.createRoot(rootElement).render(app);
  }
}
