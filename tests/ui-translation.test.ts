import { describe, expect, it, vi } from "vitest";
import { english } from "../src/lib/i18n";
import { hindi } from "../src/lib/hi";
import { languages } from "../shared/domain";
import {
  tokens,
  uiTranslationLocales,
  validCatalog,
} from "../shared/localization";
import { translateUi } from "../worker/src/ui-translation";
import type { Env } from "../worker/src/index";

function fixture() {
  const rows = new Map<string, string>();
  const run = vi.fn(async (_model: string, input: { text: string[] }) => ({
    translations: input.text.map((text) => `தமிழ் ${text}`),
  }));
  const env = {
    FIREBASE_PROJECT_ID: crypto.randomUUID(),
    AI: { run },
    DB: {
      prepare(sql: string) {
        let args: unknown[] = [];
        return {
          bind(...values: unknown[]) {
            args = values;
            return this;
          },
          async first() {
            return rows.has(String(args[0]))
              ? { copy_json: rows.get(String(args[0])) }
              : null;
          },
          async run() {
            expect(sql).toContain("translations");
            rows.set(String(args[0]), String(args[1]));
          },
        };
      },
    },
  } as unknown as Env;
  return { env, run, rows };
}
describe("resumable static UI translation", () => {
  it("translates just requested page keys without waiting for the rest of the catalog", async () => {
    const { env, run } = fixture();
    const keys = ["entryHeadlineA", "entryHeadlineB", "continueGuest"];
    const result = await translateUi(env, "ta", true, keys);
    expect(result).toMatchObject({ status: "complete" });
    expect("copy" in result && Object.keys(result.copy)).toEqual(keys);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][1].text).toEqual(
      keys.map((key) => english[key as keyof typeof english]),
    );
    await translateUi(env, "ta", true, keys);
    expect(run).toHaveBeenCalledTimes(1);
    await expect(
      translateUi(env, "ta", true, ["private farmer text"]),
    ).rejects.toMatchObject({ status: 422 });
    await expect(translateUi(env, "ta", true, [])).rejects.toMatchObject({
      status: 422,
    });
  });
  it("covers every listed Indic locale with the provider's documented script codes", () => {
    for (const [locale] of languages)
      if (locale !== "en") expect(uiTranslationLocales).toHaveProperty(locale);
    expect(uiTranslationLocales["mni-Mtei"]).toBe("mni_Mtei");
    expect(uiTranslationLocales.sat).toBe("sat_Olck");
  });
  it("requires complete non-empty catalogs and exact interpolation tokens", () => {
    expect(validCatalog(english, english)).toBe(true);
    expect(validCatalog(english, hindi)).toBe(true);
    expect(
      validCatalog(english, {
        ...english,
        dashboardWelcome: "Namaste {translated_name}",
      }),
    ).toBe(false);
    expect(validCatalog(english, { ...english, quickTour: "" })).toBe(false);
    expect(validCatalog(english, {})).toBe(false);
  });
  it("bundles English/Hindi without AI or database calls", async () => {
    const { env, run, rows } = fixture();
    expect(await translateUi(env, "hi", true)).toEqual({
      status: "complete",
      copy: hindi,
    });
    expect(await translateUi(env, "en")).toBe(english);
    expect(run).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });
  it("limits each request, resumes progress and serves complete cached catalogs without AI", async () => {
    const { env, run } = fixture();
    const first = await translateUi(env, "ta", true);
    expect(first).toMatchObject({ status: "pending", completed: 96 });
    expect(run).toHaveBeenCalledTimes(2);
    let result = first;
    for (
      let index = 0;
      index < 16 && "status" in result && result.status !== "complete";
      index++
    )
      result = await translateUi(env, "ta", true);
    expect(result).toMatchObject({ status: "complete" });
    if ("status" in result && result.status === "complete")
      expect(validCatalog(english, result.copy)).toBe(true);
    run.mockClear();
    expect(await translateUi(env, "ta", true)).toMatchObject({
      status: "complete",
    });
    expect(run).not.toHaveBeenCalled();
  });
  it("keeps successful progress across a provider outage without fabricating a catalog", async () => {
    const { env, run, rows } = fixture();
    run
      .mockImplementationOnce(async () => ({
        translations: Object.values(english)
          .slice(0, 48)
          .map((text) => `தமிழ் ${text}`),
      }))
      .mockRejectedValueOnce(new Error("temporary provider failure"));
    await expect(translateUi(env, "ta", true)).rejects.toMatchObject({
      status: 503,
    });
    expect(rows.size).toBe(1);
    const resumed = await translateUi(env, "ta", true);
    expect(resumed).toMatchObject({ status: "pending", completed: 144 });
  });
  it("rebuilds corrupt UI cache and rejects unsupported locales", async () => {
    const { env, rows } = fixture();
    rows.set("source-safe-ui-v3:ta", "null");
    expect(await translateUi(env, "ta", true)).toMatchObject({
      status: "pending",
    });
    await expect(translateUi(env, "fictional", true)).rejects.toMatchObject({
      status: 422,
    });
  });
  it("restores translated token names and falls back to token-free fragments when braces disappear", async () => {
    const { env, run } = fixture();
    run.mockImplementation(async (_model, input) => ({
      translations: input.text.map(
        (text) => `தமிழ் ${text.replace(/\{[^}]+\}/g, "{translated}")}`,
      ),
    }));
    const result = await translateUi(env, "ta");
    if ("dashboardWelcome" in result)
      expect(tokens(result.dashboardWelcome)).toEqual(
        tokens(english.dashboardWelcome),
      );
    const second = fixture();
    second.run.mockImplementation(async (_model, input) => ({
      translations: input.text.map(
        (text) => `தமிழ் ${text.replace(/\{[^}]+\}/g, "")}`,
      ),
    }));
    const recovered = await translateUi(second.env, "ta");
    expect(validCatalog(english, recovered)).toBe(true);
  });
});
