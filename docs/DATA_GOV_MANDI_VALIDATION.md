# data.gov.in mandi sample: validation record

Historical record: the experimental endpoint, client and diagnostic script were
removed in v1.5.1 at the user's request. The application keeps official market
links only. The existing Cloudflare secret is unused and was not modified.

Checked on 8 October 2026. Backend-only release: v1.5.0.

## Actual result

- The configured Cloudflare Worker has a `DATA_GOV_API_KEY` secret binding.
  Its value was not retrieved, copied locally or printed.
- Added and deployed `GET /v1/market/mandi/sample?limit=5` on
  `https://mybharat-agroman-api.agroman.workers.dev`.
- Unauthenticated requests returned HTTP 401.
- Two authenticated five-record attempts returned HTTP 502 with the sanitized
  error `The mandi provider could not complete the request.` The failure occurred
  during the upstream fetch, before any HTTP response could be validated.
- A separate keyless diagnostic from the workstation resolved the official API
  hostname but failed with `UND_ERR_CONNECT_TIMEOUT`. This does not establish a
  nationwide outage or invalid credentials.
- No public price records were retrieved. Dates, units, freshness, geographical
  coverage and the validity of the configured key remain unverified.
- Each diagnostic created and deleted only its own temporary anonymous Firebase
  identity. No existing user account or farmer record was accessed.

Worker version containing final diagnostics:
`d16ca310-efc9-462a-bd09-53232c34c254`.

## Endpoint scope and protections

The fixed upstream is the official HTTPS API resource
`9ef84268-d588-465a-a308-a864a43d0070`. The
[official government dataset catalog](https://karnataka.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi)
describes daily wholesale minimum, maximum and modal commodity prices generated
through AGMARKNET. Its catalog update timestamp is not proof of individual row
freshness or API availability.

The only accepted caller input is a sample limit from 1 to 10, default 5.
Duplicate parameters, provider URLs, PINs, state filters and other parameters
are rejected. The provider receives the server-held API key and public resource
query parameters, not Firebase credentials, farmer identity, saved location or
farm records. No dataset import or market-data persistence is performed.
Existing authenticated per-user quota counters are maintained normally.

The endpoint uses a 12-second timeout, blocks redirects, strips unapproved
response fields and never returns upstream bodies, generated request URLs,
exception text or the key. Network, non-JSON and unexpected-schema failures are
explicit errors with no synthetic fallback. Requests have an additional limit
of 10 per authenticated user per day.

Successful responses will expose record dates, public field metadata, missing
values, source attribution and freshness warnings. No price unit is assumed:
`priceUnit` remains `null` until resource-specific evidence establishes it.
A small national sample is not a district-coverage guarantee, nearby-market
recommendation, future-price prediction or export-demand signal.

## Verification and next step

`npm run check` passed: frontend, Functions and Worker builds succeeded; all 101
tests across 13 files passed. Provider tests use explicitly synthetic local fixtures, not evidence of
real market prices. `node scripts/mandi-sample-smoke.mjs` checks the deployed
endpoint with a disposable anonymous identity, prints only sanitized results
and deletes that identity afterward. The live sample check currently fails.

To distinguish key validity from connectivity, use data.gov.in's own API preview
for this resource with the key in the user's account. Share only the HTTP status
and redacted response/error, never the key or a request URL containing it. After
connectivity and credentials are verified, repeat the bounded diagnostic before
building nearby-market matching or net-proceeds comparisons.

No Firebase Hosting deployment, frontend change, new secret, paid service,
farmer-data sharing, export listing or buyer contact was part of this release.
