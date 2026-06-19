import { type Page, expect } from "@playwright/test";

import { FIXTURE_PASSWORD } from "../fixtures/data.js";

// Open the login modal from the top-right user-menu icon and submit
// the form. Used by tests that need a logged-in starting state.
// Assumes the SPA is already loaded and `lang` defaults to English.
export const login = async (page: Page, userId: string): Promise<void> => {
  await page.getByRole("button", { name: "Login" }).first().click();
  const modal = page.getByRole("dialog");
  await modal.locator('input[name="userId"]').fill(userId);
  await modal.locator('input[name="password"]').fill(FIXTURE_PASSWORD);
  const loginRequest = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/tokens") && r.request().method() === "POST"
  );
  await modal.getByRole("button", { name: "Login" }).click();
  const response = await loginRequest;
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`POST /api/v1/tokens failed: ${response.status()} ${body}`);
  }
  // After successful login the dialog closes and the user-menu icon's
  // aria-label switches from "Login" to the user id.
  await expect(modal).toBeHidden();
  await expect(page.getByRole("button", { name: userId })).toBeVisible();
};

// Open the user menu (logged-in state) and click a menu item by its
// text. Closes itself after the click — the menu's onClick handlers
// all set isOpen=false.
export const userMenuClick = async (
  page: Page,
  userId: string,
  itemText: string | RegExp
): Promise<void> => {
  await page.getByRole("button", { name: userId }).click();
  await page.getByRole("menuitem", { name: itemText }).click();
};
