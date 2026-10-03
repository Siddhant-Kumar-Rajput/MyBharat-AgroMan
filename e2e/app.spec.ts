import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("agroman-language-chosen", "yes"));
});

async function enterAsGuest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as guest", exact: true }).first().click();
}

async function openNavigationItem(page: Page, name: string) {
  const item = page.getByRole("button", { name, exact: true });
  if (!(await item.isVisible())) await page.getByRole("button", { name: "Toggle navigation" }).click();
  await item.click();
}

test("landing separates limited guest access from Google farmer sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Understand every season/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with phone/ })).toHaveCount(0);
  await enterAsGuest(page);
  await expect(page.getByRole("heading", { name: "Let’s talk about your land." })).toBeVisible();
  await expect(page.getByRole("button", { name: "My Farm Diary", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Overview", exact: true })).toHaveCount(0);
});

test("farmer dashboard manages profile preview and signs out cleanly", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).first().click();
  await page.getByLabel("Farmer name (optional)").fill("Ananya Farmer");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Odisha");
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Kataka");
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    canvas.getContext("2d")!.fillRect(0, 0, 24, 24);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('.profile-card input[type="file"]').setInputFiles({
    name: "farmer.png",
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  });
  await expect(page.getByAltText("Farmer profile preview")).toBeVisible();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Understand every season/ })).toBeVisible();
});

test("photo consent contributes metadata without persisting photo data", async ({
  page,
}) => {
  await enterAsGuest(page);
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#476333";
    ctx.fillRect(0, 0, 32, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const png = Buffer.from(encoded, "base64");
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "leaf.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Selected plant")).toBeVisible();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Leaf blight (example)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Contribute anonymous observation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Agree and contribute" }).click();
  await expect(
    page.getByRole("button", { name: "Observation contributed" }),
  ).toBeDisabled();
  const localData = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("agroman-demo");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const result = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction("local").objectStore("local").get("threads");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return JSON.stringify(result);
  });
  expect(localData).not.toContain("data:image");
  expect(localData).not.toContain("base64");
});
test("a thread stops accepting questions after eighteen turns", async ({
  page,
}) => {
  test.setTimeout(60000);
  await enterAsGuest(page);
  for (let i = 0; i < 18; i++) {
    await page.getByRole("textbox").fill(`Question ${i + 1}`);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page.getByText("Demonstration response for Ludhiana"),
    ).toHaveCount(i + 1);
  }
  await expect(page.getByRole("textbox")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page.getByRole("textbox")).toBeEnabled();
});
test("advisory persists a conversation after reload", async ({ page }) => {
  await enterAsGuest(page);
  await page.getByRole("textbox").fill("I harvested rice two weeks ago.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Demonstration response for Ludhiana"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Demonstration response for Ludhiana"),
  ).toBeVisible();
});
test("guest community view exposes only labeled aggregate demo signals", async ({
  page,
}) => {
  await enterAsGuest(page);
  await openNavigationItem(page, "Community watch");
  await expect(page.getByText("Synthetic demonstration reports")).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Geographic district view for Ludhiana",
    }),
  ).toBeVisible();
  await expect(page.locator(".geo-marker")).toHaveCount(1);
  await expect(
    page.getByText("Potential outbreak", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Authority view" })).toHaveCount(0);
});
test("language coverage is honest and layout fits the viewport", async ({
  page,
}) => {
  await enterAsGuest(page);
  await page.getByLabel("Language", { exact: true }).selectOption("pa");
  await expect(
    page.getByText(
      "This language needs the cloud translation service. English is shown until it is connected.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("farmer can build and export a phase two farm record", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await openNavigationItem(page, "My Farm Diary");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Odisha");
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Kataka");
  await page.getByLabel("Most recent crop (optional)").selectOption("RICE");
  await page.getByLabel("Most recent harvest date (optional)").fill("2026-05-20");
  await page.getByRole("button", { name: "Save profile" }).click();

  await page.getByLabel("Plot name").fill("North field");
  await page.getByLabel("Area", { exact: true }).fill("2.5");
  await page.getByRole("button", { name: "Create plot" }).click();
  await expect(page.getByRole("button", { name: /North field/ })).toBeVisible();

  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(page.getByText("Active crop cycle: Rice")).toBeVisible();
  await page.getByLabel("Activity title").fill("First irrigation");
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText("First irrigation")).toBeVisible();

  await page.getByLabel("Farmer-entered product or material name").fill("Recorded compost");
  await page.getByLabel("Recorded quantity").fill("25");
  await page.getByLabel("Farmer-entered purpose").fill("Soil preparation record");
  await page.getByRole("button", { name: "Save input record" }).click();
  await expect(page.getByText("Recorded compost")).toBeVisible();
  await expect(page.getByText(/25 Kilogram/)).toBeVisible();

  await page.getByLabel("Recorded yield").fill("18");
  await page.getByRole("button", { name: "Save harvest record" }).click();
  await expect(page.getByText(/Recorded yield: 18 Quintal/)).toBeVisible();

  await page.getByLabel("Amount in rupees").fill("1250.50");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("₹1,250.5")).toBeVisible();

  await page.getByRole("button", { name: "Create labelled example case" }).click();
  await expect(page.getByText("Model score, not diagnostic certainty or probability of a cure.").first()).toBeVisible();
  await expect(page.getByText(/AGM-DEMO-/)).toBeVisible();
  await expect(page.getByText("155333 · Odisha")).toBeVisible();

  await page.getByRole("button", { name: "Expert review" }).click();
  await expect(page.getByText("AI-assisted pre-review")).toBeVisible();
  await expect(page.getByText("Priority review")).toBeVisible();
  await page.getByLabel("Reviewer remedy summary").fill("Review the affected plants and continue field monitoring.");
  await page.getByLabel("Monitoring steps").fill("Check spread daily");
  await page.getByLabel("Non-chemical steps").fill("Separate badly affected plant material");
  await page.getByLabel("Authoritative source URL").fill("https://icar.gov.in/");
  await page.getByRole("button", { name: "Approve sourced guidance" }).click();
  await expect(page.getByText("No cases are waiting for review.")).toBeVisible();
  const farmRecordsNav = page.getByRole("button", { name: "My Farm Diary", exact: true });
  if (!(await farmRecordsNav.isVisible())) await page.getByRole("button", { name: "Toggle navigation" }).click();
  await farmRecordsNav.click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  expect((await download).suggestedFilename()).toBe("agroman-farm-record.json");

  await page.getByRole("button", { name: "Delete my farm record" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("This permanently removes your profile");
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("heading", { name: "Create your farmer profile" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Your farm record was deleted.");
});

test("Hindi read aloud loads the on-device fallback", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  test.setTimeout(60000);
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      configurable: true,
      value: () => [],
    });
    const createBuffer = AudioContext.prototype.createBuffer;
    AudioContext.prototype.createBuffer = function (
      channels,
      length,
      sampleRate,
    ) {
      (
        window as Window &
          typeof globalThis & { __agromanSpeechSeconds?: number }
      ).__agromanSpeechSeconds = length / sampleRate;
      return createBuffer.call(this, channels, length, sampleRate);
    };
  });
  await enterAsGuest(page);
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await page.getByRole("textbox").fill("मेरी फसल की देखभाल कैसे करूँ?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Demonstration response for Ludhiana"),
  ).toBeVisible();
  const dataRequest = page.waitForResponse(
    (response) => response.url().endsWith("/espeak/espeak-ng.data"),
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: "Read aloud" }).click();
  expect((await dataRequest).ok()).toBe(true);
  await expect(page.getByText("Preparing voice…")).toHaveCount(0, {
    timeout: 45000,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window &
              typeof globalThis & { __agromanSpeechSeconds?: number }
          ).__agromanSpeechSeconds ?? 0,
      ),
    )
    .toBeGreaterThan(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
