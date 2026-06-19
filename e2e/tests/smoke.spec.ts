import { test, expect } from "@playwright/test";

// Smoke test that proves the harness is wired: server up, SPA built,
// /api/v1/meta reachable, root path serves index.html.
test("server is up and SPA bundle loads", async ({ page }) => {
  const apiResponse = await page.request.get("/api/v1/meta");
  expect(apiResponse.ok()).toBe(true);

  await page.goto("/");
  await expect(page).toHaveTitle(/Photo diary/i);
});
