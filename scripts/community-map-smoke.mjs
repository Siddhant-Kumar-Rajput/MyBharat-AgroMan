import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Uses only a temporary anonymous account; never writes farmer records.
const key = readFileSync(".env.local", "utf8").match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1].trim();
assert.ok(key, "Configured Firebase public API key is required.");
async function firebase(path, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert.ok(response.ok, `Firebase ${path}: ${response.status}`);
  return response.json();
}
const guest = await firebase("signUp", { returnSecureToken: true });
try {
  async function lookup(location) {
    const response = await fetch(`https://mybharat-agroman-api.agroman.workers.dev/v1/locations/map?${new URLSearchParams(location)}`, {
      headers: { authorization: `Bearer ${guest.idToken}`, Origin: "https://mybharat-agroman.web.app" },
    });
    return { status: response.status, result: await response.json() };
  }
  const location = { state: "Uttarakhand", district: "Nainital", locality: "Anandpur", pincode: "263139" };
  const haldwani = await lookup(location);
  assert.equal(haldwani.status, 200);
  assert.match(haldwani.result.name, /haldwani/i);
  assert.equal(haldwani.result.scope, "place");
  assert.equal(haldwani.result.latitude, 29.22);
  assert.equal(haldwani.result.longitude, 79.53);
  assert.ok(!("pincode" in haldwani.result) && !("locality" in haldwani.result));
  const manual = await lookup({ ...location, locality: "Haldwani", pincode: "" });
  assert.equal(manual.status, 200);
  assert.match(manual.result.name, /haldwani/i);
  const wrong = await lookup({ ...location, locality: "Unknown office" });
  assert.equal(wrong.status, 404);
  const ludhiana = await lookup({ state: "Punjab", district: "Ludhiana", locality: "Ludhiana", pincode: "" });
  assert.equal(ludhiana.status, 200);
  assert.match(ludhiana.result.name, /ludhiana/i);
  console.log(JSON.stringify({ communityMapApi: "passed", savedPinParent: haldwani.result.name, cityCenter: [haldwani.result.latitude, haldwani.result.longitude], manualCity: "passed", ludhiana: "passed", invalidLocationRejected: true, farmerRecordsWritten: false }));
} finally {
  await firebase("delete", { idToken: guest.idToken });
  console.log(JSON.stringify({ temporaryGuestCleanup: "passed" }));
}
