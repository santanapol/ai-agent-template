import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>
        <TooltipProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </TooltipProvider>
      </ThemeProvider>
    ),
    ...options,
  });
}
