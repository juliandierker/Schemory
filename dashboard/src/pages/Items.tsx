import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Item, ItemKind } from '@schemory/shared';
import { useAuth } from '../context/AuthContext';
import { useCreateActions } from '../context/CreateActionsContext';
import ItemKindBadge from '../components/ItemKindBadge';
import Modal from '../components/Modal';
import EditFileForm from '../components/EditFileForm';
import { PlusIcon, EditIcon, DeleteIcon } from '../components/icons';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Team {
  id: number;
  name: string;
  createdAt: string;
}

interface ItemsResponse {
  items: Item[];
}

interface TeamsResponse {
  teams: Team[];
}

interface DeleteResponse {
  success: boolean;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Main Items content component
export function ItemsContent() {
  const { sessionToken } = useAuth();
  const { onCreateFile } = useCreateActions();
  const [items, setItems] = useState<Item[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for team dropdown
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Load saved team selection from localStorage
  useEffect(() => {
    const savedTeamId = localStorage.getItem('schemory_last_team_id');
    if (savedTeamId) {
      setSelectedTeamId(savedTeamId);
    }
  }, []);

  // Save team selection to localStorage when it changes
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('schemory_last_team_id', selectedTeamId);
    }
  }, [selectedTeamId]);

  const fetchItems = async (teamId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = teamId ? `${API_BASE}/items?teamId=${teamId}` : `${API_BASE}/items`;
      const response = await fetch(url, {
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

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_BASE}/teams`, {
        headers: {
          Authorization: `Bearer ${sessionToken || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch teams');
      }

      const data: TeamsResponse = await response.json();
      // Sort teams by creation date (newest first)
      const sortedTeams = [...data.teams].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTeams(sortedTeams);
      
      // If no team is selected and we have teams, select the first one (newest)
      if (!selectedTeamId && sortedTeams.length > 0) {
        setSelectedTeamId(sortedTeams[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setTeams([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchItems(selectedTeamId);
    } else {
      fetchItems();
    }
  }, [selectedTeamId]);

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
    if (selectedTeamId) {
      fetchItems(selectedTeamId);
    } else {
      fetchItems();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem || !sessionToken) return;

    try {
      const response = await fetch(`${API_BASE}/items/${encodeURIComponent(deletingItem.name)}?teamId=${deletingItem.teamId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({}));
        const message = errorData.error?.message || 'Failed to delete file';
        throw new Error(message);
      }

      const data: DeleteResponse = await response.json();
      if (data.success) {
        // Remove the item from local state
        setItems(items.filter(item => item.id !== deletingItem.id));
        setIsConfirmDeleteOpen(false);
        setDeletingItem(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleDeleteCancel = () => {
    setIsConfirmDeleteOpen(false);
    setDeletingItem(null);
  };

  const handleCreateFileClick = () => {
    if (selectedTeamId) {
      onCreateFile?.();
    } else {
      setError('Please select a team first');
    }
  };

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (item: Item) => {
    setDeletingItem(item);
    setIsConfirmDeleteOpen(true);
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="p-8">
        <main>
          <p className="text-text text-opacity-70">Loading...</p>
        </main>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-8">
        <main>
          <p className="text-error">{error}</p>
        </main>
      </div>
    );
  }

  // Get unique team names from items for grouping
  const allTeamNames = [...new Set(items.map(item => item.teamName).filter(Boolean))].sort();

  if (items.length === 0 && !isLoading) {
    return (
      <div className="p-8">
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
            {teams.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={handleCreateFileClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-body rounded-lg hover:bg-opacity-90 transition-colors text-sm sm:text-base"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create File
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
      <div className="p-8">
        <main>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display font-bold text-text">Files</h1>
          {teams.length > 0 && (
            <button
              onClick={handleCreateFileClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-body rounded-lg hover:bg-opacity-90 transition-colors text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4" />
              Create File
            </button>
          )}
        </div>

        {/* Team Filter */}
        {(teams.length > 0 || allTeamNames.length > 0) && (
          <div className="mb-6">
            <label htmlFor="team-filter" className="block text-sm font-medium text-text mb-2">
              Filter by Team
            </label>
            <select
              id="team-filter"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full max-w-xs px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id.toString()}>
                  {team.name}
                </option>
              ))}
              {allTeamNames.length > 0 && teams.length === 0 && (
                allTeamNames.map((teamName) => (
                  <option key={teamName} value={teamName}>
                    {teamName}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Team
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-text text-opacity-70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={`${item.id}-${item.teamId}`}
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
                    <span className="font-body text-text text-opacity-70">
                      {item.teamName || 'Unknown'}
                    </span>
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
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1 text-text text-opacity-70 hover:text-opacity-100 hover:bg-border hover:bg-opacity-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1 text-error text-opacity-70 hover:text-white hover:bg-error hover:bg-opacity-10 rounded-md transition-colors"
                        title="Delete"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit File Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          title="Edit File"
        >
          {editingItem && (
            <EditFileForm
              item={editingItem}
              onSuccess={handleEditSuccess}
              onCancel={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
              }}
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isConfirmDeleteOpen}
          onClose={handleDeleteCancel}
          title="Confirm Delete"
        >
          {deletingItem && (
            <div className="space-y-4">
              <p className="text-text text-opacity-80">
                Are you sure you want to delete <strong className="text-text">{deletingItem.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 border border-border text-text font-body rounded-md hover:bg-border hover:bg-opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-error text-white font-body rounded-md hover:bg-opacity-90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}

// Default export
export default function Items() {
  return <ItemsContent />;
}
