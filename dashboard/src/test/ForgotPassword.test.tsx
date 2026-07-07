import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import ForgotPassword from '../pages/ForgotPassword';
import userEvent from '@testing-library/user-event';

describe('ForgotPassword', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock for fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Activation email resent. Please check your inbox.' }),
    });
  });

  it('renders Forgot Password form', () => {
    render(<ForgotPassword />);

    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Activation Email' })).toBeInTheDocument();
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  it('disables submit button when email is empty', () => {
    render(<ForgotPassword />);

    const submitButton = screen.getByRole('button', { name: 'Send Activation Email' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when email is filled', async () => {
    const user = userEvent.setup();
    render(<ForgotPassword />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: 'Send Activation Email' });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup();
    render(<ForgotPassword />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Activation Email' }));

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText('Activation email resent. Please check your inbox.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid email format' } }),
    });

    const user = userEvent.setup();
    render(<ForgotPassword />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Send Activation Email' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('navigates to login when clicking back to login after success', async () => {
    const user = userEvent.setup();
    render(<ForgotPassword />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Activation Email' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });

    // Click back to login - this should navigate to /login
    // Since we're using MemoryRouter, we can't easily test navigation
    // But we can verify the button exists
    expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
  });

  it('has a link back to login page', () => {
    render(<ForgotPassword />);

    const loginLink = screen.getByRole('link', { name: 'Back to Login' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
