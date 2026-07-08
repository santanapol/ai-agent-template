import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';

const useRouteError = vi.fn();
const isRouteErrorResponse = vi.fn();

vi.mock('react-router-dom', () => ({
  useRouteError: () => useRouteError(),
  isRouteErrorResponse: (...args: unknown[]) => isRouteErrorResponse(...args),
}));

vi.mock('../pages/Error404', () => ({
  default: () => <div>Mock 404</div>,
}));

vi.mock('../pages/Error500', () => ({
  default: () => <div>Mock 500</div>,
}));

import RouteErrorPage from './RouteErrorPage';

describe('RouteErrorPage', () => {
  beforeEach(() => {
    useRouteError.mockReset();
    isRouteErrorResponse.mockReset();
  });

  it('renders the 404 page for route responses with status 404', () => {
    useRouteError.mockReturnValue({ status: 404 });
    isRouteErrorResponse.mockReturnValue(true);

    renderWithProviders(<RouteErrorPage />);

    expect(screen.getByText('Mock 404')).toBeInTheDocument();
  });

  it('renders the 500 page for non-404 route errors', () => {
    useRouteError.mockReturnValue(new Error('boom'));
    isRouteErrorResponse.mockReturnValue(false);

    renderWithProviders(<RouteErrorPage />);

    expect(screen.getByText('Mock 500')).toBeInTheDocument();
  });

  it('renders a reload action for chunk loading errors', () => {
    useRouteError.mockReturnValue(new Error('Loading chunk 12 failed'));
    isRouteErrorResponse.mockReturnValue(false);

    renderWithProviders(<RouteErrorPage />);

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });
});
