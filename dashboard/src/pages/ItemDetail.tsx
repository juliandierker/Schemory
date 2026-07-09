import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Item, ItemRevision } from '@schemory/shared';
import { useAuth } from '../context/AuthContext';
import { CreateActionsProvider } from '../context/CreateActionsContext';
import ItemKindBadge from '../components/ItemKindBadge';
import CodeEditor from '../components/CodeEditor';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ItemResponse {
  item: Item;
}

interface ItemRevisionsResponse {
  revisions: ItemRevision[];
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
  
  // Type for normalized display revisions
  type DisplayRevision = {
    content: string;
    kind: string;
    version: number;
    createdAt: string;
    isCurrent: boolean;
    label: string;
    shortLabel: string;
    id: string;
  };
  
  const [item, setItem] = useState<Item | null>(null);
  const [revisions, setRevisions] = useState<ItemRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<DisplayRevision | null>(null);
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
        
        // Now fetch revisions using the teamId from the item
        await fetchRevisions(data.item);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRevisions = async (itemData: Item) => {
      try {
        const response = await fetch(
          `${API_BASE}/items/${encodeURIComponent(name || '')}/revisions?teamId=${itemData.teamId}`,
          {
            headers: {
              Authorization: `Bearer ${sessionToken || ''}`,
            },
          }
        );

        if (!response.ok) {
          // It's okay if there are no revisions yet
          if (response.status !== 404) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('Failed to fetch revisions:', errorData.error?.message);
          }
          setRevisions([]);
          return;
        }

        const data: ItemRevisionsResponse = await response.json();
        setRevisions(data.revisions);
      } catch (err) {
        console.warn('Failed to load revisions:', err);
        setRevisions([]);
      }
    };

    fetchItem();
  }, [name, sessionToken]);

  // Initialize selected revision when item or revisions change
  useEffect(() => {
    if (item && !selectedRevision) {
      const initialRevision: DisplayRevision = {
        ...item,
        isCurrent: true,
        label: `Current (v${item.version})`,
        shortLabel: `v${item.version}`
      };
      setSelectedRevision(initialRevision);
    }
  }, [item, selectedRevision]);

  if (isLoading) {
    return (
      <CreateActionsProvider onCreateTeam={undefined} onCreateFile={undefined}>
        <div className="p-8">
          <main>
            <p className="text-text text-opacity-70">Loading...</p>
          </main>
        </div>
      </CreateActionsProvider>
    );
  }

  if (error) {
    return (
      <CreateActionsProvider onCreateTeam={undefined} onCreateFile={undefined}>
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
      </CreateActionsProvider>
    );
  }

  if (!item) {
    return (
      <CreateActionsProvider onCreateTeam={undefined} onCreateFile={undefined}>
        <div className="p-8">
          <main>
            <p className="text-text text-opacity-70">No item data</p>
          </main>
        </div>
      </CreateActionsProvider>
    );
  }

  // Prepare available revisions: current item + up to 2 last revisions
  // Normalize both item and revisions to have consistent types for display
  const allRevisions: DisplayRevision[] = [
    {
      ...item,
      isCurrent: true,
      label: `Current (v${item.version})`,
      shortLabel: `v${item.version}`
    },
    ...revisions.slice(0, 2).map(rev => ({
      content: rev.content,
      kind: rev.kind,
      version: rev.version,
      createdAt: rev.createdAt,
      isCurrent: false,
      label: `v${rev.version} (${formatDate(rev.createdAt)})`,
      shortLabel: `v${rev.version}`,
      id: rev.id
    }))
  ];

  // Find the selected revision for display
  const selectedDisplayRevision = allRevisions.find(rev => 
    selectedRevision === rev || 
    (selectedRevision && item && selectedRevision.id === item.id && rev.isCurrent) ||
    (selectedRevision && !rev.isCurrent && selectedRevision.id === rev.id)
  ) || allRevisions[0];

  const displayItem = selectedDisplayRevision;
  const isCurrentSelected = selectedDisplayRevision.isCurrent;

  return (
    <CreateActionsProvider onCreateTeam={undefined} onCreateFile={undefined}>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-text text-opacity-70 uppercase tracking-wider">
                Content
              </h2>
              {!isCurrentSelected && (
                <span className="text-xs text-text text-opacity-50">
                  (Viewing revision v{displayItem.version})
                </span>
              )}
            </div>
            {/* Revision Selector - placed inline with Content header */}
            {allRevisions.length > 1 && (
              <div className="flex gap-2">
                {allRevisions.map((revision) => (
                  <button
                    key={revision.isCurrent ? 'current' : revision.id}
                    onClick={() => setSelectedRevision(revision)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      displayItem === revision
                        ? 'bg-primary text-white' 
                        : 'bg-surface border border-border text-text hover:bg-border hover:bg-opacity-50'
                    }`}
                    title={revision.label}
                  >
                    {revision.shortLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="type-plate min-h-[300px]">
            <CodeEditor 
              content={displayItem.content} 
              language={displayItem.kind === 'schema' ? 'json' : 'typescript'}
              readOnly={true}
            />
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
    </CreateActionsProvider>
  );
}
