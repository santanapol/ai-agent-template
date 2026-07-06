import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { renderWithProviders } from './renderWithProviders';
import type { RenderOptions } from '@testing-library/react';

export interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: MemoryRouterProps['initialEntries'];
  initialIndex?: MemoryRouterProps['initialIndex'];
  /** Wrap with SidebarProvider for shell component tests. */
  withSidebar?: boolean;
  /** Additional wrapper rendered inside providers but outside MemoryRouter. */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export function renderWithRouter(ui: ReactElement, options: RenderWithRouterOptions = {}) {
  const {
    initialEntries = ['/'],
    initialIndex,
    withSidebar = false,
    wrapper: ExtraWrapper,
    ...renderOptions
  } = options;

  const RouterWrapper = ({ children }: { children: ReactNode }) => {
    let content: ReactNode = children;
    if (withSidebar) {
      content = <SidebarProvider>{content}</SidebarProvider>;
    }
    if (ExtraWrapper) {
      content = <ExtraWrapper>{content}</ExtraWrapper>;
    }
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        {content}
      </MemoryRouter>
    );
  };

  return renderWithProviders(ui, {
    ...renderOptions,
    wrapper: RouterWrapper,
  });
}
