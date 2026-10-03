CREATE TABLE IF NOT EXISTS phone_verifications (
  subject_id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL UNIQUE,
  phone_last4 TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
