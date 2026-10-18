import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventilion_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('eventilion_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('eventilion_user');
      }
    } catch (e) {
      console.error('Failed to sync auth state to localStorage', e);
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const isOrganizerOrAdmin = Boolean(
    user && (user.role === 'Organizer' || user.role === 'Admin')
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isOrganizerOrAdmin,
        isAdmin: user?.role === 'Admin',
        isOrganizer: user?.role === 'Organizer',
      }}
    >
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
