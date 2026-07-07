import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import userEvent from '@testing-library/user-event';
import Items from '../pages/Items';

describe('Items page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    ));

    render(<Items />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when user has no items', async () => {
    const mockItems = { items: [] };
    const mockTeams = { teams: [] };
    
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('No items yet.')).toBeInTheDocument();
    });

    expect(screen.getByText('Pull existing items from your team:')).toBeInTheDocument();
    expect(screen.getByText('npx schemory pullAll')).toBeInTheDocument();
  });

  it('renders item list when user has items', async () => {
    const mockItems = {
      items: [
        {
          id: '1',
          teamId: '1',
          teamName: 'team-alpha',
          name: 'user-profile',
          kind: 'type' as const,
          content: 'type User = { id: string; name: string; }',
          version: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('user-profile')).toBeInTheDocument();
    });

    expect(screen.getByText('team-alpha')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Network error' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ teams: [] }),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders team filter dropdown without All Teams option', async () => {
    const mockItems = { items: [] };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'team-beta', createdAt: '2024-01-02T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('team-beta')).toBeInTheDocument();
      expect(screen.getByText('team-alpha')).toBeInTheDocument();
    });

    // Check that All Teams is not present
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options.some(option => option.textContent === 'All Teams')).toBe(false);
  });

  it('renders Create File button when teams are available', async () => {
    const mockItems = { items: [] };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create File' })).toBeInTheDocument();
    });
  });

  it('renders edit and delete buttons for each item', async () => {
    const mockItems = {
      items: [
        {
          id: '1',
          teamId: '1',
          teamName: 'team-alpha',
          name: 'user-profile',
          kind: 'type' as const,
          content: 'type User = { id: string; }',
          version: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('user-profile')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Edit')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('sorts teams by creation date with newest first', async () => {
    const mockItems = { items: [] };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-older', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'team-newer', createdAt: '2024-01-03T00:00:00Z' },
        { id: 3, name: 'team-newest', createdAt: '2024-01-05T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('team-newest');
      expect(options[1]).toHaveTextContent('team-newer');
      expect(options[2]).toHaveTextContent('team-older');
    });
  });

  it('preselects the first team when no team is saved in localStorage', async () => {
    const mockItems = { items: [] };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-older', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'team-newer', createdAt: '2024-01-03T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      const select = screen.getByLabelText('Filter by Team') as HTMLSelectElement;
      expect(select.value).toBe('2'); // Should be the newest team
    });
  });

  it('saves and restores last selected team from localStorage', async () => {
    const mockItems = { items: [] };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'team-beta', createdAt: '2024-01-02T00:00:00Z' },
      ],
    };

    localStorage.setItem('schemory_last_team_id', '1');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      const select = screen.getByLabelText('Filter by Team') as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
  });

  it('shows files table with all columns', async () => {
    const mockItems = {
      items: [
        {
          id: '1',
          teamId: '1',
          teamName: 'team-alpha',
          name: 'user-type',
          kind: 'type' as const,
          content: 'type User = { id: string; }',
          version: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
    };
    const mockTeams = {
      teams: [
        { id: 1, name: 'team-alpha', createdAt: '2024-01-01T00:00:00Z' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })
    );

    render(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('user-type')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });
});