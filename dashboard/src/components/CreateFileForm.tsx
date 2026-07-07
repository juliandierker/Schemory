import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemKind } from '@schemory/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CreateFileFormProps {
  teamId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CreateItemResponse {
  item: {
    id: string;
    teamId: string;
    name: string;
    kind: ItemKind;
    content: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export default function CreateFileForm({ teamId, onSuccess, onCancel }: CreateFileFormProps) {
  const { sessionToken } = useAuth();
  const [filename, setFilename] = useState('');
  const [kind, setKind] = useState<ItemKind>('type');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/items/${encodeURIComponent(filename.trim())}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken || ''}`,
        },
        body: JSON.stringify({
          kind,
          content: content.trim(),
          teamId,
        }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Failed to create file';
        throw new Error(message);
      }

      const data: CreateItemResponse = await response.json();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="filename" className="block text-sm font-body text-text mb-1">
          Filename *
        </label>
        <input
          type="text"
          id="filename"
          value={filename}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setFilename(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter filename (e.g., user-profile)"
          className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="kind" className="block text-sm font-body text-text mb-1">
          Type *
        </label>
        <select
          id="kind"
          value={kind}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setKind(e.target.value as ItemKind);
            if (error) setError(null);
          }}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text"
          disabled={isLoading}
        >
          <option value="type">TypeScript Type</option>
          <option value="schema">JSON Schema</option>
        </select>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-body text-text mb-1">
          Content *
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            setContent(e.target.value);
            if (error) setError(null);
          }}
          placeholder={kind === 'type' ? 'type User = {\n  id: string;\n  name: string;\n};' : '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "properties": {}\n}'}
          className="w-full px-3 py-2 border border-border rounded-md font-mono text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px] resize-vertical"
          disabled={isLoading}
        />
      </div>

      {error && (
        <p className="text-error font-body text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border text-text font-body rounded-md hover:bg-border hover:bg-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !filename.trim() || !content.trim()}
          className="px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create File'}
        </button>
      </div>
    </form>
  );
}
