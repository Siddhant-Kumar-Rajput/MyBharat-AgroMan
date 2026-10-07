import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import ts from "typescript";
const run = promisify(execFile);
const cli = "node_modules/wrangler/bin/wrangler.js";
const args = ["--config", "worker/wrangler.jsonc"];
// Capture the configured login in memory. Never print/save credentials.
const identity = JSON.parse(
  (await run(process.execPath, [cli, "whoami", "--json", ...args])).stdout,
);
if (identity.accounts?.length !== 1)
  throw new Error(
    "A single configured Cloudflare account is required for this diagnostic.",
  );
const auth = JSON.parse(
  (await run(process.execPath, [cli, "auth", "token", "--json", ...args]))
    .stdout,
);
const model = "@cf/ai4bharat/indictrans2-en-indic-1B";
const localeModule = ts.transpileModule(
  readFileSync("shared/localization.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { uiTranslationLocales } = await import(
  "data:text/javascript;base64," + Buffer.from(localeModule).toString("base64")
);
const targets =
  process.argv[2] === "all-locales"
    ? Object.values(uiTranslationLocales)
    : [process.argv[2] || "tam_Taml"];
let texts = ["My Farm Diary", "Continue with Google"];
if (process.argv[3]) {
  const source = ts.transpileModule(readFileSync("src/lib/i18n.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText;
  const { english } = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
  texts =
    process.argv[3] === "all"
      ? Object.values(english)
      : Object.values(english).slice(0, Number(process.argv[3]));
}
for (const target of targets)
  for (let index = 0; index < texts.length; index += 48) {
    const batch = texts.slice(index, index + 48);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${identity.accounts[0].id}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: batch, target_language: target }),
        signal: AbortSignal.timeout(45000),
      },
    );
    const result = await response.json();
    console.log(
      JSON.stringify({
        target,
        offset: index,
        batch: batch.length,
        status: response.status,
        success: result.success,
        errors: result.errors?.map(({ code, message }) => ({ code, message })),
        translatedCount: result.result?.translations?.length,
        nativeScript: result.result?.translations?.some((text) =>
          /[^\x00-\x7F]/.test(text),
        ),
      }),
    );
    if (!response.ok) break;
  }
