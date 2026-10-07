# Compact help, onboarding and languages — v1.4.1

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
- The browser observes which static copy keys the open page actually uses,
  including newly opened menus and panels. It requests those first in batches
  of at most 24 keys and displays each validated batch immediately. Remaining
  pages load through small background batches. Navigation gets priority before
  the next batch; an already-running request may finish first.
- The server accepts only existing catalog keys (maximum 96 per request), never
  arbitrary caller text. The existing full-catalog contract remains compatible.
  Cached exact-source pairs are atomically merged in D1. Browser caches store
  source/translation pairs, so unchanged labels survive later catalog edits.
- Each returned label must preserve exact interpolation tokens. Names and counts
  are inserted locally, not submitted to the translation provider.
- The interface may temporarily mix translated labels and English fallbacks.
  An explicit current-page loading notice and machine-translation disclosure
  explain this. A failure does not erase completed translations; retry resumes
  missing labels. Switching languages ignores the old session's late response.
- Hindi and English still need no inference. Background activity never blocks
  navigation or the language chooser. No guaranteed cold-load latency is claimed.
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

The visible information icon is now 15px without a large coloured button shell;
the transparent 44px touch target remains accessible on mobile.
