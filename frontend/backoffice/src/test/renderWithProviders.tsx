import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { App as AntApp, ConfigProvider } from 'antd';

const testTheme = {
  token: {
    colorPrimary: '#2563EB',
    colorSuccess: '#10B981',
    colorError: '#EF4444',
    fontFamily: "'Inter', 'Sarabun', sans-serif",
    borderRadius: 6,
    colorBgLayout: '#F9FAFB',
  },
};

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ConfigProvider theme={testTheme}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    ),
    ...options,
  });
}
