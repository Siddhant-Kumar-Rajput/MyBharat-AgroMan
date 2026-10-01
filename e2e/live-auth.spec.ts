import { test, expect } from "@playwright/test";

const livePhone = process.env.AGROMAN_LIVE_TEST_PHONE;
const liveCode = process.env.AGROMAN_LIVE_TEST_CODE;

test("live fictional phone reaches the phone-verified farmer profile", async ({ page }) => {
  test.skip(!livePhone || !liveCode, "Live Firebase test credentials are not configured.");
  test.setTimeout(60000);

  // The test-mode frontend disables app verification only for this localhost
  // route. Firebase still validates the fictional phone/code and issues a real
  // project token, which the live Worker verifies before loading records.
  await page.goto("http://127.0.0.1:5173/?live-auth-test=1");
  await page.getByRole("button", { name: "Farmer login / sign up", exact: true }).first().click();
  await page.getByRole("button", { name: /Continue with phone/ }).click();
  await page.getByLabel("Phone number with country code").fill(livePhone!);
  await page.getByRole("button", { name: "Send test code" }).click();
  await page.getByLabel("Six-digit code").fill(liveCode!);
  await page.getByRole("button", { name: "Confirm code" }).click();

  await expect(page.getByRole("heading", { name: "Create your farmer profile" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
});
