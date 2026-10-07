import { describe, expect, it, vi } from "vitest";
import {
  pageTranslator,
  type TranslationSnapshot,
} from "../src/lib/page-translation";

describe("visible-page translation scheduler", () => {
  it("publishes the open page before background work and prioritizes a newly opened page", async () => {
    const source = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`k${i}`, `Public label ${i}`]),
    );
    let priority = ["k90", "k91"];
    const batches: string[][] = [];
    let releaseBackground!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseBackground = resolve;
    });
    const changed = vi.fn((_snapshot: TranslationSnapshot) => {});
    const translator = pageTranslator({
      source,
      initial: {},
      priority: () => priority,
      changed,
      idle: () => gate,
      fetchKeys: async (keys) => {
        batches.push(keys);
        return Object.fromEntries(
          keys.map((key) => [key, `தமிழ் ${source[key]}`]),
        );
      },
    });
    translator.wake();
    await vi.waitFor(() =>
      expect(
        changed.mock.calls.some(
          ([snapshot]) =>
            !snapshot.busy && snapshot.background && snapshot.values.k90,
        ),
      ).toBe(true),
    );
    expect(batches).toEqual([["k90", "k91"]]);
    priority = ["k80", "k81"];
    releaseBackground();
    await vi.waitFor(() => expect(batches.length).toBeGreaterThan(1));
    expect(batches[1]).toEqual(priority);
    translator.stop();
  });
  it("retains completed page text on failure, resumes retries, and never accepts broken placeholders", async () => {
    const source = { first: "Namaste {name}", next: "Next page" };
    const changed = vi.fn((_snapshot: TranslationSnapshot) => {});
    let reject = true;
    const translator = pageTranslator({
      source,
      initial: { first: "தமிழ் {name}" },
      priority: () => ["first", "next"],
      changed,
      idle: async () => {},
      fetchKeys: async () => {
        if (reject) throw new Error("Unavailable");
        return { next: "தமிழ்" };
      },
    });
    translator.wake();
    await vi.waitFor(() =>
      expect(changed.mock.lastCall?.[0]).toMatchObject({
        failed: true,
        values: { first: "தமிழ் {name}" },
      }),
    );
    reject = false;
    translator.retry();
    await vi.waitFor(() =>
      expect(changed.mock.lastCall?.[0]).toMatchObject({
        busy: false,
        failed: false,
        background: false,
      }),
    );
    translator.stop();
    const invalid = vi.fn((_snapshot: TranslationSnapshot) => {});
    const other = pageTranslator({
      source,
      initial: {},
      priority: () => ["first"],
      changed: invalid,
      fetchKeys: async () => ({ first: "தமிழ் {wrong}" }),
    });
    other.wake();
    await vi.waitFor(() =>
      expect(invalid.mock.lastCall?.[0]).toMatchObject({
        failed: true,
        values: {},
      }),
    );
    other.stop();
  });
  it("discards a response from a cancelled language session", async () => {
    let complete!: (value: Record<string, string>) => void;
    const response = new Promise<Record<string, string>>((resolve) => {
      complete = resolve;
    });
    const changed = vi.fn();
    const translator = pageTranslator({
      source: { title: "Title" },
      initial: {},
      priority: () => ["title"],
      changed,
      fetchKeys: () => response,
    });
    translator.wake();
    translator.stop();
    changed.mockClear();
    complete({ title: "தமிழ்" });
    await response;
    await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
  });
});
