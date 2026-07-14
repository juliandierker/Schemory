import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CreateActionsContext } from '../context/CreateActionsContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    sessionToken: 'sk_test',
    user: { email: 'test@example.com' },
  }),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('../assets/logo-full.svg', () => ({ default: 'logo-light.svg' }));
vi.mock('../assets/logo-full-dark.svg', () => ({ default: 'logo-dark.svg' }));

function AppLike() {
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);

  return (
    <CreateActionsContext.Provider
      value={{
        onCreateTeam: () => setIsCreateTeamModalOpen(true),
        onCreateFile: () => setIsCreateFileModalOpen(true),
      }}
    >
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <div>page</div>
              </Layout>
            }
          />
        </Routes>
      </MemoryRouter>
      <Modal isOpen={isCreateTeamModalOpen} onClose={() => setIsCreateTeamModalOpen(false)} title="Create Team">
        <div>Create Team Form</div>
      </Modal>
      <Modal isOpen={isCreateFileModalOpen} onClose={() => setIsCreateFileModalOpen(false)} title="Create New File">
        <div>Create File Form</div>
      </Modal>
    </CreateActionsContext.Provider>
  );
}

describe('Layout + Create actions wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens Create Team modal from header without Layout overriding handlers', async () => {
    const user = userEvent.setup();
    render(<AppLike />);

    await user.click(screen.getByLabelText('Create new'));
    await user.click(screen.getByRole('button', { name: /Create Team/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Team Form')).toBeInTheDocument();
    });
  });

  it('opens Create File modal from header without Layout overriding handlers', async () => {
    const user = userEvent.setup();
    render(<AppLike />);

    await user.click(screen.getByLabelText('Create new'));
    await user.click(screen.getByRole('button', { name: /Create File/i }));

    await waitFor(() => {
      expect(screen.getByText('Create File Form')).toBeInTheDocument();
    });
  });
});
