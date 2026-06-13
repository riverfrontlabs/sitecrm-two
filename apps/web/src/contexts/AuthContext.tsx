/**
 * Authentication context — JWT state, login, and logout.
 *
 * On mount, the provider reads any token stored in `localStorage` and calls
 * `GET /api/auth/me` to validate it. If the token is missing or rejected the
 * user is considered unauthenticated; if accepted, the `User` record is
 * hydrated and the app considers the session live.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@sitecrm/types';
import { authApi, setAuthToken, getAuthToken, ApiError } from '../api/client';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the initial token-validation request is in flight. */
  isLoading: boolean;
  /**
   * Sign in with email + password. On success stores the JWT and populates
   * `user`. Throws {@link ApiError} on invalid credentials.
   */
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then(u => {
        setUser(u);
        setIsLoading(false);
      })
      .catch(() => {
        setAuthToken(null);
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    setAuthToken(token);
    setUser(u);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Returns the auth context. Must be called inside {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
