import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team, Schema } from '../../types';
import { api } from '../../services/api';
import CodeEditor from '../../components/ui/CodeEditor';
import Spinner from '../../components/Spinner';
import Modal from '../../components/ui/Modal';

interface SchemaDetailPageProps {
  teams: Team[];
}

const SchemaDetailPage: React.FC<SchemaDetailPageProps> = ({ teams }) => {
  const { teamId, schemaId } = useParams<{ teamId: string; schemaId: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const team = teams.find(t => t.id === teamId);

  useEffect(() => {
    if (teamId && schemaId) {
      fetchSchema();
    }
  }, [teamId, schemaId]);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const data = await api.getSchema(teamId!, schemaId!);
      setSchema(data.schema);
      setContent(data.schema.content);
      setFileName(data.schema.fileName);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to load schema: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileName.trim()) {
      toast.error('File name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.updateSchema(teamId!, schemaId!, {
        fileName,
        content,
      });

      if (response.schema) {
        toast.success(`Schema "${fileName}" updated!`);
        setSchema(response.schema);
        navigate(`/teams/${teamId}/schemas/${schemaId}?updated=true`);
      }
    } catch (err: any) {
      toast.error(`Failed to update schema: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!schema) return;

    setIsSubmitting(true);
    setIsDeleteModalOpen(false);

    try {
      await api.deleteSchema(teamId!, schemaId!);
      toast.success(`Schema "${schema.fileName}" deleted`);
      navigate(`/teams/${teamId}/schemas`);
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
            <Spinner />
            <span>Loading schema...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-secondary-700 dark:text-secondary-300 mb-4">
            {error || 'Schema not found'}
          </h2>
          <div className="flex items-center justify-center space-x-4">
            <Link to={`/teams/${teamId}/schemas`} className="btn btn-secondary">
              Back to Schemas
            </Link>
            <button onClick={fetchSchema} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <span className="text-secondary-900 dark:text-secondary-100 truncate max-w-xs">{schema.fileName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              {schema.fileName}
            </h1>
            <span className="badge badge-success">v{schema.version}</span>
          </div>
          <p className="text-secondary-500 dark:text-secondary-400">
            JSON Schema &bull; Created {formatDate(schema.createdAt)}
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <Link to={`/teams/${teamId}/schemas/${schema.id}/edit`} className="btn btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn btn-danger"
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Schema Content
          </h2>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(content);
                toast.success('Content copied to clipboard!');
              }
            }}
            className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>
        <CodeEditor
          value={content}
          onChange={(value) => setContent(value || '')}
          language="json"
          height="600px"
          readOnly
        />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="paper">
          <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2">
            Schema ID
          </h3>
          <p className="text-sm text-secondary-900 dark:text-secondary-100 font-mono">
            {schema.id}
          </p>
        </div>
        <div className="paper">
          <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2">
            Created
          </h3>
          <p className="text-sm text-secondary-900 dark:text-secondary-100">
            {formatDate(schema.createdAt)}
          </p>
        </div>
        <div className="paper">
          <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2">
            Last Updated
          </h3>
          <p className="text-sm text-secondary-900 dark:text-secondary-100">
            {formatDate(schema.updatedAt)}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Schema"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-secondary-600 dark:text-secondary-400">
            Are you sure you want to delete <strong className="text-secondary-900 dark:text-secondary-100">{schema.fileName}</strong>?
            This action cannot be undone.
          </p>
          
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              Delete Schema
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchemaDetailPage;
