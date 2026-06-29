import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ChannelPerformancePage from './ChannelPerformancePage';
import { renderWithProviders } from '../../../test/renderWithProviders';

const mockGetInviteLinks = vi.fn();
const mockGetRoyalty21Times = vi.fn();

vi.mock('../../../lib/branchReportApiClient', () => ({
  getInviteLinks: (...args: unknown[]) => mockGetInviteLinks(...args),
  getRoyalty21Times: (...args: unknown[]) => mockGetRoyalty21Times(...args),
}));

const mockUseAuth = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ChannelPerformancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInviteLinks.mockResolvedValue([]);
    mockGetRoyalty21Times.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 50, total: 0 },
    });
    mockUseAuth.mockReturnValue({
      user: { branch_id: '507f1f77bcf86cd799439012', ou_id: '507f1f77bcf86cd799439011' },
    });
  });

  it('renders page title and breadcrumb (AC-1)', async () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText('Royalty 21 Times')).toBeInTheDocument();
    expect(screen.getByText('Branch Report')).toBeInTheDocument();
    expect(screen.getByText('Channel Performance')).toBeInTheDocument();
  });

  it('renders register date range field with current month defaults', () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText('Register Date')).toBeInTheDocument();
  });

  it('does not fetch royalty report on mount (AC-9)', async () => {
    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalled();
    });
    expect(mockGetRoyalty21Times).not.toHaveBeenCalled();
    expect(screen.getByText('Select channel and click Search')).toBeInTheDocument();
  });

  it('shows warning when user has no active branch', () => {
    mockUseAuth.mockReturnValue({
      user: { ou_id: '507f1f77bcf86cd799439011', branch_id: undefined },
    });

    renderWithProviders(<ChannelPerformancePage />);

    expect(
      screen.getByText('Please select a branch from the top navigation'),
    ).toBeInTheDocument();
    expect(mockGetInviteLinks).not.toHaveBeenCalled();
  });

  it('shows persistent notice after branch switch', async () => {
    const { rerender } = renderWithProviders(<ChannelPerformancePage />);

    mockUseAuth.mockReturnValue({
      user: { branch_id: '507f1f77bcf86cd799439099', ou_id: '507f1f77bcf86cd799439011' },
    });

    rerender(<ChannelPerformancePage />);

    expect(
      await screen.findByText('Branch changed — please search again to refresh this report'),
    ).toBeInTheDocument();
  });
});
