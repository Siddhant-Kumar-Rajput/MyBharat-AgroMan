import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("agroman-language-chosen", "yes");
    localStorage.setItem("agroman-locale", "en");
  });
});

test("shared header keeps its height, width and padding across all footer pages", async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const dimensions = () => page.locator(".site-header").evaluate((header) => {
      const rect = header.getBoundingClientRect();
      const style = getComputedStyle(header);
      return { x: rect.x, width: rect.width, height: rect.height, padding: style.padding };
    });
    const expected = await dimensions();
    expect(expected.height).toBe(width <= 860 ? 72 : 82);
    expect(expected.width).toBe(width);
    for (const path of ["/terms", "/privacy", "/data-and-consent", "/features", "/about", "/creator"]) {
      await page.goto(path);
      await expect(page.locator(".info-hero h1")).toBeVisible();
      expect(await dimensions(), `${path} at ${width}px`).toEqual(expected);
      await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator(".site-footer").evaluate((footer) => getComputedStyle(footer).display)).toBe("grid");
    }
  }
});

test("every farmer-story chapter fits narrow screens without clipping fields or controls", async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [320, 390, 768]) {
    for (const locale of ["en", "hi"]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      if (locale === "hi") await page.getByLabel("Language", { exact: true }).selectOption("hi");
      await page.locator(".entry-story-link").click();
      await expect(page.locator(".story-chapter")).toBeVisible();
      expect(await page.locator(".site-header").evaluate((header) => header.getBoundingClientRect().width)).toBe(width);
      for (let chapter = 0; chapter < 6; chapter++) {
        await page.locator(".story-timeline button").nth(chapter).click();
        await expect(page.locator(".story-autofill-row")).toHaveCount(3);
        // Inspect actual descendant bounds, not just the body's hidden overflow.
        const problems = await page.locator(".story-chapter").evaluate((root) => [...root.querySelectorAll("h2, .story-autofill-row, .story-autofill-row strong, .story-result, .story-controls button")].filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.left < -1 || rect.right > innerWidth + 1;
        }).map((item) => item.className));
        expect(problems, `${width}px ${locale} chapter ${chapter}`).toEqual([]);
        expect(await page.locator(".story-chapter").evaluate((chapter) => chapter.scrollWidth <= chapter.clientWidth)).toBe(true);
      }
    }
  }
});
