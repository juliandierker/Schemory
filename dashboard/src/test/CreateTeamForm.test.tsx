import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import CreateTeamForm from '../components/CreateTeamForm';
import userEvent from '@testing-library/user-event';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

describe('CreateTeamForm component', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with team name input and create button', () => {
    render(<CreateTeamForm onSuccess={onSuccess} />);

    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Team' })).toBeInTheDocument();
  });

  it('disables create button when team name is empty', () => {
    render(<CreateTeamForm onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Create Team' });
    expect(button).toBeDisabled();
  });

  it('enables create button when team name is entered', async () => {
    const user = userEvent.setup();
    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');

    const button = screen.getByRole('button', { name: 'Create Team' });
    expect(button).not.toBeDisabled();
  });

  it('button is disabled for whitespace-only team name', async () => {
    const user = userEvent.setup();
    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, '   ');
    const button = screen.getByRole('button', { name: 'Create Team' });
    
    // Button should be disabled for whitespace-only input
    expect(button).toBeDisabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls POST /teams on valid submit and calls onSuccess', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      team: { id: 1, name: 'my-team', createdAt: '2024-01-01T00:00:00Z' },
      membership: { userId: 1, teamId: 1, role: 'admin', joinedAt: '2024-01-01T00:00:00Z' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');
    const button = screen.getByRole('button', { name: 'Create Team' });
    await user.click(button);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'my-team' }),
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    // Input should be cleared after success
    expect(input).toHaveValue('');
  });

  it('shows server error message when creation fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Team name already taken' } }),
    }));

    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'existing-team');
    const button = screen.getByRole('button', { name: 'Create Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team name already taken')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Team name already taken' } }),
    }));

    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'existing-team');
    const button = screen.getByRole('button', { name: 'Create Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team name already taken')).toBeInTheDocument();
    });

    // Clear and start typing valid text
    await user.clear(input);
    await user.type(input, 'valid-team');

    // Error should be cleared
    expect(screen.queryByText('Team name already taken')).not.toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');
    const button = screen.getByRole('button', { name: 'Create Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('trims team name before submission', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      team: { id: 1, name: 'my-team', createdAt: '2024-01-01T00:00:00Z' },
      membership: { userId: 1, teamId: 1, role: 'admin', joinedAt: '2024-01-01T00:00:00Z' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    render(<CreateTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, '  my-team  ');
    const button = screen.getByRole('button', { name: 'Create Team' });
    await user.click(button);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams`,
        expect.objectContaining({
          body: JSON.stringify({ name: 'my-team' }),
        })
      );
    });
  });
});
