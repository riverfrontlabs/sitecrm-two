import { Navigate } from 'react-router-dom';

/** Replaced by DashboardPage — kept as redirect to avoid 404 on any stale links. */
export function HomePage() {
  return <Navigate to="/" replace />;
}
