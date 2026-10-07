import { expect, it, vi } from "vitest";
import { savedRegionReportPosition } from "../worker/src/community";
import { locationDistrictId } from "../shared/domain";

const profile = { state: "Uttarakhand", district: "Nainital", locality: "Anandpur", pincode: "263139" };
const place = { name: "Haldwani", state: profile.state, district: profile.district, latitude: 29.22254, longitude: 79.5286, scope: "place" as const, source: "Open-Meteo geocoding (GeoNames)" as const };
it("authorizes a saved Haldwani region and returns only rounded public coordinates", async () => {
  const lookup = vi.fn(async () => place);
  expect(await savedRegionReportPosition(locationDistrictId(profile), profile, lookup)).toEqual({ districtId: locationDistrictId(profile), lat: 29.22, lon: 79.53 });
  expect(lookup).toHaveBeenCalledWith(profile);
});
it("rejects another district's receipt before querying a provider", async () => {
  const lookup = vi.fn(async () => place);
  await expect(savedRegionReportPosition("PB-LDH", profile, lookup)).rejects.toMatchObject({ status: 400 });
  expect(lookup).not.toHaveBeenCalled();
});
it("requires a server-loaded profile", async () => {
  await expect(savedRegionReportPosition(locationDistrictId(profile), null, async () => place)).rejects.toMatchObject({ status: 409 });
});
it("maps an authorized legacy Ludhiana receipt into the saved-profile district feed", async () => {
  const saved = { state: "Punjab", district: "Ludhiana", locality: "Ludhiana", pincode: "" };
  const result = await savedRegionReportPosition("PB-LDH", saved, async () => ({ ...place, name: "Ludhiana", state: "Punjab", district: "Ludhiana" }));
  expect(result.districtId).toBe(locationDistrictId(saved));
});
it("rejects an unrelated resolved place or malformed coordinate", async () => {
  await expect(savedRegionReportPosition(locationDistrictId(profile), profile, async () => ({ ...place, state: "Punjab" }))).rejects.toMatchObject({ status: 400 });
  await expect(savedRegionReportPosition(locationDistrictId(profile), profile, async () => ({ ...place, latitude: NaN }))).rejects.toMatchObject({ status: 502 });
});
