# Expert Review: owner-managed access

Open the signed-in Menu → Expert review, or `/expert-review`.

Google login does not make a farmer an expert. The Worker checks the SHA-256
hash of the authenticated Firebase UID against `REVIEWER_UID_HASHES`. Ordinary
accounts receive 403 before the case query or review write is performed.

## Add an expert identified by their Google email

1. Ask the chosen expert to sign in to this app once with that Google account.
2. In **Firebase Console → mybharat-agroman → Authentication → Users**, find that
   exact email and copy its **User UID**. Hash the UID, not the email.
3. In PowerShell from this repository, run:

   ```powershell
   .\scripts\reviewer-hash.ps1 -Uid "PASTE_FIREBASE_UID"
   ```

4. In **Cloudflare → Workers & Pages → mybharat-agroman-api → Settings → Variables
   and Secrets**, edit the secret `REVIEWER_UID_HASHES`. Append the new lowercase
   hash to the existing comma-separated hashes. Preserve reviewers still approved;
   remove only a reviewer whose access the owner intends to revoke.
5. Save/deploy the configuration. Have the expert reopen the review page while
   signed in to the same account. Do not share tokens, OTPs or passwords.

The helper computes a hash locally; it does not change any secret or role.
No reviewer privileges are granted by this UI release.

## Current review workflow and limitations

- The server queue contains persisted cases marked `pending_review` or
  `follow_up_due`, with urgent triage first. The queue is not an external live
  expert-service integration and does not promise availability or response time.
- An approved reviewer supplies a summary, monitoring steps, non-chemical steps
  and source URL. The server stores the review and updates the case status;
  it does not verify professional qualifications or the agronomic correctness
  of the submitted advice automatically.
- AI triage orders cases; it is not human approval or diagnostic certainty.
- The synthetic Crop health example in the demo diary is a presentation fixture.
  The visible-growth photo checker is a separate tool: checking a photo does
  not automatically create an expert case. Farmer-facing review delivery and
  the complete live escalation UI remain unfinished; do not present them as
  completed merely because the reviewer endpoints exist.
