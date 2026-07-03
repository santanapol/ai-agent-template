import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfile from './MyProfile';
import { renderWithRouter } from '../test/renderWithRouter';
import { mockAuthUser, mockStaffProfile } from '../test/mockFactories';
import * as staffApi from '../lib/staffApiClient';
import * as authApi from '../lib/authApiClient';

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser(),
    logout: vi.fn(),
  }),
}));

vi.mock('../lib/staffApiClient');
vi.mock('../lib/authApiClient');
vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

describe('MyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffApi.getProfileByUserId).mockResolvedValue({
      profile: mockStaffProfile(),
      etag: 'etag-1',
    });
    vi.mocked(staffApi.patchProfile).mockResolvedValue({
      profile: mockStaffProfile({ firstname: 'Jane' }),
      etag: 'etag-2',
    });
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);
  });

  it('shows loading skeleton before profile loads', () => {
    vi.mocked(staffApi.getProfileByUserId).mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithRouter(<MyProfile />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows inline error and retry on load failure', async () => {
    vi.mocked(staffApi.getProfileByUserId).mockRejectedValue(new Error('fail'));

    renderWithRouter(<MyProfile />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load your profile/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('shows validation errors on empty required fields', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText(/first name/i));
    await user.clear(screen.getByLabelText(/last name/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText(/please enter first name/i)).toBeInTheDocument();
    expect(staffApi.patchProfile).not.toHaveBeenCalled();
  });

  it('saves profile successfully', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    });

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(staffApi.patchProfile).toHaveBeenCalled();
      expect(mockFeedback.message.success).toHaveBeenCalled();
    });
  });

  it('changes password on valid input', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/current password/i), 'OldPass1!');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalled();
      expect(mockFeedback.message.success).toHaveBeenCalled();
    });
  });
});
