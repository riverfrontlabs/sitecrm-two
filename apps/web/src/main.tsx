/**
 * Application entry point.
 *
 * Provider stack (outermost → innermost):
 * - `BrowserRouter`     — client-side routing
 * - `ThemeProvider`     — design-system theming; applies `data-theme` to <html>
 * - `QueryClientProvider` — React Query global cache
 * - `AuthProvider`      — JWT state, login, logout
 */
import { ThemeProvider } from '@sitecrm/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus in dev — avoids noise when switching windows.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('index.html must contain a <div id="root"> mount node.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
