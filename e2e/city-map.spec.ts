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

test("Haldwani sample and subsequently added observation have tappable, counted map markers", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
  await page.goto("/e2e/fixtures/city-map.html");
  await page.getByRole("button", { name: "Preview example signals" }).click();
  await expect(page.locator(".signal-marker")).toHaveCount(1);
  await expect(page.locator(".signal-marker-count")).toHaveText("4");
  await page.locator(".signal-marker").click();
  await expect(page.locator(".leaflet-popup-content")).toContainText("Leaf concern · sample");
  await expect(page.locator(".leaflet-popup-content")).toContainText("Synthetic");
  await page.getByRole("button", { name: "Show on map", exact: true }).click();
  await expect(page.locator(".signal-marker")).toHaveCount(2);
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
  await expect(page.locator(".leaflet-popup-content")).toContainText("Test observation");
  await expect(page.locator(".leaflet-popup-content")).toContainText("Contributed observation · unverified");
  await page.getByRole("button", { name: "Show all signals" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
