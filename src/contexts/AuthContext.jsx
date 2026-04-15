import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAPI, signupAPI } from '../services/api';
import { useToast } from './ToastContext';
const AuthContext = createContext(undefined);
/* eslint-disable react-refresh/only-export-components */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('cloudStorage_user') || sessionStorage.getItem('cloudStorage_user');
        return stored ? JSON.parse(stored) : null;
    });
    const toast = useToast();

    useEffect(() => {
        // Check for existing session token
        const token = localStorage.getItem('cloudStorage_token') || sessionStorage.getItem('cloudStorage_token');
        const storedUser = localStorage.getItem('cloudStorage_user') || sessionStorage.getItem('cloudStorage_user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        else {
            // Clear anything bad
            localStorage.removeItem('cloudStorage_token');
            localStorage.removeItem('cloudStorage_user');
            sessionStorage.removeItem('cloudStorage_token');
            sessionStorage.removeItem('cloudStorage_user');
        }
    }, []);
    const login = async (email, password, rememberMe = false) => {
        const data = await loginAPI(email, password);
        setUser(data.user);
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('cloudStorage_user', JSON.stringify(data.user));
        storage.setItem('cloudStorage_token', data.token); // Secure access token
        toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
    };
    const signup = async (email, password, name) => {
        const data = await signupAPI(name, email, password);
        setUser(data.user);
        localStorage.setItem('cloudStorage_user', JSON.stringify(data.user));
        localStorage.setItem('cloudStorage_token', data.token);
        toast.success(`Account created successfully! Welcome!`);
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
    return (<AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
