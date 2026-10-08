import {
  communityReviewSchema,
  type CommunityCase,
  type PublicCommunityReview,
} from "../../shared/community-review";
import { triageCase, type Report } from "../../shared/domain";
import { ApiError } from "./errors";

type Row = Record<string, string | number | null>;
function publicReview(row: Row): PublicCommunityReview | undefined {
  if (!row.reviewed_at) return undefined;
  return {
    risk: row.risk as PublicCommunityReview["risk"],
    summary: String(row.summary),
    prevention: JSON.parse(String(row.prevention_json)),
    sources: JSON.parse(String(row.sources_json)),
    reviewedAt: Number(row.reviewed_at),
  };
}
const reviewColumns =
  "v.risk, v.summary, v.prevention_json, v.sources_json, v.reviewed_at";

export async function communityQueue(db: D1Database): Promise<CommunityCase[]> {
  const rows = await db
    .prepare(
      `SELECT c.id, c.reference, c.evidence_json, c.version, c.created_at,
    r.district_id, r.crop, r.name, r.confidence, ${reviewColumns}
    FROM community_cases c JOIN reports r ON r.id = c.report_id
    LEFT JOIN community_reviews v ON v.id = c.last_review_id
    WHERE r.expires_at > ?
    ORDER BY (c.last_review_id IS NULL) DESC, (r.confidence < 0.75) DESC, c.updated_at DESC LIMIT 100`,
    )
    .bind(Date.now())
    .all<Row>();
  return rows.results.map((row) => {
    const evidence: string[] = JSON.parse(String(row.evidence_json));
    return {
      id: String(row.id),
      reference: String(row.reference),
      districtId: String(row.district_id),
      crop: String(row.crop),
      diseaseName: String(row.name),
      confidence: Number(row.confidence),
      evidence,
      createdAt: Number(row.created_at),
      version: Number(row.version),
      priority: triageCase({
        confidence: Number(row.confidence),
        symptoms: evidence,
        status: "pending_review",
      }).priority,
      review: publicReview(row),
    };
  });
}

export async function reviewCommunityCase(
  db: D1Database,
  id: string,
  reviewer: string,
  payload: unknown,
) {
  const input = communityReviewSchema.parse(payload);
  const existing = await db
    .prepare(
      "SELECT c.id FROM community_cases c JOIN reports r ON r.id = c.report_id WHERE c.id = ? AND r.expires_at > ?",
    )
    .bind(id, Date.now())
    .first();
  if (!existing) throw new ApiError(404, "Community case not found.");
  const reviewId = crypto.randomUUID();
  const now = Date.now();
  // Compare-and-swap plus an immutable review in one transaction. A stale editor cannot overwrite a newer review.
  const result = await db.batch([
    db
      .prepare(
        "UPDATE community_cases SET last_review_id = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      )
      .bind(reviewId, now, id, input.version),
    db
      .prepare(
        `INSERT INTO community_reviews (id, case_id, reviewer_id, risk, summary, prevention_json, sources_json, reviewed_at)
      SELECT ?, id, ?, ?, ?, ?, ?, ? FROM community_cases WHERE id = ? AND last_review_id = ?`,
      )
      .bind(
        reviewId,
        reviewer,
        input.risk,
        input.summary,
        JSON.stringify(input.prevention),
        JSON.stringify(input.sources),
        now,
        id,
        reviewId,
      ),
  ]);
  if (!result[0].meta.changes)
    throw new ApiError(
      409,
      "This case has a newer review. Refresh before submitting.",
    );
  return {
    version: input.version + 1,
    review: {
      risk: input.risk,
      summary: input.summary,
      prevention: input.prevention,
      sources: input.sources,
      reviewedAt: now,
    } satisfies PublicCommunityReview,
  };
}

export async function communityReports(
  db: D1Database,
  districtId: string,
): Promise<{ reports: Report[]; truncated: boolean }> {
  const now = Date.now();
  const rows = await db
    .prepare(
      `SELECT r.id, r.installation, r.district_id, r.crop, r.disease_code, r.name, r.confidence,
    r.latitude_approx, r.longitude_approx, r.timestamp, r.origin, c.id AS case_id, c.last_review_id,
    ${reviewColumns} FROM reports r LEFT JOIN community_cases c ON c.report_id = r.id
    LEFT JOIN community_reviews v ON v.id = c.last_review_id
    WHERE r.district_id = ? AND r.expires_at > ? AND MAX(r.timestamp, COALESCE(v.reviewed_at, 0)) >= ?
    ORDER BY MAX(r.timestamp, COALESCE(v.reviewed_at, 0)) DESC LIMIT 1000`,
    )
    .bind(districtId, now, now - 7 * 86400000)
    .all<Row>();
  return {
    truncated: rows.results.length === 1000,
    reports: rows.results.map((row) => ({
      id: String(row.id),
      installation: String(row.installation),
      districtId: String(row.district_id),
      crop: String(row.crop),
      diseaseCode: String(row.disease_code),
      name: String(row.name),
      confidence: Number(row.confidence),
      lat: Number(row.latitude_approx),
      lon: Number(row.longitude_approx),
      timestamp: Math.max(Number(row.timestamp), Number(row.reviewed_at || 0)),
      origin: row.origin as Report["origin"],
      awaitingReview: Boolean(row.case_id && !row.last_review_id),
      review: publicReview(row),
    })),
  };
}
