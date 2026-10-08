import { test, expect } from "@playwright/test";
import { hindi } from "../src/lib/hi";
import { english } from "../src/lib/i18n";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("agroman-language-chosen", "yes"),
  );
});

test("long-script landing headlines wrap inside the mobile content column", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((source) => {
    localStorage.setItem("agroman-locale", "ta");
    localStorage.setItem("agroman-ui-copy-v6-ta", JSON.stringify({ source, copy: { ...source, entryHeadlineA: "ஒவ்வொரு பருவத்தையும் புரிந்துகொள்ளுங்கள்", entryHeadlineB: "ஒவ்வொரு பதிவையும் சொந்தமாக்குங்கள்" } }));
  }, english);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  expect(await page.locator(".entry-hero h1").evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(node);
    return [...range.getClientRects()].every((rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1);
  })).toBe(true);
});

test("visitor menu information links match action typography and the tour is replayable on policy pages", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of ["/", "/privacy"]) {
    await page.goto(route);
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    const metrics = await page
      .locator(".site-menu-information a, .site-menu nav button")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          font: getComputedStyle(node).fontFamily,
          size: getComputedStyle(node).fontSize,
          height: node.getBoundingClientRect().height,
          right: node.getBoundingClientRect().right,
        })),
      );
    expect(new Set(metrics.map((node) => node.font)).size).toBe(1);
    expect(new Set(metrics.map((node) => node.size))).toEqual(
      new Set(["14px"]),
    );
    for (const node of metrics) {
      expect(node.height).toBeGreaterThanOrEqual(44);
      expect(node.right).toBeLessThanOrEqual(320);
    }
    await page
      .locator(".site-menu")
      .getByRole("button", { name: "Quick tour", exact: true })
      .click();
    const tour = page.getByRole("dialog", {
      name: "Ask without a profile",
      exact: true,
    });
    await expect(tour).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close tour", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Explore on my own", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(tour).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Toggle navigation" }),
    ).toBeFocused();
  }
  await page.screenshot({
    path: info.outputPath("visitor-menu-320.png"),
    fullPage: true,
  });
});

test("first-time farmer tour covers four destinations without writing a field and can be replayed in Hindi", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("Punjab");
  await page
    .getByRole("combobox", { name: "District", exact: true })
    .selectOption("Ludhiana");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("New here? Start with a quick tour.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".tour-welcome")
    .getByRole("button", { name: "Quick tour", exact: true })
    .click();
  for (const heading of [
    "Start with your place",
    "Let your field guide you",
    "Record a tap, not a form",
    "See your community",
  ]) {
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    const overflow = await page
      .locator(".onboarding-dialog")
      .evaluate((node) => node.scrollWidth > node.clientWidth + 1);
    expect(overflow).toBe(false);
    if (heading !== "See your community")
      await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Open my field advisor", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByLabel("How much land is in this field?"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("agroman-onboarding-v1")),
  ).toBe("done");
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await page.getByRole("button", { name: hindi.menu, exact: true }).click();
  await page
    .locator(".site-menu")
    .getByRole("button", { name: hindi.quickTour, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: hindi.tourLocationTitle, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("onboarding-hindi.png"),
    fullPage: true,
  });
});

test("superscript information stays with its label and opens a bounded panel while consent stays visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("Punjab");
  await page
    .getByRole("combobox", { name: "District", exact: true })
    .selectOption("Ludhiana");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.goto("/farm-advisor");
  await page.getByLabel("How much land is in this field?").fill("2");
  await page
    .getByRole("button", { name: "Save and calculate my outlook", exact: true })
    .click();
  const help = page.getByRole("button", {
    name: "Information about Your next-step plan",
    exact: true,
  });
  await expect(help).toHaveAttribute("aria-expanded", "false");
  const size = await help.evaluate((node) => ({ target: node.getBoundingClientRect().width, icon: node.querySelector("svg")?.getBoundingClientRect().width, background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderWidth }));
  expect(size.target).toBe(24);
  expect(size.icon).toBe(14);
  expect(size.background).toBe("rgba(0, 0, 0, 0)");
  expect(size.border).toBe("0px");
  expect(await help.evaluate((node) => {
    const anchor = node.closest(".info-hint-anchor")!;
    const range = document.createRange(); range.selectNode(anchor.firstChild!);
    const word = range.getBoundingClientRect();
    const icon = node.querySelector("svg")!.getBoundingClientRect();
    return icon.left >= word.right && icon.top < word.top + word.height / 2 && icon.bottom <= word.bottom;
  })).toBe(true);
  const button = page.getByRole("button", {
    name: "Create my next-step plan",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await help.click();
  const panel = page.getByRole("region", {
    name: "Information about Your next-step plan",
    exact: true,
  });
  await expect(
    panel.getByText(/send Google Gemini only the field area/),
  ).toBeVisible();
  await expect(panel).toBeFocused();
  expect(
    await panel.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  expect(await panel.evaluate((node) => { const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(help).toBeFocused();
  await help.click();
  await page.locator(".planning-consent").click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".planning-consent input")).toBeVisible();
  await page.locator(".planning-consent input").check();
  await expect(button).toBeEnabled();
});

test("landing motion respects reduced motion and fits narrow English and Hindi screens", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.locator(".entry-headline-line")).toHaveCount(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".entry-sunlight")).toBeHidden();
  for (const locale of ["en", "hi"]) {
    await page.locator(".site-language select").selectOption(locale);
    const bounds = await page.locator(".entry-hero h1, .entry-hero-visual, .entry-consent, .entry-story-link").evaluateAll((nodes) => nodes.map((node) => {
      const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
    }));
    expect(bounds.every(Boolean)).toBe(true);
    expect(await page.locator(".entry-headline-line").first().evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  }
  await page.screenshot({ path: info.outputPath("landing-hindi-320.png"), fullPage: true });
  await page.locator(".site-language select").selectOption("en");
  await page.screenshot({ path: info.outputPath("landing-english-320.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: info.outputPath("landing-desktop.png"), fullPage: true });
});
