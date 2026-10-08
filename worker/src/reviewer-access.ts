export interface ReviewerBindings {
  REVIEWER_UID_HASHES?: string;
  [name: `REVIEWER_UID_HASH_${string}`]: string | undefined;
}

/** Separate grants preserve the legacy secret and can be revoked independently. */
export function reviewerAllowed(
  env: ReviewerBindings,
  uidHash: string,
): boolean {
  if (!/^[a-f0-9]{64}$/.test(uidHash)) return false;
  if (
    (env.REVIEWER_UID_HASHES || "")
      .split(",")
      .some((value) => value.trim() === uidHash)
  )
    return true;
  return Object.entries(env).some(
    ([name, value]) =>
      /^REVIEWER_UID_HASH_[A-Z0-9_]+$/.test(name) &&
      typeof value === "string" &&
      value.trim() === uidHash,
  );
}
