# Phase 2 implementation status

MyBharat AgroMan is an isolated Phase 2 staging environment extended from the frozen Phase 1 baseline. This is not a claim of agronomic or financial production readiness.

## Live and verified

- Firebase Hosting: `https://mybharat-agroman.web.app`.
- Cloudflare Worker: `https://mybharat-agroman-api.agroman.workers.dev`.
- APAC D1 database `mybharat-agroman` created with Phase 1 foundation and Phase 2 record migrations.
- Six reviewed district context rows and six boundaries dated 15 September 2026 are imported from the Phase 1 Earth Engine snapshot. A live browser check verifies the observation date, source label and Ludhiana boundary. The preserved SQL has SHA-256 `857ED0E54D12F869C1CA7248D1ECD40F8858831BD20F97A90E57279E0CAF55EA`.
- Firebase Anonymous Authentication creates a guest session successfully.
- The new visitor landing cleanly separates guest access from farmer sign-in; Google and phone entry interfaces are present.
- Phone Authentication is enabled with a configured fictional test number. The gated Chromium smoke test completes the OTP flow, receives a real Firebase token and reaches the live Worker-backed profile state.
- Worker health, Hosting and production-origin CORS checks return `200`.
- Worker secrets are configured without being committed.
- Phone-verified record routes, pseudonymous subject IDs and reviewer UID allowlisting are implemented.
- Profile, plot, crop-cycle, activity, ledger, derived case, outcome, export and reviewer tables are present.
- A fictional phone-verified farmer can create and reload a live D1 profile, plot and crop cycle. The verification run then deletes its own data and a direct D1 check confirms no test profile or plot remains.
- The fictional phone-verified farmer receives `403 Reviewer access required` from the live review queue, confirming ordinary farmers cannot enter it.
- Farmers can permanently delete their AgroMan profile and related Phase 2 records through an explicit two-step interface; their Firebase sign-in is retained.
- JSON, CSV and print-to-PDF record exports work in the local demonstration flow.
- Desktop/mobile browser coverage includes the landing, guest and farmer-record workflows in isolated demonstration mode.
- The reCAPTCHA verifier lifecycle, mobile navigation and missing regional-context presentation have been repaired.

## Verified limitations

- The in-app browser still reports `auth/network-request-failed` after its reCAPTCHA interaction; the same fictional OTP flow passes in standard Chromium using Firebase's test-only local verification bypass. Production reCAPTCHA remains enabled.
- Google sign-in and linking are implemented, but account selection has not been exercised because no Google account was authorized for testing.
- The imported snapshot still uses FAO GAUL 2015 geometry and must be replaced with a reviewed current boundary source before long-term operation.
- The approved reviewer UID is allowlisted, but its account has not been authenticated in a test session, so successful reviewer access remains unverified.
- Crop-health cases in the farmer records interface remain labelled synthetic examples; there is no live qualified remedy approval claim.

## Next milestone

Follow `docs/PHASE2_PLAN.md` P0:

1. Exercise Google sign-in with a user-authorized test account while retaining phone verification as the persistence gate.
2. Authenticate the approved reviewer account and verify successful reviewer-queue access.
3. Continue the P1 onboarding, structured crop-history and constraint-aware advisory work in `docs/PHASE2_PLAN.md`.

## Existing foundation retained from Phase 1

- Text/image advisory, bounded conversations, localization catalog and speech layers.
- Aggregate outbreak rules and consent boundaries.
- Regional context contracts and reviewed-boundary support.
- PWA shell, reduced-motion support and synthetic/live provenance labels.

The original Phase 1 deployment and repository remain separate and unchanged.
