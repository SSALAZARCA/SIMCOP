import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary'; // Import the new ErrorBoundary

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