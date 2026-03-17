import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAPI, signupAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* eslint-disable react-refresh/only-export-components */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('cloudStorage_user') || sessionStorage.getItem('cloudStorage_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    // Check for existing session token
    const token = localStorage.getItem('cloudStorage_token') || sessionStorage.getItem('cloudStorage_token');
    const storedUser = localStorage.getItem('cloudStorage_user') || sessionStorage.getItem('cloudStorage_user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
        // Clear anything bad
        localStorage.removeItem('cloudStorage_token');
        localStorage.removeItem('cloudStorage_user');
        sessionStorage.removeItem('cloudStorage_token');
        sessionStorage.removeItem('cloudStorage_user');
    }
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const data = await loginAPI(email, password);
    setUser(data.user);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('cloudStorage_user', JSON.stringify(data.user));
    storage.setItem('cloudStorage_token', data.token); // Secure access token
  };

  const signup = async (email: string, password: string, name: string) => {
    const data = await signupAPI(name, email, password);
    setUser(data.user);
    localStorage.setItem('cloudStorage_user', JSON.stringify(data.user));
    localStorage.setItem('cloudStorage_token', data.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cloudStorage_user');
    localStorage.removeItem('cloudStorage_token');
    localStorage.removeItem('cloudStorage_files');
    localStorage.removeItem('cloudStorage_folders');
    sessionStorage.removeItem('cloudStorage_user');
    sessionStorage.removeItem('cloudStorage_token');
    // Reload to clear UI storage states thoroughly
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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
