import { validCatalog } from "../../shared/localization";

export type TranslationSnapshot = {
  values: Record<string, string>;
  busy: boolean;
  background: boolean;
  failed: boolean;
  progress: number;
};

/** One request at a time. Recheck visible-page priorities before each batch. */
export function pageTranslator({
  source,
  initial,
  priority,
  fetchKeys,
  changed,
  idle = () => new Promise<void>((resolve) => setTimeout(resolve, 400)),
}: {
  source: Record<string, string>;
  initial: Record<string, string>;
  priority: () => string[];
  fetchKeys: (keys: string[]) => Promise<Record<string, string>>;
  changed: (value: TranslationSnapshot) => void;
  idle?: () => Promise<void>;
}) {
  const values = { ...initial };
  let running = false,
    stopped = false,
    failed = false;
  const all = Object.keys(source);
  const missing = (keys: string[]) =>
    [...new Set(keys)].filter(
      (key) =>
        Object.prototype.hasOwnProperty.call(source, key) &&
        !validCatalog({ [key]: source[key] }, { [key]: values[key] }),
    );
  const publish = () => {
    const remaining = missing(all).length;
    const foreground = missing(priority()).length > 0;
    if (!stopped)
      changed({
        values: { ...values },
        busy: foreground,
        background: remaining > 0 && !foreground,
        failed,
        progress: Math.round((100 * (all.length - remaining)) / all.length),
      });
  };
  async function pump() {
    if (running || stopped || failed) return;
    running = true;
    try {
      while (!stopped) {
        let urgent = missing(priority());
        if (!urgent.length) {
          if (!missing(all).length) break;
          await idle();
          if (stopped) break;
          urgent = missing(priority());
        }
        const keys = urgent.length
          ? urgent.slice(0, 24)
          : missing(all).slice(0, 24);
        if (!keys.length) break;
        const result = await fetchKeys(keys);
        if (stopped) break;
        const requested = Object.fromEntries(
          keys.map((key) => [key, source[key]]),
        );
        if (!validCatalog(requested, result))
          throw new Error("Incomplete page translation");
        for (const key of keys) values[key] = result[key];
        publish();
      }
    } catch {
      failed = true;
    } finally {
      running = false;
      publish();
    }
  }
  return {
    wake() {
      publish();
      void pump();
    },
    retry() {
      failed = false;
      this.wake();
    },
    stop() {
      stopped = true;
    },
  };
}
