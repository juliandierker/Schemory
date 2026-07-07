import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import Teams from '../pages/Teams';
import userEvent from '@testing-library/user-event';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

describe('Teams page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    ));

    render(<Teams />);
    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
  });

  it('renders empty state when user has no teams', async () => {
    const mockTeams: { teams: never[] } = { teams: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('No Teams Yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create a Team')).toBeInTheDocument();
    expect(screen.getByText('Join a Team')).toBeInTheDocument();
  });

  it('renders team list when user has teams', async () => {
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', role: 'member' },
        { id: 2, name: 'team-beta', role: 'admin' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('team-alpha')).toBeInTheDocument();
      expect(screen.getByText('team-beta')).toBeInTheDocument();
    });

    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Network error' } }),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('has a link to CLI setup when no teams exist', async () => {
    const mockTeams: { teams: never[] } = { teams: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      const link = screen.getByText('Go to CLI Setup');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/cli');
    });
  });

  it('renders Create Team form when user has no teams', async () => {
    const mockTeams: { teams: never[] } = { teams: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('Create a Team')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Team' })).toBeInTheDocument();
  });

  it('renders Create Team form when user has existing teams', async () => {
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', role: 'member' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('team-alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('Create a Team')).toBeInTheDocument();
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Team' })).toBeInTheDocument();
  });

  it('displays both Create Team and Join Team sections', async () => {
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', role: 'member' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeams),
    }));

    render(<Teams />);

    await waitFor(() => {
      expect(screen.getByText('Create a Team')).toBeInTheDocument();
      expect(screen.getByText('Join a Team')).toBeInTheDocument();
    });
  });
});
