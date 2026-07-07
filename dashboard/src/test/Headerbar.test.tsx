import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import Headerbar from '../components/Headerbar';
import userEvent from '@testing-library/user-event';
import { CreateActionsProvider } from '../context/CreateActionsContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

describe('Headerbar component', () => {
  const onCreateTeam = vi.fn();
  const onCreateFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with logo, theme toggle, create dropdown, and user menu', () => {
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    // Check logo is rendered
    const logo = screen.getByRole('img', { name: 'Schemory' });
    expect(logo).toBeInTheDocument();

    // Check theme toggle button
    const themeToggle = screen.getByLabelText(/Switch to.*mode/);
    expect(themeToggle).toBeInTheDocument();

    // Check create dropdown button
    const createButton = screen.getByLabelText('Create new');
    expect(createButton).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();

    // Check user menu button
    const userMenu = screen.getByLabelText('User menu');
    expect(userMenu).toBeInTheDocument();
  });

  it('renders user initial as avatar', () => {
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const avatar = screen.getByLabelText('User menu');
    expect(avatar).toHaveTextContent('U');
  });

  it('opens create dropdown when create button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Create Team')).toBeInTheDocument();
      expect(screen.getByText('Create File')).toBeInTheDocument();
    });
  });

  it('closes create dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Team')).toBeInTheDocument();
    });

    // Click on theme toggle (outside the dropdown)
    const themeToggle = screen.getByLabelText(/Switch to.*mode/);
    await user.click(themeToggle);

    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByText('Create Team')).not.toBeInTheDocument();
    });
  });

  it('calls onCreateTeam callback when Create Team is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Team')).toBeInTheDocument();
    });

    const createTeamButton = screen.getByText('Create Team');
    await user.click(createTeamButton);

    await waitFor(() => {
      expect(onCreateTeam).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCreateFile callback when Create File is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create File')).toBeInTheDocument();
    });

    const createFileButton = screen.getByText('Create File');
    await user.click(createFileButton);

    await waitFor(() => {
      expect(onCreateFile).toHaveBeenCalledTimes(1);
    });
  });

  it('closes dropdown after clicking Create Team', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Team')).toBeInTheDocument();
    });

    const createTeamButton = screen.getByText('Create Team');
    await user.click(createTeamButton);

    await waitFor(() => {
      expect(onCreateTeam).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Create Team')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown after clicking Create File', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create File')).toBeInTheDocument();
    });

    const createFileButton = screen.getByText('Create File');
    await user.click(createFileButton);

    await waitFor(() => {
      expect(onCreateFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Create File')).not.toBeInTheDocument();
    });
  });

  it('opens user menu when user avatar is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const userMenuButton = screen.getByLabelText('User menu');
    await user.click(userMenuButton);

    await waitFor(() => {
      expect(screen.getByText(/Click to view CLI commands/)).toBeInTheDocument();
      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });
  });

  it('closes user menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const userMenuButton = screen.getByLabelText('User menu');
    await user.click(userMenuButton);

    await waitFor(() => {
      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });

    // Click on create button (outside the user menu)
    const createButton = screen.getByLabelText('Create new');
    await user.click(createButton);

    // User menu should be closed
    await waitFor(() => {
      expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
    });
  });

  it('renders theme toggle with appropriate icon based on theme', () => {
    render(
      <CreateActionsProvider onCreateTeam={onCreateTeam} onCreateFile={onCreateFile}>
        <Headerbar />
      </CreateActionsProvider>
    );

    const themeToggle = screen.getByLabelText(/Switch to.*mode/);
    expect(themeToggle).toBeInTheDocument();
    
    // Theme toggle button should contain an SVG icon (Sun or Moon)
    // Check that the button has child elements (the SVG icons)
    const themeToggleButton = themeToggle.querySelector('svg');
    expect(themeToggleButton).not.toBeNull();
  });
});
