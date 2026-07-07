import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserInfo {
  email: string;
}

interface AuthContextType {
  sessionToken: string | null;
  user: UserInfo | null;
  login: (token: string, email?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize from localStorage to persist across page reloads
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('schemory_session_token') || null;
    }
    return null;
  });
  const [user, setUser] = useState<UserInfo | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('schemory_user_email');
      return savedUser ? { email: savedUser } : null;
    }
    return null;
  });

  // When token changes, fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (sessionToken) {
        try {
          const response = await fetch(`${API_BASE}/auth/login/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: sessionToken }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.user?.email) {
              setUser({ email: data.user.email });
              if (typeof window !== 'undefined') {
                localStorage.setItem('schemory_user_email', data.user.email);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      }
    };
    fetchUserInfo();
  }, [sessionToken]);

  const login = (token: string, email?: string) => {
    setSessionToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('schemory_session_token', token);
    }
    if (email) {
      setUser({ email });
      if (typeof window !== 'undefined') {
        localStorage.setItem('schemory_user_email', email);
      }
    }
  };

  const logout = () => {
    setSessionToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schemory_session_token');
      localStorage.removeItem('schemory_user_email');
    }
  };

  return (
    <AuthContext.Provider value={{ sessionToken, user, login, logout }}>
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
