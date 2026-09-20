import { test, expect } from "@playwright/test";

import { login } from "./helpers.js";

// The admin photo drawer: its overview and read-only sections are
// components of their own, the editable sections share the form.
test.describe("admin photo drawer", () => {
  test("shows the photo, and saves an edited title and visibility", async ({ page }) => {
    await page.goto("/");
    await login(page, "admin");
    await page.goto("/m/photos/alpha-tokyo.jpg");

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    // Overview: the thumbnail hero and the gallery the photo is in.
    await expect(drawer.locator('img[src*="thumbnail/alpha-tokyo.jpg"]').first()).toBeVisible();
    await expect(drawer.getByText("Alpha gallery").first()).toBeVisible();
    // Read-only section: the id and the capture timestamp.
    await expect(drawer.getByText("System (converter-owned)")).toBeVisible();
    await expect(drawer.getByText("2024-05-04 13:13:03")).toBeVisible();

    const title = drawer.getByLabel("Title (en)");
    await title.fill("Shibuya crossing");
    await drawer.getByLabel("Private", { exact: true }).check();

    const saved = page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/photos/alpha-tokyo.jpg") && r.request().method() === "PUT"
    );
    await drawer.getByRole("button", { name: "Save" }).click();
    const response = await saved;
    expect(response.status()).toBe(204);
    expect(response.request().postDataJSON()).toEqual({
      title: "Shibuya crossing",
      isPrivate: true,
    });

    const stored = await page.request.get("/api/v1/photos/alpha-tokyo.jpg");
    const photo = await stored.json();
    expect(photo.title).toBe("Shibuya crossing");
    expect(photo.isPrivate).toBe(true);
  });
});
