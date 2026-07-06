import { type ThemeConfig, theme } from 'antd';

export const designTokens = {
  colorPrimary: '#2563EB',     // Zero Platform Primary Blue
  colorSuccess: '#10B981',     // Success Green
  colorError: '#EF4444',       // Error Red
  colorWarning: '#F59E0B',     // Warning Orange
  colorInfo: '#3B82F6',        // Info Blue
  borderRadius: 6,
};

export const layoutTokens = {
  pageGap: 24,
  sectionGap: 16,
  compactGap: 8,
  /** Sticky action bars sit above page content but below modals/popovers */
  zIndexSticky: 10,
};

export const getAppTheme = (mode: 'light' | 'dark'): ThemeConfig => ({
  algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    ...designTokens,
    colorBgLayout: mode === 'dark' ? '#141414' : '#F9FAFB',
  },
  components: {
    Table: {
      headerBg: mode === 'dark' ? '#1d1d1d' : '#f5f5f5',
    },
    Button: {
      borderRadius: designTokens.borderRadius,
    },
    Card: {
      borderRadiusLG: 8,
    },
  },
});
