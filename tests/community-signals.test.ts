import { describe, expect, it } from "vitest";
import { clusterReports, type Report } from "../shared/domain";
import {
  signalPresentation,
  type PublicCommunityReview,
} from "../shared/community-review";

const now = Date.now();
const base: Report = {
  id: "one",
  installation: "one",
  districtId: "PB-LDH",
  crop: "RICE",
  diseaseCode: "TEST",
  name: "Synthetic concern",
  confidence: 0.6,
  lat: 30.9,
  lon: 75.8,
  timestamp: now,
  origin: "demo",
};
const review: PublicCommunityReview = {
  risk: "spreading",
  summary: "Synthetic expert assessment",
  prevention: ["Synthetic advice"],
  sources: ["https://example.test/source"],
  reviewedAt: now,
};
describe("expert-led community signal presentation", () => {
  it("never turns model confidence or report count into a red marker", () => {
    const input = [1, 2, 3, 4].map((id) => ({
      ...base,
      id: String(id),
      installation: String(id),
      confidence: 0.99,
    }));
    const [legacy] = clusterReports(input, now);
    expect(legacy.status).toBe("potential");
    expect(signalPresentation(legacy)).toEqual({
      tone: "unreviewed",
      label: "communityUnreviewed",
    });
    const [pending] = clusterReports(
      input.map((r) => ({ ...r, awaitingReview: true, confidence: 0.6 })),
      now,
    );
    expect(pending.count).toBe(4);
    expect(signalPresentation(pending).tone).toBe("pending");
  });
  it("separates pending, legacy, hazardous and resolved signals from the same area", () => {
    const result = clusterReports(
      [
        { ...base, id: "pending", awaitingReview: true },
        { ...base, id: "legacy", confidence: 0.9 },
        { ...base, id: "hazard", review },
        { ...base, id: "resolved", review: { ...review, risk: "resolved" } },
      ],
      now,
    );
    expect(result).toHaveLength(4);
    expect(result.map((item) => signalPresentation(item).tone).sort()).toEqual([
      "cleared",
      "hazard",
      "pending",
      "unreviewed",
    ]);
  });
  it("keeps time limits and strips private report fields from clusters", () => {
    expect(
      clusterReports(
        [
          { ...base, awaitingReview: true, timestamp: now + 1 },
          { ...base, review, timestamp: now - 8 * 86400000 },
        ],
        now,
      ),
    ).toEqual([]);
    const [cluster] = clusterReports([{ ...base, review }], now);
    expect(Object.keys(cluster)).not.toContain("installation");
    expect(Object.keys(cluster)).not.toContain("confidence");
    expect(cluster.reviews).toEqual([review]);
  });
});
