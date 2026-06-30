import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { App as AntApp, ConfigProvider } from 'antd';
import { ThemeProvider } from '../contexts/ThemeContext';
import { getAppTheme } from '../theme/themeConfig';

const testTheme = getAppTheme('light');

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>
        <ConfigProvider theme={testTheme}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </ThemeProvider>
    ),
    ...options,
  });
}
