import React from 'react';
import { Link } from 'react-router-dom';
import { Schema } from '../../types';

interface SchemaCardProps {
  schema: Schema;
  teamId: string;
  onDelete: () => void;
}

const SchemaCard: React.FC<SchemaCardProps> = ({ schema, teamId, onDelete }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="card p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 truncate">
              {schema.fileName}
            </h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              v{schema.version}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link
            to={`/teams/${teamId}/schemas/${schema.id}`}
            className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 dark:text-secondary-500 dark:hover:bg-secondary-800 dark:hover:text-secondary-300 transition-colors"
            title="Edit schema"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
            title="Delete schema"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-secondary-500 dark:text-secondary-400">Created:</span>
          <span className="text-sm text-secondary-600 dark:text-secondary-300">
            {formatDate(schema.createdAt)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-secondary-500 dark:text-secondary-400">Updated:</span>
          <span className="text-sm text-secondary-600 dark:text-secondary-300">
            {formatDate(schema.updatedAt)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <Link
          to={`/teams/${teamId}/schemas/${schema.id}`}
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
        >
          View details
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default SchemaCard;
