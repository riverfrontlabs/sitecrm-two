import { Route, Routes } from 'react-router-dom';
import { BuilderPage } from './pages/BuilderPage.js';

/**
 * Root router for the builder app.
 *
 * Routes:
 * - `/`           — new site prompt (blank canvas)
 * - `/sites/:id`  — resume editing an existing site spec
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<BuilderPage />} />
      <Route path="/sites/:siteId" element={<BuilderPage />} />
    </Routes>
  );
}
