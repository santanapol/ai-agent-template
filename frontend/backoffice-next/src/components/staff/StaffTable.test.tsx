import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import StaffTable from "./StaffTable";
import { createStaffColumns } from "./staff-columns";

const mockProfiles = [
  {
    id: "1",
    user_id: "user-1",
    ou_id: "ou-1",
    branch_id: "branch-1",
    code: "EMP-001",
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com",
    tel: "1234567890",
    status: "active" as const,
    user: { username: "jdoe", role: "staff" },
  },
];

function StaffTableHarness({
  onEdit,
  onArchive,
}: {
  onEdit?: (record: (typeof mockProfiles)[0]) => void;
  onArchive?: (record: (typeof mockProfiles)[0]) => void;
}) {
  const handlers = {
    onView: vi.fn(),
    onArchive,
    onRestore: vi.fn(),
    onEdit,
  };
  const table = useReactTable({
    data: mockProfiles,
    columns: createStaffColumns(handlers),
    getCoreRowModel: getCoreRowModel(),
  });

  return <StaffTable table={table} loading={false} pagination={{ current: 1, pageSize: 10, total: 1 }} />;
}

describe("StaffTable", () => {
  test("does not render Email or Tel column headers", () => {
    render(<StaffTableHarness onEdit={vi.fn()} onArchive={vi.fn()} />);
    expect(screen.queryByRole("columnheader", { name: /^Email$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Tel$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Action$/i })).toBeInTheDocument();
  });

  test("renders edit button when onEdit is provided", () => {
    render(<StaffTableHarness onEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Edit profile/i })).toBeInTheDocument();
  });

  test("does not render edit button when onEdit is omitted", () => {
    render(<StaffTableHarness />);
    expect(screen.queryByRole("button", { name: /Edit profile/i })).not.toBeInTheDocument();
  });

  test("does not render archive button when onArchive is omitted", () => {
    render(<StaffTableHarness onEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Archive profile/i })).not.toBeInTheDocument();
  });

  test("renders archive button when onArchive is provided", () => {
    render(<StaffTableHarness onArchive={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Archive profile/i })).toBeInTheDocument();
  });
});
