import type { BreadcrumbProps } from 'antd';

export const listBreadcrumb = (title: string): BreadcrumbProps['items'] => [{ title }];

export const detailBreadcrumb = (
  parentLabel: string,
  currentLabel: string,
  onParentClick?: () => void,
): BreadcrumbProps['items'] => [
  { title: parentLabel, ...(onParentClick ? { onClick: onParentClick } : {}) },
  { title: currentLabel },
];
