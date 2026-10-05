import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type User, getStoredToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<{ user: User; message: string }>;
  uploadAvatar: (file: File) => Promise<{ user: User; avatar_url: string; message: string }>;
  removeAvatar: () => Promise<{ user: User; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getProfile();
      setUser(data.user);
    } catch {
      // Invalid/expired token
      api.logout().catch(() => {});
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await api.signup({ name, email, password });
    setUser(data.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const data = await api.getProfile();
      setUser(data.user);
    } catch {
      // Ignore error
    }
  };

  const updateProfile = async (data: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
    return res;
  };

  const uploadAvatar = async (file: File) => {
    const res = await api.uploadAvatar(file);
    setUser(res.user);
    return res;
  };

  const removeAvatar = async () => {
    const res = await api.removeAvatar();
    setUser(res.user);
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshProfile, updateProfile, uploadAvatar, removeAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
