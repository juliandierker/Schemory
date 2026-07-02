import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Team } from '../types';
import Spinner from '../components/Spinner';

interface TeamListPageProps {
  teams: Team[];
  onCreateTeam: (name: string) => Promise<Team | undefined>;
}

const TeamListPage: React.FC<TeamListPageProps> = ({ teams, onCreateTeam }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setIsCreating(true);
    try {
      const team = await onCreateTeam(newTeamName.trim());
      if (team) {
        setNewTeamName('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
            Welcome to Schemory
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-400">
            Don't forget your data structures
          </p>
        </div>

        {/* Create Team Card */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                Your Teams
              </h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Create a team to start storing and sharing schemas and type definitions
              </p>
            </div>
          </div>

          {/* Create team form */}
          <form onSubmit={handleCreateTeam} className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="sr-only">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={!newTeamName.trim() || isCreating}
              className="btn btn-primary whitespace-nowrap"
            >
              {isCreating ? <Spinner size="sm" className="mr-2" /> : null}
              Create Team
            </button>
          </form>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary-500 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-secondary-700 dark:text-secondary-300">
              No teams yet
            </h3>
            <p className="text-secondary-500 dark:text-secondary-400 mt-2">
              Create your first team above to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="card p-6 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      {team.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {team.name}
                </h3>
                
                <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400">
                  <span className="truncate">{team.id.slice(0, 8)}...</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamListPage;
