'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, restoreSession, setAccessToken, type SessionData } from '../lib/api-client';

type AuthState = {
  session: SessionData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void restoreSession().then((restored) => {
      setSession(restored);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<SessionData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      anonymous: true,
    });
    setAccessToken(data.accessToken);
    setSession(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<unknown>('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setSession(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const authValue = useMemo(
    () => ({ session, loading, login, logout }),
    [session, loading, login, logout],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be rendered inside Providers');
  return value;
}
