import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team, TypeDefinition } from '../../types';
import { api } from '../../services/api';
import Spinner from '../../components/Spinner';
import TypeCard from '../../components/ui/TypeCard';

interface TypeListPageProps {
  teams: Team[];
}

const TypeListPage: React.FC<TypeListPageProps> = ({ teams }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const [types, setTypes] = useState<TypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const team = teams.find(t => t.id === teamId);

  useEffect(() => {
    if (teamId) {
      fetchTypes();
    }
  }, [teamId]);

  const fetchTypes = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      const data = await api.listTypes(teamId);
      setTypes(data.types || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to load types: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (id: string, fileName: string) => {
    if (!teamId) return;
    
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteType(teamId, id);
      toast.success(`Type definition "${fileName}" deleted`);
      fetchTypes();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  // Filter and sort types
  const filteredTypes = types
    .filter(type => 
      type.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.content.toLowerCase().includes(searchQuery.toLowerCase())
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
            Type Definitions
          </h1>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            Manage your TypeScript type definitions
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

          {/* New Type button */}
          <Link
            to={`/teams/${teamId}/types/new`}
            className="btn btn-primary whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Type</span>
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
            placeholder="Search types..."
            className="input pl-10 w-full max-w-md"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
            <Spinner />
            <span>Loading type definitions...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button onClick={fetchTypes} className="btn btn-primary text-sm">
            Retry
          </button>
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-secondary-500 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-secondary-700 dark:text-secondary-300">
            No type definitions found
          </h3>
          <p className="text-secondary-500 dark:text-secondary-400 mt-2">
            {searchQuery 
              ? `No types match "${searchQuery}"` 
              : 'Create your first TypeScript type definition to get started'}
          </p>
          {!searchQuery && (
            <Link to={`/teams/${teamId}/types/new`} className="inline-block mt-4 btn btn-primary">
              Create Type
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTypes.map((type) => (
            <TypeCard
              key={type.id}
              type={type}
              teamId={teamId!}
              onDelete={() => handleDeleteType(type.id, type.fileName)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TypeListPage;
