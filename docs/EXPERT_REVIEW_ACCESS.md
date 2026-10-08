# Expert Review: owner-managed access

Open the signed-in Menu → Expert review, or `/expert-review`.

Google login does not make a farmer an expert. The Worker checks the SHA-256
hash of the authenticated Firebase UID against the legacy `REVIEWER_UID_HASHES`
list and individual `REVIEWER_UID_HASH_<LABEL>` secret bindings. Ordinary
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
   and Secrets**, add a new **Secret** with a unique name such as
   `REVIEWER_UID_HASH_EXPERT_002`. Use uppercase letters, digits and underscores
   in the label. Its value must be exactly the lowercase hash from the helper.
   Choose an unused name; overwriting an existing grant replaces that expert.
   Each individual binding holds one UID hash. Keep the legacy
   `REVIEWER_UID_HASHES` secret unchanged: its hidden value cannot be read back
   for a safe append. Record the label/account mapping privately, not in Git.
5. Save/deploy the configuration. Have the expert reopen the review page while
   signed in to the same account. Do not share tokens, OTPs or passwords.

The helper computes a hash locally; it does not change any secret or role.
Only the owner changes these server bindings; neither an email nor a client-side
role flag grants access. To revoke an individual grant, delete only its binding
and deploy. A UID also present in the legacy list remains authorized until its
legacy grant is removed. Existing experts keep access when new grants are added.
Firebase sign-in credentials and mobile-verification settings are unchanged.

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
