import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { MenuTreeNode } from "@/views/permission-admin/permissionAdminUtils";

import { MenuTree } from "./MenuTree";

const nodes: MenuTreeNode[] = [
  {
    key: "billing",
    label: "Billing",
    children: [
      { key: "invoices:list", label: "Invoices" },
      { key: "agents:list", label: "Agents" },
    ],
  },
  { key: "staff", label: "Staff" },
];

describe("MenuTree", () => {
  test("renders node labels and keys", () => {
    render(<MenuTree nodes={nodes} />);
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("(billing)")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("(staff)")).toBeInTheDocument();
  });

  test("renders checkboxes when checkable", () => {
    render(<MenuTree nodes={nodes} checkable checkedKeys={[]} onCheckedChange={() => undefined} />);
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });
});
