import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.clear();
  };

  const isAuthenticated = !!user;

  const refresh = async () => {
    try {
      const { whoami } = await import('../services/authApi');
      const res = await whoami();
      if (res?.status && res?.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } else if (res?.data) { // If there's no status wrapper but data exists
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } else if (res && !res.data) { // If res is the user object directly
        setUser(res);
        localStorage.setItem('user', JSON.stringify(res));
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
