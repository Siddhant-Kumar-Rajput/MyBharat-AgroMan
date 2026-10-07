import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";

// Identity verification is mocked only in this isolated local test module.
// The deployed Worker always verifies Firebase signatures with jose.
vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => ({ payload: { sub: token, firebase: { sign_in_provider: token === "guest" ? "anonymous" : "google.com" } } }),
}));
import worker, { type Env } from "../worker/src/index";

let runtime: Miniflare;
let env: Env;
const key = "isolated-community-test-key-not-a-secret";
const district = "IN:Uttarakhand:Nainital";
const receipt = "00000000-0000-4000-8000-000000000071";
const guestReceipt = "00000000-0000-4000-8000-000000000072";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const request = (uid: string, body: unknown, path = "reports/contribute", method = "POST") => worker.fetch(new Request(`https://example.test/v1/${path}`, {
  method, headers: { Authorization: `Bearer ${uid}`, Origin: "https://example.test", "Content-Type": "application/json" },
  ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
}), env);

beforeAll(async () => {
  runtime = new Miniflare({ workers: [{ config: {
    name: "community-tests", compatibilityDate: "2026-09-28",
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default { fetch() { return new Response('ok'); } }" } } },
    env: { DB: { type: "d1", id: "isolated-community", dev: { remote: false } } },
  } }], telemetry: { enabled: false } });
  const db = await runtime.getD1Database("DB");
  for (const file of readdirSync("worker/migrations").filter((name) => name.endsWith(".sql")).sort())
    for (const statement of readFileSync(`worker/migrations/${file}`, "utf8").split(";").filter((sql) => sql.trim())) await db.prepare(statement).run();
  const subject = createHmac("sha256", key).update("farmer").digest("hex");
  await db.prepare("INSERT INTO farmer_profiles (subject_id, locale, state, district, locality, pincode, consent_version, created_at, updated_at) VALUES (?, 'en', 'Uttarakhand', 'Nainital', 'Anandpur', '263139', '2026-10-01.1', 0, 0)").bind(subject).run();
  for (const [id, uid] of [[receipt, "farmer"], [guestReceipt, "guest"]])
    await db.prepare("INSERT INTO receipts (id, uid_hash, district_id, diagnosis_json, model, expires_at, used) VALUES (?, ?, ?, ?, 'isolated-test', ?, 0)").bind(id, hash(uid), district, JSON.stringify({ crop: "RICE", diseaseCode: "TEST_CONCERN", name: "Local test concern", confidence: 0.84, evidence: ["synthetic local test"] }), Date.now() + 60000).run();
  env = { DB: db, SUBJECT_ID_KEY: key, REQUIRE_APP_CHECK: "false", FIREBASE_PROJECT_ID: "isolated-test", ALLOWED_ORIGINS: "https://example.test" } as unknown as Env;
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://api.postalpincode.in/")) return Response.json([{ Status: "Success", PostOffice: [{ Name: "Anandpur", Block: "Haldwani", District: "Nainital", State: "Uttarakhand", Pincode: "263139" }] }]);
    if (url.startsWith("https://geocoding-api.open-meteo.com/")) return Response.json({ results: [{ name: "Haldwani", latitude: 29.22254, longitude: 79.5286, admin1: "Uttarakhand", admin2: "Nainital" }] });
    return original(input, init);
  });
}, 30000);
afterAll(async () => { vi.unstubAllGlobals(); await runtime?.dispose(); });

describe.sequential("community contribution API against isolated D1", () => {
  it("rejects absent consent and another farmer's receipt", async () => {
    expect((await request("farmer", { receipt, consent: false, locationSource: "saved_region" })).status).toBe(400);
    expect((await request("other-farmer", { receipt, consent: true, locationSource: "saved_region" })).status).toBe(400);
  });
  it("does not let guests use a saved farmer region", async () => {
    expect((await request("guest", { receipt: guestReceipt, consent: true, locationSource: "saved_region" })).status).toBe(403);
  });
  it("rejects GPS coordinates in a saved-region request", async () => {
    expect((await request("farmer", { receipt, consent: true, locationSource: "saved_region", position: { lat: 29.22254, lon: 79.5286 } })).status).toBe(400);
  });
  it("creates a consented Haldwani signal and immediately exposes it on the district map feed", async () => {
    expect((await request("farmer", { receipt, consent: true, locationSource: "saved_region" })).status).toBe(200);
    const response = await request("guest", undefined, `outbreaks/nearby?districtId=${encodeURIComponent(district)}`, "GET");
    expect(response.status).toBe(200);
    const result = await response.json() as { clusters: Array<Record<string, unknown>> };
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]).toMatchObject({ districtId: district, lat: 29.22, lon: 79.53, count: 1, status: "observation", origin: "live" });
    const row = await env.DB.prepare("SELECT latitude_approx, longitude_approx FROM reports").first();
    expect(row).toEqual({ latitude_approx: 29.22, longitude_approx: 79.53 });
    expect(JSON.stringify(result)).not.toContain("263139");
    expect((await request("farmer", { receipt, consent: true, locationSource: "saved_region" })).status).toBe(409);
  });
});
