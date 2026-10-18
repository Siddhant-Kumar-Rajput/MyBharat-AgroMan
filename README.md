# My Bharat Agroman

My Bharat Agroman is a mobile-first farming and advisory application created for the MY Bharat hackathon. It helps farmers keep a simple season record, understand the evidence available for their field, ask for practical guidance and share crop concerns for community visibility and authorized human review.

The application is a working prototype. Its demonstration data is synthetic, and it is not a government-operated service.

**Try the web application:** [mybharat-agroman.web.app](https://mybharat-agroman.web.app/)

## What farmers can do

- Explore as a guest or sign in with Google to save a profile and farm records. Phone verification is optional.
- Choose a language at entry or from the shared navigation. English and Hindi are bundled; other listed Indian languages use on-demand translation and depend on provider availability. Translation quality is not certified.
- Set up a basic field profile with area, water availability and the current crop or previous harvest.
- Use **My Farm Advisor** to review crop age, harvest history, approximate weather and the crop-calendar evidence available for a region. The advisor computes useful summaries and can request a consent-based AI planning check.
- Ask **My Bharat Agroman** questions by text or voice. Voice transcription uses Whisper through Cloudflare Workers AI; the transcript can be edited before sending. Read-aloud depends on the device voice and configured speech services.
- Use **Check Visible Growth** to request a consent-based description of a resized crop photo. The application saves the derived observation rather than the photo.
- Keep season activities, inputs and harvests in **My Farm Diary**. Optional finance records total the income and expenses entered by the farmer.
- Open official market and export-information links through **My Opportunities** to research possible selling routes.
- View approximate, consented concerns on the **Community Watch** city map. Authorized reviewers can assess concerns, publish prevention guidance, flag possible spread risk or mark an assessment resolved.

## How the advisory works

The application reuses a small amount of farmer-provided information and performs calculations such as area conversion, crop age, time since harvest and summaries of recorded income and expenses. It uses approximate, model-estimate weather and selected sourced crop calendars where available. Missing soil evidence remains visible; the application does not infer a soil laboratory result or fertilizer dose from a PIN code.

Google Gemini supports agricultural chat, consent-based planning and visible-growth photo observations. AI output is decision support and does not establish a definitive diagnosis or guarantee yield or profit. Community risk and resolution labels come from an authorized human review. Reviewer access is explicitly granted by the project owner; a Google login alone does not grant it.

## Run locally

Install the project dependencies and start the web application:

```sh
npm ci
npm run dev
```

Open the local address shown by Vite. Local development uses clearly labelled synthetic demonstration data unless live mode is explicitly configured. No production credentials should be added to source control.

Useful project checks:

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

For Firebase and Cloudflare Worker configuration, see [docs/SETUP.md](docs/SETUP.md). To understand reviewer access and the review workflow, see [docs/EXPERT_REVIEW_ACCESS.md](docs/EXPERT_REVIEW_ACCESS.md). Keep local values in ignored environment files such as `worker/.dev.vars`; never commit API keys, tokens, phone numbers or other secrets.

## Current boundaries

- Weather is an approximate model estimate for a saved place, not a measurement from the farmer's field or an official severe-weather warning.
- Crop-calendar coverage is limited to selected sourced regions. A nationwide location directory does not mean nationwide crop recommendations are available.
- There is no connected field soil-report service, fertilizer-dose estimator, live buyer-matching system or export-demand feed.
- My Finances summarizes entries the farmer has recorded; it is not an audited profit statement or earnings forecast.
- Community review is an application workflow. It does not guarantee expert availability, a response time or professional qualification verification.
- The prototype has not been validated through a farmer pilot or an independent agronomic evaluation.

## Technology

- **Web application:** React, TypeScript and Vite
- **Authentication:** Firebase Authentication
- **Application API and records:** Cloudflare Workers and D1
- **AI services:** Google Gemini for agricultural guidance and photo observations; Cloudflare Workers AI for speech transcription and interface translation
- **Weather and maps:** Open-Meteo estimates and OpenStreetMap tiles
