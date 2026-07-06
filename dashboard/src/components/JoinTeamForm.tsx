import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface JoinTeamFormProps {
  onSuccess: () => void;
}

interface JoinTeamResponse {
  team: {
    id: number;
    name: string;
    createdAt: string;
    joinCode?: string;
  };
  membership: {
    userId: number;
    teamId: number;
    role: string;
    joinedAt: string;
  };
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function JoinTeamForm({ onSuccess }: JoinTeamFormProps) {
  const { sessionToken } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation: match server validation (non-empty after trim)
    if (!joinCode.trim()) {
      setError('Join code is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/teams/${encodeURIComponent(joinCode)}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken || ''}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Failed to join team';
        throw new Error(message);
      }

      const data: JoinTeamResponse = await response.json();
      // On success, refetch the team list via the onSuccess callback
      onSuccess();
      setJoinCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setJoinCode(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="joinCode" className="block text-sm font-body text-text mb-1">
          Join Code
        </label>
        <input
          type="text"
          id="joinCode"
          value={joinCode}
          onChange={handleJoinCodeChange}
          placeholder="Enter join code"
          className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-error font-body text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading || !joinCode.trim()}
        className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Joining...' : 'Join Team'}
      </button>
    </form>
  );
}
