import type React from "react";

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

/** Detail routes use a shortened menu trail until a page pushes a custom trail. */
const DETAIL_ROUTE_PATTERNS: RegExp[] = [/^\/invoices\/[^/]+$/];

export function isDetailRoute(pathname: string): boolean {
  return DETAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isDashboardMenuItem(item: MenuItemType): boolean {
  return item.route === "/" || item.key === "dashboard" || item.key === "/";
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

export type SearchMenuItem = {
  id: string;
  group: string;
  label: string;
  route: string;
};

export function flattenMenuForSearch(menuTree: MenuItemType[]): SearchMenuItem[] {
  const results: SearchMenuItem[] = [];

  const walk = (items: MenuItemType[], group: string) => {
    for (const item of items) {
      const nextGroup = group || item.label;
      if (item.route) {
        results.push({
          id: item.key,
          group: nextGroup,
          label: item.label,
          route: item.route,
        });
      }
      if (item.children?.length) {
        walk(item.children, item.label);
      }
    }
  };

  walk(menuTree, "");
  return results.sort((a, b) => a.label.localeCompare(b.label));
}

function findMenuBreadcrumbTrail(menuTree: MenuItemType[], pathname: string): BreadcrumbLinkItem[] | null {
  function search(items: MenuItemType[], ancestors: MenuItemType[]): BreadcrumbLinkItem[] | null {
    for (const item of items) {
      const chain = [...ancestors, item];
      if (item.route === pathname) {
        return chain.map((node) => ({ label: node.label }));
      }
      if (item.children?.length) {
        const found = search(item.children, chain);
        if (found) return found;
      }
    }
    return null;
  }

  return search(menuTree, []);
}

function breadcrumbFromTrail(trail: BreadcrumbLinkItem[]): SidebarBreadcrumb {
  const page = String(trail.at(-1)?.label ?? "");
  const parent = trail.length > 1 ? String(trail.at(-2)?.label ?? "") : null;
  return { parent, page, items: trail };
}

/** Normalize menu or page override breadcrumb for SiteHeader rendering. */
export function resolveBreadcrumbItems(breadcrumb: SidebarBreadcrumb): BreadcrumbLinkItem[] {
  if (breadcrumb.items?.length) {
    return breadcrumb.items;
  }

  const items: BreadcrumbLinkItem[] = [];
  if (breadcrumb.parent) {
    items.push({ label: breadcrumb.parent });
  }
  if (breadcrumb.page) {
    items.push({ label: breadcrumb.page });
  }
  return items;
}

export function resolveSidebarBreadcrumb(menuTree: MenuItemType[], pathname: string): SidebarBreadcrumb {
  const trail = findMenuBreadcrumbTrail(menuTree, pathname);
  if (trail) {
    return breadcrumbFromTrail(trail);
  }

  if (pathname === "/" || pathname === "") {
    return { parent: null, page: "Dashboard" };
  }

  if (isDetailRoute(pathname)) {
    const baseSegment = pathname.split("/").filter(Boolean)[0];
    for (const item of menuTree) {
      for (const child of item.children ?? []) {
        if (child.route === `/${baseSegment}`) {
          return { parent: item.label, page: child.label };
        }
      }
    }
    return { parent: null, page: "Details" };
  }

  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "Page";
  return {
    parent: null,
    page: segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}
