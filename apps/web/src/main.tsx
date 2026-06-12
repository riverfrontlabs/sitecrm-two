/**
 * Application entry point.
 *
 * Mounts the React tree with its two global providers:
 * - `BrowserRouter` — client-side routing (`/` home, `/design` preview).
 * - `ThemeProvider` — design-system theming; applies `data-theme` to <html>
 *   and persists the user's choice.
 */
import { ThemeProvider } from '@sitetwo/design-system';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('index.html must contain a <div id="root"> mount node.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
