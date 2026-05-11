import { test, expect } from "@playwright/test";
import { USER_ROLES, gotoAppWithRole } from "./fixtures/role";

test.describe("sidebar nav — each role", () => {
  for (const role of USER_ROLES) {
    test(`${role}: Dashboard, Items, Reports headings`, async ({ page }) => {
      await gotoAppWithRole(page, role);

      await page.getByRole("link", { name: "Dashboard" }).click();
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();

      await page.getByRole("link", { name: "Items" }).click();
      await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();

      await page.getByRole("link", { name: "Reports" }).click();
      await expect(
        page.getByRole("heading", { name: "Reports" }),
      ).toBeVisible();
    });
  }
});
