import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeTheme } from './stores/theme-store';
import './index.css';

// Initialize theme before rendering to prevent flash
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
