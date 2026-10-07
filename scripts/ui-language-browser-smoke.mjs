import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const site = "https://mybharat-agroman.web.app";
const file = readdirSync("dist/assets").find((name) => /^index-.*\.js$/.test(name));
const key = readFileSync(`dist/assets/${file}`, "utf8").match(/AIza[A-Za-z0-9_-]{35}/)?.[0];
assert.ok(key, "Configured public web key is required");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = await context.newPage();
let anonymousToken;
const responses = [];
let pageErrors = 0;
page.on("pageerror", () => pageErrors++);
page.on("response", (response) => {
  if (response.url().includes("identitytoolkit.googleapis.com/v1/accounts:signUp")) responses.push(response.json().then((value) => { anonymousToken = value.idToken; }));
});
try {
  await page.addInitScript(() => localStorage.setItem("agroman-language-chosen", "yes"));
  await page.goto(site, { waitUntil: "domcontentloaded" });
  const select = page.locator(".site-language select");
  for (const locale of ["ta", "pa", "bn"]) {
    await select.selectOption(locale);
    await page.waitForFunction((value) => document.documentElement.lang === value, locale, { timeout: 90000 });
    assert.equal(await page.locator(".language-failure").count(), 0);
    assert.match(await page.locator(".entry-hero h1").innerText(), /[^\x00-\x7F]/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.equal(await page.locator(".entry-hero h1").evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(node);
      return [...range.getClientRects()].every((rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1);
    }), true, "Translated headline must wrap without clipped text");
    console.log(JSON.stringify({ browserLocale: locale, nativeHeadline: true, viewportFits: true }));
  }
  await select.selectOption("en");
  await page.evaluate(() => localStorage.removeItem("agroman-ui-copy-v5-1.4.0-ta"));
  let rejectOnce = true;
  await page.route("**/v1/translate/ui", async (route) => {
    if (rejectOnce && route.request().postDataJSON()?.locale === "ta") {
      rejectOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Injected translation outage" }) });
    } else await route.continue();
  });
  await select.selectOption("ta");
  await page.locator(".language-failure").waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.locator(".language-failure button").click();
  await page.waitForFunction(() => document.documentElement.lang === "ta", undefined, { timeout: 90000 });
  assert.equal(await page.locator(".language-failure").count(), 0);
  console.log(JSON.stringify({ injectedOutage: "visible English fallback", retry: "recovered Tamil" }));
  await page.locator(".site-menu-toggle").click();
  await page.locator(".site-menu-information").waitFor();
  mkdirSync("test-results/live-language", { recursive: true });
  await page.screenshot({ path: "test-results/live-language/tamil-menu-390.png", fullPage: false });
  assert.equal(pageErrors, 0, "Browser runtime error occurred");
} finally {
  await Promise.allSettled(responses);
  await context.close(); await browser.close();
  if (anonymousToken) {
    const removed = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: anonymousToken }) });
    assert.equal(removed.ok, true, "Temporary anonymous session cleanup failed");
    console.log(JSON.stringify({ temporaryAnonymousSessionRemoved: true }));
  }
}
