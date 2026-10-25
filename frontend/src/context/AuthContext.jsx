import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventilion_user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Ensure only admin or organizer is recognized
      const role = parsed?.role?.toLowerCase();
      if (role === 'admin' || role === 'organizer') {
        return {
          ...parsed,
          role,
        };
      }
      return null;
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
    try {
      const role = userData?.role?.toLowerCase() === 'admin' ? 'admin' : 'organizer';
      const cleanUser = {
        user_id: userData?.user_id,
        name: userData?.name || userData?.full_name || userData?.email?.split('@')[0],
        email: userData?.email,
        role,
        token: userData?.token,
      };
      setUser(cleanUser);
      localStorage.setItem('eventilion_user', JSON.stringify(cleanUser));
    } catch (e) {
      console.error('Failed to save user in login', e);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('eventilion_user');
    } catch (e) {
      console.error('Failed to clear auth state from localStorage', e);
    }
    setUser(null);
  };

  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isOrganizer = role === 'organizer';
  const isOrganizerOrAdmin = Boolean(user && (isAdmin || isOrganizer));

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        login,
        logout,
        isAdmin,
        isOrganizer,
        isOrganizerOrAdmin,
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
