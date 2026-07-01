import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';

const navigate = vi.fn();
const login = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>Navigate to {to}</div>,
  useNavigate: () => navigate,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login,
  }),
}));

vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

import Login from './Login';

describe('Login', () => {
  it('shows inline validation errors when submit is empty', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Please enter username')).toBeInTheDocument();
    expect(screen.getByText('Please enter password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(mockFeedback.message.error).toHaveBeenCalledWith('Please enter username and password');
  });
});
