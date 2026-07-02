import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team, Schema } from '../../types';
import { api } from '../../services/api';
import Spinner from '../../components/Spinner';
import SchemaCard from '../../components/ui/SchemaCard';

interface SchemaListPageProps {
  teams: Team[];
}

const SchemaListPage: React.FC<SchemaListPageProps> = ({ teams }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const team = teams.find(t => t.id === teamId);

  useEffect(() => {
    if (teamId) {
      fetchSchemas();
    }
  }, [teamId]);

  const fetchSchemas = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      const data = await api.listSchemas(teamId);
      setSchemas(data.schemas || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to load schemas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchema = async (id: string, fileName: string) => {
    if (!teamId) return;
    
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteSchema(teamId, id);
      toast.success(`Schema "${fileName}" deleted`);
      fetchSchemas();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  // Filter and sort schemas
  const filteredSchemas = schemas
    .filter(schema => 
      schema.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schema.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  const toggleSortDirection = (field: 'name' | 'createdAt' | 'updatedAt') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'createdAt' | 'updatedAt') => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            JSON Schemas
          </h1>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            Manage your JSON schema definitions
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-500 dark:text-secondary-400">Sort by:</span>
            <button
              onClick={() => toggleSortDirection('name')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'name' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800'
              }`}
            >
              <span>Name</span>
              {getSortIcon('name')}
            </button>
            <button
              onClick={() => toggleSortDirection('createdAt')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'createdAt' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800'
              }`}
            >
              <span>Date Created</span>
              {getSortIcon('createdAt')}
            </button>
            <button
              onClick={() => toggleSortDirection('updatedAt')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'updatedAt' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800'
              }`}
            >
              <span>Last Updated</span>
              {getSortIcon('updatedAt')}
            </button>
          </div>

          {/* New Schema button */}
          <Link
            to={`/teams/${teamId}/schemas/new`}
            className="btn btn-primary whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Schema</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemas..."
            className="input pl-10 w-full max-w-md"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
            <Spinner />
            <span>Loading schemas...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button onClick={fetchSchemas} className="btn btn-primary text-sm">
            Retry
          </button>
        </div>
      ) : filteredSchemas.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-secondary-500 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-secondary-700 dark:text-secondary-300">
            No schemas found
          </h3>
          <p className="text-secondary-500 dark:text-secondary-400 mt-2">
            {searchQuery 
              ? `No schemas match "${searchQuery}"` 
              : 'Create your first JSON schema to get started'}
          </p>
          {!searchQuery && (
            <Link to={`/teams/${teamId}/schemas/new`} className="inline-block mt-4 btn btn-primary">
              Create Schema
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemas.map((schema) => (
            <SchemaCard
              key={schema.id}
              schema={schema}
              teamId={teamId!}
              onDelete={() => handleDeleteSchema(schema.id, schema.fileName)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SchemaListPage;
