import { describe, expect, it, vi } from "vitest";
import {
  fetchMandiSample,
  mandiSampleQuery,
  MANDI_RESOURCE_ID,
} from "../worker/src/mandi";

const now = Date.parse("2026-10-08T06:00:00Z");
const key = "isolated-test-credential-not-a-real-key";
const fixture = (row: Record<string, unknown> = {}) => ({
  title:
    "Current Daily Price of Various Commodities from Various Markets (Mandi)",
  index_name: MANDI_RESOURCE_ID,
  org: ["Isolated local test publisher"],
  status: "ok",
  total: "123",
  updated_date: "2026-10-07T12:00:00Z",
  message: `Must never be reflected: ${key}`,
  records: [
    {
      state: "Uttarakhand",
      district: "Nainital",
      market: "Haldwani",
      commodity: "Tomato",
      variety: "Local",
      grade: "FAQ",
      arrival_date: "07/10/2026",
      min_price: "1000",
      max_price: "1600",
      modal_price: "1300",
      private_field: "must be stripped",
      ...row,
    },
  ],
});
describe("bounded read-only mandi sample", () => {
  it("calls only the official endpoint with the configured key and public query fields", async () => {
    const provider = vi.fn(async () =>
      Response.json(fixture()),
    ) as unknown as typeof fetch;
    const result = await fetchMandiSample(
      { DATA_GOV_API_KEY: key },
      5,
      provider,
      now,
    );
    const [url, options] = vi.mocked(provider).mock.calls[0];
    const request = new URL(String(url));
    expect(request.origin).toBe("https://api.data.gov.in");
    expect(request.pathname).toBe(`/resource/${MANDI_RESOURCE_ID}`);
    expect([...request.searchParams.keys()].sort()).toEqual([
      "api-key",
      "format",
      "limit",
      "offset",
    ]);
    expect(request.searchParams.get("api-key")).toBe(key);
    expect(options?.redirect).toBe("error");
    expect(result.records[0]).toMatchObject({
      arrivalDate: "2026-10-07",
      prices: { minimum: 1000, maximum: 1600, modal: 1300 },
    });
    expect(result.dateRange.latestAgeDays).toBe(1);
    expect(result.priceUnit).toBeNull();
    expect(JSON.stringify(result)).not.toContain(key);
    expect(JSON.stringify(result)).not.toContain("private_field");
  });
  it("rejects missing credentials, unsupported input and excessive sample sizes before fetching", async () => {
    const provider = vi.fn() as unknown as typeof fetch;
    await expect(fetchMandiSample({}, 5, provider)).rejects.toMatchObject({
      status: 503,
    });
    await expect(
      fetchMandiSample({ DATA_GOV_API_KEY: key }, 11, provider),
    ).rejects.toThrow();
    expect(
      mandiSampleQuery.safeParse({ limit: 5, pincode: "263139" }).success,
    ).toBe(false);
    expect(
      mandiSampleQuery.safeParse({ limit: 5, "api-key": key }).success,
    ).toBe(false);
    expect(provider).not.toHaveBeenCalled();
  });
  it("redacts provider failures and rejects wrong resources without a synthetic fallback", async () => {
    const provider = vi.fn(async () => {
      throw new Error(`https://example.test/?api-key=${key}`);
    }) as unknown as typeof fetch;
    await expect(
      fetchMandiSample({ DATA_GOV_API_KEY: key }, 5, provider),
    ).rejects.toMatchObject({
      status: 502,
      message: "The mandi provider could not complete the request.",
    });
    const rejected = vi.fn(async () =>
      Response.json({ error: key }, { status: 403 }),
    ) as unknown as typeof fetch;
    await expect(
      fetchMandiSample({ DATA_GOV_API_KEY: key }, 5, rejected),
    ).rejects.toMatchObject({ status: 502 });
    const wrong = vi.fn(async () =>
      Response.json({ ...fixture(), index_name: "not-this-resource" }),
    ) as unknown as typeof fetch;
    await expect(
      fetchMandiSample({ DATA_GOV_API_KEY: key }, 5, wrong),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      fetchMandiSample(
        { DATA_GOV_API_KEY: key },
        5,
        async () => new Response(`<html>${key}</html>`),
      ),
    ).rejects.toMatchObject({
      status: 502,
      message: "The mandi provider returned a non-JSON response.",
    });
    await expect(
      fetchMandiSample({ DATA_GOV_API_KEY: key }, 5, async () => {
        throw new DOMException(key, "TimeoutError");
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: "The mandi provider request timed out.",
    });
  });
  it("keeps missing values unknown, rejects impossible calendar dates and flags stale/future dates", async () => {
    const read = async (row: Record<string, unknown>) =>
      fetchMandiSample(
        { DATA_GOV_API_KEY: key },
        5,
        async () => Response.json(fixture(row)),
        now,
      );
    const invalid = await read({
      arrival_date: "31/02/2026",
      min_price: "",
      modal_price: "NA",
    });
    expect(invalid.records[0].arrivalDate).toBeNull();
    expect(invalid.records[0].prices.minimum).toBeNull();
    expect(invalid.records[0].prices.modal).toBeNull();
    expect(invalid.warnings).toContain("unverified_record_date");
    expect((await read({ arrival_date: "01/10/2026" })).warnings).toContain(
      "latest_sample_record_older_than_three_days",
    );
    expect((await read({ arrival_date: "09/10/2026" })).warnings).toContain(
      "future_record_date",
    );
    expect(
      (await read({ min_price: "2000", max_price: "1000" })).warnings,
    ).toContain("inconsistent_price_range");
  });
  it("classifies transport failures without returning provider exception text", async () => {
    for (const [detail, message] of [
      [
        `redirect https://other.test/?api-key=${key}`,
        "The mandi provider attempted a redirect; it was blocked to protect the API key.",
      ],
      [
        `DNS resolution failed ${key}`,
        "The mandi provider hostname could not be resolved.",
      ],
      [
        `SSL certificate failed ${key}`,
        "A secure connection to the mandi provider could not be established.",
      ],
    ]) {
      await expect(
        fetchMandiSample({ DATA_GOV_API_KEY: key }, 5, async () => {
          throw new Error(detail);
        }),
      ).rejects.toMatchObject({ status: 502, message });
    }
  });
  it("returns an explicitly empty sample rather than inventing records", async () => {
    const result = await fetchMandiSample(
      { DATA_GOV_API_KEY: key },
      5,
      async () => Response.json({ ...fixture(), records: [], total: 0 }),
      now,
    );
    expect(result.records).toEqual([]);
    expect(result.warnings).toContain("empty_sample");
    expect(result.dateRange.latest).toBeNull();
  });
});
