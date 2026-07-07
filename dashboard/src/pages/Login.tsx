import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginResponse {
  sessionToken?: string;
  token?: string;
  accessToken?: string;
  user?: {
    email: string;
  };
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          password 
        }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        let message = errorData.error?.message || 'Login failed';
        
        // Provide more user-friendly error messages
        if (errorData.error?.code === 'MISSING_EMAIL') {
          message = 'Please enter your email address';
        } else if (errorData.error?.code === 'MISSING_PASSWORD') {
          message = 'Please enter your password';
        } else if (errorData.error?.code === 'INVALID_CREDENTIALS') {
          message = 'Invalid email or password';
        }
        
        throw new Error(message);
      }

      const data: LoginResponse = await response.json();
      // API returns { accessToken, user } for email/password login
      const sessionToken = data.accessToken || data.sessionToken || data.token;
      const userEmail = data.user?.email;
      
      if (!sessionToken) {
        throw new Error('No session token received');
      }

      login(sessionToken, userEmail);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold text-text mb-6">
          Schemory
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-body text-text mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-body text-text mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-error font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text text-opacity-70 font-body">
          Don't have an account? <a href="/signup" className="text-primary hover:underline">Sign up</a>
        </p>
        
        <p className="mt-2 text-sm text-text text-opacity-70 font-body">
          <a href="/forgot-password" className="text-primary hover:underline">Forgot password? Resend activation email</a>
        </p>
      </div>
    </div>
  );
}
