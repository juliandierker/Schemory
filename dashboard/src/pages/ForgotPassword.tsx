import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ForgotPasswordResponse {
  status?: string;
  message?: string;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/resend-activation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        let message = errorData.error?.message || 'Failed to send activation email';
        
        if (errorData.error?.code === 'INVALID_EMAIL') {
          message = 'Please enter a valid email address';
        }
        
        throw new Error(message);
      }

      const data: ForgotPasswordResponse = await response.json();
      
      setSuccess(data.message || 'If an account exists with this email, a new activation email has been sent. Please check your inbox.');
      
      // Clear the email field
      setEmail('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send activation email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  // If successful, show success message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-display font-bold text-text mb-6">
            Check Your Email
          </h1>
          <p className="text-text font-body mb-4">{success}</p>
          <p className="text-text text-opacity-70 font-body text-sm">
            The activation link will take you to a page where you can set your password.
          </p>
          <div className="mt-8">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold text-text mb-6">
          Forgot Password
        </h1>
        
        <p className="text-text text-opacity-70 font-body text-sm mb-6">
          Enter your email address and we'll send you a new activation link to reset your password.
        </p>
        
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

          {error && (
            <p className="text-error font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending activation email...' : 'Send Activation Email'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text text-opacity-70 font-body">
          <a href="/login" className="text-primary hover:underline">Back to Login</a>
        </p>
      </div>
    </div>
  );
}
