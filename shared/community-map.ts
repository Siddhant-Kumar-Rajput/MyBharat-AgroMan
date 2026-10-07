import { postalWeatherLocality, selectDistrictGeocodeMatch, type FarmLocation, type IndianGeocodeLocation, type PostalOfficeLocation } from "./domain";

export type CommunityMapPlace = {
  name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  scope: "place" | "district";
  source: "Open-Meteo geocoding (GeoNames)";
};

// The postal parent is a town/block, not proof of a municipality boundary.
// Never use a farm coordinate, weather forecast or a different district here.
export async function resolveCommunityMapPlace(
  location: FarmLocation,
  dependencies: {
    postal: (pin: string) => Promise<PostalOfficeLocation[]>;
    geocode: (name: string) => Promise<IndianGeocodeLocation[]>;
  },
): Promise<CommunityMapPlace | null> {
  let place = location.locality;
  if (location.pincode) {
    // An invalid PIN/locality combination must not silently become another town.
    const parent = postalWeatherLocality(await dependencies.postal(location.pincode), location);
    if (!parent) return null;
    place = parent;
  }
  const names: Array<{ name: string; scope: CommunityMapPlace["scope"] }> = [
    ...(place ? [{ name: place, scope: "place" as const }] : []),
    ...(place !== location.district ? [{ name: location.district, scope: "district" as const }] : []),
  ];
  for (const { name, scope } of names) {
    const match = selectDistrictGeocodeMatch(await dependencies.geocode(name), location);
    if (!match || !Number.isFinite(match.latitude) || !Number.isFinite(match.longitude)
      || match.latitude < -90 || match.latitude > 90 || match.longitude < -180 || match.longitude > 180) continue;
    return {
      name: match.name, state: location.state, district: location.district,
      latitude: Math.round(match.latitude * 100) / 100,
      longitude: Math.round(match.longitude * 100) / 100,
      scope,
      source: "Open-Meteo geocoding (GeoNames)",
    };
  }
  return null;
}
