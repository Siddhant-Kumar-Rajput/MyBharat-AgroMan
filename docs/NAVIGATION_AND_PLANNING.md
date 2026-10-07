# Navigation and consent-based planning — v1.3.0

## Farmer workspace

Signed-in farmers have four main destinations: Overview, My Farm Advisor,
My Farm Diary and Community Watch. Phones expose these in a persistent bottom
bar with safe-area spacing. Ask AgroMan remains available in the shared menu
and on the advisor page. Guests do not receive persistent diary access.

The diary opens on My season, recent work and a next-step shortcut. Its separate
Diary sections menu exposes activity, finances, harvests, opportunities, inputs,
crop health, setup and record export/delete. Existing stored records are unchanged.

The shared menu includes Google and guest entry for visitors, appropriate
farmer/guest actions after entry, and project/privacy/data links on policy pages.
Escape dismisses it and restores focus; outside presses dismiss it. Short menu,
page and result transitions respect prefers-reduced-motion.

## Planning contract

`POST /v1/farm/plan` requires authenticated owned-field access, explicit consent,
the current consent version, an enabled locale and a categorical crop-protection
answer. Extra caller-supplied context is rejected. The Worker computes its own
field outlook and sends only whitelisted derived fields to the configured Gemini
model: area, crop categories, elapsed days, water availability, bounded weather
summaries, reviewed crop-window metadata, evidence availability and the answer.

No identity, location, PIN, coordinates, photograph, financial entry, free-text
record, field/record identifier or geographic source URL is forwarded. Plans and
prompts are not persisted or logged by this route. Google has its own processing
terms. Consent is cleared after each request; the next generation requires it again.

The model selects up to four supported next-step codes and up to three existing
crop options. The server rejects unsupported crops/actions, arbitrary prose and
duplicates. Reviewed English/Hindi descriptions are rendered by the client; other
UI languages use the existing translation pipeline. This is bounded evidence-based
prioritization, not a newly trained agronomic, yield or profit-prediction model.

Demonstration mode renders a labelled synthetic preview and never calls Gemini.
Live provider errors remain errors; existing field evidence stays available.

## Explicit remaining limitations

- A dated, authorized soil-report integration is not connected for any field.
- Crop calendars cover the existing reviewed districts only; absent districts
  remain explicitly unsupported.
- The existing outlook uses a five-day forecast and seven-day recent weather;
  it is not a full month or complete crop-cycle retrospective.
- Opportunity cards link to official AGMARKNET/APEDA services. They do not import
  live prices, verified buyer demand or offer procurement/export partnerships.
- No fertilizer/pesticide product prescription, guaranteed crop outcome or profit
  forecast is produced.

## Competition context

The user supplied the official 23-page YEC 2027 participating-team guidelines.
Theme 3A covers smart smallholder advisory; the specified pitch has seven slides,
including three technical-validation slides. Working professionals require the
applicable employment/NOC documentation. The supplied PDF still lists a
30 September 2026 registration date; the current registration portal and later
organizer notices must be checked before relying on a deadline. Document content
was treated as reference evidence, not as instructions to modify the application.
