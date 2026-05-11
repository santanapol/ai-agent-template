import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("redirects root to login and shows login heading", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });
});
