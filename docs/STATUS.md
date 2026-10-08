# Phase 2 implementation status

## Current release: v1.6.0 — community expert review

Newly consented community contributions create global expert tickets and amber pending-review map signals. Authorized reviewers can publish sourced prevention advice and choose monitoring, risk of spread (red), risk not confirmed, or resolved. The map and cards show the latest public assessment and its date; no farmer identity, PIN/locality, photo or reviewer account identifiers are exposed. Legacy reports remain unreviewed, with no implicit consent migration. Queue location is not restricted by the expert's profile. See `EXPERT_REVIEW_ACCESS.md` for the workflow, active windows, limits and access configuration.

This release retains the v1.3–v1.5 navigation, consent-based planning, page-first translation, compact information controls, landing motion, official market links and individual expert grants documented in `CHANGELOG.md`. It does not add a live market feed, automatic agronomic verification or a guaranteed expert response time. Private crop-cycle cases and the visible-growth tool remain separate from consented public sharing.

Validation: frontend, Functions and Worker builds pass; 102 unit/integration tests pass. The desktop/mobile regression run passed 55 checks with three explicit environment-gated skips; the two outdated consent-label tests were corrected and passed in follow-up checks, covering all 57 applicable checks. Final focused checks also verify the new review lifecycle, expanded popup bounds, Hindi at 320px, consent disclosure and advisory/community navigation. Review-source validation rejects non-HTTPS, malformed and credential-bearing URLs; concurrent updates cannot overwrite a newer assessment. Screenshots were inspected with fixture map tiles (not production tile crawling). The sizeable frontend chunk warning remains; this is not an agronomic or security-readiness certification.

Remote migration `0008_community_review.sql` applied successfully without backfilling old reports. Worker version `c03ecb76-89d0-45e5-87fe-b1ea7578ac52` deployed; health/CORS passed and unauthenticated expert access returned 401. Both legacy and individual expert-grant secret names remain configured. No fabricated public reports or reviews were inserted into production for testing. Real end-user Google sessions and expert agronomic decisions were not automated in this release verification.

## Previous release: v1.2.2 — mobile shell and community signals

Information-page hero styles no longer target the shared navigation header. At the same viewport, the shared header is 72px tall up to 860px and 82px above that. Footer-linked pages use a contents navigation, readable stacked sections and a compact notice while retaining the shared footer. Story grids shrink correctly, use wrapped field values and mobile-sized controls, and reveal fields vertically to avoid transient horizontal overflow.

Community Watch's explicit example switch generates local synthetic signals near a resolved city rather than relying on the six pilot district fixtures. The sample distress button is session-only and never posts an example to the live feed. Map markers display counts/status and open labelled details; lists can focus a marker and the map can frame all district signals. Newly received live aggregates update the marker layer without a reload.

For authenticated farmers, an observation may use the centre of their server-owned saved town/district after explicit consent and a server-issued diagnosis receipt. The backend checks receipt ownership/expiry/reuse and the receipt district against that profile before lookup. It neither accepts GPS with this mode nor treats a self-reported saved region as an exact/verified farm position. Legacy guest GPS contributions still require a supported reviewed boundary. A single eligible observation is labelled an unverified observation, never a confirmed outbreak. A diary action or an insufficient AI photo does not automatically create a public signal.

Model behavior, treatment policy and the original Phase 1 repository are not changed. Tests of the contribution route use an isolated local D1 database, synthetic receipts and test-only identity/provider mocks; no production diagnoses/reports are fabricated. Existing dependency-audit and model-validation limitations from previous releases remain.

Release validation: frontend/functions/Worker builds pass; 75 unit/integration tests and 37 desktop/mobile browser checks pass (3 explicitly gated skips). The shared header's dimensions are checked across all six information pages at 320/390/768/1280px. All six story chapters are checked in English/Hindi at 320/390/768px using actual descendant bounds and scroll widths, not merely hidden body overflow. Mobile policy/story screenshots were visually inspected. The full local D1 route test verifies consent, receipt ownership/reuse, guest restrictions, exclusion of GPS in saved-region mode, rounded coordinates and immediate inclusion in the district feed. The original checkout remains at `8dac190fccf7e525e9b5d6c3b960e14046e8ee77` with its pre-existing untracked directories untouched.

## Previous release: v1.2.1 — city maps

Community Watch now resolves a saved postal locality to its parent town and renders OpenStreetMap streets without depending on a weather forecast or imported district polygon. PIN 263139 / Anandpur resolves to Haldwani. A district fallback is labelled explicitly if the town is not indexed; failed lookups show retry rather than another district. Aggregated alerts remain district-scoped, not farm/locality locations. The old unreviewed rounded outline is removed.

The user approved the additional map provider. Browser tile requests carry the viewed map area and normal request metadata (including IP), never an application PIN/locality, name, phone, raw GPS or farm record. Postal PIN and Open-Meteo place lookups use the previously approved provider path. The provider notice and privacy pages describe this. OSM attribution is visible; HTTP browser caching/referrer is preserved and no offline tile downloads/prefetch are provided. Automated browser checks mock tiles rather than crawl the provider. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and [Leaflet](https://leafletjs.com/).

Town/block names are not proof of legal city boundaries. Provider place coverage and tile availability are not guaranteed. Model development remains unchanged in this map-fix release.

Release validation: all builds and 65 unit/integration tests passed; the full desktop/mobile suite passed 31 checks (3 explicitly gated skips), followed by 8 targeted layout/community/localization regression checks. The deployed API passed PIN-to-Haldwani, manual Haldwani, Ludhiana and invalid-locality rejection checks using a temporary anonymous account, then deleted that account; no farmer records were written. A single current mobile viewport displayed real Haldwani street tiles with attribution and no horizontal overflow. Cloudflare and Firebase Hosting deployment completed. The original Phase 1 checkout remains at `8dac190fccf7e525e9b5d6c3b960e14046e8ee77` with its existing untracked directories unchanged.

Separate security maintenance remains: npm audit reports 13 existing workspace dependency findings (1 critical, 10 high, 1 moderate, 1 low). The map install adds only Leaflet and its type packages to the lockfile; none of these added packages is listed in the findings. No unrelated or breaking dependency upgrades were attempted. Passing map tests is not a claim of security or agronomic production readiness.

## Previous release: v1.2.0 — 7 October 2026

The diary now uses a minimal field setup and a backend-computed outlook. It includes sowing/harvest transitions, daily one-tap updates, sourced planting-window screening, recent/forecast modeled rainfall, a reference water-balance signal and per-photo-consent Gemini observations. Detailed inputs, finance and exports are optional. Google sign-in permits persistence; phone verification is optional, superseding the historical gate described below.

Software validation covers calculations, isolated local D1 ownership/idempotency/privacy checks and desktop/mobile farm workflows. Live deployment/smoke status is recorded in the release handoff. Actual crop-photo accuracy is not agronomically validated. Calendar coverage is intentionally limited; soil fertility and calibrated yield forecasts are not connected. See [the research, architecture and next milestones](FIELD_INTELLIGENCE_PLAN.md).

Live MyBharat D1/Worker verification passed the full empty-field → sowing → duplicate-safe activity → artificial-photo rejection → harvest workflow. PIN 263139 resolved to Haldwani; five forecast days and seven recent modeled days were available. Guest persistent access returned 403. No photo bytes appeared in exported records. The check removed only its own synthetic farmer record and temporary guest account. Hindi is bundled to avoid an external-translation dependency; older incomplete browser catalogs are not reused.

The notes below are historical foundation checks, not a statement that their old entry screens or phone gate remain current.

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
