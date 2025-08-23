// CRITICAL: First line of JavaScript execution
console.log('🔥 User Agent:', navigator.userAgent);
console.log('🔥 Platform:', window.navigator.platform);
console.log('🔥 Location:', window.location.href);

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApp } from './utils/capacitor';


// Initialize native app features
initializeApp();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

