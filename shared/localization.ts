export const uiTranslationLocales = {
  as: "asm_Beng",
  bn: "ben_Beng",
  brx: "brx_Deva",
  doi: "doi_Deva",
  gu: "guj_Gujr",
  hi: "hin_Deva",
  kn: "kan_Knda",
  ks: "kas_Arab",
  kok: "gom_Deva",
  mai: "mai_Deva",
  ml: "mal_Mlym",
  "mni-Mtei": "mni_Mtei",
  mr: "mar_Deva",
  ne: "npi_Deva",
  or: "ory_Orya",
  pa: "pan_Guru",
  sa: "san_Deva",
  sat: "sat_Olck",
  sd: "snd_Arab",
  ta: "tam_Taml",
  te: "tel_Telu",
  ur: "urd_Arab",
} as const;
export function tokens(text: string) {
  return text.match(/\{[^}]+\}/g) ?? [];
}
export function validCatalog(
  source: Record<string, string>,
  value: unknown,
): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const copy = value as Record<string, unknown>;
  return Object.entries(source).every(
    ([key, text]) =>
      typeof copy[key] === "string" &&
      !!copy[key].trim() &&
      JSON.stringify(tokens(text).sort()) ===
        JSON.stringify(tokens(copy[key]).sort()),
  );
}
export type UiTranslationResult<T> =
  | { status: "complete"; copy: T }
  | { status: "pending"; completed: number; total: number };
