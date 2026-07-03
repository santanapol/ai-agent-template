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

import Error500 from './Error500';

describe('Error500', () => {
  it('shows title and subtitle', () => {
    renderWithRouter(<Error500 />);
    expect(screen.getByText('500 Server Error')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('navigates to dashboard on primary action', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Error500 />);
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
