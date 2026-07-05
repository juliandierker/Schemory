import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import JoinTeamForm from '../components/JoinTeamForm';
import userEvent from '@testing-library/user-event';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

describe('JoinTeamForm component', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with team name input and join button', () => {
    render(<JoinTeamForm onSuccess={onSuccess} />);

    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Team' })).toBeInTheDocument();
  });

  it('disables join button when team name is empty', () => {
    render(<JoinTeamForm onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Join Team' });
    expect(button).toBeDisabled();
  });

  it('enables join button when team name is entered', async () => {
    const user = userEvent.setup();
    render(<JoinTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');

    const button = screen.getByRole('button', { name: 'Join Team' });
    expect(button).not.toBeDisabled();
  });

  it('shows error for empty team name on submit', async () => {
    const user = userEvent.setup();
    render(<JoinTeamForm onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows error for whitespace-only team name on submit', async () => {
    const user = userEvent.setup();
    render(<JoinTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, '   ');
    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls POST /teams/:name/join on valid submit and calls onSuccess', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      team: { id: 1, name: 'my-team', createdAt: '2024-01-01T00:00:00Z' },
      membership: { userId: 1, teamId: 1, role: 'member', joinedAt: '2024-01-01T00:00:00Z' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    render(<JoinTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');
    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/my-team/join`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    // Input should be cleared after success
    expect(input).toHaveValue('');
  });

  it('shows server error message when join fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Team not found' } }),
    }));

    render(<JoinTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'nonexistent-team');
    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team not found')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<JoinTeamForm onSuccess={onSuccess} />);

    // Trigger error first
    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument();
    });

    // Start typing
    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'a');

    // Error should be cleared
    expect(screen.queryByText('Team name is required')).not.toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<JoinTeamForm onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('Enter team name');
    await user.type(input, 'my-team');
    const button = screen.getByRole('button', { name: 'Join Team' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to join team')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
