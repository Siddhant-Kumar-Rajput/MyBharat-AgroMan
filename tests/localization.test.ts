import { describe, expect, it } from "vitest";
import { english } from "../src/lib/i18n";
import { hindi } from "../src/lib/hi";

describe("bundled Hindi catalog", () => {
  it("covers every current UI key without a provider request", () => {
    expect(Object.keys(hindi).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english) as Array<keyof typeof english>)
      expect(hindi[key].length, key).toBeGreaterThan(0);
  });
  it("preserves the exact interpolation tokens, including names and day counts", () => {
    for (const key of Object.keys(english) as Array<keyof typeof english>)
      expect(hindi[key].match(/\{[^}]+\}/g) ?? [], key).toEqual(
        english[key].match(/\{[^}]+\}/g) ?? [],
      );
  });
  it("includes native-script field and photo-consent copy", () => {
    expect(hindi.smartTitle).toMatch(/[\u0900-\u097f]/);
    expect(hindi.smartPhotoConsent).toContain("Google Gemini");
    expect(hindi.smartWindowSoon).toContain("{days}");
  });
});
