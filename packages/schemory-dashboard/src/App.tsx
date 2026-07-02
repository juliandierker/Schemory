import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import TeamPage from './pages/TeamPage';
import TeamListPage from './pages/TeamListPage';
import SchemaListPage from './pages/schemas/SchemaListPage';
import SchemaDetailPage from './pages/schemas/SchemaDetailPage';
import SchemaNewPage from './pages/schemas/SchemaNewPage';
import TypeListPage from './pages/types/TypeListPage';
import TypeDetailPage from './pages/types/TypeDetailPage';
import TypeNewPage from './pages/types/TypeNewPage';
import TeamSettingsPage from './pages/settings/TeamSettingsPage';
import { Team, Schema, TypeDefinition } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555';

function App() {
  const { theme } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data.teams || []);
      if (data.teams && data.teams.length > 0) {
        setSelectedTeam(data.teams[0]);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to load teams: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (name: string) => {
    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (data.team) {
        toast.success(`Team "${name}" created!`);
        fetchTeams();
        return data.team;
      }
    } catch (err: any) {
      toast.error(`Failed to create team: ${err.message}`);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-primary-400"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-6 py-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchTeams}
            className="mt-3 btn btn-primary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect to first team or create team */}
        <Route 
          path="/" 
          element={
            <Layout onCreateTeam={() => {
              const teamName = prompt('New team name:');
              if (teamName) {
                createTeam(teamName);
              }
            }} />
          }
        >
          <Route index element={<TeamListPage teams={teams} onCreateTeam={createTeam} />} />
        </Route>

        {/* Team routes */}
        <Route 
          path="/teams/:teamId" 
          element={
            <Layout 
              teamId={selectedTeam?.id} 
              teamName={selectedTeam?.name} 
              onCreateTeam={() => {
                const teamName = prompt('New team name:');
                if (teamName) {
                  createTeam(teamName);
                }
              }} 
            />
          }
        >
          <Route index element={<TeamPage team={selectedTeam!} />} />
          
          {/* Schema routes */}
          <Route path="schemas" element={<SchemaListPage teams={teams} />} />
          <Route path="schemas/new" element={<SchemaNewPage teams={teams} />} />
          <Route path="schemas/:schemaId" element={<SchemaDetailPage teams={teams} />} />
          
          {/* Type routes */}
          <Route path="types" element={<TypeListPage teams={teams} />} />
          <Route path="types/new" element={<TypeNewPage teams={teams} />} />
          <Route path="types/:typeId" element={<TypeDetailPage teams={teams} />} />
          
          {/* Settings route */}
          <Route path="settings" element={<TeamSettingsPage teams={teams} />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

