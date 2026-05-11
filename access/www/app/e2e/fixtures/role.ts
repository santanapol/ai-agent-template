import { expect, type Page } from "@playwright/test";

/** Mirrors `UserRole` in `src/app/auth-context.ts` for e2e (no import from `src/`). */
export const USER_ROLES = [
  "owner",
  "admin",
  "manager",
  "member",
  "billing",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const OU_LEVEL_ROLES: UserRole[] = ["owner", "admin"];
export const BRANCH_SCOPED_ROLES: UserRole[] = [
  "manager",
  "member",
  "billing",
];

/**
 * Login → demo session link → optional role switch (sidebar `#role-selector`).
 * Demo session matches `DEFAULT_SESSION`: ou-001 / bkk-01.
 */
export async function gotoAppWithRole(page: Page, role: UserRole) {
  await page.goto("/login");
  await page
    .getByRole("link", { name: /Enter app \(demo session/ })
    .click();
  await expect(page).toHaveURL(/\/ou\/ou-001\/branches\/bkk-01\/dashboard/);
  await page.locator("#role-selector").selectOption(role);
  await expect(page.locator("#role-selector")).toHaveValue(role);
}

/**
 * Stub gateway billing GET/PATCH so BillingPage renders plan UI (demo has no JWT).
 * Matches relative `/api/v1/...` (same origin as Vite) or absolute gateway URL.
 */
export async function stubBillingPlanApi(page: Page) {
  const planJson = JSON.stringify({
    data: {
      planCode: "starter",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  await page.route(
    "**/api/v1/ou/ou-001/branches/bkk-01/billing/plan",
    async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: planJson,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: planJson,
      });
    },
  );
  await page.route(
    "**/api/v1/ou/ou-001/branches/bkk-01/billing/invoices",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    },
  );
}

/**
 * Phase B (optional): real JWT-backed e2e — add `globalSetup` writing `storageState`,
 * seed users per role in Auth, or intercept `POST` to the auth login path via
 * `page.route` returning a valid `access_token` whose payload matches
 * `sessionFromAccessToken` claims.
 */
