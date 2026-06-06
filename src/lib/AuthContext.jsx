import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [isAuthenticated, setAuth]    = useState(false);
  const [isLoadingAuth, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setLoading(false); return; }

    api.auth.me()
      .then((u) => { setUser(u); setAuth(true); })
      .catch(() => { localStorage.removeItem('auth_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { token, user: u } = await api.auth.login(username, password);
    localStorage.setItem('auth_token', token);
    setUser(u);
    setAuth(true);
    return u;
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setAuth(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
