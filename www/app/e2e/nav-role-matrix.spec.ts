import { test, expect } from "@playwright/test";
import { USER_ROLES, gotoAppWithRole, OU_LEVEL_ROLES } from "./fixtures/role";

test.describe("sidebar nav — each role", () => {
  for (const role of USER_ROLES) {
    test(`${role}: Members and OU Settings links`, async ({ page }) => {
      await gotoAppWithRole(page, role);

      await page.getByRole("link", { name: "Members" }).click();
      await expect(
        page.getByRole("heading", { name: "Members", exact: true }),
      ).toBeVisible();

      await page.getByRole("link", { name: "OU Settings" }).click();
      if ((OU_LEVEL_ROLES as readonly string[]).includes(role)) {
        await expect(
          page.getByRole("heading", { name: "OU Settings" }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: "403 Forbidden" }),
        ).toBeVisible();
      }
    });
  }
});
