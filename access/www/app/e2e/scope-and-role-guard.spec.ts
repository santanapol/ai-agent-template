import { test, expect } from "@playwright/test";
import {
  BRANCH_SCOPED_ROLES,
  OU_LEVEL_ROLES,
  USER_ROLES,
  gotoAppWithRole,
} from "./fixtures/role";

test.describe("ScopeGuard — branch URL vs session", () => {
  for (const role of OU_LEVEL_ROLES) {
    test(`${role}: may open another branch in same OU (cnx-01)`, async ({
      page,
    }) => {
      await gotoAppWithRole(page, role);
      await page.goto("/ou/ou-001/branches/cnx-01/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    });
  }

  for (const role of BRANCH_SCOPED_ROLES) {
    test(`${role}: blocked on other branch in same OU`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.goto("/ou/ou-001/branches/cnx-01/dashboard");
      await expect(
        page.getByRole("heading", { name: "403 Forbidden" }),
      ).toBeVisible();
    });
  }
});

test.describe("ScopeGuard — wrong OU", () => {
  for (const role of USER_ROLES) {
    test(`${role}: forbidden for wrong OU`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.goto("/ou/wrong-ou/branches/bkk-01/dashboard");
      await expect(
        page.getByRole("heading", { name: "403 Forbidden" }),
      ).toBeVisible();
    });
  }
});

test.describe("RoleGuard — OU Settings", () => {
  for (const role of OU_LEVEL_ROLES) {
    test(`${role}: may open OU settings`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.goto("/ou/ou-001/settings");
      await expect(
        page.getByRole("heading", { name: "OU Settings" }),
      ).toBeVisible();
    });
  }

  for (const role of BRANCH_SCOPED_ROLES) {
    test(`${role}: forbidden on OU settings`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.goto("/ou/ou-001/settings");
      await expect(
        page.getByRole("heading", { name: "403 Forbidden" }),
      ).toBeVisible();
    });
  }
});

test.describe("home branch still allowed", () => {
  for (const role of USER_ROLES) {
    test(`${role}: dashboard on bkk-01`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    });
  }
});
