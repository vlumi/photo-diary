import { test, expect } from "@playwright/test";

import { FIXTURE_PASSWORD } from "../fixtures/data.js";
import { login, userMenuClick } from "./helpers.js";

test.describe("login + logout cycle", () => {
  test("login as alice → cookies set → logout → cookies cleared, login modal re-openable", async ({
    page,
  }) => {
    await page.goto("/");
    await login(page, "alice");

    // pd_access + pd_refresh cookies were set by the login response.
    const cookies = await page.context().cookies();
    const accessCookie = cookies.find((c) => c.name === "pd_access");
    const refreshCookie = cookies.find((c) => c.name === "pd_refresh");
    expect(accessCookie?.httpOnly).toBe(true);
    expect(accessCookie?.sameSite).toBe("Lax");
    expect(refreshCookie?.httpOnly).toBe(true);

    // The post-#259 regression guard: the per-user query cache must
    // be invalidated on logout. Easiest measurable proxy is the
    // user-menu trigger label flipping back to "Login".
    await userMenuClick(page, "alice", "Logout");
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

    const cookiesAfter = await page.context().cookies();
    expect(cookiesAfter.find((c) => c.name === "pd_access")).toBeUndefined();
    expect(cookiesAfter.find((c) => c.name === "pd_refresh")).toBeUndefined();
  });
});

test.describe("session expiry → re-login", () => {
  test("revoking the session server-side surfaces the login modal on the next admin call", async ({
    page,
  }) => {
    await page.goto("/");
    await login(page, "admin");

    // Navigate to /m WITH valid cookies first so the SPA bundle loads
    // cleanly. Token-filter runs on every request including page
    // navigations, so triggering 401 before the bundle is in place
    // would render the raw JSON error in the browser.
    await userMenuClick(page, "admin", "Manage");
    await expect(page).toHaveURL(/\/m$/);

    // Force a 401 on the next admin call + the refresh attempt that
    // follows. Reproduces the real "session is unrecoverable" path:
    // refresh fails → expireLocalAuth → session-expired modal.
    // Hand-rolling cookies wouldn't work — the token-filter 401s page
    // navigations too, and clearing cookies leaves the server seeing
    // :guest (403, not 401).
    await page.route("**/api/v1/users", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "expired" }),
      })
    );
    await page.route("**/api/v1/tokens/refresh", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "expired" }),
      })
    );

    // SPA-internal navigation (no page reload) to /m/users — fires
    // GET /api/v1/users via openapi-fetch, the intercepted 401 hits
    // the global handler, refresh also 401s, expireLocalAuth opens
    // the modal.
    await page.evaluate(() => {
      window.history.pushState({}, "", "/m/users");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toContainText(/session has expired/i);

    // Re-login from the same modal works. Clear the route intercepts
    // so the actual POST /tokens reaches the server.
    await page.unroute("**/api/v1/tokens/refresh");
    await page.unroute("**/api/v1/users");

    // Re-login from the same modal works.
    await modal.locator('input[name="userId"]').fill("admin");
    await modal.locator('input[name="password"]').fill(FIXTURE_PASSWORD);
    await modal.getByRole("button", { name: "Login" }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByRole("button", { name: "admin" })).toBeVisible();
  });
});
