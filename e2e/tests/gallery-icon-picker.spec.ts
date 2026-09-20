import { test, expect } from "@playwright/test";

import { login } from "./helpers.js";

// The gallery route carries no photos; the icon picker on the gallery
// edit form fetches them from the photo route once the form is open.
test.describe("gallery icon picker", () => {
  test("offers the gallery's photos, loaded only when editing", async ({ page }) => {
    const photoLists: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname === "/api/v1/gallery-photos/alpha") photoLists.push(request.method());
    });

    await page.goto("/");
    await login(page, "admin");
    await page.goto("/m/g/alpha");
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();

    const gallery = await page.request.get("/api/v1/galleries/alpha");
    expect(await gallery.json()).not.toHaveProperty("photos");
    expect(photoLists).toEqual([]);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByText("Pick from photos").click();
    await expect(page.getByTitle("alpha-tokyo.jpg")).toBeVisible();
    expect(photoLists).toEqual(["GET"]);
  });
});
