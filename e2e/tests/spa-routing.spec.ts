import { test, expect } from "@playwright/test";

import { login } from "./helpers.js";

test.describe("non-existent gallery", () => {
  test("/g/<unknown> renders an empty view with a link back to home", async ({
    page,
  }) => {
    await page.goto("/");
    await login(page, "alice");

    await page.goto("/g/nonexistent");

    // The SPA's Gallery component falls through to <Empty> when no
    // accessible gallery matches the URL. Empty surfaces an "Empty"
    // label inside its title bar and the breadcrumb / Home icon link
    // back out. The exact copy is en-only here (the fixture doesn't
    // set instance_defaultLanguage so the SPA defaults to en); the
    // assertion lives on the link's text contents which the Empty
    // component derives from the gallery model, not from a
    // translation key.
    await expect(page.getByText("Empty").first()).toBeVisible();

    // A Home link is reachable from the empty state (this was the
    // #251 regression — the empty view used to dead-end on private
    // galleries without an out).
    const homeLink = page
      .getByRole("link")
      .or(page.getByRole("button"))
      .filter({ has: page.locator("svg") })
      .first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe("language persistence", () => {
  test("switching language persists across a reload", async ({ page }) => {
    await page.goto("/");

    // Pick Finnish from the top-of-page radio group. The radio is
    // visually hidden (opacity:0); use the label text as the click
    // target.
    await page.getByText("Suomi", { exact: true }).click();

    // Wait for the SPA to reflect the change. The Login button's text
    // would have switched from English ("Login") to Finnish
    // ("Kirjaudu sisään") — that's the cheapest assertion that the
    // i18n bundle actually swapped.
    await expect(
      page.getByRole("radio", { name: "Suomi" })
    ).toBeChecked();
    await expect(page.getByRole("button", { name: /Kirjaudu/i })).toBeVisible();

    // Reload. The language selection lives in localStorage["lang"]
    // and rehydrates on bundle load.
    await page.reload();
    await expect(
      page.getByRole("radio", { name: "Suomi" })
    ).toBeChecked();
    await expect(page.getByRole("button", { name: /Kirjaudu/i })).toBeVisible();
  });
});
