import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import JoinTeamForm from '../components/JoinTeamForm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UserTeam {
  id: number;
  name: string;
  joinCode?: string;
  role: string;
}

interface TeamsResponse {
  teams: UserTeam[];
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function Teams() {
  const { sessionToken } = useAuth();
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/teams`, {
        headers: {
          Authorization: `Bearer ${sessionToken || ''}`,
        },
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch teams');
      }

      const data: TeamsResponse = await response.json();
      setTeams(data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleJoinSuccess = () => {
    // Refetch the team list after successful join
    fetchTeams();
  };

  return (
    <div className="p-8">
      <main className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-error bg-opacity-10 border border-error rounded-lg p-4 mb-6">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* Team List */}
        <section className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-display font-semibold text-text mb-4">
            Your Teams
          </h2>

          {isLoading ? (
            <p className="text-text text-opacity-70">Loading teams...</p>
          ) : teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text text-opacity-70 mb-4">
                You are not a member of any team yet.
              </p>
              <p className="text-text text-opacity-70 mb-2">
                Join a team to see it here, or use the CLI:
              </p>
              <code className="font-mono bg-border px-2 py-1 rounded text-sm">
                npx schemory join &lt;team-name&gt;
              </code>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                      Team Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                      Join Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teams.map((team) => (
                    <tr
                      key={team.id}
                      className="hover:bg-border hover:bg-opacity-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-body text-text">{team.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-text text-sm">
                          {team.joinCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-body text-text text-opacity-70">
                          {team.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Join Team Form */}
        <section className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-display font-semibold text-text mb-4">
            Join a Team
          </h2>
          <p className="text-text text-opacity-70 mb-4">
            Enter a join code to join a team. Ask a team member to share their join code with you.
          </p>
          <div className="max-w-md">
            <JoinTeamForm onSuccess={handleJoinSuccess} />
          </div>
        </section>
      </main>
    </div>
  );
}
