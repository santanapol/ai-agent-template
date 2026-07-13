# Theme and Styling Tokens Standards

This document establishes the official styling tokens, colors, spacings, and theme configurations for the Zero Platform backoffice, ensuring a consistent visual brand identity in both Light and Dark modes.

---

## 1. Seed Design Tokens (Branding)
All branding tokens are centralized in [`index.css`](../../../../code-base/zero-platform/frontend/backoffice/src/index.css) (`:root` / `.dark` CSS variables):

*   **Primary Color**: `#2563EB` (Zero Blue)
*   **Success Color**: `#10B981` (Emerald Green)
*   **Error Color**: `#EF4444` (Coral Red)
*   **Warning Color**: `#F59E0B` (Amber Orange)
*   **Info Color**: `#3B82F6` (Royal Blue)
*   **Typography**: `'Inter', 'Sarabun', sans-serif`
*   **Border Radius**: `6px` for small interactive components (Buttons, Inputs), `8px` for larger structural containers (Cards).

---

## 2. Spacing & Spacing Tokens
Always use layout tokens instead of hardcoded numbers in padding, margin, or gap CSS styles:

*   **`pageGap` (24px)**: Vertical spacing between main page components (e.g. Header to PageContentCard, or Card to Card).
*   **`sectionGap` (16px)**: Spacing within cards (e.g., filter wrapper to table, or gap between filter components).
*   **`compactGap` (8px)**: Small spacing for close inline details (e.g., icon next to text, or inline actions list).

---

## 3. Dark Mode & Color Consistency Rules
To prevent UI degradation in Dark mode:

1.  **Background Layout**:
    *   Light: `#F9FAFB` (Off-white)
    *   Dark: `#141414` (Deep charcoal)
2.  **Card Backgrounds**:
    *   Use `<Card variant="borderless">` or `<PageContentCard>` which integrates automatically with Ant Design's `colorBgContainer` token.
    *   Never use hardcoded `#FFF` or `#FFFFFF` for background colors.
3.  **Elevated Panels**:
    *   For sticky floating toolbars (e.g., `BulkInvoiceActionBar`), use `token.colorBgElevated` and `token.boxShadowSecondary`.
4.  **Text Colors**:
    *   Always use Ant Design's `<Typography.Text>` or `<Typography.Paragraph>` components.
    *   If using inline spans, apply semantic tokens: `colorText` or `colorTextDescription`.
