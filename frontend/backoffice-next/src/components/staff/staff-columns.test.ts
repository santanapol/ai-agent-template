import { describe, expect, test, vi } from "vitest";

import { createStaffColumns, STAFF_TABLE_COLUMN_IDS } from "./staff-columns";

describe("createStaffColumns", () => {
  const handlers = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
  };

  test("exposes only list-table column ids (no email or tel)", () => {
    expect(STAFF_TABLE_COLUMN_IDS).toEqual(["code", "name", "username", "status", "actions"]);
    const ids = createStaffColumns(handlers).map((column) => column.id);
    expect(ids).not.toContain("email");
    expect(ids).not.toContain("tel");
    expect(ids).toEqual([...STAFF_TABLE_COLUMN_IDS]);
  });

  test("uses Action header for the actions column", () => {
    const actionsColumn = createStaffColumns(handlers).find((column) => column.id === "actions");
    expect(actionsColumn?.header).toBe("Action");
  });
});
