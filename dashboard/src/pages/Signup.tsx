import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// API base URL - Vite injects import.meta.env.VITE_API_URL at build time
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SignupResponse {
  status?: string;
  message?: string;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function Signup() {
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
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        let message = errorData.error?.message || 'Signup failed';
        
        if (errorData.error?.code === 'INVALID_EMAIL') {
          message = 'Please enter a valid email address';
        } else if (errorData.error?.code === 'EMAIL_EXISTS') {
          message = 'This email is already registered. Please log in.';
        }
        
        throw new Error(message);
      }

      const data: SignupResponse = await response.json();
      
      if (data.status !== 'pending') {
        throw new Error('Signup did not complete successfully');
      }

      setSuccess('Activation email sent! Please check your inbox and click the activation link to set your password.');
      
      // Clear the email field
      setEmail('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  // If signup was successful, show success message
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
              Go to Login
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
          Create Account
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

          {error && (
            <p className="text-error font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending activation email...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text text-opacity-70 font-body">
          Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
