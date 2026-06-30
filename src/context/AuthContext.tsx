import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  twoFAChallenge: TwoFAChallenge | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  setup2FA: () => Promise<{ qrUrl: string; secret: string }>;
  enable2FA: (code: string) => Promise<{ recoveryCodes: string[] }>;
  verifyTOTP: (code: string) => Promise<void>;
  useRecoveryCode: (recoveryCode: string) => Promise<void>;
  clearTwoFAChallenge: () => void;
  googleAuth: (credential: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'drauwper_token';
const USER_KEY = 'drauwper_user';

interface LoginResponse {
  token?: string;
  tokenExpiry?: number;
  user?: { id: string; username: string; email: string; credits: number; avatar?: string; joined?: string; accountType?: string; accountStatus?: string };
  accountType?: string;
  message?: string;
  requires2FASetup?: boolean;
  requiresTOTP?: boolean;
  tempToken?: string;
}

interface RegisterResponse {
  success?: boolean;
  user?: { id: string; username: string; email: string; credits: number; avatar?: string; joined?: string; accountType?: string; accountStatus?: string };
  token?: string;
  message?: string;
  requires2FASetup?: boolean;
  tempToken?: string;
}

type TwoFAChallenge =
  | { type: 'needs_setup'; tempToken: string }
  | { type: 'needs_totp'; tempToken: string };

interface TwoFASetupResponse {
  qrUrl: string;
  secret: string;
  tempToken: string;
}

interface TwoFAEnableResponse {
  token: string;
  tokenExpiry: number;
  user: { id: string; username: string; email: string; credits: number; accountType?: string };
  accountType: string;
  recoveryCodes: string[];
  verification?: unknown;
}

interface TwoFAVerifyResponse {
  token: string;
  tokenExpiry: number;
  user: { id: string; username: string; email: string; credits: number; accountType?: string };
  accountType: string;
  verification?: unknown;
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
  profilePicture?: string;
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
    avatar: u.profilePicture || u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
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
  const [twoFAChallenge, setTwoFAChallenge] = useState<TwoFAChallenge | null>(null);

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

    // inside AuthContext
 const googleAuth = useCallback(async (credential: string) => {
     const res = await api.post<LoginResponse>('/api/auth/google', { credential });
     if (res.token && res.user) {
       const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
       persist(res.token, mapped);
     }
   }, [persist]);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
    if (res.requires2FASetup && res.tempToken) {
      setTwoFAChallenge({ type: 'needs_setup', tempToken: res.tempToken });
      return;
    }
    if (res.requiresTOTP && res.tempToken) {
      setTwoFAChallenge({ type: 'needs_totp', tempToken: res.tempToken });
      return;
    }
    if (res.token && res.user) {
      const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
      persist(res.token, mapped);
    }
  }, [persist]);

  const register = useCallback(async (username: string, email: string, password: string) => {
     await api.post<RegisterResponse>('/api/auth/register', {
       username, email, password, firstName: username,
     });
     // No session yet — user must verify their email, then log in.
   }, []);


  // const register = useCallback(async (username: string, email: string, password: string) => {
  //   const res = await api.post<RegisterResponse>('/api/auth/register', {
  //     username,
  //     email,
  //     password,
  //     firstName: username,
  //   });
  //   if (res.requires2FASetup && res.tempToken) {
  //     setTwoFAChallenge({ type: 'needs_setup', tempToken: res.tempToken });
  //     return;
  //   }
  //   if (res.token && res.user) {
  //     const mapped = mapServerUser(res.user);
  //     persist(res.token, mapped);
  //   }
  // }, [persist]);

  const setup2FA = useCallback(async (): Promise<{ qrUrl: string; secret: string }> => {
    if (!twoFAChallenge || twoFAChallenge.type !== 'needs_setup') {
      throw new Error('No active 2FA setup challenge');
    }
    const res = await api.post<TwoFASetupResponse>('/api/auth/2fa/setup', { tempToken: twoFAChallenge.tempToken });
    // Update stored tempToken with the secret-bearing one from server
    setTwoFAChallenge({ type: 'needs_setup', tempToken: res.tempToken });
    return { qrUrl: res.qrUrl, secret: res.secret };
  }, [twoFAChallenge]);

  const enable2FA = useCallback(async (code: string): Promise<{ recoveryCodes: string[] }> => {
    if (!twoFAChallenge || twoFAChallenge.type !== 'needs_setup') {
      throw new Error('No active 2FA setup challenge');
    }
    const res = await api.post<TwoFAEnableResponse>('/api/auth/2fa/enable', {
      tempToken: twoFAChallenge.tempToken,
      code,
    });
    const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
    persist(res.token, mapped);
    setTwoFAChallenge(null);
    return { recoveryCodes: res.recoveryCodes };
  }, [twoFAChallenge, persist]);

  const verifyTOTP = useCallback(async (code: string): Promise<void> => {
    if (!twoFAChallenge || twoFAChallenge.type !== 'needs_totp') {
      throw new Error('No active TOTP challenge');
    }
    const res = await api.post<TwoFAVerifyResponse>('/api/auth/2fa/verify', {
      tempToken: twoFAChallenge.tempToken,
      code,
    });
    const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
    persist(res.token, mapped);
    setTwoFAChallenge(null);
  }, [twoFAChallenge, persist]);

  const useRecoveryCode = useCallback(async (recoveryCode: string): Promise<void> => {
    if (!twoFAChallenge || twoFAChallenge.type !== 'needs_totp') {
      throw new Error('No active TOTP challenge');
    }
    const res = await api.post<TwoFAVerifyResponse>('/api/auth/2fa/recover', {
      tempToken: twoFAChallenge.tempToken,
      recoveryCode,
    });
    const mapped = mapServerUser({ ...res.user, accountType: res.user.accountType ?? res.accountType });
    persist(res.token, mapped);
    setTwoFAChallenge(null);
  }, [twoFAChallenge, persist]);

  const clearTwoFAChallenge = useCallback(() => setTwoFAChallenge(null), []);

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
        twoFAChallenge,
        login,
        register,
        logout,
        refreshUser,
        updateBalance,
        setup2FA,
        enable2FA,
        verifyTOTP,
        useRecoveryCode,
        clearTwoFAChallenge,
        googleAuth
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
