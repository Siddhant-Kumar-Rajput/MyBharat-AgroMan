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

### Community issues (v1.6.0)

1. A farmer or guest obtains a server-authorized photo observation in the crop
   advisory chat and selects **Share an issue for expert review**. The separate
   consent explains the derived fields sent to reviewers and the public result.
2. The issue appears on its district's Community Watch as **Potential risk ·
   awaiting expert review**, at an approximate location. Any viewer of that
   district can see it. A profile's city controls the initial map, not reviewer access.
3. An owner-authorized expert opens **Expert review → Community issues · all
   regions**. The queue is global, capped at 100 recent active issues with pending
   reviews first. A Haldwani expert can review a Noida report and vice versa.
4. The expert selects monitoring, risk of spread, risk not confirmed, or resolved;
   writes a public summary and prevention steps; optionally adds an HTTPS source; and confirms
   publication. Only **risk of spread** turns the marker red. Report counts and
   model confidence never do. Changing the assessment updates its marker.
5. Community Watch shows the assessment, advice, sources and review date in the
   marker and issue card. Live maps refresh every 30 seconds while visible, on
   return/focus, and with **Refresh issues**. Errors clear stale signals. Read-only
   feed requests have a separate 3,000/day allowance so automatic refresh does
   not consume the general advisory allowance; general access remains 300/day.

Public responses omit identity, reviewer-account identifiers, PIN/locality and
photos. Reviews are attributed internally to the server-authenticated reviewer,
stored immutably, and protected from stale overwrites by a case version. Experts
must not put private information into public free text. Sources are optional as of v1.6.1 and
not automatically verified for agronomic correctness or government endorsement.

Migration `0008_community_review.sql` is additive and does not backfill old reports.
Old contributions stay **Unreviewed observation** until their owner submits a new
authorized observation with the new review consent. Same-day duplicate reports
do not erase an existing assessment. The public window is seven days from the
latest observation/review; report expiry is 90 days from contribution. Expiry
excludes records from the active feed/queue, not a claim of automatic physical
deletion. There is no promised expert response time, push notification, or
external expert-service integration. The visible-growth checker remains separate.

### Private crop-cycle cases

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
  not automatically create an expert case. Private case guidance does not
  automatically publish to Community Watch; public sharing requires the
  separate community contribution and consent described above.
