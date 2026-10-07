import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// No server secret is read locally. The Worker calls data.gov.in with its secret.
// Only a new disposable anonymous Firebase identity is created and then deleted.
const asset = readdirSync("dist/assets").find((name) =>
  /^index-.*\.js$/.test(name),
);
const publicKey = readFileSync(`dist/assets/${asset}`, "utf8").match(
  /AIza[A-Za-z0-9_-]{35}/,
)?.[0];
assert.ok(publicKey, "Configured public Firebase web key is required");
const endpoint =
  "https://mybharat-agroman-api.agroman.workers.dev/v1/market/mandi/sample?limit=5";
const account = async (operation, body) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${publicKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    },
  );
  assert.ok(
    response.ok,
    `Disposable account operation returned HTTP ${response.status}`,
  );
  return response.json();
};
const unauthenticated = await fetch(endpoint, {
  signal: AbortSignal.timeout(15000),
});
assert.equal(unauthenticated.status, 401);
console.log(JSON.stringify({ unauthenticatedAccess: "blocked" }));
const session = await account("signUp", { returnSecureToken: true });
try {
  const response = await fetch(endpoint, {
    headers: {
      Origin: "https://mybharat-agroman.web.app",
      Authorization: `Bearer ${session.idToken}`,
    },
    signal: AbortSignal.timeout(25000),
  });
  console.log(JSON.stringify({ mandiEndpointStatus: response.status }));
  const result = await response.json();
  assert.ok(response.ok, String(result.error ?? "Mandi sample unavailable"));
  assert.equal(
    result.source?.resourceId,
    "9ef84268-d588-465a-a308-a864a43d0070",
  );
  assert.ok(Array.isArray(result.records) && result.records.length <= 5);
  assert.equal(result.mode, "live");
  // Response contains only whitelisted public source metadata and price rows.
  console.log(JSON.stringify(result, null, 2));
} finally {
  await account("delete", { idToken: session.idToken });
  console.log(JSON.stringify({ temporaryAnonymousSessionRemoved: true }));
}
