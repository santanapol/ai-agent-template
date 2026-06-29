import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminLayout from './AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import type { DecodedUser } from '../types/auth';
import { renderWithProviders } from '../test/renderWithProviders';
import * as invoicesApi from '../lib/invoicesApiClient';
import { ZERO_HQ_BRANCH_ID } from '../lib/branchOptions';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('../lib/staffApiClient', () => ({
  getProfileByUserId: vi.fn().mockRejectedValue(new Error('skip')),
}));

vi.mock('../lib/invoicesApiClient', () => ({
  listInvoiceAgents: vi.fn(),
}));

const messageError = vi.fn();
const messageSuccess = vi.fn();

vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => ({
    message: {
      error: messageError,
      success: messageSuccess,
      warning: vi.fn(),
      info: vi.fn(),
    },
    modal: {},
    notification: {},
  }),
}));

const branches = [
  { branch_id: 'b-home', branch_name: 'Home Branch', branch_code: 'H01', active: true },
  { branch_id: 'b-target', branch_name: 'Target Branch', branch_code: 'T01', active: true },
  { branch_id: 'b-off', branch_name: 'Closed Branch', branch_code: 'X01', active: false },
];

function branchSelect() {
  return screen.getByRole('combobox', { name: 'Select active branch' });
}

function mockAuth(user: DecodedUser, extra: Partial<AuthContextValue> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    permissions: [],
    menus: [
      { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
    ],
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    login: vi.fn(),
    logout: vi.fn(),
    switchBranch: vi.fn().mockResolvedValue(undefined),
    ...extra,
  } as AuthContextValue);
}

describe('AdminLayout branch switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageError.mockReset();
    messageSuccess.mockReset();
    vi.mocked(invoicesApi.listInvoiceAgents).mockResolvedValue({ data: branches } as never);
  });

  it('shows branch Select for platform_admin and calls switchBranch on change', async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: 'user-1',
        role: 'platform_admin',
        ou_id: 'ou-1',
        branch_id: 'b-home',
        home_branch_id: 'b-home',
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });
    expect(screen.getByText('Branch')).toBeInTheDocument();

    await user.click(branchSelect());
    await user.click(await screen.findByText('T01 - Target Branch'));

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith('b-target');
      expect(messageSuccess).toHaveBeenCalledWith('Switched to T01 - Target Branch');
    });
  });

  it('shows branch Select for support_admin and calls switchBranch on change', async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: 'user-support',
        role: 'support_admin',
        ou_id: 'ou-1',
        branch_id: 'b-home',
        home_branch_id: 'b-home',
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });

    await user.click(branchSelect());
    await user.click(await screen.findByText('T01 - Target Branch'));

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith('b-target');
    });
  });

  it('shows clear control when active branch differs from home', async () => {
    mockAuth({
      sub: 'user-home-hint',
      role: 'platform_admin',
      ou_id: 'ou-1',
      branch_id: 'b-target',
      home_branch_id: 'b-home',
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    const { container } = renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(container.querySelector('.ant-select-clear')).toBeInTheDocument();
    });
  });

  it('clearing branch select switches back to home branch', async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: 'user-reset-home',
        role: 'platform_admin',
        ou_id: 'ou-1',
        branch_id: 'b-target',
        home_branch_id: 'b-home',
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    const { container } = renderWithProviders(<AdminLayout />);

    const clearBtn = await waitFor(() => {
      const el = container.querySelector('.ant-select-clear');
      if (!el) throw new Error('clear icon not found');
      return el;
    });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith('b-home');
      expect(messageSuccess).toHaveBeenCalledWith('Switched to H01 - Home Branch');
    });
  });

  it('shows read-only branch Tag for branch_admin (no switcher)', async () => {
    mockAuth({
      sub: 'user-2',
      role: 'branch_admin',
      ou_id: 'ou-1',
      branch_id: 'b-home',
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(screen.getByText('H01 - Home Branch')).toBeInTheDocument();
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('lists inactive branches with (Inactive) label but disabled', async () => {
    mockAuth({
      sub: 'user-3',
      role: 'support',
      ou_id: 'ou-1',
      branch_id: 'b-home',
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });

    await user.click(branchSelect());
    const inactive = await screen.findByText('X01 - Closed Branch (Inactive)');
    expect(inactive.closest('.ant-select-item-option')).toHaveClass('ant-select-item-option-disabled');
  });

  it('reverts optimistic selection when switchBranch fails', async () => {
    const switchBranch = vi.fn().mockRejectedValue(new Error('switch failed'));
    mockAuth(
      {
        sub: 'user-optimistic',
        role: 'platform_admin',
        ou_id: 'ou-1',
        branch_id: 'b-home',
        home_branch_id: 'b-home',
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });

    await user.click(branchSelect());
    await user.click(await screen.findByText('T01 - Target Branch'));

    await waitFor(() => {
      expect(messageError).toHaveBeenCalled();
      expect(branchSelect()).not.toHaveTextContent('T01 - Target Branch');
    });
  });

  it('shows Zero HQ label when home branch is platform HQ (not in gpp list)', async () => {
    mockAuth({
      sub: 'user-zero-hq',
      role: 'platform_admin',
      ou_id: 'ou-1',
      branch_id: ZERO_HQ_BRANCH_ID,
      home_branch_id: ZERO_HQ_BRANCH_ID,
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('ZERO - Zero HQ')).toBeInTheDocument();
    });
  });

  it('shows error when switchBranch fails', async () => {
    const switchBranch = vi.fn().mockRejectedValue(new Error('switch failed'));
    mockAuth(
      {
        sub: 'user-4',
        role: 'platform_admin',
        ou_id: 'ou-1',
        branch_id: 'b-home',
        home_branch_id: 'b-home',
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSelect()).toBeInTheDocument();
    });

    await user.click(branchSelect());
    await user.click(await screen.findByText('T01 - Target Branch'));

    await waitFor(() => {
      expect(messageError).toHaveBeenCalled();
    });
  });
});
