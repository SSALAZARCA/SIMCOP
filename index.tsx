import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary'; // Import the new ErrorBoundary

// Global recovery for dynamic chunk 404s after new deployments
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = window.sessionStorage.getItem('simcop_vite_preload_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    window.sessionStorage.setItem('simcop_vite_preload_reload', now.toString());
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason?.message || event?.reason?.toString() || '';
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('Importing a module script failed') ||
    reason.includes('error loading dynamically imported module')
  ) {
    const lastReload = window.sessionStorage.getItem('simcop_chunk_rejection_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      window.sessionStorage.setItem('simcop_chunk_rejection_reload', now.toString());
      window.location.reload();
    }
  }
});

// Security Audit: Suppress console logs in production to prevent operational data leakage
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

const rootElement = document.getElementById('root');
console.log("📍 Root element found:", !!rootElement);
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log("⚛️ Starting React mount...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);