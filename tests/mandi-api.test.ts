import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => ({
    payload: { sub: token, firebase: { sign_in_provider: "anonymous" } },
  }),
}));
import worker, { type Env } from "../worker/src/index";
import { MANDI_RESOURCE_ID } from "../worker/src/mandi";

const quota = vi.fn(async () => ({ count: 1 }));
const env = {
  DATA_GOV_API_KEY: "isolated-test-key-never-used-with-real-provider",
  ALLOWED_ORIGINS: "https://example.test",
  REQUIRE_APP_CHECK: "false",
  DB: { prepare: () => ({ bind: () => ({ first: quota }) }) },
} as unknown as Env;
const call = (query = "", token = "test-guest") =>
  worker.fetch(
    new Request(`https://example.test/v1/market/mandi/sample${query}`, {
      headers: {
        Origin: "https://example.test",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
    env,
  );
afterEach(() => {
  vi.unstubAllGlobals();
  quota.mockClear();
});
describe("mandi diagnostic route", () => {
  it("requires authenticated access and applies the existing quotas", async () => {
    const provider = vi.fn(async () =>
      Response.json({
        title:
          "Current Daily Price of Various Commodities from Various Markets (Mandi)",
        index_name: MANDI_RESOURCE_ID,
        records: [],
        total: 0,
      }),
    );
    vi.stubGlobal("fetch", provider);
    expect((await call("", "")).status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
    const response = await call("?limit=2");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      returned: 0,
      mode: "live",
      scope: "national_sample",
    });
    expect(quota).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it("rejects caller data, excessive limits and repeated query keys before the provider", async () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);
    for (const query of [
      "?pincode=263139",
      "?state=Uttarakhand",
      "?limit=11",
      "?limit=2&limit=3",
      "?url=https://attacker.test/",
    ])
      expect((await call(query)).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
});
