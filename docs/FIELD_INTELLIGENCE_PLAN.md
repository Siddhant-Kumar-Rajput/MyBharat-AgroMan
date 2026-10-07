# From forms to field decisions

Research and implementation baseline: 7 October 2026. First release: v1.2.0.

## Product contract

The farmer supplies a small amount of information once. AgroMan must reuse it, compute what it can justify, explain the evidence, and ask another question only when it changes a decision. More input fields are not evidence of intelligence.

One-time field basics are area/unit, inherited profile location, empty/growing status and whether supplemental water is available. An empty field may record its previous crop, harvest date and optional quantity. A growing field records its crop and sowing date. Machinery and finance do not belong in this default flow. Water availability does: rain-fed suitability and water stress cannot be assessed as if every field had irrigation. This simplification is consistent with [FAO AquaCrop's input requirements](https://www.fao.org/aquacrop/overview/input-requirements/en), which also explain why advanced yield models need more evidence than a location and photograph.

## Implemented first vertical slice

- My Farm Diary opens on a field outlook; detailed records are optional.
- Field setup inherits saved state/district instead of asking again. The existing PIN-to-parent-locality weather correction is retained.
- Worker-side calculations normalize area, previous harvest quantity, days since harvest and days since sowing. A harvest entry is a farmer-reported observation, not a future yield forecast.
- Live weather retrieves five forecast days and seven recent modeled days from the already-approved Open-Meteo service. The engine sums rainfall and reference evapotranspiration, distinguishes missing values from zero, and flags a modeled daily rainfall of at least 25 mm as a drainage watch—not an official warning.
- Crop options use explicitly sourced district windows. No arbitrary percentage score, yield promise or pan-India coverage claim is shown.
- Watering, weeding and crop protection require one tap. Server dates use Asia/Kolkata. Retried requests do not create duplicate daily activities. A tap does not invent product, dose, water quantity or cost.
- Starting a crop and completing its harvest advance the field state. The last harvest automatically becomes the next empty-field baseline.
- Approved Gemini photo processing requires farmer consent for each request. Only a resized image, crop code, sowing age and language are sent. Canvas preparation removes image metadata. AgroMan saves structured observations, not images or photo URLs. Visible stage/stress is not a diagnosis or proof of normal growth; next steps are fixed retake/monitor/local-expert actions, not generated chemical prescriptions.
- Ownership is checked on every field/cycle route. Anonymous guests cannot create persistent farmer records. Google sign-in remains sufficient; phone verification is optional as requested.
- Baselines, activities and derived observations join the farmer's JSON export and cascade-delete with the farmer record. Weather is not silently substituted with synthetic values in live mode.
- Hindi uses a bundled complete UI catalog with curated new field/consent text and token-parity tests. It does not depend on a cloud translation call. Other supported Indic interfaces still use the configured translator and its availability/quotas; no new language-accuracy certification is claimed.

The backend uses a versioned deterministic rules engine for auditable calculations. AI is restricted to the visual task; it does not fabricate measurements that the rules engine then treats as facts.

## Calculations and interpretation

| Calculation | Evidence | What it does not establish |
| --- | --- | --- |
| Acres × 0.40468564224 → hectares | Farmer-entered field area | Surveyed boundary or ownership |
| Harvest tonnes ÷ hectares | Farmer-entered harvest and field area | Predicted next yield |
| Today minus reported sowing/harvest date | Saved date, Indian local day | Biological stage or crop health |
| Five-day rain minus five-day ET0 | Approximate weather-model values | Crop irrigation requirement or actual soil moisture |
| Seven-day recent rainfall total | Recent modeled weather | A field rain-gauge measurement |
| Upcoming window within 60 days | Historic district calendar | A current agronomist-approved planting prescription |

Open-Meteo exposes [FAO reference evapotranspiration and forecast/history variables](https://open-meteo.com/en/docs). Actual crop water demand requires crop coefficients, stage, soil storage and other adjustments; [FAO explains the distinction](https://www.fao.org/4/X0490E/x0490e0a.htm). Consequently v1.2.0 provides a cautious water-pressure signal, not litres to apply or an automatic irrigation schedule. Short-term weather cannot predict the entire crop season.

## Sowing evidence and coverage

The [ICAR-CRIDA district contingency-plan index](https://www.icar-crida.res.in/Crop_Contingency_Plan.html) is a useful public starting point, not a live advisory API. Plans are historic and require local confirmation.

- [Ludhiana, 2011](https://www.icar-crida.res.in/CP-2012/statewiseplans/Punjab%20(Pdf)/PAU,%20Ludhiana/PUNJAB%205-Ludhiana%2030.04.2011.pdf): encode the irrigated windows for supported rice, wheat, maize, cotton and sugarcane. Week 2 is represented as days 8–14 and week 4 as days 22–28; the original source remains visible.
- [Pune, 2011](https://www.icar-crida.res.in/CP-2012/statewiseplans/Maharastra(Pdf)/MPKVV,%20Rahuri/MH8-%20PUNE%2031.03.2011.pdf): supported rain-fed wheat and rice windows. Other crops in the plan are not silently mapped to app crop codes.
- [Nainital, 2014](https://www.icar-crida.res.in/CP-2012/statewiseplans/Uttarkhand/UKD8-Nainital-10.07.14.pdf): the plan identifies rabi wheat but does not establish an exact sowing window for this app. Oct–Nov is an explicitly inferred broad rabi screen only. Hill/plain altitude and local variety must be checked; this is not exact date evidence.
- All other districts: age, area, harvest and available weather calculations still work. Crop ranking is explicitly unavailable until reviewed sources are added. No district borrows another state's calendar.

Expansion must preserve source URL, year, geographic scope, crop/variety, water assumptions and exact-versus-inferred status. Do not import old chemical recommendations into the treatment UI.

## Soil resources: do not turn a PIN into a laboratory result

[ISRIC SoilGrids](https://docs.isric.org/globaldata/soilgrids/index.html) provides modeled soil properties at approximately 250 m resolution, including pH, organic carbon, texture and total nitrogen, with uncertainty information. These are not measured fertility on the farmer's plot and do not provide a complete N-P-K prescription. Its documentation currently says the REST service is temporarily paused. It is therefore not connected as a pretend live fertility feed.

The official [Soil Health Card integration guidance](https://soilhealth.dac.gov.in/files/SHC_API_Integration_Guidelines.pdf) should be used for an authorized integration, not scraping personal cards. Organisational access and credentials must be confirmed. No such access is configured or claimed here.

Next safe choices: an explicitly consented farmer soil report, or a reviewed district aggregate with date, methodology, licence, sample count and uncertainty. Do not infer fertilizer dose from district averages. The existing Phase 1 modeled pH snapshot is not a fertility report and is not used as one.

## Models and competition assessment

| Resource | Useful capability | Decision |
| --- | --- | --- |
| [Plantix](https://plantix.net/en/) and its [API toolkit](https://plantix.net/en/plantix-intelligence/api-toolkit/) | Existing crop-photo diagnosis and cultivation support | A serious benchmark. A free farmer app does not establish free embedding/API rights. Do not claim its service or dataset is integrated. |
| [PlantVillage author dataset](https://huggingface.co/datasets/mohanty/PlantVillage) | Leaf-disease training/evaluation baseline | Controlled leaf images are not a growth-stage or whole-field dataset. The published crop/class coverage does not match all six AgroMan crops. Preserve dataset licence and attribution requirements. |
| [CropGuard model card](https://huggingface.co/AbhiCommits/cropguard-models) | ResNet50 ONNX weights suitable for CPU experiments | Author reports strong laboratory test accuracy but no field evaluation and uncalibrated confidence. The CC-BY-SA licence needs review. Do not advertise the laboratory score as Indian field performance. |
| [Microsoft FarmVibes.AI](https://github.com/microsoft/farmvibes-ai) | Agricultural geospatial and multimodal workflows | Useful later for parcel-based satellite analysis. It is not a drop-in trained farmer assistant or a reason to infer field NDVI from a postal centre. Infrastructure and exact consented boundaries are separate requirements. |
| [FAO AquaCrop](https://www.fao.org/aquacrop/en/) | Crop-growth and water-productivity simulation; Python source is available | Best candidate for a later agronomic scenario service after local crop parameters and soil assumptions are reviewed. Not installed or called in v1.2.0. Source/model licence and hosting cost still need review. |
| Configured Google Gemini | Fast multimodal visual description | Used only for consent-based observations. No newly trained specialist model, calibrated accuracy or crop-health certification is claimed. Provider quotas still apply. |

The defensible differentiation is the closed field loop: small inputs → reusable evidence → auditable decisions → tap updates → observed outcome → next season. Diagnosis chat or more forms alone are not a differentiated computation layer.

## Next implementation milestones

1. Expand sourced calendars and variety-duration evidence, prioritising the user's district and presentation regions. Separate current official advisory from historic screening evidence.
2. Integrate authorized soil evidence and enforce its source/date/coverage. Ask the farmer only to resolve missing information that actually changes a recommendation.
3. Prototype AquaCrop outside the Cloudflare request path as a bounded asynchronous scenario job. Start with crop-water risk ranges rather than point yield promises. Validate against real local outcomes and display assumptions and uncertainty.
4. Evaluate a specialist photo model before deployment: include real Indian field photos, backgrounds, non-crop negatives and supported classes. Split evaluation by farm/device to prevent leakage, use expert labels, measure per-crop errors and abstention, and calibrate scores. Compare against the current visual pipeline on the same held-out set.
5. Do not reuse the current photos for training: no raw-image persistence is authorized. A future opt-in research collection needs separate consent, retention/deletion rules, approved storage and expert labelling.
6. Add opt-in ongoing crop-cycle weather history as a separate design: v1.2.0 reads a recent seven-day window on demand; it is not a scheduled archival weather pipeline.

## Release verification

Calculation tests cover units, date boundaries, crop ownership relationships, windows, water assumptions, missing weather, recent-rain coverage, conflicting cycles and image-result abstention. Local D1 tests cover profile inheritance, ownership, retry safety, active-crop guards, one-tap deduplication, photo consent/data minimisation, harvest completion and cascade deletion. Desktop/mobile tests exercise minimal setup through sowing, activities, reload and harvest, plus the retained detailed/export flow. Synthetic browser screenshots are visually reviewed. Actual farm-photo accuracy and agronomic yield validation require labelled field evidence and are not implied by software tests.
