import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteHeader } from './site-header';
import { renderWithRouter } from '../../test/renderWithRouter';

describe('SiteHeader', () => {
  it('shows SidebarTrigger on desktop', () => {
    renderWithRouter(
      <SiteHeader
        breadcrumb={{ parent: null, page: 'Dashboard' }}
        isMobile={false}
        onOpenMobileNav={vi.fn()}
      />,
      { withSidebar: true },
    );

    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/open navigation menu/i)).not.toBeInTheDocument();
  });

  it('shows mobile hamburger and calls onOpenMobileNav', async () => {
    const onOpenMobileNav = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(
      <SiteHeader
        breadcrumb={{ parent: null, page: 'Dashboard' }}
        isMobile
        onOpenMobileNav={onOpenMobileNav}
      />,
      { withSidebar: true },
    );

    await user.click(screen.getByLabelText(/open navigation menu/i));
    expect(onOpenMobileNav).toHaveBeenCalled();
  });

  it('hides menu-derived breadcrumb to avoid duplicating PageContainer h1 (CC-03)', () => {
    renderWithRouter(
      <SiteHeader
        breadcrumb={{ parent: 'Billing', page: 'Invoices' }}
        isMobile={false}
        onOpenMobileNav={vi.fn()}
      />,
      { withSidebar: true },
    );

    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
  });

  it('renders breadcrumb items array with links', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(
      <SiteHeader
        breadcrumb={{
          parent: null,
          page: 'Invoices',
          items: [
            { label: 'Billing', onClick },
            { label: 'Invoices' },
          ],
        }}
        isMobile={false}
        onOpenMobileNav={vi.fn()}
      />,
      { withSidebar: true },
    );

    const billingLabel = await screen.findByText('Billing');
    await user.click(billingLabel);
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('shows mobile branch label when provided (CC-07)', () => {
    renderWithRouter(
      <SiteHeader
        breadcrumb={{ parent: null, page: 'Dashboard' }}
        isMobile
        onOpenMobileNav={vi.fn()}
        mobileBranchLabel="HQ · Bangkok Branch"
      />,
      { withSidebar: true },
    );

    expect(screen.getByText('HQ · Bangkok Branch')).toBeInTheDocument();
  });
});
