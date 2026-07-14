import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Royalty21Table from "./Royalty21Table";
import { createRoyalty21Columns } from "./royalty21Columns";

function Royalty21TableHarness({
  hasSearched,
  loading = false,
  total = 0,
}: {
  hasSearched: boolean;
  loading?: boolean;
  total?: number;
}) {
  const table = useReactTable({
    data: [],
    columns: createRoyalty21Columns(),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${row.username}::${row.register}`,
  });

  return <Royalty21Table table={table} loading={loading} hasSearched={hasSearched} total={total} />;
}

describe("Royalty21Table", () => {
  it("shows pre-search empty state before first search", () => {
    render(<Royalty21TableHarness hasSearched={false} />);

    expect(screen.getByText("Run Search to load report")).toBeInTheDocument();
  });

  it("shows no-results empty state after search returns empty", () => {
    render(<Royalty21TableHarness hasSearched={true} />);

    expect(screen.getByText("No members match these filters")).toBeInTheDocument();
  });
});
