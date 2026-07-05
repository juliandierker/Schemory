import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Item } from '@schemory/shared';
import { useAuth } from '../context/AuthContext';
import ItemKindBadge from '../components/ItemKindBadge';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ItemsResponse {
  items: Item[];
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Items() {
  const { sessionToken } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/items`, {
          headers: {
            Authorization: `Bearer ${sessionToken || ''}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to fetch items');
        }

        const data: ItemsResponse = await response.json();
        setItems(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-display font-bold text-text">Items</h1>
        </header>
        <main>
          <p className="text-text text-opacity-70">Loading...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-display font-bold text-text">Items</h1>
        </header>
        <main>
          <p className="text-error">{error}</p>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-display font-bold text-text">Items</h1>
        </header>
        <main className="max-w-2xl">
          <div className="bg-surface border border-border rounded-lg p-6">
            <h2 className="text-lg font-display font-semibold text-text mb-4">
              No items yet.
            </h2>
            <p className="text-text text-opacity-70 mb-2">
              Pull existing items from your team:
            </p>
            <code className="font-mono bg-border px-2 py-1 rounded text-sm">
              npx schemory pullAll
            </code>
            <p className="text-text text-opacity-70 mt-4 mb-2">
              Or push your first schema or type:
            </p>
            <code className="font-mono bg-border px-2 py-1 rounded text-sm">
              npx schemory push my-type
            </code>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-display font-bold text-text">Items</h1>
        <Link
          to="/"
          className="px-4 py-2 border border-border rounded-md font-body text-text hover:bg-border transition-colors"
        >
          Back to Dashboard
        </Link>
      </header>

      <main>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Kind
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-border hover:bg-opacity-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/items/${item.name}`}
                      className="font-body text-text hover:text-primary transition-colors"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <ItemKindBadge kind={item.kind} />
                  </td>
                  <td className="px-6 py-4 text-text text-opacity-70">
                    v{item.version}
                  </td>
                  <td className="px-6 py-4 text-text text-opacity-70">
                    {formatDate(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
