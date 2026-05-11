import { test, expect } from "@playwright/test";
import { USER_ROLES, gotoAppWithRole, stubBillingPlanApi } from "./fixtures/role";

const MEMBER_MANAGE_ROLES = ["owner", "admin", "manager"] as const;
const BILLING_MANAGE_ROLES = ["owner", "admin"] as const;

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

test.describe("BillingPage — canManageBillingPlan", () => {
  test.beforeEach(async ({ page }) => {
    await stubBillingPlanApi(page);
  });

  for (const role of BILLING_MANAGE_ROLES) {
    test(`${role}: shows update plan controls`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.getByRole("link", { name: "Billing" }).click();
      await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
      await expect(page.getByText("Current plan:")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Update plan" }),
      ).toBeVisible();
    });
  }

  for (const role of USER_ROLES.filter(
    (r) => !(BILLING_MANAGE_ROLES as readonly string[]).includes(r),
  )) {
    test(`${role}: read-only billing plan`, async ({ page }) => {
      await gotoAppWithRole(page, role);
      await page.getByRole("link", { name: "Billing" }).click();
      await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
      await expect(page.getByText("Current plan:")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Update plan" }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Read-only for this role.").first(),
      ).toBeVisible();
    });
  }
});
