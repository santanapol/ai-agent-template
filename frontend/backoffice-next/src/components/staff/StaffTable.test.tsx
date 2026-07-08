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

function StaffTableHarness({ onEdit }: { onEdit?: (record: (typeof mockProfiles)[0]) => void }) {
  const handlers = {
    onView: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onEdit,
  };
  const table = useReactTable({
    data: mockProfiles,
    columns: createStaffColumns(handlers),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <StaffTable
      table={table}
      loading={false}
      pagination={{ current: 1, pageSize: 10, total: 1 }}
      viewMode="list"
      handlers={handlers}
    />
  );
}

describe("StaffTable", () => {
  test("renders edit button when onEdit is provided", () => {
    render(<StaffTableHarness onEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Edit profile/i })).toBeInTheDocument();
  });

  test("does not render edit button when onEdit is omitted", () => {
    render(<StaffTableHarness />);
    expect(screen.queryByRole("button", { name: /Edit profile/i })).not.toBeInTheDocument();
  });
});
