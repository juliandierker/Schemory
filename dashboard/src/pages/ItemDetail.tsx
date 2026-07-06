import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Item } from '@schemory/shared';
import { useAuth } from '../context/AuthContext';
import ItemKindBadge from '../components/ItemKindBadge';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ItemResponse {
  item: Item;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ItemDetail() {
  const { sessionToken } = useAuth();
  const { name } = useParams<{ name: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!name) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/items/${encodeURIComponent(name)}`, {
          headers: {
            Authorization: `Bearer ${sessionToken || ''}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            const errorData: ErrorResponse = await response.json().catch(() => ({
              error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' },
            }));
            setError(errorData.error.message);
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to fetch item');
        }

        const data: ItemResponse = await response.json();
        setItem(data.item);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [name]);

  if (isLoading) {
    return (
      <div className="p-8">
        <main>
          <p className="text-text text-opacity-70">Loading...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <main>
          <div className="bg-surface border border-border rounded-lg p-6 max-w-2xl">
            <h2 className="text-lg font-display font-semibold text-text mb-2">
              Item Not Found
            </h2>
            <p className="text-text text-opacity-70">
              {error}
            </p>
            <p className="text-text text-opacity-70 mt-4">
              Check the item name and try again, or browse all items.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8">
        <main>
          <p className="text-text text-opacity-70">No item data</p>
        </main>
      </div>
    );
  }

  return (
    <div className="p-8">
      <main className="max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-display font-bold text-text">
              {item.name}
            </h1>
            <ItemKindBadge kind={item.kind} />
          </div>
          <p className="text-text text-opacity-70">
            Version {item.version} &bull; Updated {formatDate(item.updatedAt)}
          </p>
        </div>

        <section className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-text text-opacity-70 uppercase tracking-wider mb-4">
            Content
          </h2>
          <div className="type-plate">
            <pre className="margin-0 whitespace-pre-wrap">{item.content}</pre>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-text text-opacity-70 uppercase tracking-wider mb-4">
            Metadata
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-text text-opacity-70">ID</dt>
              <dd className="font-mono text-text">{item.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text text-opacity-70">Team</dt>
              <dd className="font-mono text-text">{item.teamId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text text-opacity-70">Kind</dt>
              <dd className="text-text">{item.kind}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text text-opacity-70">Version</dt>
              <dd className="text-text">{item.version}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
