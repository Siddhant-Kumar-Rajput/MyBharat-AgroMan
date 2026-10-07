import { test, expect, type Page } from "@playwright/test";
import { hindi } from "../src/lib/hi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("agroman-language-chosen", "yes");
  });
});
async function navigate(page: Page, label: string) {
  const button = page
    .locator(".site-desktop-nav, .mobile-main-nav")
    .getByRole("button", { name: label, exact: true });
  for (let i = 0; i < (await button.count()); i++)
    if (await button.nth(i).isVisible()) {
      await button.nth(i).click();
      return;
    }
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .locator(".site-menu")
    .getByRole("button", { name: label, exact: true })
    .click();
}
test("visitor and footer menus expose both entry routes and information links", async ({
  page,
}) => {
  for (const path of ["/", "/privacy", "/features"]) {
    await page.goto(path);
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    const menu = page.getByRole("dialog", { name: "Main navigation" });
    await expect(
      menu.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Continue as guest", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Privacy policy", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Toggle navigation" }),
    ).toBeFocused();
  }
});
test("diary and advice are separate and secondary sections do not clutter the first view", async ({
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
  await navigate(
    page,
    info.project.name === "mobile" ? "Diary" : "My Farm Diary",
  );
  await expect(
    page.getByRole("heading", { name: "Recent work", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Plot name")).toHaveCount(0);
  await expect(page.getByLabel("Amount in rupees")).toHaveCount(0);
  await page.getByRole("button", { name: "Diary sections" }).click();
  await expect(
    page
      .locator("#diary-workspace-menu")
      .getByRole("button", { name: "My finances" }),
  ).toBeVisible();
  await page
    .locator("#diary-workspace-menu")
    .getByRole("button", { name: "My opportunities" })
    .click();
  await expect(page.getByRole("link", { name: /Find an FPO/ })).toHaveAttribute(
    "href",
    /farmerconnect.apeda.gov.in/,
  );
  await expect(page.getByText(/not an AgroMan partnership/)).toBeVisible();
  await navigate(
    page,
    info.project.name === "mobile" ? "Advice" : "My Farm Advisor",
  );
  await page.getByLabel("How much land is in this field?").fill("2");
  await page
    .getByRole("button", { name: "Save and calculate my outlook" })
    .click();
  const generate = page.getByRole("button", {
    name: "Create my next-step plan",
    exact: true,
  });
  await expect(generate).toBeDisabled();
  await page.locator(".planning-consent input").check();
  await generate.click();
  await expect(
    page.getByText("Synthetic planning preview.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".planning-result li")).toHaveCount(4);
  await expect(generate).toBeDisabled();
  for (const width of [320, 390, 768, 900, 1024, 1280]) {
    await page.setViewportSize({ width, height: 860 });
    await expect
      .poll(async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    const bounds = await page
      .locator(".site-header > *, .site-header-tools > *")
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return (
              rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1)
            );
          })
          .map((node) => node.className),
      );
    expect(bounds).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("field-advisor-390.png"),
    fullPage: true,
  });
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page
      .locator(".site-menu")
      .getByRole("button", { name: "My Farm Advisor", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".site-menu")
      .getByRole("button", { name: "Ask AgroMan", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".site-menu")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});
test("narrow Hindi navigation and diary stay inside the viewport with reduced motion", async ({
  page,
}, info) => {
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
  await page.goto("/diary");
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await page.getByRole("button", { name: hindi.diarySections }).click();
  await expect(page.locator("#diary-workspace-menu")).toBeVisible();
  const overflow = await page
    .locator(
      ".site-header, .diary-workspace-menu, .mobile-main-nav, .diary-next-action",
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return (
            rect.width > 0 &&
            (rect.left < -1 ||
              rect.right > innerWidth + 1 ||
              node.scrollWidth > node.clientWidth + 1)
          );
        })
        .map((node) => node.className),
    );
  expect(overflow).toEqual([]);
  await page.screenshot({
    path: info.outputPath("hindi-diary-320.png"),
    fullPage: true,
  });
});
