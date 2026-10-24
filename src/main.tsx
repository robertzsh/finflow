import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// HashRouter keeps routing entirely client-side (URLs use #/…), so the app
// works on any static host — Cloudflare Pages, Netlify, Vercel, GitHub Pages,
// or a plain file server — with zero rewrite/redirect configuration.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

// If a stale-chunk reload just happened and the app is now running fine, clear the
// guard so a FUTURE deploy can auto-recover too. A deploy that keeps failing within
// this window keeps the guard set, so it can never reload-loop.
setTimeout(() => { try { sessionStorage.removeItem('ff-chunk-reloaded'); } catch { /* */ } }, 8000);
