import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import Login from '../pages/Login';
import userEvent from '@testing-library/user-event';

describe('Login', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock for fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'sk_test_token', user: { email: 'test@example.com' } }),
    });
  });

  it('renders Login form', () => {
    render(<Login />);

    expect(screen.getByText('Schemory')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('disables submit button when email and password are empty', () => {
    render(<Login />);

    const submitButton = screen.getByRole('button', { name: 'Log In' });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when only email is filled', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: 'Log In' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when both email and password are filled', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: 'Log In' });
    expect(submitButton).not.toBeDisabled();
  });

  it('has a link to signup page', () => {
    render(<Login />);

    const signupLink = screen.getByRole('link', { name: 'Sign up' });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('has a link to forgot password page', () => {
    render(<Login />);

    const forgotPasswordLink = screen.getByRole('link', { name: 'Forgot password? Resend activation email' });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('shows error message on login failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }),
    });

    const user = userEvent.setup();
    render(<Login />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('shows user-friendly error for missing email', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'MISSING_EMAIL', message: 'Email is required' } }),
    });

    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument();
    });
  });

  it('shows user-friendly error for missing password', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'MISSING_PASSWORD', message: 'Password is required' } }),
    });

    const user = userEvent.setup();
    render(<Login />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });
});
