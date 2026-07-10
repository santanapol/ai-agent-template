import { useState } from "react";

import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Checkbox } from "@/components/ui/checkbox";

import { DataTableView } from "./data-table-view";
import { useServerDataTable } from "./use-server-data-table";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
];

const selectableColumns: ColumnDef<Row>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.name}`}
      />
    ),
  },
  { id: "name", accessorKey: "name", header: "Name" },
];

function ServerTableHarness({ data, total }: { data: Row[]; total: number }) {
  const table = useServerDataTable({
    data,
    columns,
    pageIndex: 0,
    pageSize: 20,
    pageCount: Math.max(1, Math.ceil(total / 20)),
    onPaginationChange: () => undefined,
    getRowId: (row) => row.id,
  });

  return <DataTableView table={table} />;
}

function SelectableServerTableHarness({ data }: { data: Row[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedKeys = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const table = useServerDataTable({
    data,
    columns: selectableColumns,
    pageIndex: 0,
    pageSize: 10,
    pageCount: 1,
    onPaginationChange: () => undefined,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => selectedKeys.length < 50 || row.getIsSelected(),
    getRowId: (row) => row.id,
  });

  return (
    <div>
      <div data-testid="selected-count">{selectedKeys.length}</div>
      <div data-testid="row-selected">{String(table.getRowModel().rows[0]?.getIsSelected() ?? false)}</div>
      <DataTableView table={table} rowSelection={rowSelection} />
    </div>
  );
}

describe("useServerDataTable", () => {
  it("renders rows when server page data arrives after mount", () => {
    const { rerender } = render(<ServerTableHarness data={[]} total={2} />);

    expect(screen.getByText("No data found")).toBeInTheDocument();

    rerender(
      <ServerTableHarness
        data={[
          { id: "1", name: "Alice" },
          { id: "2", name: "Bob" },
        ]}
        total={2}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("No data found")).not.toBeInTheDocument();
  });

  it("keeps row checkbox checked after selecting a row", async () => {
    const user = userEvent.setup();
    render(
      <SelectableServerTableHarness
        data={[
          { id: "inv-1", name: "Alice" },
          { id: "inv-2", name: "Bob" },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Select Alice" }));

    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    expect(screen.getByTestId("row-selected")).toHaveTextContent("true");
    expect(screen.getByRole("checkbox", { name: "Select Alice" })).toHaveAttribute("aria-checked", "true");
  });
});
