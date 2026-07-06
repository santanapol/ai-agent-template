import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import { mockAuthUser } from '../test/mockFactories';

const navigate = vi.fn();
const login = vi.fn();
const mockUseAuth = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>Navigate to {to}</div>,
  useNavigate: () => navigate,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

import Login from './Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login,
    });
  });

  it('shows inline validation errors when submit is empty', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Please enter username')).toBeInTheDocument();
    expect(screen.getByText('Please enter password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(mockFeedback.message.error).not.toHaveBeenCalled();
  });

  it('calls login on successful submit', async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/username/i), 'platform_admin');
    await user.type(screen.getByLabelText(/^password$/i), '1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith('platform_admin', '1234');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows toast error when login rejects', async () => {
    login.mockRejectedValue(new Error('Unauthorized'));
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/username/i), 'bad');
    await user.type(screen.getByLabelText(/^password$/i), 'bad');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockFeedback.message.error).toHaveBeenCalledWith('Login failed. Please try again.');
  });

  it('redirects when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockAuthUser(),
      loading: false,
      login,
    });

    renderWithProviders(<Login />);

    expect(screen.getByText('Navigate to /')).toBeInTheDocument();
  });
});
