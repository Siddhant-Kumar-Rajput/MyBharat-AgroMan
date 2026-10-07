import { english } from "../../src/lib/i18n";
import { hindi } from "../../src/lib/hi";
import {
  tokens,
  uiTranslationLocales,
  validCatalog,
  type UiTranslationResult,
} from "../../shared/localization";
import type { Env } from "./index";
import { ApiError } from "./errors";

// Cache reviewed UI source strings, never caller text or identity. Completed
// batches survive provider outages and catalog additions. Page requests contain
// only whitelisted static keys; they never translate caller text or record values.
export const isUiKey = (key: string) => Object.hasOwn(english, key);
type CachedStrings = Record<string, string>;
const inFlight = new Map<
  string,
  Promise<UiTranslationResult<Record<string, string>>>
>();
async function translate(
  env: Env,
  locale: string,
  incremental: boolean,
  keys?: string[],
): Promise<UiTranslationResult<Record<string, string>>> {
  if (
    keys &&
    (!keys.length || keys.length > 96 || keys.some((key) => !isUiKey(key)))
  )
    throw new ApiError(422, "Only supported static UI keys can be translated.");
  const source = keys
    ? Object.fromEntries(
        keys.map((key) => [key, english[key as keyof typeof english]]),
      )
    : english;
  if (locale === "en" || locale === "hi")
    return {
      status: "complete",
      copy: keys
        ? Object.fromEntries(
            keys.map((key) => [
              key,
              (locale === "hi" ? hindi : english)[key as keyof typeof english],
            ]),
          )
        : locale === "hi"
          ? hindi
          : english,
    };
  const target =
    uiTranslationLocales[locale as keyof typeof uiTranslationLocales];
  if (!target)
    throw new ApiError(422, "Translation is unavailable for this language.");
  const cacheKey = `source-safe-ui-v3:${locale}`;
  const cached = await env.DB.prepare(
    "SELECT copy_json FROM translations WHERE cache_key = ?",
  )
    .bind(cacheKey)
    .first<{ copy_json: string }>();
  let store: CachedStrings = {};
  try {
    if (cached) {
      const parsed = JSON.parse(cached.copy_json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        store = parsed;
    }
  } catch {
    /* Rebuild an invalid UI cache, not farmer data. */
  }
  const values = [...new Set(Object.values(source))];
  const usable = (source: string) =>
    typeof store[source] === "string" &&
    !!store[source].trim() &&
    JSON.stringify(tokens(source).sort()) ===
      JSON.stringify(tokens(store[source]).sort());
  const missing = values.filter((source) => !usable(source));
  const limit = incremental ? 96 : missing.length;
  for (let offset = 0; offset < Math.min(missing.length, limit); offset += 48) {
    const batch = missing.slice(offset, Math.min(offset + 48, limit));
    let translated: string[];
    try {
      const result = await env.AI.run("@cf/ai4bharat/indictrans2-en-indic-1B", {
        text: batch,
        target_language: target,
      });
      translated = result.translations;
    } catch (error) {
      // Codes and exception types only: never log upstream text or credentials.
      const code =
        error instanceof Error
          ? error.message.match(/\b(?:30\d{2}|50\d{2})\b/)?.[0]
          : undefined;
      console.error("UI translation provider rejected", {
        type: error instanceof Error ? error.name : "UnknownError",
        code,
      });
      throw new ApiError(
        503,
        "UI translation is temporarily unavailable. Completed progress is saved; retry this language.",
      );
    }
    if (
      !Array.isArray(translated) ||
      translated.length !== batch.length ||
      translated.some((text) => typeof text !== "string" || !text.trim())
    )
      throw new ApiError(
        502,
        "UI translation was incomplete. Retry this language.",
      );
    for (let index = 0; index < batch.length; index++) {
      const source = batch[index];
      const placeholders = tokens(source);
      let cursor = 0;
      let value = translated[index].replace(
        /\{[^}]+\}/g,
        (match) => placeholders[cursor++] ?? match,
      );
      if (
        cursor !== placeholders.length ||
        tokens(value).length !== placeholders.length
      ) {
        // Preserve tokens exactly by translating only the public sentence parts.
        const fragments = source.split(/(\{[^}]+\})/g);
        const parts = fragments.filter(
          (part) => part.trim() && !/^\{[^}]+\}$/.test(part),
        );
        const result = await env.AI.run(
          "@cf/ai4bharat/indictrans2-en-indic-1B",
          { text: parts.map((part) => part.trim()), target_language: target },
        );
        if (result.translations?.length !== parts.length)
          throw new ApiError(
            502,
            "UI translation did not preserve placeholders.",
          );
        let partIndex = 0;
        value = fragments
          .map((part) =>
            !part.trim() || /^\{[^}]+\}$/.test(part)
              ? part
              : `${part.match(/^\s*/)?.[0] ?? ""}${result.translations[partIndex++]}${part.match(/\s*$/)?.[0] ?? ""}`,
          )
          .join("");
      }
      if (!validCatalog({ value: source }, { value }))
        throw new ApiError(
          502,
          "UI translation did not preserve placeholders.",
        );
      store[source] = value;
    }
    await env.DB.prepare(
      "INSERT INTO translations (cache_key, copy_json, created_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET copy_json = CASE WHEN json_valid(translations.copy_json) THEN json_patch(translations.copy_json, excluded.copy_json) ELSE excluded.copy_json END, created_at = excluded.created_at",
    )
      .bind(cacheKey, JSON.stringify(store), Date.now())
      .run();
  }
  const completed = values.filter(usable).length;
  if (completed < values.length)
    return { status: "pending", completed, total: values.length };
  const copy = Object.fromEntries(
    Object.entries(source).map(([key, source]) => [key, store[source]]),
  );
  if (!validCatalog(source, copy))
    throw new ApiError(502, "UI translation was incomplete.");
  return { status: "complete", copy: copy as typeof english };
}
export async function translateUi(
  env: Env,
  locale: string,
  incremental = false,
  keys?: string[],
) {
  const key = `${env.FIREBASE_PROJECT_ID}:${locale}:${incremental}:${keys ? [...new Set(keys)].sort().join(",") : "all"}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = translate(env, locale, incremental, keys).finally(() =>
      inFlight.delete(key),
    );
    inFlight.set(key, pending);
  }
  const result = await pending;
  if (!incremental && result.status === "complete") return result.copy;
  return result;
}
