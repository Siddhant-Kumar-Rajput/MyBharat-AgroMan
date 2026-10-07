import { describe, expect, it, vi } from "vitest";
import { resolveCommunityMapPlace } from "../shared/community-map";

const location = { state: "Uttarakhand", district: "Nainital", locality: "Anandpur", pincode: "263139" };
const office = { ...location, name: "Anandpur", block: "Haldwani" };
const haldwani = { name: "Haldwani", latitude: 29.22254, longitude: 79.5286, admin1: "Uttarakhand", admin2: "Nainital" };

describe("community place resolution, independent of weather and reviewed boundaries", () => {
  it("maps a PIN locality to Haldwani rather than the Nainital hill town", async () => {
    const geocode = vi.fn(async () => [haldwani]);
    const result = await resolveCommunityMapPlace(location, { postal: async () => [office], geocode });
    expect(geocode).toHaveBeenCalledExactlyOnceWith("Haldwani");
    expect(result).toMatchObject({ name: "Haldwani", scope: "place", latitude: 29.22, longitude: 79.53 });
    expect(result).not.toHaveProperty("pincode");
    expect(result).not.toHaveProperty("locality");
  });
  it("never replaces an invalid PIN/locality with a different town", async () => {
    const geocode = vi.fn();
    expect(await resolveCommunityMapPlace({ ...location, locality: "Unknown office" }, { postal: async () => [office], geocode })).toBeNull();
    expect(geocode).not.toHaveBeenCalled();
  });
  it("uses and honestly labels a district fallback if a town is not indexed", async () => {
    const result = await resolveCommunityMapPlace(location, {
      postal: async () => [office],
      geocode: async (name) => name === "Nainital" ? [{ ...haldwani, name: "Nainital", latitude: 29.39 }] : [],
    });
    expect(result).toMatchObject({ name: "Nainital", scope: "district", latitude: 29.39 });
  });
  it("rejects same-named places in another district or state", async () => {
    expect(await resolveCommunityMapPlace(location, {
      postal: async () => [office], geocode: async () => [{ ...haldwani, admin1: "Punjab" }, { ...haldwani, admin2: "Another district" }],
    })).toBeNull();
  });
  it("supports directly chosen cities without sending a PIN", async () => {
    const postal = vi.fn();
    const result = await resolveCommunityMapPlace({ ...location, locality: "Haldwani", pincode: "" }, { postal, geocode: async () => [haldwani] });
    expect(result?.name).toBe("Haldwani");
    expect(postal).not.toHaveBeenCalled();
  });
  it("does not treat malformed coordinates as a valid map", async () => {
    expect(await resolveCommunityMapPlace(location, { postal: async () => [office], geocode: async () => [{ ...haldwani, latitude: NaN }] })).toBeNull();
  });
  it("recognizes a provider's District suffix without confusing Ludhiana East", async () => {
    const result = await resolveCommunityMapPlace({ state: "Punjab", district: "Ludhiana", locality: "Ludhiana", pincode: "" }, {
      postal: vi.fn(), geocode: async () => [{ ...haldwani, name: "Ludhiana", admin1: "Punjab", admin2: "Ludhiana district", admin3: "Ludhiana East" }],
    });
    expect(result).toMatchObject({ name: "Ludhiana", scope: "place" });
    expect(await resolveCommunityMapPlace({ state: "Punjab", district: "Ludhiana West", locality: "Ludhiana", pincode: "" }, {
      postal: vi.fn(), geocode: async () => [{ ...haldwani, name: "Ludhiana", admin1: "Punjab", admin2: "Ludhiana district", admin3: "Ludhiana East" }],
    })).toBeNull();
  });
});
