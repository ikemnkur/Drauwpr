import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'drauwper_token';
const USER_KEY = 'drauwper_user';

interface LoginResponse {
  token: string;
  tokenExpiry: number;
  user: { id: string; username: string; email: string; credits: number; avatar?: string; joined?: string; accountType?: string; accountStatus?: string };
  accountType: string;
  message: string;
}

interface RegisterResponse {
  success: boolean;
  user: { id: string; username: string; email: string; credits: number; avatar?: string; joined?: string; accountType?: string; accountStatus?: string };
  token: string;
  message: string;
}

interface UserResponse {
  user: { id: string; username: string; email: string; credits: number; avatar?: string; dateCreated?: string; verification?: string; accountType?: string; accountStatus?: string };
  token: string;
}

function mapServerUser(u: {
  id: string;
  username: string;
  email: string;
  credits: number;
  avatar?: string;
  joined?: string;
  dateCreated?: string;
  verification?: string;
  accountType?: string;
  accountStatus?: string;
}): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
    creditBalance: u.credits,
    joined: u.joined ? new Date(u.joined).getTime() : u.dateCreated ? new Date(u.dateCreated).getTime() : Date.now(),
    verification: u.verification || 'none',
    accountType: u.accountType || 'free',
    accountStatus: u.accountStatus || 'active',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
    const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
    persist(res.token, mapped);
  }, [persist]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.post<RegisterResponse>('/api/auth/register', {
      username,
      email,
      password,
      firstName: username, // backend expects firstName, use username as default
    });
    const mapped = mapServerUser(res.user);
    persist(res.token, mapped);
  }, [persist]);

  const logout = useCallback(async () => {
    if (user) {
      try {
        await api.post('/api/auth/logout', { username: user.username });
      } catch {
        // logout should always succeed client-side
      }
    }
    clear();
  }, [user, clear]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.post<UserResponse>('/api/user', { email: user.email });
      const mapped = mapServerUser({ ...res.user, credits: res.user.credits });
      persist(res.token, mapped);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clear();
      }
    }
  }, [user, persist, clear]);

  const updateBalance = useCallback((newBalance: number) => {
    if (!user || !token) return;
    const updated = { ...user, creditBalance: newBalance };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
