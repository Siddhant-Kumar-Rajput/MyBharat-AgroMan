import indiaStatesData from "../data/india-states-districts.json";
import type { Copy } from "../lib/i18n";

type StateDistrict = { state: string; districts: string[] };
const indiaStates = indiaStatesData as StateDistrict[];

type Props = {
  copy: Copy;
  state: string;
  district: string;
  onChange: (location: { state: string; district: string }) => void;
  required?: boolean;
};

export function LocationFields({ copy: t, state, district, onChange, required = true }: Props) {
  const districts = indiaStates.find((item) => item.state === state)?.districts ?? [];

  return (
    <div className="location-fields">
      <label>
        {t.state}
        <select required={required} value={state} onChange={(event) => onChange({ state: event.target.value, district: "" })}>
          <option value="">{t.chooseState}</option>
          {indiaStates.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
        </select>
      </label>
      <label>
        {t.district}
        <select required={required} disabled={!state} value={district} onChange={(event) => onChange({ state, district: event.target.value })}>
          <option value="">{state ? t.chooseDistrict : t.chooseStateFirst}</option>
          {districts.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <small className="location-source">{t.locationDirectoryNote}</small>
    </div>
  );
}
