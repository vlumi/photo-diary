import { test, expect } from "@playwright/test";

import { FIXTURE_PASSWORD } from "../fixtures/data.js";
import { login } from "./helpers.js";

test.describe("change password", () => {
  test("correct current → success, fresh tokens issued, subsequent calls succeed", async ({
    page,
  }) => {
    await page.goto("/");
    await login(page, "alice");

    // Capture the pd_refresh cookie value before — change-password
    // rotates this device's session, so the cookie value MUST change.
    const before = (await page.context().cookies()).find(
      (c) => c.name === "pd_refresh"
    );
    expect(before?.value).toBeDefined();

    // Open the change-password modal from the user menu.
    await page.getByRole("button", { name: "alice" }).click();
    await page.getByRole("menuitem", { name: "Change password" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    await modal.locator('input[name="currentPassword"]').fill(FIXTURE_PASSWORD);
    await modal.locator('input[name="newPassword"]').fill("new-password-1");
    await modal.locator('input[name="confirmPassword"]').fill("new-password-1");
    await modal.getByRole("button", { name: "Change password" }).click();

    // Modal closes on success.
    await expect(modal).toBeHidden();

    // pd_refresh was rotated.
    const after = (await page.context().cookies()).find(
      (c) => c.name === "pd_refresh"
    );
    expect(after?.value).toBeDefined();
    expect(after?.value).not.toBe(before?.value);

    // Subsequent authed call still works under the new session. The
    // /api/v1/tokens GET keep-alive returns 200 when authed, 401
    // otherwise. Routed through the browser via page.evaluate rather
    // than page.request — the cookies carry the Secure flag, and
    // Playwright's Node-side APIRequestContext (page.request) refuses
    // to attach Secure cookies on plain HTTP, while chromium treats
    // 127.0.0.1 as a secure context and sends them.
    const keepaliveOk = await page.evaluate(async () => {
      const r = await fetch("/api/v1/tokens", { credentials: "include" });
      return r.ok;
    });
    expect(keepaliveOk).toBe(true);

    // Restore the fixture password so the next test / run starts
    // from a known baseline. The current session (rotated above) is
    // authorised to roll alice back.
    await page.getByRole("button", { name: "alice" }).click();
    await page.getByRole("menuitem", { name: "Change password" }).click();
    const modal2 = page.getByRole("dialog");
    await modal2.locator('input[name="currentPassword"]').fill("new-password-1");
    await modal2.locator('input[name="newPassword"]').fill(FIXTURE_PASSWORD);
    await modal2
      .locator('input[name="confirmPassword"]')
      .fill(FIXTURE_PASSWORD);
    await modal2.getByRole("button", { name: "Change password" }).click();
    await expect(modal2).toBeHidden();
  });

  test("wrong current → inline error, session stays alive", async ({ page }) => {
    await page.goto("/");
    await login(page, "alice");

    await page.getByRole("button", { name: "alice" }).click();
    await page.getByRole("menuitem", { name: "Change password" }).click();
    const modal = page.getByRole("dialog");

    await modal.locator('input[name="currentPassword"]').fill("not-the-password");
    await modal.locator('input[name="newPassword"]').fill("new-password-1");
    await modal.locator('input[name="confirmPassword"]').fill("new-password-1");
    await modal.getByRole("button", { name: "Change password" }).click();

    // Inline error appears + the modal stays open.
    await expect(modal.getByRole("alert")).toContainText(
      /current password is incorrect/i
    );
    await expect(modal).toBeVisible();

    // Session still alive — close the modal and verify alice is still
    // the user-menu owner.
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("button", { name: "alice" })).toBeVisible();
  });
});
