# MyBharat AgroMan Phase 2 activation and operations

Most setup is automated. The first live deployment is complete; this file records what was done and what still needs a project-owner decision.

## Completed

- Firebase project/web app `mybharat-agroman` linked; Anonymous and Phone Authentication enabled.
- Firebase Hosting deployed at `https://mybharat-agroman.web.app`.
- Cloudflare authenticated on this device.
- Worker deployed at `https://mybharat-agroman-api.agroman.workers.dev`.
- Gemini key stored as Cloudflare encrypted secret `GEMINI_API_KEY`.
- Sarvam key stored as Cloudflare encrypted secret `SARVAM_API_KEY`.
- APAC D1 database `mybharat-agroman` created with both migrations applied.
- Phase 2 Worker secrets include the record subject-isolation key and approved reviewer UID hash.
- Worker health, Hosting and production-origin CORS smoke tests passed.

No purchased domain is required for the hackathon. The Firebase URL already contains AgroMan.

## Manual work still required later

Only account/security decisions require the project owner:

1. Repair the phone reCAPTCHA lifecycle and complete the fictional-number OTP test.
2. Add and test the Google provider-linking interface.
3. Refresh the reviewed regional context/boundary snapshot when approved. The currently imported six-district snapshot is preserved at `scripts/generated/context-2026-09-15.sql` with SHA-256 `857ED0E54D12F869C1CA7248D1ECD40F8858831BD20F97A90E57279E0CAF55EA`.
4. Approve and configure Firebase App Check after reviewing staging behavior.
5. Approve expanded districts, refreshed observations and agronomic release evidence.

## Routine developer operations

Validate locally:

```sh
npm ci
npm run check
npm run test:e2e
```

Browser tests force `VITE_API_MODE=demo` through `.env.test`, so tests never consume live AI/data quotas. The ignored `.env.local` selects live mode for production builds.

Deploy the Worker and Hosting:

```sh
npx wrangler deploy --secrets-file worker/.dev.vars --config worker/wrangler.jsonc
npm run build
firebase deploy --only hosting --project mybharat-agroman
```

Refresh Earth Engine context:

```sh
python scripts/import_context.py --project YOUR_REVIEWED_EARTH_ENGINE_PROJECT --date YYYY-MM-DD
npx wrangler d1 execute mybharat-agroman --remote --file scripts/generated/context-YYYY-MM-DD.sql --config worker/wrangler.jsonc
```

Review every generated SQL file before import. The exporter refuses missing source observations rather than inventing values. Modeled soil is regional context, not a farm laboratory measurement.

## Secrets and privacy

- Never put Gemini/Sarvam keys, Cloudflare tokens, passwords or OTPs in source
  control or chat.
- Never silently substitute synthetic data in live mode.
- Images, audio and raw GPS coordinates must not be persisted or logged.
- Rotate the Gemini key in Cloudflare **Workers & Pages → mybharat-agroman-api → Settings → Variables and Secrets**.
- Rotate the Sarvam key in the same Cloudflare secret panel. Never expose it as
  a frontend environment variable.
- Keep App Check optional only during staging; enforce it before broader public use.
