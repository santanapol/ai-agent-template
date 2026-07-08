import { Fragment } from 'react';
import { Menu } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { resolveBreadcrumbItems, type BreadcrumbLinkItem, type SidebarBreadcrumb } from '@/components/layout/types';

function BreadcrumbItemContent({ item, isLast }: { item: BreadcrumbLinkItem; isLast: boolean }) {
  if (isLast) {
    return <BreadcrumbPage>{item.label}</BreadcrumbPage>;
  }
  if (item.onClick || item.href) {
    return (
      <BreadcrumbLink
        href={item.href}
        onClick={(event) => {
          if (item.onClick) {
            event.preventDefault();
            item.onClick();
          }
        }}
      >
        {item.label}
      </BreadcrumbLink>
    );
  }
  return <span className="text-muted-foreground">{item.label}</span>;
}

function HeaderBreadcrumb({ items }: { items: BreadcrumbLinkItem[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={String(item.label)}>
              {index > 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
              <BreadcrumbItem className={index === 0 ? 'hidden md:block' : undefined}>
                <BreadcrumbItemContent item={item} isLast={isLast} />
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function SiteHeader({
  breadcrumb,
  isMobile,
  onOpenMobileNav,
  mobileBranchLabel,
}: {
  breadcrumb: SidebarBreadcrumb;
  isMobile: boolean;
  onOpenMobileNav: () => void;
  /** CC-07: compact branch context when desktop switcher is hidden on mobile */
  mobileBranchLabel?: string | null;
}) {
  const breadcrumbItems = resolveBreadcrumbItems(breadcrumb);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b">
      <div className="flex h-full min-w-0 items-center gap-2 px-4">
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
          >
            <Menu aria-hidden="true" />
          </Button>
        ) : (
          <SidebarTrigger className="-ml-1" />
        )}
        {breadcrumbItems.length > 0 ? (
          <>
            <Separator
              orientation="vertical"
              className="mr-2 self-center data-[orientation=vertical]:h-4 data-vertical:self-center"
            />
            <HeaderBreadcrumb items={breadcrumbItems} />
          </>
        ) : null}
      </div>
      {isMobile && mobileBranchLabel ? (
        <p
          className="max-w-[45%] truncate px-4 text-sm text-muted-foreground"
          title={mobileBranchLabel}
        >
          {mobileBranchLabel}
        </p>
      ) : null}
    </header>
  );
}
