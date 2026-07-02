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

import Error404 from './Error404';

describe('Error404', () => {
  it('shows title and subtitle', () => {
    renderWithRouter(<Error404 />);
    expect(screen.getByText('404 Not Found')).toBeInTheDocument();
    expect(screen.getByText(/does not exist/i)).toBeInTheDocument();
  });

  it('navigates to dashboard on primary action', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Error404 />);
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
