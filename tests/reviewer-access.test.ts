import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
// Authentication is isolated here only; production retains Firebase signature verification.
vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => {
    if (token === "invalid") throw new Error("Invalid fixture token");
    const [provider, uid] = token.split(":");
    return {
      payload: {
        sub: uid,
        firebase: { sign_in_provider: provider },
        expert: true,
      },
    };
  },
}));
import worker, { type Env } from "../worker/src/index";
import { reviewerAllowed } from "../worker/src/reviewer-access";

const hash = (uid: string) => createHash("sha256").update(uid).digest("hex");
const review = {
  decision: "undetermined",
  remedy: { summary: "Isolated test review", monitoring: [], nonChemical: [] },
  sources: ["https://example.test/source"],
  synthetic: true,
};
function setup() {
  const dataQueries: string[] = [];
  const batch = vi.fn(async (_statements: unknown[]) => []);
  const env = {
    SUBJECT_ID_KEY: "isolated-local-test-key",
    REVIEWER_UID_HASHES: ` ${hash("legacy")},${hash("another-legacy")} `,
    REVIEWER_UID_HASH_EXPERT_001: hash("new-expert"),
    ALLOWED_ORIGINS: "https://example.test",
    REQUIRE_APP_CHECK: "false",
    DB: {
      prepare: (sql: string) => {
        if (!sql.includes("quotas")) dataQueries.push(sql);
        return {
          bind: (...values: unknown[]) => ({
            sql,
            values,
            all: async () => ({ results: [] }),
            first: async () =>
              sql.includes("quotas")
                ? { count: 1 }
                : { id: "00000000-0000-4000-8000-000000000001" },
          }),
          all: async () => ({ results: [] }),
        };
      },
      batch,
    },
  } as unknown as Env;
  const call = (uid: string, write = false, provider = "google.com") =>
    worker.fetch(
      new Request(
        "https://example.test/v1/expert/cases" +
          (write ? "/00000000-0000-4000-8000-000000000001/review" : ""),
        {
          method: write ? "POST" : "GET",
          headers: {
            Origin: "https://example.test",
            ...(uid
              ? {
                  Authorization:
                    uid === "invalid"
                      ? "Bearer invalid"
                      : `Bearer ${provider}:${uid}`,
                }
              : {}),
          },
          ...(write
            ? {
                body: JSON.stringify({
                  ...review,
                  reviewerId: hash("spoofed"),
                }),
              }
            : {}),
        },
      ),
      env,
    );
  return { env, call, dataQueries, batch };
}
describe("owner-managed expert grants", () => {
  it("preserves legacy reviewers alongside a new individual grant on both routes", async () => {
    const { call, batch } = setup();
    for (const uid of ["legacy", "another-legacy", "new-expert"]) {
      expect((await call(uid)).status).toBe(200);
      expect((await call(uid, true)).status).toBe(200);
      const statements = batch.mock.calls.at(-1)![0] as unknown as Array<{
        values: unknown[];
      }>;
      expect(statements[0].values[2]).toBe(hash(uid));
    }
  });
  it("rejects unauthenticated, invalid, ordinary and anonymous users before reading or writing cases", async () => {
    for (const [uid, provider, status] of [
      ["", "google.com", 401],
      ["invalid", "google.com", 401],
      ["farmer", "google.com", 403],
      ["new-expert", "anonymous", 403],
    ] as const) {
      const { call, dataQueries, batch } = setup();
      expect((await call(uid, false, provider)).status).toBe(status);
      expect((await call(uid, true, provider)).status).toBe(status);
      expect(dataQueries).toEqual([]);
      expect(batch).not.toHaveBeenCalled();
    }
  });
  it("revokes an individual grant without removing legacy reviewers", async () => {
    const { env, call } = setup();
    delete env.REVIEWER_UID_HASH_EXPERT_001;
    expect((await call("new-expert")).status).toBe(403);
    expect((await call("new-expert", true)).status).toBe(403);
    expect((await call("legacy")).status).toBe(200);
  });
  it("ignores malformed hashes and unrelated bindings", () => {
    expect(reviewerAllowed({ REVIEWER_UID_HASHES: "" }, "")).toBe(false);
    expect(
      reviewerAllowed(
        { REVIEWER_UID_HASHES: "", OTHER_SECRET: hash("farmer") } as Env,
        hash("farmer"),
      ),
    ).toBe(false);
    expect(
      reviewerAllowed(
        { REVIEWER_UID_HASHES: "", REVIEWER_UID_HASH_BAD: "*" },
        hash("farmer"),
      ),
    ).toBe(false);
  });
});
