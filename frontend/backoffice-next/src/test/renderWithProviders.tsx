import type { ComponentType, ReactElement, ReactNode } from "react";

import { type RenderOptions, render } from "@testing-library/react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmDialogProvider } from "@/hooks/useConfirmDialog";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Optional wrapper rendered inside theme/tooltip/confirm providers. */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { wrapper: InnerWrapper, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => {
      let content: ReactNode = children;
      if (InnerWrapper) {
        content = <InnerWrapper>{content}</InnerWrapper>;
      }
      return (
        <PreferencesStoreProvider>
          <ThemeProvider>
            <TooltipProvider>
              <ConfirmDialogProvider>{content}</ConfirmDialogProvider>
            </TooltipProvider>
          </ThemeProvider>
        </PreferencesStoreProvider>
      );
    },
    ...renderOptions,
  });
}
