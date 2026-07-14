import type React from "react";

import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTableToolbarActions } from "./data-table-toolbar-actions";

vi.mock("@/lib/downloadBlob", () => ({
  triggerBlobDownload: vi.fn(),
}));

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name", id: "name" }];

function ToolbarHarness(props: Partial<React.ComponentProps<typeof DataTableToolbarActions<Row>>> = {}) {
  const table = useReactTable({
    data: [{ id: "1", name: "Alice" }],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return <DataTableToolbarActions table={table} exportFileName="widgets" {...props} />;
}

describe("DataTableToolbarActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both Export CSV and Export Excel options in the dropdown", async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));

    expect(await screen.findByText("Export CSV")).toBeInTheDocument();
    expect(screen.getByText("Export Excel")).toBeInTheDocument();
  });

  it("does not render a nested button (Base UI render-prop trigger, not asChild)", async () => {
    render(<ToolbarHarness />);

    const trigger = screen.getByRole("button", { name: /export visible rows/i });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.querySelector("button")).toBeNull();
  });

  it("disables the Export trigger when exportDisabled is true", () => {
    render(<ToolbarHarness exportDisabled />);

    expect(screen.getByRole("button", { name: /export visible rows/i })).toBeDisabled();
  });

  it("default path: Export CSV uses the TanStack-table-driven exportVisibleRowsToCsv", async () => {
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export CSV"));

    expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), "widgets.csv");
  });

  it("default path: Export Excel uses the TanStack-table-driven exportVisibleRowsToXlsx", async () => {
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export Excel"));

    // The Excel path is a dynamic import() - wait for its promise chain to settle
    // before asserting, so it can't leak into a later test.
    await waitFor(() => {
      expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), "widgets.xlsx");
    });
  });

  it("override path: onExportCsv/onExportXlsx are called instead of the default table-driven export", async () => {
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");
    const onExportCsv = vi.fn();
    const onExportXlsx = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ToolbarHarness onExportCsv={onExportCsv} onExportXlsx={onExportXlsx} />);

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export CSV"));
    expect(onExportCsv).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export Excel"));
    await waitFor(() => {
      expect(onExportXlsx).toHaveBeenCalledTimes(1);
    });

    expect(triggerBlobDownload).not.toHaveBeenCalled();
  });

  it("shows the column-visibility control by default and hides it when disabled", () => {
    const { rerender } = render(<ToolbarHarness />);
    expect(screen.getByRole("button", { name: /customize visible columns/i })).toBeInTheDocument();

    rerender(<ToolbarHarness showColumnVisibility={false} />);
    expect(screen.queryByRole("button", { name: /customize visible columns/i })).not.toBeInTheDocument();
  });
});
