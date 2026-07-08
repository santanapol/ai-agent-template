import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTableColumnVisibility } from "@/components/data-table/data-table-column-visibility";
import { exportVisibleRowsToCsv } from "@/components/data-table/export-visible-rows";
import { ListPageCard } from "@/components/layout/ListPageCard";
import { InlineFilterSelect } from "@/components/list-page/InlineFilterSelect";
import { ListPageSearch } from "@/components/list-page/ListPageSearch";

vi.mock("@/lib/downloadBlob", () => ({
  triggerBlobDownload: vi.fn(),
}));

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name", id: "name" }];

function VisibilityHarness() {
  const table = useReactTable({
    data: [{ id: "1", name: "Alice" }],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility: { name: true } },
  });
  return <DataTableColumnVisibility table={table} />;
}

describe("Phase 6A toolkit", () => {
  it("ListPageCard renders selectionBar and footer slots", () => {
    render(
      <ListPageCard title="Staff" selectionBar={<span>2 selected</span>} footer={<span>Page 1</span>}>
        <div>Body</div>
      </ListPageCard>,
    );

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("ListPageSearch updates value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ListPageSearch id="q" value="" onChange={onChange} placeholder="Search staff" />);

    await user.type(screen.getByLabelText("Search staff"), "jo");
    expect(onChange).toHaveBeenCalled();
  });

  it("InlineFilterSelect renders prefix label", () => {
    render(
      <InlineFilterSelect
        id="status"
        prefix="Status:"
        value="active"
        options={[
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Status: Active")).toBeInTheDocument();
  });

  it("DataTableColumnVisibility renders customize trigger", () => {
    render(<VisibilityHarness />);
    expect(screen.getByRole("button", { name: /customize visible columns/i })).toBeInTheDocument();
  });

  it("exportVisibleRowsToCsv downloads a CSV blob", async () => {
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");

    function ExportHarness() {
      const table = useReactTable({
        data: [{ id: "1", name: "Alice" }],
        columns,
        getCoreRowModel: getCoreRowModel(),
      });
      exportVisibleRowsToCsv(table, "staff");
      return null;
    }

    render(<ExportHarness />);
    expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), "staff.csv");
  });
});
