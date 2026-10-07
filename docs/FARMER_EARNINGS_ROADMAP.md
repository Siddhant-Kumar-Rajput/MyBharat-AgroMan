# Farmer earnings and export opportunities: current status and next build

Checked against official portals on 8 October 2026. This is a development plan,
not a claim that live market demand, matching or export transactions are connected.

## What is implemented

Diary → My Opportunities links to official mandi information, APEDA Farmer
Connect and APEDA AgriExchange. Diary also has a thin income/expense ledger,
harvest quantities and portable records. Existing crop windows and weather may
inform field planning, but they do not predict a crop's selling price or profit.
JSON/CSV record export is unrelated to agricultural export trade.

v1.5.0 adds a server-only, authenticated national mandi sample endpoint. Its live
validation currently fails at the upstream connection (HTTP 502); no market rows
have been retrieved and API-key validity is not yet established. This is not a
live nearby-market UI or a profit/export-demand integration. See
[the validation record](DATA_GOV_MANDI_VALIDATION.md).

## What is not implemented

- Live nearby mandi price ingestion, commodity/variety/grade matching and price freshness.
- Net-proceeds comparison, break-even selling price or validated yield/profit forecasts.
- Export readiness assessment, verified matching, live demand scoring or transactions.
- A marketplace or agronomic approval system for pesticides/fertilizers.

## Recommended first useful release: Better selling decisions

1. Acquire a licensed/authorized dated mandi dataset through the user's configured
   project. The data.gov.in/Agmarknet acquisition method, required API key,
   rate limits and reuse terms must be checked before importing. Do not scrape
   restricted pages or invent an API key. Filter public data within AgroMan;
   do not send identity, records or finance to the source provider.
2. Match crop, variety, grade and market; display source, units and date. Stale,
   unmatched or missing data produces an explicit unavailable state, not a guess.
3. Compute net sale proceeds deterministically:
   saleable quantity × dated price − transport − packing − fees − other sale costs.
   Missing costs remain unknown; they are never assumed to be zero. Show ranges
   where valid min/max source prices exist. This is not whole-season profit unless
   production costs are also known. No yield forecast or future guaranteed price.
4. Compare a local market, a farther market and an actual provided FPO/buyer quote
   where available. Let the farmer edit only unknown costs; reuse the saved harvest.
5. Explain which assumptions change the result. AI may explain sourced evidence
   under a separately approved payload, but it must not manufacture prices, buyers,
   harvest yields or demand. Current Gemini planning consent excludes finance and
   free-text diary records; it cannot be silently expanded for this feature.

## Then: Export readiness, not an “export now” promise

- Start with crop/quantity/harvest date already saved; ask only missing grade,
  traceability and basic packing/storage information.
- Show readiness gaps and official guidance, without certifying a lot or guessing
  residue compliance. Destination-specific requirements need dated official sources.
- Direct smaller producers toward aggregation through an FPO and a verified
  exporter. APEDA Farmer Connect supports FPO/FPC/cooperative profiles, sell offers
  and exporter enquiries; linking it is not an AgroMan partnership or integration.
- Use APEDA AgriExchange statistics as dated trade context, not a prediction of
  future demand or an assured buyer. Listed leads require validation and expiry checks.
- Contact details, farmer identity and records are shared only after explicit consent.
  Do not create listings or contact/export to third parties without authorization.

## Potential AgroMan business model (proposal, not current revenue)

Keep basic farmer advice/community access free. Validate FPO subscriptions for
aggregate planning, record coordination and selling comparisons with actual FPOs
before claiming traction. A later clearly disclosed verified-transaction fee needs
contracts, consent, dispute handling and no incentive to bias crop/input advice.
Paid pesticide promotion must never override safety or recommendation quality.

## Official resources

- [APEDA AgriExchange](https://agriexchange.apeda.gov.in/Home/): trade statistics,
  market intelligence, regulations, exporter/packhouse directories and buy/sell leads.
- [APEDA Farmer Connect](https://farmerconnect.apeda.gov.in/Home/): FPO/cooperative
  and exporter connection, offers and enquiries.
- [eNAM FPO information](https://www.enam.gov.in/web/stakeholders-Involved/fpos):
  aggregation and registration channels; not proof AgroMan can trade on their behalf.

No market credentials, external account registrations, paid billing, dataset
imports or buyer communications were performed in the v1.4.1 UI release.
