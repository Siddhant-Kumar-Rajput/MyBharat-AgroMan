# Compact help, onboarding and languages — v1.4.0

## Visible first-use help

New farmer sessions see a Quick tour invitation on the Overview dashboard until
the tour is completed in that browser. Menu → Quick tour replays it on landing,
farmer, guest and policy pages. Farmer steps cover location, advice, diary and
community; the visitor/guest guide explains the guest/account boundary.

Completion opens the field advisor but does not save a location, plot, crop or
synthetic record. It stores only a local completion flag, not an account UID.
Close/Escape and "Explore on my own" leave the current work intact.

Circular information buttons open an inline band, not a hover-only tooltip.
They support keyboard activation, focus restoration, Escape and 44px targets.
The UI hides background explanations, not provider consent choices, missing-data
states, essential restrictions or analysis results. Full policy documents remain
readable as documents.

## Text language behavior

- English and Hindi are complete bundled catalogs; Hindi requires no inference.
- The dropdown includes English and the 22 scheduled Indic languages, mapped to
  the documented IndicTrans2 script codes in `shared/localization.ts`.
- Other languages use the configured Cloudflare model. They are machine
  translated, not certified by native agricultural-language reviewers.
- Each UI request translates at most 96 unique static strings. The server caches
  successful source/translation pairs and atomically merges them in D1; progress
  survives a provider failure or another visitor's request. Catalog additions
  only require new/changed source strings, not every previous translation.
- Only a complete catalog with intact interpolation tokens is displayed. Names,
  day counts and similar placeholders remain values inserted by the app.
- During a cold load English stays visible with progress. Failure shows an
  explicit retry action. HTML language/direction matches the displayed catalog,
  not a failed requested language. Complete browser caches skip provider calls.
- No farmer identity, location, photos or record values are submitted for UI
  translation; only the application's static English copy is sent.

Cloudflare availability and account quotas still apply. This release does not
enable a paid plan or substitute synthetic translations after a live failure.
Text support does not imply speech support for every listed language.

## Diagnostics

```powershell
node scripts/ui-language-smoke.mjs ta pa bn
node scripts/translation-provider-probe.mjs all-locales
```

The first script uses the configured public web API key and deletes only its
own newly created anonymous Firebase test session. It touches translation caches,
not profiles or farm records. The provider probe captures the existing Cloudflare
login in memory and never prints/saves credentials; by default it submits two
public UI labels per target. A full-catalog probe consumes provider quota and is
an explicit opt-in (`tam_Taml all`), not a normal browser or unit test.

See `EXPERT_REVIEW_ACCESS.md` for owner-managed reviewer setup and the remaining
limitations of live case escalation/delivery.
