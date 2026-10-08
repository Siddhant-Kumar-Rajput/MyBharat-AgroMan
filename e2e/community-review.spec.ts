import { test, expect } from "@playwright/test";

const tile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
test("expert publishes a sourced risk and later resolves it on the same city map", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: tile }),
  );
  await page.goto("/e2e/fixtures/community-review.html");
  await expect(page.locator(".signal-marker.pending")).toHaveCount(1);
  await page.getByText("Review this issue", { exact: true }).click();
  await page
    .getByLabel("Risk assessment", { exact: true })
    .selectOption("spreading");
  await page
    .getByLabel("Public assessment summary")
    .fill("Synthetic expert finding for the test journey.");
  await page
    .getByLabel("Prevention advice", { exact: true })
    .fill("Synthetic prevention step.");
  await page
    .getByLabel("Authoritative source URL")
    .fill("https://example.test/guidance");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publish review to the map" }).click();
  await expect(page.locator(".signal-marker.hazard")).toHaveCount(1);
  await expect(
    page.getByText(
      "Review published. Community Watch will show the updated assessment.",
    ),
  ).toBeVisible();
  await page.locator(".signal-marker").click();
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
  await page.locator(".leaflet-popup-content summary").click();
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "Synthetic expert finding",
  );
  await expect(page.locator(".leaflet-popup-content a")).toHaveAttribute(
    "href",
    "https://example.test/guidance",
  );
  await page.getByRole("button", { name: "Reviewed issues (1)" }).click();
  await page.getByText("Update assessment", { exact: true }).click();
  await page
    .getByLabel("Risk assessment", { exact: true })
    .selectOption("resolved");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publish review to the map" }).click();
  await expect(page.locator(".signal-marker.cleared")).toHaveCount(1);
  await expect(page.locator(".signal-marker.hazard")).toHaveCount(0);
  await page.locator(".signal-marker").click();
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(1);
  await page.locator(".leaflet-popup-content summary").click();
  await expect(page.locator(".leaflet-popup-content")).toContainText("Expert reviewed · resolved");
  await expect.poll(async () => {
    const popup = await page.locator(".leaflet-popup").boundingBox();
    const frame = await page.locator(".city-map-frame").boundingBox();
    return Boolean(popup && frame && popup.y >= frame.y && popup.y + popup.height <= frame.y + frame.height);
  }).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("community-reviewed.png"),
    fullPage: true,
  });
});

test("Hindi reviewer form and map fit a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: tile }),
  );
  await page.goto("/e2e/fixtures/community-review.html?lang=hi");
  await page.locator(".community-review-editor summary").click();
  await expect(page.locator(".review-form")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("community-review-hindi.png"),
    fullPage: true,
  });
});
