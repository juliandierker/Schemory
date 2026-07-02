import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Team } from '../../types';
import { api } from '../../services/api';
import Spinner from '../../components/Spinner';
import Modal from '../../components/ui/Modal';

interface TeamSettingsPageProps {
  teams: Team[];
}

const TeamSettingsPage: React.FC<TeamSettingsPageProps> = ({ teams }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      const foundTeam = teams.find(t => t.id === teamId);
      if (foundTeam) {
        setTeam(foundTeam);
        setNewName(foundTeam.name);
      }
      setLoading(false);
    }
  }, [teamId, teams]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      toast.error('Team name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Note: API endpoint for updating team name might need to be added
      // For now, we'll use a generic update approach
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5555'}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Team updated!`);
        setTeam(data.team);
      } else {
        throw new Error('Failed to update team');
      }
    } catch (err: any) {
      toast.error(`Failed to update team: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!teamId) return;

    setIsSubmitting(true);
    setIsDeleteModalOpen(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5555'}/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Team "${team?.name}" deleted`);
        navigate('/');
      } else {
        throw new Error('Failed to delete team');
      }
    } catch (err: any) {
      toast.error(`Failed to delete team: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
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
            <span>Loading settings...</span>
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
        <span className="text-secondary-900 dark:text-secondary-100">Settings</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Team Settings
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400 mt-1">
          Configure your team preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Team Information Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-6">
            Team Information
          </h2>
          
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input max-w-md"
                placeholder="Enter team name"
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || newName === team.name}
              >
                {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
                Update Team Name
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-secondary-200 dark:border-secondary-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2">
                Team ID
              </h3>
              <p className="text-sm text-secondary-900 dark:text-secondary-100 font-mono">
                {team.id}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2">
                Created
              </h3>
              <p className="text-sm text-secondary-900 dark:text-secondary-100">
                {formatDate(team.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div className="card border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-6">
            Danger Zone
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              These actions are irreversible. Please proceed with caution.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                  Delete Team
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Permanently delete this team and all its schemas and type definitions.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Team
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Team"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-secondary-600 dark:text-secondary-400">
            Are you sure you want to delete <strong className="text-secondary-900 dark:text-secondary-100">{team.name}</strong>?
          </p>
          <p className="text-secondary-500 dark:text-secondary-400 text-sm">
            This will permanently delete the team and all its schemas and type definitions. 
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
              Delete Team
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamSettingsPage;
