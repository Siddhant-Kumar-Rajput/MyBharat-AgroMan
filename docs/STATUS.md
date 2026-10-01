# Phase 2 implementation status

MyBharat AgroMan is an isolated Phase 2 staging environment extended from the frozen Phase 1 baseline. This is not a claim of agronomic or financial production readiness.

## Live and verified

- Firebase Hosting: `https://mybharat-agroman.web.app`.
- Cloudflare Worker: `https://mybharat-agroman-api.agroman.workers.dev`.
- APAC D1 database `mybharat-agroman` created with Phase 1 foundation and Phase 2 record migrations.
- Firebase Anonymous Authentication creates a guest session successfully.
- Phone Authentication is enabled with a configured fictional test number.
- Worker health, Hosting and production-origin CORS checks return `200`.
- Worker secrets are configured without being committed.
- Phone-verified record routes, pseudonymous subject IDs and reviewer UID allowlisting are implemented.
- Profile, plot, crop-cycle, activity, ledger, derived case, outcome, export and reviewer tables are present.
- JSON, CSV and print-to-PDF record exports work in the local demonstration flow.
- Desktop/mobile browser coverage includes the farmer-record workflow in isolated demonstration mode.

## Verified limitations

- Live phone linking reaches Firebase invisible reCAPTCHA but currently fails with `auth/network-request-failed` in the in-app browser. Retrying also reveals a reusable-verifier lifecycle defect. OTP is not yet validated end to end.
- Google sign-in may be enabled in Firebase, but no Google linking interface exists in the app yet.
- The new Phase 2 D1 database does not yet contain the reviewed regional context and district-boundary rows from the Phase 1 environment; live pages currently show a missing-boundary error.
- The live reviewer route is configured for the approved UID hash, but reviewer access has not yet been exercised with a phone-verified live token.
- Crop-health cases in the farmer records interface remain labelled synthetic examples; there is no live qualified remedy approval claim.

## Next milestone

Follow `docs/PHASE2_PLAN.md` P0:

1. Build the visitor/guest/farmer landing and explicit identity-state shell.
2. Add Google account linking while retaining phone verification as the persistence gate.
3. Repair reCAPTCHA lifecycle and validate fictional phone OTP in a normal browser.
4. Repair mobile navigation and contextualize missing-data states.
5. Import separately reviewed regional context and boundaries into the new D1 database.
6. Verify live farmer persistence and reviewer authorization.

## Existing foundation retained from Phase 1

- Text/image advisory, bounded conversations, localization catalog and speech layers.
- Aggregate outbreak rules and consent boundaries.
- Regional context contracts and reviewed-boundary support.
- PWA shell, reduced-motion support and synthetic/live provenance labels.

The original Phase 1 deployment and repository remain separate and unchanged.
