import { describe, expect, it, vi } from "vitest";
import {
  buildFieldOutlook,
  type FieldBaseline,
} from "../shared/farm-intelligence";
import {
  allowedPlanActions,
  planningEvidence,
  planningRequestSchema,
  validatePlan,
  PLANNING_CONSENT_VERSION,
} from "../shared/farm-planning";
import { generateFieldPlan } from "../worker/src/farm-planning";
import type { Env } from "../worker/src/index";

const id = "00000000-0000-4000-8000-000000000001";
const plot = {
  id,
  name: "Private field name",
  area: 2,
  areaUnit: "acre" as const,
  irrigation: "other" as const,
  mechanization: "unspecified" as const,
  state: "Punjab",
  district: "Ludhiana",
  createdAt: 0,
  updatedAt: 0,
};
const baseline: FieldBaseline = {
  id,
  plotId: id,
  area: 2,
  areaUnit: "acre",
  waterAccess: "unknown",
  fieldState: "empty",
  previous: {
    cropCode: "RICE",
    harvestedOn: "2026-09-01",
    unit: "quintal",
    quantity: 20,
  },
  createdAt: 0,
};
const outlook = buildFieldOutlook({
  plot,
  baseline,
  cycles: [],
  today: "2026-10-07",
});
const input = {
  plotId: id,
  consent: true as const,
  consentVersion: PLANNING_CONSENT_VERSION,
  locale: "hi",
  cropProtection: "unknown" as const,
};
const env = {
  GEMINI_MODEL: "test-model",
  GEMINI_API_KEY: "fictional-test-key",
} as Env;

describe("field planning evidence and provider contract", () => {
  it("requires the exact consent version and rejects extra forwarded context", () => {
    expect(planningRequestSchema.safeParse(input).success).toBe(true);
    for (const extra of [
      { consent: false },
      { consentVersion: "old" },
      { context: { location: "Noida" } },
      { notes: "private diary note" },
    ])
      expect(
        planningRequestSchema.safeParse({ ...input, ...extra }).success,
      ).toBe(false);
  });
  it("whitelists derived evidence instead of passing complete records or source URLs", () => {
    const payload = JSON.stringify(
      planningEvidence(outlook, baseline, "unknown"),
    );
    for (const privateValue of [
      id,
      "Private field name",
      "Punjab",
      "Ludhiana",
      "2026-09-01",
      "sourceUrl",
      "plotId",
      "latitude",
      "longitude",
      "quantity",
    ])
      expect(payload).not.toContain(privateValue);
    expect(JSON.parse(payload)).toMatchObject({
      previousCrop: "RICE",
      daysSinceHarvest: 36,
      waterAccess: "unknown",
      weather: null,
      soilStatus: "not_available",
    });
  });
  it("blocks unavailable crop advice, invented actions, extra prose and duplicate choices", () => {
    const missing = buildFieldOutlook({
      plot: {
        ...plot,
        district: "Gautam Buddha Nagar",
        state: "Uttar Pradesh",
      },
      baseline,
      cycles: [],
      today: "2026-10-07",
    });
    expect(allowedPlanActions(missing, "no")).toContain("local_calendar");
    expect(allowedPlanActions(missing, "no")).not.toContain("input_record");
    for (const output of [
      { priorities: ["inspect"], cropCodes: ["WHEAT"] },
      { priorities: ["apply_fertilizer"], cropCodes: [] },
      { priorities: ["check_drainage"], cropCodes: [] },
      { priorities: ["inspect", "inspect"], cropCodes: [] },
      { priorities: ["inspect"], cropCodes: [], text: "Use a made-up product" },
    ])
      expect(() => validatePlan(output, missing, "no")).toThrow();
  });
  it("sends only minimized evidence and returns validated priorities", async () => {
    const provider = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      priorities: ["check_water", "inspect", "soil_test"],
                      cropCodes: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
    try {
      expect(
        await generateFieldPlan(env, input, outlook, baseline),
      ).toMatchObject({
        priorities: ["check_water", "inspect", "soil_test"],
        locale: "hi",
        model: "test-model",
      });
      const body = JSON.parse(String(provider.mock.calls[0][1]?.body));
      for (const value of [id, "Punjab", "Ludhiana", "Private field name"])
        expect(JSON.stringify(body)).not.toContain(value);
      expect(body.contents[0].parts[0].text).toBe(
        JSON.stringify(planningEvidence(outlook, baseline, "unknown")),
      );
    } finally {
      provider.mockRestore();
    }
  });
  it("rejects a configured provider failure without falling back to invented advice", async () => {
    const provider = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unavailable", { status: 503 }));
    try {
      await expect(
        generateFieldPlan(env, input, outlook, baseline),
      ).rejects.toMatchObject({ status: 502 });
    } finally {
      provider.mockRestore();
    }
  });
});
