import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/renderWithRouter';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import Error403 from './Error403';

describe('Error403', () => {
  it('shows title and subtitle', () => {
    renderWithRouter(<Error403 />);
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it('navigates to dashboard on primary action', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Error403 />);
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
