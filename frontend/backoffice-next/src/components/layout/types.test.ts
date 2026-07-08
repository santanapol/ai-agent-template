import { describe, expect, it } from "vitest";

import { flattenMenuForSearch, type MenuItemType } from "./types";

const menuTree: MenuItemType[] = [
  {
    key: "billing",
    label: "Billing",
    sort_order: 1,
    children: [
      { key: "invoices", label: "Invoices", route: "/invoices", sort_order: 1 },
      { key: "agents", label: "Agents", route: "/agents", sort_order: 2 },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    sort_order: 2,
    children: [
      {
        key: "smart",
        label: "Smart Reports",
        sort_order: 1,
        children: [{ key: "smart-list", label: "Scripts", route: "/smart-reports", sort_order: 1 }],
      },
    ],
  },
];

describe("flattenMenuForSearch", () => {
  it("returns searchable routes with group labels", () => {
    const items = flattenMenuForSearch(menuTree);
    expect(items).toEqual(
      expect.arrayContaining([
        { id: "agents", group: "Billing", label: "Agents", route: "/agents" },
        { id: "invoices", group: "Billing", label: "Invoices", route: "/invoices" },
        { id: "smart-list", group: "Smart Reports", label: "Scripts", route: "/smart-reports" },
      ]),
    );
  });
});
