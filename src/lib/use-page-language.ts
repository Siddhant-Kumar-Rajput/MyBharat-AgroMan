import { useEffect, useMemo, useRef, useState } from "react";
import {
  validCatalog,
  type UiTranslationResult,
} from "../../shared/localization";
import { english, type Copy } from "./i18n";
import { request } from "./api";
import { pageTranslator, type TranslationSnapshot } from "./page-translation";

export const languageCacheKey = (locale: string) =>
  `agroman-ui-copy-v6-${locale}`;
function readCache(locale: string) {
  const values: Record<string, string> = {};
  try {
    const cached = JSON.parse(
      localStorage.getItem(languageCacheKey(locale)) ?? "null",
    );
    for (const [key, source] of Object.entries(english))
      if (
        cached?.source?.[key] === source &&
        validCatalog({ [key]: source }, { [key]: cached?.copy?.[key] })
      )
        values[key] = cached.copy[key];
  } catch {
    /* Invalid UI cache is ignored, never farm records. */
  }
  return values;
}
const empty: TranslationSnapshot = {
  values: {},
  busy: false,
  background: false,
  failed: false,
  progress: 0,
};
export function usePageLanguage(locale: string, scope: string, live: boolean) {
  const [state, setState] = useState(() => ({
    locale,
    ...empty,
    values: readCache(locale),
  }));
  const [retryCount, setRetryCount] = useState(0);
  const priority = useRef({ scope, keys: new Set<string>() });
  if (priority.current.scope !== scope)
    priority.current = { scope, keys: new Set() };
  const controller = useRef<ReturnType<typeof pageTranslator> | undefined>(
    undefined,
  );
  const scheduled = useRef(false);
  const activeValues = state.locale === locale ? state.values : {};
  const copy = useMemo(
    () =>
      new Proxy({ ...english, ...activeValues } as Copy, {
        get(target, key: string | symbol) {
          if (
            typeof key === "string" &&
            Object.prototype.hasOwnProperty.call(english, key) &&
            !priority.current.keys.has(key)
          ) {
            priority.current.keys.add(key);
            if (!scheduled.current) {
              scheduled.current = true;
              queueMicrotask(() => {
                scheduled.current = false;
                controller.current?.wake();
              });
            }
          }
          return Reflect.get(target, key);
        },
      }),
    [activeValues, scope, locale],
  );
  useEffect(() => {
    let cancelled = false;
    const initial = readCache(locale);
    localStorage.setItem("agroman-locale", locale);
    const display = (value: TranslationSnapshot) => {
      if (cancelled) return;
      const translated =
        locale !== "en" && Object.keys(value.values).length > 0;
      const language = translated ? locale : "en";
      document.documentElement.lang = language;
      document.documentElement.dir = ["ur", "ks", "sd"].includes(language)
        ? "rtl"
        : "ltr";
      setState({ locale, ...value });
      try {
        localStorage.setItem(
          languageCacheKey(locale),
          JSON.stringify({ source: english, copy: value.values }),
        );
      } catch {
        /* A full browser store must not block translation. */
      }
    };
    display({ ...empty, values: initial });
    if (locale === "hi") {
      display({
        ...empty,
        values: initial,
        busy: !validCatalog(english, initial),
      });
      void import("./hi")
        .then(({ hindi }) =>
          display({ ...empty, values: hindi, progress: 100 }),
        )
        .catch(() => display({ ...empty, values: initial, failed: true }));
    } else if (locale !== "en" && live) {
      const session = pageTranslator({
        source: english,
        initial,
        priority: () => [...priority.current.keys],
        changed: display,
        fetchKeys: async (keys) => {
          const result = await request<
            UiTranslationResult<Record<string, string>>
          >("translate/ui", { locale, incremental: true, keys });
          if (result.status !== "complete")
            throw new Error("Page batch did not complete");
          return result.copy;
        },
      });
      controller.current = session;
      session.wake();
    }
    return () => {
      cancelled = true;
      controller.current?.stop();
      controller.current = undefined;
    };
  }, [locale, live, retryCount]);
  return {
    copy,
    languageBusy: state.locale === locale && state.busy,
    languageFailed: state.locale === locale && state.failed,
    languageBackground: state.locale === locale && state.background,
    languageProgress: state.locale === locale ? state.progress : 0,
    retryLanguage: () => setRetryCount((value) => value + 1),
  };
}
