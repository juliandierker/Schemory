import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CreateActionsContext } from './context/CreateActionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Activate from './pages/Activate';
import ForgotPassword from './pages/ForgotPassword';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import Teams from './pages/Teams';
import CLI from './pages/CLI';
import Modal from './components/Modal';
import CreateTeamForm from './components/CreateTeamForm';
import CreateFileForm from './components/CreateFileForm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function AppContent() {
  const { sessionToken } = useAuth();
  // Global modal state for create actions
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [teams, setTeams] = useState<{id: number, name: string}[]>([]);

  const handleCreateTeamClick = () => {
    setIsCreateTeamModalOpen(true);
  };

  const handleCreateFileClick = () => {
    setIsCreateFileModalOpen(true);
  };

  // Fetch teams for file creation
  useEffect(() => {
    if (sessionToken) {
      fetch(`${API_BASE}/teams`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
      .then(res => res.json())
      .then(data => setTeams(data.teams || []))
      .catch(() => setTeams([]));
    }
  }, [sessionToken]);

  return (
    <CreateActionsContext.Provider value={{ onCreateTeam: handleCreateTeamClick, onCreateFile: handleCreateFileClick }}>
      <Routes>
        {/* Public routes (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Teams />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <Layout>
                <Items />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:name"
          element={
            <ProtectedRoute>
              <Layout>
                <ItemDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Layout>
                <Teams />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* CLI page */}
        <Route
          path="/cli"
          element={
            <ProtectedRoute>
              <Layout>
                <CLI />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      
      {/* Global Create Team Modal */}
      <Modal isOpen={isCreateTeamModalOpen} onClose={() => setIsCreateTeamModalOpen(false)} title="Create Team">
        <CreateTeamForm onSuccess={() => setIsCreateTeamModalOpen(false)} />
      </Modal>
      
      {/* Global Create File Modal */}
      <Modal isOpen={isCreateFileModalOpen} onClose={() => setIsCreateFileModalOpen(false)} title="Create New File">
        <CreateFileForm
          teamId={teams[0]?.id || 0}
          onSuccess={() => setIsCreateFileModalOpen(false)}
          onCancel={() => setIsCreateFileModalOpen(false)}
        />
      </Modal>
    </CreateActionsContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
