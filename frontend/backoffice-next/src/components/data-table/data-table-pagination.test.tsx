import { useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DataTablePagination } from "./data-table-pagination";
import { useServerDataTable } from "./use-server-data-table";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [{ id: "name", accessorKey: "name", header: "Name" }];

const data: Row[] = Array.from({ length: 60 }, (_, i) => ({ id: `${i}`, name: `Row ${i}` }));

function Harness() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const table = useServerDataTable({
    data,
    columns,
    pageIndex,
    pageSize,
    pageCount: Math.max(1, Math.ceil(data.length / pageSize)),
    onPaginationChange: (next) => {
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  return <DataTablePagination table={table} total={data.length} pageSizeOptions={[20, 50, 100]} />;
}

describe("DataTablePagination", () => {
  // Vitest doesn't run the React Compiler transform, so this can't catch the caller-side
  // memoization bug the "use no memo" fix in Royalty21Table.tsx (and siblings) guards against —
  // it only verifies the Select-to-table wiring itself is correct.
  it("reflects a new Rows-per-page selection", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByLabelText("Rows per page");
    expect(trigger).toHaveTextContent("50");

    trigger.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    await user.keyboard("{ArrowUp}"); // from "50" to "20" in [20, 50, 100]
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByLabelText("Rows per page")).toHaveTextContent("20"));
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });
});
