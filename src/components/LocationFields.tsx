import indiaStatesData from "../data/india-states-districts.json";
import type { Copy } from "../lib/i18n";
import { useState } from "react";
import { MapPinned, Search } from "lucide-react";
import { request } from "../lib/api";

type StateDistrict = { state: string; districts: string[] };
const indiaStates = indiaStatesData as StateDistrict[];

type Props = {
  copy: Copy;
  state: string;
  district: string;
  locality: string;
  pincode: string;
  onChange: (location: { state: string; district: string; locality: string; pincode: string }) => void;
  required?: boolean;
};

type LocationResult = { state: string; district: string; locality: string; pincode: string };

export function LocationFields({ copy: t, state, district, locality, pincode, onChange, required = true }: Props) {
  const districts = indiaStates.find((item) => item.state === state)?.districts ?? [];
  const [method, setMethod] = useState<"manual" | "pincode">(pincode ? "pincode" : "manual");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [message, setMessage] = useState("");

  async function lookup(kind: "pincode" | "locality") {
    setBusy(true);
    setMessage("");
    try {
      const path = kind === "pincode"
        ? `locations/pincode?pincode=${encodeURIComponent(pincode)}`
        : `locations/search?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&locality=${encodeURIComponent(locality)}`;
      const value = await request<{ locations: LocationResult[] }>(path);
      setResults(value.locations);
      if (!value.locations.length) setMessage(t.locationLookupEmpty);
      if (value.locations.length === 1) onChange(value.locations[0]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function choose(result: LocationResult) {
    onChange(result);
    setResults([]);
    setMessage("");
  }

  return (
    <div className="location-fields">
      <fieldset className="location-method">
        <legend>{t.locationMethod}</legend>
        <button type="button" className={method === "pincode" ? "active" : ""} onClick={() => setMethod("pincode")}><MapPinned size={16} />{t.usePincode}</button>
        <button type="button" className={method === "manual" ? "active" : ""} onClick={() => setMethod("manual")}><Search size={16} />{t.chooseManually}</button>
      </fieldset>
      {method === "pincode" && (
        <div className="location-lookup-row">
          <label>{t.pincode}<input required={required} inputMode="numeric" autoComplete="postal-code" value={pincode} maxLength={6} onChange={(event) => onChange({ state, district, locality, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) })} /></label>
          <button type="button" className="secondary" disabled={busy || !/^\d{6}$/.test(pincode)} onClick={() => void lookup("pincode")}><Search size={16} />{busy ? t.locationLookupBusy : t.findPincode}</button>
          <small>{t.pincodeHint}</small>
        </div>
      )}
      {method === "manual" && <>
      <label>
        {t.state}
        <select required={required} value={state} onChange={(event) => onChange({ state: event.target.value, district: "", locality: "", pincode: "" })}>
          <option value="">{t.chooseState}</option>
          {indiaStates.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
        </select>
      </label>
      <label>
        {t.district}
        <select required={required} disabled={!state} value={district} onChange={(event) => onChange({ state, district: event.target.value, locality: "", pincode: "" })}>
          <option value="">{state ? t.chooseDistrict : t.chooseStateFirst}</option>
          {districts.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <div className="location-lookup-row">
        <label>{t.locality}<input value={locality} onChange={(event) => onChange({ state, district, locality: event.target.value, pincode: "" })} placeholder={t.chooseLocality} /></label>
        <button type="button" className="secondary" disabled={busy || !state || !district || locality.trim().length < 2} onClick={() => void lookup("locality")}><Search size={16} />{busy ? t.locationLookupBusy : t.searchLocality}</button>
        <small>{t.approximateLocationHint}</small>
      </div>
      </>}
      {results.length > 0 && <div className="location-results" role="listbox" aria-label={t.chooseLocality}>{results.map((result) => <button type="button" role="option" key={`${result.locality}-${result.pincode}`} onClick={() => choose(result)}><strong>{result.locality}</strong><span>{result.district}, {result.state}{result.pincode ? ` · ${result.pincode}` : ""}</span></button>)}</div>}
      {message && <small className="location-message" role="status">{message}</small>}
      <small className="location-source">{t.locationDirectoryNote}</small>
    </div>
  );
}
