import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  sessionToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize from localStorage to persist across page reloads
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('schemory_session_token') || null;
    }
    return null;
  });

  const login = (token: string) => {
    setSessionToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemory_session_token', token);
    }
  };

  const logout = () => {
    setSessionToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schemory_session_token');
    }
  };

  return (
    <AuthContext.Provider value={{ sessionToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
