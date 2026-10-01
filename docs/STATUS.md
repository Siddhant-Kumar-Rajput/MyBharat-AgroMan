# Phase 2 implementation status

MyBharat AgroMan is an isolated Phase 2 staging environment extended from the frozen Phase 1 baseline. This is not a claim of agronomic or financial production readiness.

## Live and verified

- Firebase Hosting: `https://mybharat-agroman.web.app`.
- Cloudflare Worker: `https://mybharat-agroman-api.agroman.workers.dev`.
- APAC D1 database `mybharat-agroman` created with Phase 1 foundation and Phase 2 record migrations.
- Firebase Anonymous Authentication creates a guest session successfully.
- The new visitor landing cleanly separates guest access from farmer sign-in; Google and phone entry interfaces are present.
- Phone Authentication is enabled with a configured fictional test number. The gated Chromium smoke test completes the OTP flow, receives a real Firebase token and reaches the live Worker-backed profile state.
- Worker health, Hosting and production-origin CORS checks return `200`.
- Worker secrets are configured without being committed.
- Phone-verified record routes, pseudonymous subject IDs and reviewer UID allowlisting are implemented.
- Profile, plot, crop-cycle, activity, ledger, derived case, outcome, export and reviewer tables are present.
- JSON, CSV and print-to-PDF record exports work in the local demonstration flow.
- Desktop/mobile browser coverage includes the landing, guest and farmer-record workflows in isolated demonstration mode.
- The reCAPTCHA verifier lifecycle, mobile navigation and missing regional-context presentation have been repaired.

## Verified limitations

- The in-app browser still reports `auth/network-request-failed` after its reCAPTCHA interaction; the same fictional OTP flow passes in standard Chromium using Firebase's test-only local verification bypass. Production reCAPTCHA remains enabled.
- Google sign-in and linking are implemented, but account selection has not been exercised because no Google account was authorized for testing.
- The new Phase 2 D1 database does not yet contain the reviewed regional context and district-boundary rows from the Phase 1 environment; live pages therefore omit unavailable regional values rather than presenting synthetic replacements.
- The live reviewer route is configured for the approved UID hash, but reviewer access has not yet been exercised with a phone-verified live token.
- Crop-health cases in the farmer records interface remain labelled synthetic examples; there is no live qualified remedy approval claim.

## Next milestone

Follow `docs/PHASE2_PLAN.md` P0:

1. Exercise Google sign-in with a user-authorized test account while retaining phone verification as the persistence gate.
2. Save and reload a live fictional farmer profile and crop record, then remove any test-only records created during verification.
3. Import separately reviewed regional context and boundaries into the new D1 database.
4. Verify reviewer authorization with the approved reviewer account and a phone-verified live token.
5. Continue the P1 onboarding, structured crop-history and constraint-aware advisory work in `docs/PHASE2_PLAN.md`.

## Existing foundation retained from Phase 1

- Text/image advisory, bounded conversations, localization catalog and speech layers.
- Aggregate outbreak rules and consent boundaries.
- Regional context contracts and reviewed-boundary support.
- PWA shell, reduced-motion support and synthetic/live provenance labels.

The original Phase 1 deployment and repository remain separate and unchanged.
