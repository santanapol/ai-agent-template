import type { Table } from "@tanstack/react-table";
import { LayoutGrid, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ListViewMode = "list" | "grid";

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  viewMode?: ListViewMode;
  onViewModeChange?: (mode: ListViewMode) => void;
  showViewToggle?: boolean;
}

export function DataTableSelectionBar<TData>({
  table,
  viewMode = "list",
  onViewModeChange,
  showViewToggle = false,
}: DataTableSelectionBarProps<TData>) {
  const selectedCount = Object.keys(table.getState().rowSelection ?? {}).length;

  if (selectedCount === 0 && !showViewToggle) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-muted-foreground text-sm">
      <span>{selectedCount > 0 ? `${selectedCount} selected` : "\u00A0"}</span>
      {showViewToggle && onViewModeChange ? (
        <ToggleGroup
          value={[viewMode]}
          onValueChange={(values) => {
            const next = values[0] as ListViewMode | undefined;
            if (next) onViewModeChange(next);
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="list" aria-label="List view">
            <List aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      ) : null}
    </div>
  );
}
