import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StaffTable from './StaffTable';

describe('StaffTable', () => {
  const mockProfiles = [
    {
      id: '1',
      user_id: 'user-1',
      ou_id: 'ou-1',
      branch_id: 'branch-1',
      code: 'EMP-001',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      tel: '1234567890',
      status: 'active' as const,
      user: { username: 'jdoe', role: 'staff' },
    },
  ];

  const defaultProps = {
    profiles: mockProfiles,
    loading: false,
    pagination: { current: 1, pageSize: 10, total: 1 },
    onView: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onTableChange: vi.fn(),
  };

  test('renders edit button when onEdit is provided', () => {
    const onEdit = vi.fn();
    render(<StaffTable {...defaultProps} onEdit={onEdit} />);
    const editButton = screen.getByRole('button', { name: /Edit profile/i });
    expect(editButton).toBeInTheDocument();
  });

  test('does not render edit button when onEdit is omitted', () => {
    render(<StaffTable {...defaultProps} onEdit={undefined} />);
    const editButton = screen.queryByRole('button', { name: /Edit profile/i });
    expect(editButton).not.toBeInTheDocument();
  });
});
