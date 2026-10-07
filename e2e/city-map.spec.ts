import { test, expect } from "@playwright/test";

// Automated UI checks use local fixture tiles, never crawl the OSM tile server.
const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
test("city map renders Haldwani with attribution, usable controls and no mobile overflow", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
  await page.goto("/e2e/fixtures/city-map.html");
  await expect(page.getByRole("region", { name: "Community street map for Haldwani" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Haldwani" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenStreetMap", exact: true })).toBeVisible();
  await expect(page.locator(".city-map-status")).toHaveCount(0);
  await page.getByRole("button", { name: "Zoom map in" }).click();
  await page.getByRole("button", { name: "Back to my town" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText(/Alerts cover your saved district/)).toBeVisible();
});

test("blocked tile provider offers a retry that restores the map", async ({ page }) => {
  let fail = true;
  await page.route("https://tile.openstreetmap.org/**", (route) => fail ? route.abort() : route.fulfill({ contentType: "image/png", body: tile }));
  await page.goto("/e2e/fixtures/city-map.html");
  await expect(page.getByText(/Street-map tiles are unavailable/)).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry map" }).click();
  await expect(page.locator(".city-map-status")).toHaveCount(0);
});

test("Hindi city map keeps localized controls and provider attribution", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
  await page.goto("/e2e/fixtures/city-map.html?lang=hi");
  await expect(page.getByRole("button", { name: "मेरे शहर पर वापस जाएँ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenStreetMap", exact: true })).toBeVisible();
  await expect(page.locator(".city-map-status")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
