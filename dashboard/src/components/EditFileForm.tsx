import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Item, ItemKind } from '@schemory/shared';
import CodeEditor from './CodeEditor';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface EditFileFormProps {
  item: Item;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UpdateItemResponse {
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

export default function EditFileForm({ item, onSuccess, onCancel }: EditFileFormProps) {
  const { sessionToken } = useAuth();
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content);
  const [kind, setKind] = useState<ItemKind>(item.kind as ItemKind);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setIsLoading(true);

    try {
      // Use the existing item's name for the URL, but send the new name in the body
      // The API will handle renaming by creating a new item and deleting the old one
      // For now, we'll just update the content and version
      const response = await fetch(`${API_BASE}/items/${encodeURIComponent(item.name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken || ''}`,
        },
        body: JSON.stringify({
          kind,
          content: content.trim(),
          lastKnownVersion: item.version,
          teamId: item.teamId,
        }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Failed to update file';
        throw new Error(message);
      }

      const data: UpdateItemResponse = await response.json();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-body text-text mb-1">
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter name"
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
        <div className="border border-border rounded-md overflow-hidden">
          <CodeEditor
            content={content}
            language={kind === 'schema' ? 'json' : 'typescript'}
            readOnly={false}
            onChange={(newContent) => {
              setContent(newContent);
              if (error) setError(null);
            }}
            className="min-h-[300px]"
          />
        </div>
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
          disabled={isLoading || !name.trim() || !content.trim()}
          className="px-4 py-2 bg-primary text-white font-body rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Updating...' : 'Update File'}
        </button>
      </div>
    </form>
  );
}
