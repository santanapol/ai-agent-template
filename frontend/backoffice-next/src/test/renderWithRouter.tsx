import type { ComponentType, ReactElement, ReactNode } from "react";

import type { RenderOptions } from "@testing-library/react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { MemoryRouter, type MemoryRouterProps } from "@/navigation/compat";

import { renderWithProviders } from "./renderWithProviders";

export interface RenderWithRouterOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: MemoryRouterProps["initialEntries"];
  initialIndex?: MemoryRouterProps["initialIndex"];
  /** Wrap with SidebarProvider for shell component tests. */
  withSidebar?: boolean;
  /** Additional wrapper rendered inside providers but outside MemoryRouter. */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export function renderWithRouter(ui: ReactElement, options: RenderWithRouterOptions = {}) {
  const {
    initialEntries = ["/"],
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
