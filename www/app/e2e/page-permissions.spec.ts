import { test, expect } from "@playwright/test";
import { USER_ROLES, gotoAppWithRole } from "./fixtures/role";

const MEMBER_MANAGE_ROLES = ["owner", "admin", "manager"] as const;

test.describe("MembersPage — canManageMembers", () => {
  for (const role of MEMBER_MANAGE_ROLES) {
    test(`${role}: shows add member controls`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.getByRole("link", { name: "Members" }).click();
      await expect(
        page.getByRole("heading", { name: "Members", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Add member" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add member" }),
      ).toBeVisible();
    });
  }

  for (const role of USER_ROLES.filter(
    (r) => !(MEMBER_MANAGE_ROLES as readonly string[]).includes(r),
  )) {
    test(`${role}: read-only members (no add form)`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.getByRole("link", { name: "Members" }).click();
      await expect(
        page.getByRole("heading", { name: "Members", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Add member" }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Read-only for this role.").first(),
      ).toBeVisible();
    });
  }
});
