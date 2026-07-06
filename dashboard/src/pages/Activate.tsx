import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ActivateResponse {
  user?: {
    id: number;
    email: string;
    isActive: boolean;
  };
  accessToken?: string;
  expiresAt?: string;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function Activate() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Extract token from URL search params
  const token = searchParams.get('token') || '';

  useEffect(() => {
    // If no token in URL, redirect to login
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Call activate endpoint with token and password
      const response = await fetch(`${API_BASE}/auth/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim(),
          password
        }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        let message = errorData.error?.message || 'Activation failed';
        
        if (errorData.error?.code === 'INVALID_TOKEN') {
          message = 'Invalid or expired activation token. Please sign up again.';
        } else if (errorData.error?.code === 'WEAK_PASSWORD') {
          message = 'Password must be at least 8 characters';
        } else if (errorData.error?.code === 'MISSING_PASSWORD') {
          message = 'Password is required';
        }
        
        throw new Error(message);
      }

      const data: ActivateResponse = await response.json();
      
      if (!data.accessToken) {
        throw new Error('Activation succeeded but no access token received');
      }

      // Auto-login the user after activation
      login(data.accessToken || '');
      setSuccess('Account activated successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  // Show loading state if no token yet
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="text-center">
          <p className="text-text text-opacity-70">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-display font-bold text-text mb-6">
            Account Activated
          </h1>
          <p className="text-success font-body mb-4">{success}</p>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold text-text mb-2">
          Activate Your Account
        </h1>
        <p className="text-text text-opacity-70 font-body mb-6">
          Please set a password to complete your Schemory account activation.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-body text-text mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter a strong password"
              className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-body text-text mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm your password"
              className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-error font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim() || !confirmPassword.trim()}
            className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Activating...' : 'Activate Account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text text-opacity-70 font-body">
          Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
