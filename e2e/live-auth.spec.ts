import { test, expect, type Page } from "@playwright/test";

const livePhone = process.env.AGROMAN_LIVE_TEST_PHONE;
const liveCode = process.env.AGROMAN_LIVE_TEST_CODE;

async function removeLiveRecord(page: Page) {
  const records = page.getByRole("button", { name: "My Farm Diary", exact: true });
  if (await records.isVisible().catch(() => false)) await records.click();
  const remove = page.getByRole("button", { name: "Delete my farm record" });
  const emptyProfile = page.getByRole("heading", { name: "Create your farmer profile" });
  await expect(emptyProfile.or(remove)).toBeVisible({ timeout: 20000 });
  if (await emptyProfile.isVisible()) return;
  await remove.click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(emptyProfile).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled({ timeout: 20000 });
}

test("live fictional farmer records persist and reviewer access is denied", async ({ page }) => {
  test.skip(!livePhone || !liveCode, "Live Firebase test credentials are not configured.");
  test.setTimeout(90000);

  // The test-mode frontend disables app verification only for this localhost
  // route. Firebase still validates the fictional phone/code and issues a real
  // project token, which the live Worker verifies before loading records.
  await page.addInitScript(() => localStorage.setItem("agroman-language-chosen", "yes"));
  await page.goto("http://127.0.0.1:5173/?live-auth-test=1");
  await page.getByRole("button", { name: "Farmer login / sign up", exact: true }).first().click();
  await page.getByRole("button", { name: /Continue with phone/ }).click();
  await page.getByLabel("Phone number with country code").fill(livePhone!);
  await page.getByRole("button", { name: "Send test code" }).click();
  await page.getByLabel("Six-digit code").fill(liveCode!);
  await page.getByRole("button", { name: "Confirm code" }).click();

  await expect(page.getByRole("button", { name: "Return to entry and switch account" })).toHaveText("Verified farmer", { timeout: 20000 });
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Farm advisor", exact: true }).click();
  await expect(page.getByText("Observation date: 2026-09-15")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/OpenLandMap modeled surface pH/)).toBeVisible();
  await page.getByRole("button", { name: "Community watch", exact: true }).click();
  await expect(page.getByRole("img", { name: "Geographic district view for Ludhiana" })).toBeVisible();
  await expect(page.locator("path.district-boundary")).toBeVisible();
  await page.getByRole("button", { name: "My Farm Diary", exact: true }).click();
  await expect(page.getByRole("button", { name: "Return to entry and switch account" })).toHaveText("Verified farmer");
  await removeLiveRecord(page);
  await expect(page.getByRole("heading", { name: "Create your farmer profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled({ timeout: 20000 });
  try {
    await page.getByLabel("Farmer name (optional)").fill("Automated verification");
    await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Odisha");
    await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Kataka");
    await page.getByLabel("Most recent crop (optional)").selectOption("RICE");
    await page.getByLabel("Most recent harvest date (optional)").fill("2026-05-20");
    const profileResponse = page.waitForResponse(
      (response) => response.url().endsWith("/v1/profile") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save profile" }).click();
    const savedProfile = await profileResponse;
    expect(savedProfile.status(), await savedProfile.text()).toBe(200);
    await expect(page.getByRole("heading", { name: "Your farm, season by season." })).toBeVisible({ timeout: 20000 });

    await page.getByLabel("Plot name").fill("Verification plot");
    await page.getByLabel("Area", { exact: true }).fill("0.5");
    await page.getByRole("button", { name: "Create plot" }).click();
    const startCycle = page.getByRole("button", { name: "Start cycle" });
    await expect(startCycle).toBeEnabled({ timeout: 20000 });
    await startCycle.click();
    await expect(page.getByText("Active crop cycle: Rice")).toBeVisible({ timeout: 20000 });

    await page.getByLabel("Farmer-entered product or material name").fill("Verification compost");
    await page.getByLabel("Recorded quantity").fill("20");
    await page.getByLabel("Farmer-entered purpose").fill("Automated persistence check");
    await page.getByRole("button", { name: "Save input record" }).click();
    await expect(page.getByText("Verification compost")).toBeVisible({ timeout: 20000 });

    await page.getByLabel("Recorded yield").fill("10");
    await page.getByRole("button", { name: "Save harvest record" }).click();
    await expect(page.getByText(/Recorded yield: 10 Quintal/)).toBeVisible({ timeout: 20000 });

    await page.reload();
    await page.getByRole("button", { name: "My Farm Diary", exact: true }).click();
    await expect(page.getByText("Automated verification")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Verification plot/ })).toBeVisible();
    await expect(page.getByText("Active crop cycle: Rice")).toBeVisible();
    await expect(page.getByText("Verification compost")).toBeVisible();
    await expect(page.getByText(/Recorded yield: 10 Quintal/)).toBeVisible();

    await page.getByRole("button", { name: "Expert review" }).click();
    await expect(page.getByRole("heading", { name: "Review crop-health cases." })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Reviewer access required.", { timeout: 20000 });
    await expect(page.getByText("No cases are waiting for review.")).toHaveCount(0);
  } finally {
    await removeLiveRecord(page);
  }
});
