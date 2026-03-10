import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary'; // Import the new ErrorBoundary

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