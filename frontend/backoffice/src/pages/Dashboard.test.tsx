import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import { renderWithRouter } from '../test/renderWithRouter';
import { mockAuthUser, mockPaginatedResponse } from '../test/mockFactories';
import * as staffApi from '../lib/staffApiClient';

const navigate = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/staffApiClient');
vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

import { useAuth } from '../contexts/AuthContext';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffApi.listProfiles).mockResolvedValue(
      mockPaginatedResponse([], 5),
    );
  });

  it('loads stat cards for admin roles', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser('platform_admin'),
      permissions: ['profiles:list'],
    } as ReturnType<typeof useAuth>);

    vi.mocked(staffApi.listProfiles)
      .mockResolvedValueOnce(mockPaginatedResponse([], 12))
      .mockResolvedValueOnce(mockPaginatedResponse([], 3));

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Active Staff')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(staffApi.listProfiles).toHaveBeenCalledTimes(2);
  });

  it('does not fetch stats for non-admin roles', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser('staff'),
      permissions: ['profiles:lookup', 'profiles:read'],
    } as ReturnType<typeof useAuth>);

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Total Active Staff')).not.toBeInTheDocument();
    });
    expect(staffApi.listProfiles).not.toHaveBeenCalled();
    expect(screen.getByText(/more dashboard widgets coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open staff management/i })).not.toBeInTheDocument();
  });

  it('shows error toast when stats fetch fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser('branch_admin'),
    } as ReturnType<typeof useAuth>);
    vi.mocked(staffApi.listProfiles).mockRejectedValue(new Error('network'));

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
  });

  it('navigates to staff management from quick action', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser('platform_admin'),
      permissions: ['profiles:list'],
    } as ReturnType<typeof useAuth>);

    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /open staff management/i }));
    expect(navigate).toHaveBeenCalledWith('/staff');
  });
});
