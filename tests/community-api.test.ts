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
import { COMMUNITY_REVIEW_CONSENT, signalPresentation, type CommunityCase } from "../shared/community-review";
import type { Cluster } from "../shared/domain";

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
  env = { DB: db, SUBJECT_ID_KEY: key, REVIEWER_UID_HASH_EXPERT_TEST: hash("expert"), REQUIRE_APP_CHECK: "false", FIREBASE_PROJECT_ID: "isolated-test", ALLOWED_ORIGINS: "https://example.test" } as unknown as Env;
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
  it("keeps map polling out of the general advisory allowance", async () => {
    const day = new Date().toISOString().slice(0, 10);
    const generalKey = hash(`guest_all_${day}`);
    const before = await env.DB.prepare("SELECT count FROM quotas WHERE quota_key = ?").bind(generalKey).first();
    expect((await request("guest", undefined, `outbreaks/nearby?districtId=${encodeURIComponent(district)}`, "GET")).status).toBe(200);
    expect(await env.DB.prepare("SELECT count FROM quotas WHERE quota_key = ?").bind(generalKey).first()).toEqual(before);
    expect(await env.DB.prepare("SELECT count FROM quotas WHERE quota_key = ?").bind(hash(`guest_community-feed_${day}`)).first()).toEqual({ count: 1 });
  });
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
    expect(await env.DB.prepare("SELECT COUNT(*) AS total FROM community_cases").first()).toEqual({ total: 0 });
  });
  it("routes a newly consented issue globally, publishes only expert assessments and protects concurrent reviews", async () => {
    const expertSubject = createHmac("sha256", key).update("expert").digest("hex");
    await env.DB.prepare("INSERT INTO farmer_profiles (subject_id, locale, state, district, locality, consent_version, created_at, updated_at) VALUES (?, 'en', 'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'test', 0, 0)").bind(expertSubject).run();
    const createReceipt = async () => {
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO receipts (id, uid_hash, district_id, diagnosis_json, model, expires_at, used) VALUES (?, ?, ?, ?, 'test', ?, 0)").bind(id, hash("farmer"), district, JSON.stringify({ crop: "RICE", diseaseCode: "REVIEW_TEST", name: "Synthetic review concern", confidence: 0.6, evidence: ["Derived test observation"] }), Date.now() + 60000).run();
      return id;
    };
    const payload = { receipt: await createReceipt(), consent: true, locationSource: "saved_region", reviewConsentVersion: COMMUNITY_REVIEW_CONSENT };
    const response = await request("farmer", payload);
    expect(response.status).toBe(200);
    const result = await response.json() as { reference: string };
    expect(result.reference).toMatch(/^COM-/);
    const queueResponse = await request("expert", undefined, "expert/cases", "GET");
    expect(queueResponse.status).toBe(200);
    const queue = await queueResponse.json() as { communityCases: CommunityCase[] };
    const item = queue.communityCases[0];
    expect(item).toMatchObject({ reference: result.reference, districtId: district, version: 0, confidence: 0.6 });
    expect(item.review).toBeUndefined();
    const feed = async () => {
      const value = await request("guest", undefined, `outbreaks/nearby?districtId=${encodeURIComponent(district)}`, "GET");
      expect(value.status).toBe(200);
      const body = await value.json() as { clusters: Cluster[] };
      for (const secret of [hash("farmer"), hash("expert"), expertSubject, "263139", "Anandpur", "evidence", "reviewer_id", "installation"]) expect(JSON.stringify(body)).not.toContain(secret);
      return body.clusters.find((cluster) => cluster.name === "Synthetic review concern")!;
    };
    expect(signalPresentation(await feed()).tone).toBe("pending");
    const path = `expert/community-cases/${item.id}/review`;
    const review = { version: 0, risk: "spreading", summary: "Isolated synthetic test assessment", prevention: ["Test prevention guidance"], sources: ["https://example.test/agronomy"], publishConsent: true };
    for (const uid of ["guest", "farmer"]) expect((await request(uid, review, path)).status).toBe(403);
    for (const invalid of [{ publishConsent: false }, { sources: ["javascript:alert(1)"] }, { sources: ["not a URL"] }, { sources: ["https://user:password@example.test/"] }, { prevention: [] }, { risk: "confirmed_by_ai" }]) expect((await request("expert", { ...review, ...invalid }, path)).status).toBe(400);
    const simultaneous = await Promise.all([request("expert", review, path), request("expert", review, path)]);
    expect(simultaneous.map((r) => r.status).sort()).toEqual([200, 409]);
    const reviewed = await feed();
    expect(signalPresentation(reviewed).tone).toBe("hazard");
    expect(reviewed.reviews?.[0]).toMatchObject({ risk: "spreading", summary: review.summary, prevention: review.prevention, sources: review.sources });
    expect(reviewed.awaitingReview).toBe(false);
    expect((await request("farmer", payload)).status).toBe(409);
    expect((await request("farmer", { ...payload, receipt: await createReceipt() })).status).toBe(200);
    expect(await env.DB.prepare("SELECT COUNT(*) AS total FROM community_cases").first()).toEqual({ total: 1 });
    expect(await env.DB.prepare("SELECT version FROM community_cases WHERE id = ?").bind(item.id).first()).toEqual({ version: 1 });
    expect(await env.DB.prepare("SELECT COUNT(*) AS total FROM community_reviews").first()).toEqual({ total: 1 });
    expect((await request("expert", { ...review, version: 1, risk: "resolved" }, path)).status).toBe(200);
    expect(signalPresentation(await feed()).label).toBe("communityResolved");
    expect((await request("expert", review, path)).status).toBe(409);
    await env.DB.prepare("UPDATE reports SET expires_at = 0 WHERE disease_code = 'REVIEW_TEST'").run();
    expect(await feed()).toBeUndefined();
    expect((await request("expert", { ...review, version: 2 }, path)).status).toBe(404);
  }, 30000);
});
