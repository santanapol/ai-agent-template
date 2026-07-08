import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { BreadcrumbLinkItem, SidebarBreadcrumb } from '@/components/layout/types';

type PageBreadcrumbContextValue = {
  setOverrideItems: (items: BreadcrumbLinkItem[] | null) => void;
};

const PageBreadcrumbContext = createContext<PageBreadcrumbContextValue | null>(null);

export function PageBreadcrumbProvider({
  baseBreadcrumb,
  children,
}: {
  baseBreadcrumb: SidebarBreadcrumb;
  children: (breadcrumb: SidebarBreadcrumb) => React.ReactNode;
}) {
  const [overrideItems, setOverrideItems] = useState<BreadcrumbLinkItem[] | null>(null);

  const breadcrumb = useMemo<SidebarBreadcrumb>(
    () => (overrideItems ? { parent: null, page: '', items: overrideItems } : baseBreadcrumb),
    [baseBreadcrumb, overrideItems],
  );

  const value = useMemo(() => ({ setOverrideItems }), []);

  return (
    <PageBreadcrumbContext.Provider value={value}>
      {children(breadcrumb)}
    </PageBreadcrumbContext.Provider>
  );
}

/** Push a custom breadcrumb trail into SiteHeader (same slot as list pages). */
export function usePageBreadcrumb(items: BreadcrumbLinkItem[] | null) {
  const context = useContext(PageBreadcrumbContext);
  if (!context) {
    throw new Error('usePageBreadcrumb must be used within PageBreadcrumbProvider');
  }

  const { setOverrideItems } = context;

  useEffect(() => {
    setOverrideItems(items);
    return () => setOverrideItems(null);
  }, [items, setOverrideItems]);
}
