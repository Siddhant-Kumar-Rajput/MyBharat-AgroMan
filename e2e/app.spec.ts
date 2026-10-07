import { test, expect, type Page } from "@playwright/test";
import { hindi } from "../src/lib/hi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("agroman-language-chosen", "yes"));
});

async function enterAsGuest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as guest", exact: true }).first().click();
}

async function openNavigationItem(page: Page, name: string) {
  const matching = page.getByRole("button", { name, exact: true });
  let visibleIndex = -1;
  for (let index = 0; index < await matching.count(); index += 1) {
    if (await matching.nth(index).isVisible()) {
      visibleIndex = index;
      break;
    }
  }
  if (visibleIndex < 0) {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    for (let index = 0; index < await matching.count(); index += 1) {
      if (await matching.nth(index).isVisible()) {
        visibleIndex = index;
        break;
      }
    }
  }
  expect(visibleIndex, `A visible navigation button named ${name}`).toBeGreaterThanOrEqual(0);
  await matching.nth(visibleIndex).click();
}
async function openDiarySection(page: Page, name: string) {
  await page.getByRole("button", { name: "Diary sections", exact: true }).click();
  await page.locator("#diary-workspace-menu").getByRole("button", { name, exact: true }).click();
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

test("browser back returns to the previous in-app page and information routes load directly", async ({ page }) => {
  await enterAsGuest(page);
  await expect(page).toHaveURL(/\/advisor$/);
  await openNavigationItem(page, "Community watch");
  await expect(page).toHaveURL(/\/community$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/advisor$/);
  await expect(page.getByRole("heading", { name: "Let’s talk about your land." })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
});

test("mobile-safe landing and farmer story keep copy separated inside the shared shell", async ({ page }) => {
  await page.goto("/");
  const story = page.getByRole("button", { name: /View the farmer story/ });
  const consent = page.getByText(/Guest access stays anonymous/);
  const storyBox = await story.boundingBox();
  const consentBox = await consent.boundingBox();
  expect(storyBox).not.toBeNull();
  expect(consentBox).not.toBeNull();
  expect(storyBox!.y + storyBox!.height).toBeLessThanOrEqual(consentBox!.y);
  const languageOptions = await page.getByLabel("Language").first().locator("option").evaluateAll((options) => options.slice(0, 2).map((option) => option.getAttribute("value")));
  expect(languageOptions).toEqual(["en", "hi"]);
  await story.click();
  await expect(page.getByRole("button", { name: "Go to home or overview" })).toBeVisible();
  await expect(page.getByLabel("Diary fields filled during the demonstration")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await page.getByRole("button", { name: "Toggle navigation" }).click();
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
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await openNavigationItem(page, "My Farm Diary");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Odisha");
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Kataka");
  await page.getByRole("button", { name: "Save profile" }).click();
  await openDiarySection(page, "Set up farm");

  await page.getByLabel("Plot name").fill("North field");
  await page.getByLabel("Area", { exact: true }).fill("2.5");
  await page.getByRole("button", { name: "Create plot" }).click();
  await expect(page.getByRole("button", { name: /North field/ })).toBeVisible();

  await page.getByRole("button", { name: "Start cycle" }).click();
  await openDiarySection(page, "Add activity");
  await expect(page.getByText("Active crop cycle: Rice")).toBeVisible();
  await page.getByLabel("Activity title").fill("First irrigation");
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText("First irrigation")).toBeVisible();

  await openDiarySection(page, "My inputs");
  await page.getByLabel("Farmer-entered product or material name").fill("Recorded compost");
  await page.getByLabel("Recorded quantity").fill("25");
  await page.getByLabel("Farmer-entered purpose").fill("Soil preparation record");
  await page.getByRole("button", { name: "Save input record" }).click();
  await expect(page.getByText("Recorded compost")).toBeVisible();
  await expect(page.getByText(/25 Kilogram/)).toBeVisible();

  await openDiarySection(page, "My harvests");
  await page.getByLabel("Recorded yield").fill("18");
  await page.getByRole("button", { name: "Save harvest record" }).click();
  await expect(page.getByText(/Recorded yield: 18 Quintal/)).toBeVisible();

  await openDiarySection(page, "My finances");
  await page.getByLabel("Amount in rupees").fill("1250.50");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("₹1,250.5")).toBeVisible();

  await openDiarySection(page, "Crop health");
  await page.getByRole("button", { name: "Create labelled example case" }).click();
  await expect(page.getByText("Model score, not diagnostic certainty or probability of a cure.").first()).toBeVisible();
  await expect(page.getByText(/AGM-DEMO-/)).toBeVisible();
  await openDiarySection(page, "Records");
  await expect(page.getByText("155333 · Odisha")).toBeVisible();

  await openNavigationItem(page, "Expert review");
  await expect(page.getByText("AI-assisted pre-review")).toBeVisible();
  await expect(page.getByText("Priority review")).toBeVisible();
  await page.getByLabel("Reviewer remedy summary").fill("Review the affected plants and continue field monitoring.");
  await page.getByLabel("Monitoring steps").fill("Check spread daily");
  await page.getByLabel("Non-chemical steps").fill("Separate badly affected plant material");
  await page.getByLabel("Authoritative source URL").fill("https://icar.gov.in/");
  await page.getByRole("button", { name: "Approve sourced guidance" }).click();
  await expect(page.getByText("No cases are waiting for review.")).toBeVisible();
  await openNavigationItem(page, "My Farm Diary");
  await openDiarySection(page, "Records");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  expect((await download).suggestedFilename()).toBe("agroman-farm-record.json");

  await page.getByRole("button", { name: "Delete my farm record" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("This permanently removes your profile");
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("heading", { name: "Create your farmer profile" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Your farm record was deleted.");
});

test("minimal field setup computes an outlook and supports one-tap work", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).first().click();
  await openNavigationItem(page, "My Farm Advisor");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Punjab");
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Ludhiana");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByLabel("How much land is in this field?").fill("2");
  await page.getByLabel("Can you water the crop when rain is not enough?").selectOption("supplemental");
  await page.getByLabel("What did you last harvest?").selectOption("RICE");
  await page.getByLabel("Most recent harvest date (optional)").fill("2026-01-01");
  await page.getByLabel("How much did you harvest?").fill("18");
  await page.getByRole("button", { name: "Save and calculate my outlook" }).click();
  await expect(page.getByRole("heading", { name: "What the weather suggests" })).toBeVisible();
  await expect(page.locator(".field-metrics")).toContainText("2.22");
  await expect(page.getByLabel("Plot name")).toHaveCount(0);
  await expect(page.getByText("No authorized, dated soil report is connected", { exact: false })).toHaveCount(1);
  await page.getByRole("button", { name: "I have sown a crop" }).click();
  await page.getByLabel("When did you sow this crop?").fill("2026-01-10");
  await page.getByRole("button", { name: "Start this crop record" }).click();
  await expect(page.getByRole("heading", { name: "What did you do today?" })).toBeVisible();
  await page.getByRole("button", { name: /Watered the crop/ }).click();
  await expect(page.getByRole("button", { name: /Watered the crop.*Recorded today/ })).toBeDisabled();
  await page.getByRole("button", { name: /Removed weeds/ }).click();
  await expect(page.getByRole("button", { name: /Removed weeds.*Recorded today/ })).toBeDisabled();
  await page.getByText("Recent field work", { exact: true }).click();
  await expect(page.locator(".field-timeline li")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /Watered the crop.*Recorded today/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("field-outlook.png"), fullPage: true });
  await page.getByRole("button", { name: "The crop is harvested" }).click();
  await page.getByLabel("Harvest date", { exact: true }).fill("2026-09-01");
  await page.getByLabel("How much did you harvest?").fill("20");
  await page.getByRole("button", { name: "Save harvest and finish this crop" }).click();
  await expect(page.getByRole("heading", { name: "Explore your next crop" })).toBeVisible();
  await expect(page.locator(".field-metrics")).toContainText("2.47");
  await expect(page.getByRole("heading", { name: "What did you do today?" })).toHaveCount(0);
});

test("Hindi UI loads without a translation service or stale catalog", async ({ page }) => {
  let providerRequested = false;
  await page.addInitScript(() => localStorage.setItem("agroman-ui-copy-v2-hi", JSON.stringify({ chatTitle: "Old incomplete catalog" })));
  await page.route("**/v1/translate/ui", (route) => { providerRequested = true; return route.abort(); });
  await enterAsGuest(page);
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await expect(page.getByRole("heading", { name: hindi.chatTitle })).toBeVisible();
  expect(providerRequested).toBe(false);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await page.getByRole("button", { name: hindi.send, exact: true }).click();
  await expect(
    page.getByText("Demonstration response for Ludhiana"),
  ).toBeVisible();
  const dataRequest = page.waitForResponse(
    (response) => response.url().endsWith("/espeak/espeak-ng.data"),
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: hindi.listen }).click();
  expect((await dataRequest).ok()).toBe(true);
  await expect(page.getByText(hindi.voiceLoading)).toHaveCount(0, {
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
