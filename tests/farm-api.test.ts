import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import { handleFarm } from "../worker/src/farm";
import type { Env } from "../worker/src/index";
import { translateUi } from "../worker/src/ui-translation";
import { english } from "../src/lib/i18n";

let runtime: Miniflare;
let env: Env;
const id = "00000000-0000-4000-8000-000000000021";
const next = "00000000-0000-4000-8000-000000000022";
const setup = {
  id,
  area: 2,
  areaUnit: "acre",
  waterAccess: "rain_only",
  fieldState: "empty",
  previous: {
    cropCode: "RICE",
    harvestedOn: "2026-01-01",
    quantity: 18,
    unit: "quintal",
  },
};
const weatherUnavailable = async () => {
  throw new Error("Weather provider unavailable");
};
function call(subject: string, path: string, input?: unknown, query = "") {
  return handleFarm(
    new Request(
      `https://example.test/v1/${path}${query}`,
      input === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(input) },
    ),
    env,
    subject,
    path,
    weatherUnavailable,
  );
}
beforeAll(async () => {
  runtime = new Miniflare({
    workers: [
      {
        config: {
          name: "field-tests",
          compatibilityDate: "2026-09-28",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('ok'); } }",
              },
            },
          },
          env: {
            DB: { type: "d1", id: "test-fields", dev: { remote: false } },
          },
        },
      },
    ],
    telemetry: { enabled: false },
  });
  const db = await runtime.getD1Database("DB");
  for (const file of readdirSync("worker/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync(`worker/migrations/${file}`, "utf8")
      .split(";")
      .filter((sql) => sql.trim()))
      await db.prepare(statement).run();
  }
  for (const subject of ["farmer-a", "farmer-b"])
    await db
      .prepare(
        "INSERT INTO farmer_profiles (subject_id, locale, state, district, consent_version, created_at, updated_at) VALUES (?, 'en', 'Punjab', 'Ludhiana', '2026-10-01.1', 0, 0)",
      )
      .bind(subject)
      .run();
  env = { DB: db } as unknown as Env;
}, 30000);
afterAll(async () => {
  await runtime?.dispose();
});

describe.sequential("field API against a local D1 database", () => {
  it("requires a saved profile", async () =>
    await expect(
      call("unknown-farmer", "farm/setup", { ...setup, id: next }),
    ).rejects.toMatchObject({ status: 409 }));
  it("creates one field and baseline atomically, with inherited location", async () => {
    expect((await call("farmer-a", "farm/setup", setup)).status).toBe(201);
    const row = await env.DB.prepare(
      "SELECT state, district, mechanization FROM farm_plots WHERE id = ?",
    )
      .bind(id)
      .first();
    expect(row).toEqual({
      state: "Punjab",
      district: "Ludhiana",
      mechanization: "unspecified",
    });
  });
  it("retries do not duplicate or overwrite the saved field", async () => {
    await call("farmer-a", "farm/setup", { ...setup, area: 99 });
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count, area FROM farm_plots WHERE id = ?",
    )
      .bind(id)
      .first();
    expect(row).toEqual({ count: 1, area: 2 });
  });
  it("blocks other farmers from reading or reusing a field id", async () => {
    await expect(
      call("farmer-b", "farm/outlook", undefined, `?plotId=${id}`),
    ).rejects.toMatchObject({ status: 404 });
    await expect(call("farmer-b", "farm/setup", setup)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      call("farmer-b", "farm/start", {
        id: next,
        plotId: id,
        cropCode: "WHEAT",
        startedOn: "2026-01-01",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("still computes records when weather fails, without synthetic fallback", async () => {
    const result = (
      await call("farmer-a", "farm/outlook", undefined, `?plotId=${id}`)
    ).value;
    expect(result).toMatchObject({
      fieldState: "empty",
      areaHa: 0.81,
      previousYieldTonnesPerHa: 2.22,
      weather: null,
      soilStatus: "not_available",
    });
  });
  it("starts one active crop, safely retries, and rejects a second active crop", async () => {
    const input = {
      id: next,
      plotId: id,
      cropCode: "WHEAT",
      startedOn: "2026-01-01",
    };
    await call("farmer-a", "farm/start", input);
    expect((await call("farmer-a", "farm/start", input)).value).toMatchObject({
      alreadySaved: true,
    });
    await expect(
      call("farmer-a", "farm/start", {
        ...input,
        id: "00000000-0000-4000-8000-000000000023",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("records quick activities once per crop/action/day, not chemical details", async () => {
    await call("farmer-a", "farm/action", {
      cycleId: next,
      action: "irrigation",
    });
    await call("farmer-a", "farm/action", {
      cycleId: next,
      action: "irrigation",
    });
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM farm_quick_actions WHERE cycle_id = ?",
    )
      .bind(next)
      .first();
    expect(row).toEqual({ count: 1 });
    await expect(
      call("farmer-b", "farm/action", { cycleId: next, action: "weeding" }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("requires photo consent before model use or persistence", async () => {
    await expect(
      call("farmer-a", "farm/photo", {
        cycleId: next,
        consent: false,
        locale: "en",
        image: { mime: "image/jpeg", data: "A".repeat(120) },
      }),
    ).rejects.toHaveProperty("name", "ZodError");
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM crop_photo_observations",
    ).first();
    expect(row).toEqual({ count: 0 });
  });
  it("sends only approved photo context and stores derived results, not the image", async () => {
    env.GEMINI_API_KEY = "unit-test-not-a-real-secret";
    env.GEMINI_MODEL = "test-model";
    const original = globalThis.fetch;
    const payloads: string[] = [];
    const provider = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, options) => {
        if (
          String(url).startsWith("https://generativelanguage.googleapis.com/")
        ) {
          payloads.push(String(options?.body));
          return Response.json({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        quality: "retake",
                        stage: "undetermined",
                        visibleStress: "undetermined",
                        observation: "The image is not a usable crop photo.",
                        nextStep: "retake",
                      }),
                    },
                  ],
                },
              },
            ],
          });
        }
        return original(url, options);
      });
    try {
      const input = {
        cycleId: next,
        consent: true,
        locale: "en",
        image: { mime: "image/jpeg", data: "A".repeat(120) },
      };
      await expect(call("farmer-b", "farm/photo", input)).rejects.toMatchObject(
        { status: 404 },
      );
      expect(payloads).toHaveLength(0);
      expect((await call("farmer-a", "farm/photo", input)).value).toMatchObject(
        { quality: "retake", stage: "undetermined", model: "test-model" },
      );
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toContain("WHEAT");
      for (const privateValue of ["farmer-a", "Ludhiana", "Punjab", next])
        expect(payloads[0]).not.toContain(privateValue);
      const row = await env.DB.prepare(
        "SELECT observation_json FROM crop_photo_observations WHERE subject_id = ?",
      )
        .bind("farmer-a")
        .first<{ observation_json: string }>();
      expect(row?.observation_json).not.toContain(input.image.data);
      expect(row?.observation_json).not.toContain("inlineData");
    } finally {
      provider.mockRestore();
    }
  });
  it("finishes a crop once and carries its harvest into the next empty-field outlook", async () => {
    const input = {
      id: "00000000-0000-4000-8000-000000000024",
      cycleId: next,
      harvestedOn: "2026-09-01",
      quantity: 20,
      unit: "quintal",
    };
    await expect(call("farmer-b", "farm/harvest", input)).rejects.toMatchObject(
      { status: 404 },
    );
    await expect(
      call("farmer-a", "farm/harvest", { ...input, harvestedOn: "2025-12-31" }),
    ).rejects.toMatchObject({ status: 400 });
    await call("farmer-a", "farm/harvest", input);
    expect((await call("farmer-a", "farm/harvest", input)).value).toMatchObject(
      { alreadySaved: true },
    );
    expect(
      (await call("farmer-a", "farm/outlook", undefined, `?plotId=${id}`))
        .value,
    ).toMatchObject({
      fieldState: "empty",
      previousYieldTonnesPerHa: 2.47,
      photo: null,
    });
    await expect(
      call("farmer-a", "farm/action", { cycleId: next, action: "weeding" }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("authorizes planning and consent before any provider request", async () => {
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ priorities: ["inspect", "soil_test"], cropCodes: [] }) }] } }] }));
    try {
      const input = { plotId: id, consent: true, consentVersion: "farm-planning-2026-10-07.1", locale: "en", cropProtection: "unknown" };
      await expect(call("farmer-b", "farm/plan", input)).rejects.toMatchObject({ status: 404 });
      await expect(call("farmer-a", "farm/plan", { ...input, consent: false })).rejects.toThrow();
      await expect(call("farmer-a", "farm/plan", { ...input, context: { crop: "invented" } })).rejects.toThrow();
      expect(provider).not.toHaveBeenCalled();
      expect((await call("farmer-a", "farm/plan", input)).value).toMatchObject({ priorities: ["inspect", "soil_test"], model: "test-model" });
      expect(provider).toHaveBeenCalledTimes(1);
      for (const privateValue of ["farmer-a", "Ludhiana", "Punjab", id]) expect(String(provider.mock.calls[0][1]?.body)).not.toContain(privateValue);
    } finally { provider.mockRestore(); }
  });
  it("merges static UI progress atomically in D1 and serves a complete catalog", async () => {
    const cacheKey = "source-safe-ui-v3:ta";
    await env.DB.prepare("INSERT INTO translations (cache_key, copy_json, created_at) VALUES (?, ?, 0)").bind(cacheKey, JSON.stringify({ preservedAcrossWrites: "public UI cache marker" })).run();
    const originalAi = env.AI;
    env.AI = { run: async (_model: string, input: { text: string[] }) => ({ translations: input.text.map((text) => `தமிழ் ${text}`) }) } as unknown as Env["AI"];
    try {
      expect(await translateUi(env, "ta", true)).toMatchObject({ status: "pending" });
      const cache = await env.DB.prepare("SELECT copy_json FROM translations WHERE cache_key = ?").bind(cacheKey).first<{ copy_json: string }>();
      expect(JSON.parse(cache!.copy_json).preservedAcrossWrites).toBe("public UI cache marker");
      const complete = await translateUi(env, "ta");
      expect(Object.keys(complete).sort()).toEqual(Object.keys(english).sort());
      expect(complete).toMatchObject({ dashboardWelcome: `தமிழ் ${english.dashboardWelcome}` });
    } finally { env.AI = originalAi; }
  });
  it("deleting the profile cascades through fields, baselines and quick actions", async () => {
    await env.DB.prepare("DELETE FROM farmer_profiles WHERE subject_id = ?")
      .bind("farmer-a")
      .run();
    for (const table of [
      "farm_plots",
      "field_baselines",
      "crop_cycles",
      "farm_quick_actions",
      "crop_photo_observations",
    ])
      expect(
        await env.DB.prepare(
          `SELECT COUNT(*) AS count FROM ${table} WHERE subject_id = ?`,
        )
          .bind("farmer-a")
          .first(),
      ).toEqual({ count: 0 });
  });
});
