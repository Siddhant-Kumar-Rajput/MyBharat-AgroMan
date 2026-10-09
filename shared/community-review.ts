import { z } from "zod";

export const COMMUNITY_REVIEW_CONSENT = "2026-10-08.community-review.1";
export const communityRiskSchema = z.enum([
  "watch",
  "spreading",
  "not_confirmed",
  "resolved",
]);
export type CommunityRisk = z.infer<typeof communityRiskSchema>;
const sourceUrl = z
  .string()
  .url()
  .max(1000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  });
export const communityReviewSchema = z
  .object({
    version: z.number().int().nonnegative(),
    risk: communityRiskSchema,
    summary: z.string().trim().min(10).max(1000),
    prevention: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
    sources: z.array(sourceUrl).max(5).default([]),
    publishConsent: z.literal(true),
  })
  .strict();
export type CommunityReviewInput = z.infer<typeof communityReviewSchema>;
export type PublicCommunityReview = Pick<
  CommunityReviewInput,
  "risk" | "summary" | "prevention" | "sources"
> & { reviewedAt: number };
export type CommunityCase = {
  id: string;
  reference: string;
  districtId: string;
  crop: string;
  diseaseName: string;
  confidence: number;
  evidence: string[];
  createdAt: number;
  version: number;
  priority: "standard" | "priority" | "urgent";
  review?: PublicCommunityReview;
};
export function signalPresentation(signal: {
  awaitingReview?: boolean;
  review?: PublicCommunityReview;
  reviews?: PublicCommunityReview[];
}) {
  const review = signal.review ?? signal.reviews?.[0];
  if (review)
    return {
      tone:
        review.risk === "spreading"
          ? "hazard"
          : review.risk === "watch"
            ? "monitor"
            : "cleared",
      label: (
        {
          spreading: "communitySpreading",
          watch: "communityWatch",
          not_confirmed: "communityNotConfirmed",
          resolved: "communityResolved",
        } as const
      )[review.risk],
    };
  return {
    tone: signal.awaitingReview ? "pending" : "unreviewed",
    label: signal.awaitingReview
      ? ("communityPending" as const)
      : ("communityUnreviewed" as const),
  };
}
