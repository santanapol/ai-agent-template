import { type ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTableView } from "./data-table-view";
import { useServerDataTable } from "./use-server-data-table";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
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
});
