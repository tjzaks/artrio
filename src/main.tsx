// CRITICAL: First line of JavaScript execution
console.log('🔥 SIMULATOR DEBUG: main.tsx execution started!');
console.log('🔥 User Agent:', navigator.userAgent);
console.log('🔥 Platform:', window.navigator.platform);
console.log('🔥 Location:', window.location.href);

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApp } from './utils/capacitor';

console.log('🔥 SIMULATOR DEBUG: Imports loaded successfully');

// Initialize native app features
console.log('🔥 SIMULATOR DEBUG: About to initialize capacitor...');
initializeApp();
console.log('🔥 SIMULATOR DEBUG: Capacitor initialized');

console.log('🔥 SIMULATOR DEBUG: About to create React root...');
const rootElement = document.getElementById("root");
console.log('🔥 SIMULATOR DEBUG: Root element found:', !!rootElement);

if (!rootElement) {
  console.error('🔥 SIMULATOR DEBUG: ROOT ELEMENT NOT FOUND!');
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
console.log('🔥 SIMULATOR DEBUG: React root created, about to render...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🔥 SIMULATOR DEBUG: App rendered successfully!');
