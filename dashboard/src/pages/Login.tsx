import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginResponse {
  sessionToken?: string;
  token?: string;
}

interface ErrorResponse {
  error?: {
    message?: string;
  };
}

export default function Login() {
  const [token, setToken] = useState('');
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
        body: JSON.stringify({ token: token.trim() }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Login failed';
        throw new Error(message);
      }

      const data: LoginResponse = await response.json();
      // API returns { sessionToken } per contract
      const sessionToken = data.sessionToken || data.token;
      
      if (!sessionToken) {
        throw new Error('No session token received');
      }

      login(sessionToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold text-text mb-6">
          Schemory Dashboard
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-body text-text mb-1">
              Login Token
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={handleTokenChange}
              placeholder="Enter your CLI login token"
              className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-error font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text text-opacity-70 font-body">
          Get your token from the CLI: <code className="font-mono bg-border px-1 rounded">npx schemory login</code>
        </p>
      </div>
    </div>
  );
}
