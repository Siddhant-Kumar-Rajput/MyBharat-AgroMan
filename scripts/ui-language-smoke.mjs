import { readFileSync, readdirSync } from "node:fs";

// Use only the already-published Firebase web API key. No server secret or
// existing farmer session is read. Delete only the anonymous account we create.
const asset = readdirSync("dist/assets").find((name) =>
  /^index-.*\.js$/.test(name),
);
const key = readFileSync(`dist/assets/${asset}`, "utf8").match(
  /AIza[A-Za-z0-9_-]{35}/,
)?.[0];
if (!key) throw new Error("Configured public Firebase web key not found.");
const locales = process.argv.slice(2);
if (!locales.length) throw new Error("Pass the UI locales to check.");
const api = "https://mybharat-agroman-api.agroman.workers.dev/v1/";
const firebase = async (path, body) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok)
    throw new Error(`Disposable Firebase session returned ${response.status}`);
  return response.json();
};
const session = await firebase("signUp", { returnSecureToken: true });
try {
  for (const locale of locales) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const response = await fetch(api + "translate/ui", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://mybharat-agroman.web.app",
          Authorization: `Bearer ${session.idToken}`,
        },
        body: JSON.stringify({ locale, incremental: true }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      console.log(
        JSON.stringify({
          locale,
          status: response.status,
          progress: result.status,
          completed: result.completed,
          total: result.total,
          keys: result.copy ? Object.keys(result.copy).length : 0,
          error: response.ok ? undefined : result.error,
        }),
      );
      if (!response.ok || result.status === "complete") break;
      if (result.status !== "pending")
        throw new Error("Unexpected translation contract.");
    }
  }
} finally {
  await firebase("delete", { idToken: session.idToken });
  console.log(JSON.stringify({ temporaryAnonymousSessionRemoved: true }));
}
