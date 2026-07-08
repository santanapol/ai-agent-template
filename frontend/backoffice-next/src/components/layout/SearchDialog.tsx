"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";

import { flattenMenuForSearch, type MenuItemType } from "@/components/layout/types";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

function groupSearchItems(items: ReturnType<typeof flattenMenuForSearch>) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog({
  menuTree,
  onNavigate,
  mobile = false,
}: {
  menuTree: MenuItemType[];
  onNavigate: (route: string) => void;
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(() => flattenMenuForSearch(menuTree), [menuTree]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (route: string) => {
    handleOpenChange(false);
    onNavigate(route);
  };

  const renderGroups = (searchItems: ReturnType<typeof flattenMenuForSearch>) =>
    groupSearchItems(searchItems).map(({ group, items: groupItems }, index) => (
      <Fragment key={group}>
        {index > 0 ? <CommandSeparator /> : null}
        <CommandGroup heading={group}>
          {groupItems.map((item) => (
            <CommandItem key={item.id} value={`${item.group} ${item.label}`} onSelect={() => handleSelect(item.route)}>
              <span className="truncate">{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </Fragment>
    ));

  return (
    <>
      {mobile ? (
        <Button type="button" size="icon" aria-label="Search navigation" onClick={() => handleOpenChange(true)}>
          <Search aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="link"
          className="px-0! font-normal text-muted-foreground hover:no-underline"
          onClick={() => handleOpenChange(true)}
        >
          <Search data-icon="inline-start" aria-hidden="true" />
          Search
          <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
            <span className="text-xs">⌘</span>J
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput placeholder="Search pages, invoices, and more…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {renderGroups(items)}
        </CommandList>
      </CommandDialog>
    </>
  );
}
