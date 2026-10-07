import { districts, locationDistrictId, type FarmLocation } from "../../shared/domain";
import type { CommunityMapPlace } from "../../shared/community-map";
import { ApiError } from "./errors";

// Caller must load this profile using the authenticated farmer's server-side
// subject, never a client-supplied place or public map coordinates.
export async function savedRegionReportPosition(
  receiptDistrict: string,
  profile: FarmLocation | null,
  lookup: (location: FarmLocation) => Promise<CommunityMapPlace>,
) {
  if (!profile) throw new ApiError(409, "Save a farming region before contributing an observation.");
  const legacy = districts.find((item) => item.state.toLowerCase() === profile.state.toLowerCase() && item.name.toLowerCase() === profile.district.toLowerCase());
  if (receiptDistrict !== locationDistrictId(profile) && receiptDistrict !== legacy?.id)
    throw new ApiError(400, "The observation must match your saved farming district.");
  const place = await lookup(profile);
  if (place.state !== profile.state || place.district !== profile.district)
    throw new ApiError(400, "The map place does not match your saved farming district.");
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude))
    throw new ApiError(502, "The saved region has no valid map centre.");
  return { districtId: locationDistrictId(profile), lat: Math.round(place.latitude * 100) / 100, lon: Math.round(place.longitude * 100) / 100 };
}
