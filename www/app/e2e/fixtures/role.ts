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
 * Stub `GET/POST/PATCH/DELETE` on `/api/v1/members` so e2e runs without members-api.
 */
export async function stubMembersApi(page: Page) {
  await page.route("**/api/v1/members", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          code: "SUCCESS",
          message: null,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      });
      return;
    }
    if (method === "POST") {
      const raw = route.request().postData();
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          code: "CREATED",
          message: null,
          data: {
            userId: "e2e-stub-user",
            username: body.username,
            displayName: body.displayName,
            email: body.email ?? null,
            role: body.role,
            status: body.status ?? "active",
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/api/v1/members/*", async (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          code: "SUCCESS",
          message: null,
          data: {
            userId: "e2e-stub-user",
            username: "stub",
            displayName: "Patched",
            email: null,
            role: "member",
            status: "active",
          },
        }),
      });
      return;
    }
    if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          code: "SUCCESS",
          message: null,
          data: { deleted: true },
        }),
      });
      return;
    }
    await route.continue();
  });
}

/**
 * Login → demo session link → optional role switch (sidebar `#role-selector`).
 * Demo session matches `DEFAULT_SESSION`: ou-001 / bkk-01.
 */
export async function gotoAppWithRole(page: Page, role: UserRole) {
  await stubMembersApi(page);
  await page.goto("/login");
  await page
    .getByRole("link", { name: /Enter app \(demo session/ })
    .click();
  await expect(page).toHaveURL(/\/ou\/ou-001\/branches\/bkk-01\/members/);
  await page.locator("#role-selector").selectOption(role);
  await expect(page.locator("#role-selector")).toHaveValue(role);
}

/**
 * Phase B (optional): real JWT-backed e2e — add `globalSetup` writing `storageState`,
 * seed users per role in Auth, or intercept `POST` to the auth login path via
 * `page.route` returning a valid `access_token` whose payload matches
 * `sessionFromAccessToken` claims.
 */
