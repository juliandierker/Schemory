import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team } from '../../types';
import { api } from '../../services/api';
import CodeEditor from '../../components/ui/CodeEditor';
import Spinner from '../../components/Spinner';

interface SchemaNewPageProps {
  teams: Team[];
}

const DEFAULT_JSON_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/{{name}}.schema.json",
  "title": "{{name}}",
  "description": "A sample JSON schema",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The unique identifier"
    },
    "name": {
      "type": "string",
      "description": "The name of the item"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the item was created"
    }
  },
  "required": ["id", "name"]
}`;

const SchemaNewPage: React.FC<SchemaNewPageProps> = ({ teams }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState(DEFAULT_JSON_SCHEMA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const team = teams.find(t => t.id === teamId);

  useEffect(() => {
    if (!teamId) {
      navigate('/');
    }
  }, [teamId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    if (!fileName.endsWith('.json') && !fileName.endsWith('.schema.json')) {
      setError('File name should end with .json or .schema.json');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.createSchema(teamId!, {
        name: fileName,
        fileName,
        content,
      });

      if (response.schema) {
        toast.success(`Schema "${fileName}" created!`);
        navigate(`/teams/${teamId}/schemas`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to create schema: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!team) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-secondary-700 dark:text-secondary-300">
            Team not found
          </h2>
          <Link to="/" className="inline-block mt-4 btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-400 mb-8">
        <Link to={`/teams/${teamId}`} className="hover:text-primary-600 dark:hover:text-primary-400">
          {team.name}
        </Link>
        <span>/</span>
        <Link to={`/teams/${teamId}/schemas`} className="hover:text-primary-600 dark:hover:text-primary-400">
          Schemas
        </Link>
        <span>/</span>
        <span className="text-secondary-900 dark:text-secondary-100">New</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Create New JSON Schema
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400 mt-1">
          Define your JSON schema structure
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* File Name */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            File Name <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="user.schema.json"
                className="input"
              />
            </div>
            <button type="submit" className="btn btn-primary self-end" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              Create Schema
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
              JSON Schema Content
            </label>
            <button
              type="button"
              onClick={() => setContent(DEFAULT_JSON_SCHEMA)}
              className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Reset to default
            </button>
          </div>
          <CodeEditor
            value={content}
            onChange={(value) => setContent(value || '')}
            language="json"
            height="500px"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-8 border-t border-secondary-200 dark:border-secondary-700">
          <Link
            to={`/teams/${teamId}/schemas`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !fileName.trim()}
          >
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Create Schema
          </button>
        </div>
      </form>
    </div>
  );
};

export default SchemaNewPage;
