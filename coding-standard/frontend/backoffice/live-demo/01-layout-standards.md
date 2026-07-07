# Zero Platform UI/UX Layout Standards

This document establishes the official layout standards for the Zero Platform backoffice. All pages must adhere to these composition rules to guarantee visual consistency and proper dark/light theme support.

## Core Layout Components

Always import layout wrappers from the layout component package:
```typescript
import { PageContainer, DetailContainer, PageContentCard, FiltersContainer } from '../../components/layout';
```

> [!NOTE]
> The reference source code templates for these layout components are located in the [templates](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates) directory.

---

## 1. List / Directory Pages (หน้าตารางรายการหลัก)
Used for showing tables of items (Invoices, Staff, Agents, Reports) with search filter bars.

### Layout Composition Rules:
1. **Root Wrapper**: Wrap the entire page in `<PageContainer>`.
2. **Body Wrapper**: Wrap the filters and table in a single `<PageContentCard>`.
3. **Filter Bar**: Wrap all search inputs, select dropdowns, and date pickers inside a `<FiltersContainer>`.
   - 🚫 **Never** use raw `<Space>` or custom `<Flex>` for filter layouts.
   - Standard width limits for filter inputs:
     - Search Input: `width: '100%', maxWidth: 300`
     - Select Dropdown: `width: 150` to `width: 220` depending on context
     - Date Picker: `width: 180`
4. **Table Responsive**: Set the Table scroll property to `scroll={{ x: 'max-content' }}` to support proper responsive scaling.

### Structure Example:
```tsx
return (
  <PageContainer title="Staff Management" description="Manage system staff profiles.">
    <PageContentCard>
      <FiltersContainer>
        <Input.Search placeholder="Search..." style={{ width: '100%', maxWidth: 300 }} />
        <Select placeholder="Filter" style={{ width: 150 }} />
      </FiltersContainer>
      
      <Table columns={columns} dataSource={data} rowKey="id" scroll={{ x: 'max-content' }} />
    </PageContentCard>
  </PageContainer>
);
```

---

## 2. Detail Pages (หน้ารายละเอียดข้อมูลเฉพาะชิ้น)
Used for displaying specific invoices, transaction logs, or configuration sheets.

### Layout Composition Rules:
1. **Root Wrapper**: Wrap the page in `<DetailContainer>`.
2. **Panel Wrapper**: Wrap forms or detail blocks in `<PageContentCard>`.
3. **Form Width Limit**: Limit the max-width of form/profile details cards to `720px` to maintain comfortable readability and focus.
4. **Attributes Table**: Use Ant Design's `<Descriptions>` with consistent borders.

---

## 3. Dashboard / Overview Page (หน้าสรุปสถิติ)
Used for aggregate stats and system health numbers.

### Layout Composition Rules:
1. **Metrics List**: Use `<Row gutter={[24, 24]}>` for stats lists.
2. **Statistic Cards**: Wrap `<Statistic>` inside a `<Card variant="borderless">` and apply `token.borderRadius` style override.
3. **Theme Tokens**: Standardize colors on icons and labels using design tokens (`token.colorPrimary`, `token.colorSuccess`, `token.colorWarning`).

---

## 4. Error / Result Pages (หน้าแสดงสถานะ/ข้อผิดพลาด)
1. Always use Ant Design's `<Result>` component.
2. Center the container using a flexbox wrapper with `minHeight: '80vh'`.

---

## 📄 Copy-Pasteable Boilerplate Templates

We have provided ready-to-use, clean boilerplate code for each of these 4 page types in the [templates](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates) directory:

1.  **[ListTemplate.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates/ListTemplate.tsx):** Standard directory list view template with filters and tables.
2.  **[DetailTemplate.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates/DetailTemplate.tsx):** Standard detail view page containing Descriptions and editable Form.
3.  **[DashboardTemplate.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates/DashboardTemplate.tsx):** Overview dashboard with 4 metric cards and analytical grid columns.
4.  **[ResultTemplate.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/frontend/backoffice/live-demo/templates/ResultTemplate.tsx):** Centered layout wrapper displaying success, 403, 404, or 500 status indicators.

