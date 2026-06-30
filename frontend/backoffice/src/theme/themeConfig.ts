import { type ThemeConfig, theme } from 'antd';

// ─── Seed Tokens (Brand Identity) ──────────────────────────────────────────────
export const designTokens = {
  colorPrimary: '#2563EB',     // Zero Platform Primary Blue
  colorSuccess: '#10B981',     // Success Green
  colorError: '#EF4444',       // Error Red
  colorWarning: '#F59E0B',     // Warning Orange
  colorInfo: '#3B82F6',        // Info Blue
  fontFamily: "'Inter', 'Sarabun', sans-serif",
  borderRadius: 6,
};

// ─── Semantic Layout Tokens (Spacing & Structure) ──────────────────────────────
// Use these constants across all pages for consistent spacing.
export const layoutTokens = {
  /** Main gap between sections on a page (e.g. header → card → table). */
  pageGap: 24,
  /** Gap inside cards between related elements (e.g. form fields). */
  sectionGap: 16,
  /** Small gap for tight inline elements (e.g. icon + text). */
  compactGap: 8,
};

// ─── Theme Config Factory ──────────────────────────────────────────────────────
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
