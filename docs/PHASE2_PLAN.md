# MyBharat AgroMan — Phase 2 product and delivery plan

This plan reconciles the original AgroMan build specification with the frozen Phase 1 implementation, the current Phase 2 foundation, and the privacy and evidence rules adopted for the national showcase.

## Product position

MyBharat AgroMan extends the Phase 1 advisory and community-signal product. It is not a replacement chatbot. Phase 2 adds a farmer-controlled longitudinal record, phone-verified persistence, constraint-aware guidance, reviewed crop-health cases and, later, carefully framed market and export-demand signals.

Until the predictive features and source pipelines are operational, describe the product as a **longitudinal farm record and advisory system**, not a complete farm digital twin.

## Implementation stack decisions

- Firebase remains responsible for Authentication and Hosting.
- Cloudflare Workers and D1 remain the single application API and persistent record store. The original specification mentioned Cloud Functions, Firestore and BigQuery, but Phase 2 will not duplicate records across two backends merely to match that early proposal.
- Earth Engine and government datasets enter D1 through separately reviewed, dated imports. A source described in the original specification is not treated as a working live API until its access, reuse terms and freshness have been verified.
- The new repository and cloud resources are isolated for the Phase 2 hackathon while retaining the complete Phase 1 Git history and product foundation.

## Identity and roles

| Role | Authentication | Permitted capabilities |
| --- | --- | --- |
| Visitor | None | View the national introduction, trust model and login choices. |
| Guest | Firebase Anonymous Authentication | Use the advisor, language and accessibility features, official helplines and public aggregate community signals. Guest conversations remain device-local. |
| Google account holder | Anonymous account linked to Google | Retain a convenient account entry point, but persistent farmer records remain locked until a phone number is verified. |
| Verified farmer | Firebase account with a verified phone provider, optionally linked to Google | Create and retrieve profiles, plots, crop cycles, activities, ledger entries, crop-health cases, outcomes and exports. |
| Reviewer | Authenticated account whose UID is explicitly approved | Review derived case evidence and publish structured, sourced remedies. There is no public reviewer registration. |
| Authority | Restricted account or judge-safe aggregate view | View aggregate outbreak signals only; never individual farmer records, raw GPS or photos. |

### Identity invariants

- The landing page offers **Continue as guest** and **Farmer login or sign up**.
- Phone OTP is the trust gate for all persistent farmer records.
- Google sign-in is an optional convenience and account-linking method; Google alone does not unlock persistent records.
- A guest upgrading to phone or Google links the provider to the current anonymous Firebase user so the session is not fragmented.
- If a credential already belongs to another account, stop and present an explicit recovery/merge choice. Never silently merge accounts.
- Reviewer and authority access is assigned, never self-declared.

## Experience architecture

1. **National landing page** — concise purpose, differentiated value, privacy model and two clear entry actions.
2. **Guest home** — advisory-first experience with a visible Guest state and a non-blocking upgrade action.
3. **Farmer authentication** — phone OTP first; Google offered as a convenient linked sign-in. reCAPTCHA has a dedicated, reusable lifecycle.
4. **Verified farmer home** — season summary, active crop cycle, pending follow-ups, recent field activity, ledger summary and portable-record export.
5. **Crop-health case journey** — assessment, confidence band, request ID, reviewer state, sourced remedy and 3/7-day outcome.
6. **Reviewer workspace** — derived evidence only, structured remedy fields, authoritative source requirement and auditable decision history.
7. **Authority view** — district-level aggregate signals with explicit uncertainty and provenance.

## Original specification reconciliation

| Original requirement | Current status | Phase 2 treatment |
| --- | --- | --- |
| Phone OTP profile | Live fictional OTP, token verification, record persistence and session restoration verified in Chromium | Required before persistent records. Production reCAPTCHA remains enabled. |
| GPS captured and locked to profile | Not implemented by design | Replace with explicit consent, manual district fallback and optional coarse area. Never persist raw GPS. Location can be changed through a logged history rather than being permanently locked. |
| Soil/climate baseline on profile | Six reviewed district context rows and boundaries are deployed with date/source | Keep modeled values labelled as regional estimates, not farm measurements; replace legacy GAUL geometry when a reviewed source is approved. |
| Land size | Implemented per plot | Aggregate only when useful; preserve multiple plots and units. |
| Mechanization and irrigation | Implemented per plot | Keep editable per plot because constraints may differ across a holding. Add bullock-drawn wording to the localized catalog. |
| Current/most recent crop and time since harvest | Implemented in onboarding with a derived day interval | Derive it from crop cycles once enough history exists, while retaining farmer correction. |
| Crop-cycle logging | Structured farmer-reported input, harvest and yield events implemented | Add periodic derived health assessments with provenance and consent. |
| Periodic crop photos | Upload/analysis exists only in advisory flow | Process ephemerally; persist only derived assessment, consent receipt, request ID and provenance. Do not persist raw photos. |
| Pesticide/fertilizer history | Structured input class, farmer-entered product, amount/unit, purpose, date and source implemented | Keep it historical and farmer-reported. Do not produce dosage without authoritative evidence. |
| Soil trajectory and degradation risk | Missing | Add evidence-backed rules/models after structured input history exists. Clearly label modeled risk and uncertainty. |
| Constraint-aware next-crop advice | Missing | Ground advice in plot, irrigation, mechanization, previous crop, harvest interval, current season and reviewed regional context. |
| Farmer-owned portable record | JSON/CSV/print-to-PDF foundation implemented | Add human-readable provenance and correction history. It may support an application but is not bank, government or insurer verification. |
| KCC/PMFBY presentation | Not integrated | Provide a farmer-owned summary with a disclaimer; do not claim official acceptance or claim readiness without written validation. |
| APEDA/DGCIS opportunity signal | Missing/deferred | Build only after a lawful, reproducible data import is verified. Restrict to export-relevant cash crops and show freshness, range assumptions and uncertainty prominently. |

## Phase 1 capabilities that Phase 2 must carry forward

- Text, voice and image advisory with bounded multi-turn context.
- Regional soil/climate context with date and source.
- Crowdsourced outbreak aggregation and in-app alerts.
- Device-local guest conversations and quota controls.
- All configured Indian language choices with honest provider-coverage labels.
- Soil/climate dashboard: NDVI, modeled soil moisture and rainfall trend once reviewed data is imported.
- Agmarknet/data.gov.in market-price nudge after a reliable dataset and freshness policy are confirmed.
- Live camera conversation remains a stretch feature after the records and evidence flows are stable.

The reviewed Phase 1 snapshot is now imported into the Phase 2 D1 environment: six district context rows and six boundaries dated 15 September 2026. The exact SQL is preserved at `scripts/generated/context-2026-09-15.sql`; modeled soil remains regional context rather than a farm measurement, and GAUL 2015 geometry remains a documented replacement target.

## New Phase 2 extensions agreed during planning

- Official helpline escalation: national Kisan Call Centre `1800-180-1551`; Odisha `155333` only when the selected state is Odisha.
- Request IDs connect assessment, review, remedy and outcome.
- Similar-case retrieval uses reviewed/closed cases before any model-training proposal.
- AI-assisted pre-review uses a versioned safety policy to route standard, priority and urgent cases. It may show fixed low-risk interim steps, but confidence alone never authorizes a treatment or chemical recommendation.
- Synthetic competition cases remain visibly labelled and never imply expert approval.
- In-app follow-up reminders precede push notifications.
- Farmer ledger remains a lightweight self-reported record, not audited accounting.

## Delivery sequence

### P0 — identity and live-foundation repair

- Replace the current home-first flow with the visitor/guest/farmer entry architecture.
- Add Google provider linking while retaining phone verification as the persistence gate.
- Repair reusable reCAPTCHA creation/reset and test fictional phone sign-in in a normal browser.
- Make identity state visible: Visitor, Guest, Google linked, Phone verified, Reviewer.
- Repair mobile navigation.
- Replace missing-boundary global errors with contextual empty states.
- Import reviewed regional context and boundary data into the new D1 database.

### P1 — complete longitudinal record

- Completed: onboarding records recent crop and most recent harvest date, then shows the derived day interval.
- Completed: structured farmer-reported input, harvest and yield events persist across sessions.
- Connect real derived crop-health assessments to crop cycles.
- Add record correction history and improved PDF presentation.
- In progress: AI-assisted triage and a structured reviewer form now require authoritative sources; farmer delivery and correction history remain.

### P2 — predictive personalization

- Add constraint-aware next-crop guidance.
- Add evidence-backed soil/practice risk indicators with uncertainty.
- Add season-aware recommendations and freshness controls.
- Evaluate outcomes before considering any training pipeline.

### P3 — market and export opportunity

- Verify APEDA/DGCIS/data.gov.in acquisition and reuse terms.
- Establish curated, dated imports rather than assuming a live API.
- Add currency and cost assumptions with provenance.
- Restrict recommendations to relevant cash crops and display ranges, volatility and policy risk.

### Stretch

- NDVI/rainfall/moisture dashboard expansion.
- Agmarknet price trends.
- Live camera and voice conversation.
- Push notifications after consent and delivery testing.

## Release claims and safety rules

- Never store raw photos, audio or raw GPS in application persistence or logs.
- Never call AI confidence diagnostic certainty.
- Never call modeled soil a farm laboratory measurement.
- Never call a record verified solely because a photo was analyzed.
- Never claim Gates Foundation, government, bank, insurer, APEDA or helpline partnership without written authorization.
- Never claim an exported record is accepted for KCC or PMFBY; say the farmer may choose to present it as supporting documentation.
- Never present demand or profit estimates as guarantees.
- Never silently substitute synthetic data in live mode.

## Completion criteria for the next milestone

- A visitor can deliberately choose guest or farmer entry.
- Guest advisory works without an error banner.
- A guest can link the configured fictional phone number and retain the same Firebase UID.
- A Google-linked user is prompted for phone verification before persistent record creation.
- A verified farmer can create, reload and export a profile, plot and crop cycle from the live D1 database.
- The approved reviewer UID can open the live review queue; ordinary farmers receive `403`.
- Desktop and mobile browser tests cover identity state, provider linking, persistence gates and reCAPTCHA recovery.
