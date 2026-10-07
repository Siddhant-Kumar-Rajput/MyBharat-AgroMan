# Release history

## v1.3.0 — 7 October 2026

- Separate Overview, My Farm Advisor, My Farm Diary and Community Watch. Add a four-item, safe-area-aware mobile navigation bar, also available on information pages.
- Give visitor and policy-page menus complete navigation, Google sign-in and guest entry. Add a visible menu label, keyboard dismissal, focus restoration and short reduced-motion-aware transitions.
- Open the diary on a compact season summary; move activities, inputs, harvests, finances, opportunities, health, setup and export/delete controls into a secondary section menu. Keep existing records and ownership protections.
- Add official market/FPO/export information links, explicitly not a live demand integration, partnership or profit prediction.
- Add per-request, consent-based Gemini planning from a server-owned field outlook. Whitelist derived evidence; exclude identity, location, photos, finance and free-text records. Validate supported actions and existing crop windows; do not persist plans or silently replace live failures with synthetic output.
- Add English/Hindi copy, updated processing disclosure and backend/mobile/desktop regression coverage.

## v1.2.2 — 7 October 2026

- Fix information-page hero styles accidentally resizing the shared header. Keep common header dimensions and footer grid across routes; add readable section navigation and a compact policy notice.
- Repair farmer-story intrinsic grid widths, field/value wrapping and mobile controls. Preserve full-width shared chrome and use vertical field-fill reveals so animations do not overflow.
- Generate explicitly synthetic Community Watch examples around any resolved saved town, including Haldwani. Add a session-only sample distress action for presentation; no examples are written to live reports.
- Add counted, keyboard/touch-accessible markers, provenance-labelled popups, a status legend, list-to-map focus and a fit-all-signals control. Update markers when the live report feed changes.
- Allow signed-in farmers to consent to server-authorized observations at their saved town/district centre, without transmitting GPS or requiring a pilot boundary. Validate the server-owned profile against the authorized receipt; retain guest GPS boundary checks and receipt/consent rules.
- Add English/Hindi copy and regression tests for every story chapter, header dimensions, marker updates, and contribution authorization/storage/feed behavior in isolated D1.

## v1.2.1 — 7 October 2026

- Resolve saved postal localities to their parent town for Community Watch; PIN 263139 / Anandpur uses Haldwani, not the Nainital hill town.
- Decouple map-place lookup from weather forecasts and reviewed-boundary availability.
- Add an attributed OpenStreetMap street map with mobile-sized zoom/recenter controls and explicit tile-failure/retry states. No GPS, identity, PIN or farm records are sent to the tile provider.
- Validate geocoding against saved state/district; label a district fallback when a town is not indexed. No fabricated administrative outline or replacement district.
- Keep aggregate alerts district-scoped, clearing stale alerts when the location changes.
- Add English/Hindi map copy, updated provider disclosures and deterministic map/privacy/mobile tests using mocked tiles.

## v1.2.0 — 7 October 2026

- Replace the form-first diary with a computed field outlook and optional detailed tools.
- Add minimal empty/growing field setup, inherited location and previous-harvest normalization.
- Add a backend rules engine for crop/harvest age, five-day reference rainfall balance, recent modeled rainfall and explicitly sourced planting-window screening.
- Add one-tap watering, weeding and crop-protection records with daily deduplication.
- Add consent-based Gemini visible-growth observations, saving derived results only.
- Add sowing and harvest transitions that carry context into the next season.
- Add ownership, database, consent, calculation and mobile/desktop workflow tests.
- Bundle the Hindi UI catalog, preserve interpolation tokens and invalidate incomplete older language caches.
- Retain explicit missing-soil and missing-calendar states. No trained specialist model, exact fertility or future-yield claim.

## v1.1.2

- Resolve weather using a verified postal parent locality, avoiding an unrelated district-centre temperature for PIN 263139.

## v1.1.1

- Improve shared mobile navigation, footer/header consistency and localization placeholders.

## v1.1.0

- Add location-aware profile/diary, PIN lookup, weather, policy pages and presentation workflow.
