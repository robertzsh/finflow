import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// HashRouter keeps routing entirely client-side (URLs use #/…), so the app
// works on any static host — Cloudflare Pages, Netlify, Vercel, GitHub Pages,
// or a plain file server — with zero rewrite/redirect configuration.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
