import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";

// Explicit opt-in test credentials only. Never overwrite an existing profile.
const phone = process.env.AGROMAN_FIELD_SMOKE_PHONE;
const code = process.env.AGROMAN_FIELD_SMOKE_CODE;
if (!phone || !code)
  throw new Error("Set the configured fictional Firebase test phone and code.");
const config = readFileSync(".env.local", "utf8");
const key = config.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1].trim();
const api = "https://mybharat-agroman-api.agroman.workers.dev/v1/";
const origin = "https://mybharat-agroman.web.app";
const date = (days = 0) =>
  new Date(Date.now() + 330 * 60000 + days * 86400000)
    .toISOString()
    .slice(0, 10);
async function firebase(path, body) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json();
  assert.equal(
    response.ok,
    true,
    `Firebase test ${path} failed with status ${response.status}`,
  );
  return result;
}
const session = await firebase("sendVerificationCode", {
  phoneNumber: phone,
  recaptchaToken: "NO_RECAPTCHA",
});
const login = await firebase("signInWithPhoneNumber", {
  sessionInfo: session.sessionInfo,
  code,
});
async function raw(
  path,
  body,
  method = body ? "POST" : "GET",
  token = login.idToken,
) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, result: await response.json() };
}
async function call(path, body, method) {
  const response = await raw(path, body, method);
  assert.ok(response.status < 300, `${path} returned ${response.status}`);
  return response.result;
}
const before = await call("profile");
assert.equal(
  before.profile,
  null,
  "Test account already has a profile. Stop without changing it.",
);
const marker = `Synthetic release check ${randomUUID().slice(0, 8)}`;
let created = false;
let guest;
try {
  await call("profile", {
    displayName: marker,
    locale: "en",
    state: "Uttarakhand",
    district: "Nainital",
    locality: "Anandpur",
    pincode: "263139",
    consentVersion: "2026-10-01",
  });
  created = true;
  const id = randomUUID();
  const setup = {
    id,
    area: 2,
    areaUnit: "acre",
    waterAccess: "supplemental",
    fieldState: "empty",
    previous: {
      cropCode: "RICE",
      harvestedOn: date(-20),
      quantity: 18,
      unit: "quintal",
    },
  };
  await call("farm/setup", setup);
  await call("farm/setup", setup);
  let outlook = await call(`farm/outlook?plotId=${id}`);
  assert.equal(outlook.previousYieldTonnesPerHa, 2.22);
  assert.equal(outlook.fieldState, "empty");
  assert.ok(
    outlook.weather,
    "Live weather was unavailable; do not claim this test passed.",
  );
  assert.equal(outlook.weather.forecastDays, 5);
  assert.equal(outlook.weather.recentDays, 7);
  assert.equal(typeof outlook.weather.referenceBalance5DaysMm, "number");
  const cycleId = randomUUID();
  await call("farm/start", {
    id: cycleId,
    plotId: id,
    cropCode: "WHEAT",
    startedOn: date(-7),
  });
  await call("farm/action", { cycleId, action: "irrigation" });
  await call("farm/action", { cycleId, action: "irrigation" });
  outlook = await call(`farm/outlook?plotId=${id}`);
  assert.equal(outlook.cropAgeDays, 7);
  assert.equal(outlook.actions.length, 1);
  guest = await firebase("signUp", { returnSecureToken: true });
  assert.equal(
    (await raw(`farm/outlook?plotId=${id}`, undefined, "GET", guest.idToken))
      .status,
    403,
  );

  const browser = await chromium.launch();
  let image;
  try {
    const page = await browser.newPage();
    image = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      context.fillStyle = "#648f52";
      context.fillRect(0, 0, 64, 64);
      return {
        mime: "image/jpeg",
        data: canvas.toDataURL("image/jpeg").split(",")[1],
      };
    });
  } finally {
    await browser.close();
  }
  assert.equal(
    (await raw("farm/photo", { cycleId, locale: "en", consent: false, image }))
      .status,
    400,
  );
  const observation = await call("farm/photo", {
    cycleId,
    locale: "en",
    consent: true,
    image,
  });
  assert.equal(
    observation.quality,
    "retake",
    "An artificial solid-colour image must be rejected.",
  );
  assert.equal(observation.stage, "undetermined");
  const records = await call("records");
  assert.equal(records.plots.length, 1);
  assert.equal(records.quickActions.length, 1);
  assert.equal(records.photoObservations.length, 1);
  assert.ok(
    !JSON.stringify(records).includes(image.data),
    "Photo bytes must not be saved.",
  );
  await call("farm/harvest", {
    id: randomUUID(),
    cycleId,
    harvestedOn: date(),
    quantity: 20,
    unit: "quintal",
  });
  outlook = await call(`farm/outlook?plotId=${id}`);
  assert.equal(outlook.fieldState, "empty");
  assert.equal(outlook.previousYieldTonnesPerHa, 2.47);
  console.log(
    JSON.stringify({
      liveFieldWorkflow: "passed",
      weatherLocation: outlook.weather.location,
      dailyDuplicateGuard: "passed",
      guestAccessDenied: true,
      insufficientPhotoRejected: true,
      storedPhotoBytes: false,
      harvestTransition: "passed",
    }),
  );
} finally {
  if (created) {
    const current = await call("profile");
    assert.equal(
      current.profile?.displayName,
      marker,
      "Profile changed during verification. Do not delete other work.",
    );
    await call("profile", undefined, "DELETE");
    assert.equal((await call("profile")).profile, null);
    console.log(JSON.stringify({ syntheticTestRecordCleanup: "passed" }));
  }
  if (guest) await firebase("delete", { idToken: guest.idToken });
}
