import type React from 'react';

export interface MenuItemType {
  key: string;
  label: string;
  icon?: React.ReactNode;
  route?: string;
  children?: MenuItemType[];
  sort_order: number;
}

export interface BreadcrumbLinkItem {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface SidebarBreadcrumb {
  parent: string | null;
  page: string;
  /** When set, replaces parent/page and renders a multi-level trail in SiteHeader. */
  items?: BreadcrumbLinkItem[];
}

/** Routes that render their own breadcrumb via DetailContainer — hide SiteHeader breadcrumb. */
const DETAIL_ROUTE_PATTERNS: RegExp[] = [/^\/invoices\/[^/]+$/];

export function isDetailRoute(pathname: string): boolean {
  return DETAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function flattenMenuToTwoLevels(items: MenuItemType[]): MenuItemType[] {
  return items.map((item) => {
    if (!item.children?.length) return item;

    const flatChildren: MenuItemType[] = [];
    for (const child of item.children) {
      if (child.children?.length) {
        for (const grandchild of child.children) {
          flatChildren.push({
            ...grandchild,
            icon: grandchild.icon ?? child.icon,
          });
        }
      } else {
        flatChildren.push(child);
      }
    }

    flatChildren.sort((a, b) => a.sort_order - b.sort_order);
    return { ...item, children: flatChildren };
  });
}

function findMenuBreadcrumb(
  menuTree: MenuItemType[],
  pathname: string,
): SidebarBreadcrumb | null {
  for (const item of menuTree) {
    if (item.route === pathname) {
      return { parent: null, page: item.label };
    }
    for (const child of item.children ?? []) {
      if (child.route === pathname) {
        return { parent: item.label, page: child.label };
      }
      if (child.route && pathname.startsWith(`${child.route}/`)) {
        return { parent: item.label, page: child.label };
      }
    }
    if (item.route && pathname.startsWith(`${item.route}/`)) {
      return { parent: null, page: item.label };
    }
  }
  return null;
}

export function resolveSidebarBreadcrumb(
  menuTree: MenuItemType[],
  pathname: string,
): SidebarBreadcrumb {
  const fromMenu = findMenuBreadcrumb(menuTree, pathname);
  if (fromMenu) {
    return fromMenu;
  }

  if (pathname === '/' || pathname === '') {
    return { parent: null, page: 'Dashboard' };
  }

  if (isDetailRoute(pathname)) {
    const baseSegment = pathname.split('/').filter(Boolean)[0];
    for (const item of menuTree) {
      for (const child of item.children ?? []) {
        if (child.route === `/${baseSegment}`) {
          return { parent: item.label, page: child.label };
        }
      }
    }
    return { parent: null, page: 'Details' };
  }

  const segment = pathname.split('/').filter(Boolean).at(-1) ?? 'Page';
  return {
    parent: null,
    page: segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}
