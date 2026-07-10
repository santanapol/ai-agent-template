import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

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

  test("parent checkbox is checked when all leaf children are checked", () => {
    render(
      <MenuTree
        nodes={nodes}
        checkable
        checkedKeys={["invoices:list", "agents:list"]}
        onCheckedChange={() => undefined}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Billing" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Invoices" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();
  });

  test("parent checkbox is indeterminate when some leaf children are checked", () => {
    render(
      <MenuTree nodes={nodes} checkable checkedKeys={["invoices:list"]} onCheckedChange={() => undefined} />,
    );

    const billing = screen.getByRole("checkbox", { name: "Billing" });
    expect(billing).not.toBeChecked();
    expect(billing).toHaveAttribute("aria-checked", "mixed");
  });

  test("clicking checked parent cascades uncheck to all leaves", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <MenuTree
        nodes={nodes}
        checkable
        checkedKeys={["invoices:list", "agents:list"]}
        onCheckedChange={onCheckedChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Billing" }));

    expect(onCheckedChange).toHaveBeenCalledWith([]);
  });

  test("clicking unchecked parent cascades check to all leaves", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<MenuTree nodes={nodes} checkable checkedKeys={[]} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Billing" }));

    expect(onCheckedChange).toHaveBeenCalledWith(expect.arrayContaining(["billing", "invoices:list", "agents:list"]));
  });

  test("clicking indeterminate parent checks all leaves", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <MenuTree nodes={nodes} checkable checkedKeys={["invoices:list"]} onCheckedChange={onCheckedChange} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Billing" }));

    expect(onCheckedChange).toHaveBeenCalledWith(expect.arrayContaining(["billing", "invoices:list", "agents:list"]));
  });
});
