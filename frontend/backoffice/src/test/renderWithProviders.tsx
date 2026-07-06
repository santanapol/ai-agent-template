import {
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Optional wrapper rendered inside theme/tooltip/confirm providers. */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { wrapper: InnerWrapper, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => {
      let content: ReactNode = children;
      if (InnerWrapper) {
        content = <InnerWrapper>{content}</InnerWrapper>;
      }
      return (
        <ThemeProvider>
          <TooltipProvider>
            <ConfirmDialogProvider>{content}</ConfirmDialogProvider>
          </TooltipProvider>
        </ThemeProvider>
      );
    },
    ...renderOptions,
  });
}
