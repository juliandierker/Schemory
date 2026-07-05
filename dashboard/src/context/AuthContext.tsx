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
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const login = (token: string) => {
    setSessionToken(token);
  };

  const logout = () => {
    setSessionToken(null);
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
