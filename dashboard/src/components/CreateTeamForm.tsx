import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CreateTeamFormProps {
  onSuccess: () => void;
}

interface CreateTeamResponse {
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

export default function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const { sessionToken } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation: match server validation (non-empty after trim)
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken || ''}`,
        },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Failed to create team';
        throw new Error(message);
      }

      const data: CreateTeamResponse = await response.json();
      // On success, refetch the team list via the onSuccess callback
      onSuccess();
      setTeamName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTeamName(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="teamName" className="block text-sm font-body text-text mb-1">
          Team Name
        </label>
        <input
          type="text"
          id="teamName"
          value={teamName}
          onChange={handleTeamNameChange}
          placeholder="Enter team name"
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
        disabled={isLoading || !teamName.trim()}
        className="w-full px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Creating...' : 'Create Team'}
      </button>
    </form>
  );
}
