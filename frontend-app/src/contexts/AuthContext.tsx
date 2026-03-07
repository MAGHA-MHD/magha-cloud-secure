import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  plan: string;
  storage_used: number;
  storage_limit: number;
  mfa_enabled: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, mfa_code?: string) => Promise<{ requires_mfa: boolean }>;
  register: (email: string, username: string, password: string, full_name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await authAPI.getMe();
        setUser(res.data);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, mfa_code?: string) => {
    const res = await authAPI.login({ email, password, mfa_code });
    if (res.data.requires_mfa) {
      return { requires_mfa: true };
    }
    localStorage.setItem('token', res.data.access_token);
    await refreshUser();
    return { requires_mfa: false };
  };

  const register = async (email: string, username: string, password: string, full_name?: string) => {
    await authAPI.register({ email, username, password, full_name });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
