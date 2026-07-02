import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team, Schema, TypeDefinition } from '../types';
import { api } from '../services/api';
import Spinner from '../components/Spinner';

interface TeamPageProps {
  team: Team;
}

const TeamPage: React.FC<TeamPageProps> = ({ team }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [types, setTypes] = useState<TypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const schemasData = await api.listSchemas(team.id);
      const typesData = await api.listTypes(team.id);
      
      setSchemas(schemasData.schemas || []);
      setTypes(typesData.types || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            {team.name}
          </h1>
        </div>
        <p className="text-secondary-500 dark:text-secondary-400">
          Team ID: <span className="font-mono text-secondary-700 dark:text-secondary-300">{team.id}</span>
          <span className="mx-2">&bull;</span>
          Created: {formatDate(team.createdAt)}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">{schemas.length}</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">JSON Schemas</p>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">{types.length}</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Type Definitions</p>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            {schemas.length + types.length}
          </p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Total Items</p>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            {Math.max(
              ...schemas.map(s => s.version),
              ...types.map(t => t.version),
              0
            )}
          </p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Highest Version</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to={`/teams/${team.id}/schemas/new`}
            className="flex items-center space-x-3 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-600 dark:bg-primary-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-secondary-900 dark:text-secondary-100">New JSON Schema</p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Create a new schema definition</p>
            </div>
          </Link>

          <Link
            to={`/teams/${team.id}/types/new`}
            className="flex items-center space-x-3 p-4 rounded-lg bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-600 dark:bg-accent-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-secondary-900 dark:text-secondary-100">New Type Definition</p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Create a new TypeScript type</p>
            </div>
          </Link>

          <Link
            to={`/teams/${team.id}/settings`}
            className="flex items-center space-x-3 p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800/50 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary-400 dark:bg-secondary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-secondary-900 dark:text-secondary-100">Team Settings</p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Configure team preferences</p>
            </div>
          </Link>

          <button
            onClick={fetchData}
            className="flex items-center space-x-3 p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800/50 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary-400 dark:bg-secondary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20L20 4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-secondary-900 dark:text-secondary-100">Refresh Data</p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Reload schemas and types</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Schemas */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Recent Schemas
              </h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Last 5 schemas
              </p>
            </div>
            <Link
              to={`/teams/${team.id}/schemas`}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              View all
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : schemas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                No schemas yet
              </p>
              <Link
                to={`/teams/${team.id}/schemas/new`}
                className="inline-block mt-2 text-sm font-medium text-primary-600 dark:text-primary-400"
              >
                Create your first schema
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {schemas
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((schema) => (
                  <Link
                    key={schema.id}
                    to={`/teams/${team.id}/schemas/${schema.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {schema.fileName}
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">
                          v{schema.version} &bull; {formatDate(schema.createdAt)}
                        </p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {/* Recent Type Definitions */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Recent Type Definitions
              </h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Last 5 types
              </p>
            </div>
            <Link
              to={`/teams/${team.id}/types`}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              View all
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                No type definitions yet
              </p>
              <Link
                to={`/teams/${team.id}/types/new`}
                className="inline-block mt-2 text-sm font-medium text-primary-600 dark:text-primary-400"
              >
                Create your first type
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {types
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((type) => (
                  <Link
                    key={type.id}
                    to={`/teams/${team.id}/types/${type.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {type.fileName}
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">
                          v{type.version} &bull; {formatDate(type.createdAt)}
                        </p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
