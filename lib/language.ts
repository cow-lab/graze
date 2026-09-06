// OpenAlex reports a work's language as an ISO 639-1 code. Only the common ones are
// spelled out here; anything else falls back to the uppercased code, which is still more
// informative than hiding the fact that the paper isn't in English.
const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  ca: "Catalan",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hu: "Hungarian",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sv: "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  vi: "Vietnamese",
  zh: "Chinese",
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

// English is the site's language, so flagging it would just be noise — only a *different*
// original language is worth disclosing.
export function isNonEnglish(code: string | null | undefined): code is string {
  if (!code) return false;
  return code.toLowerCase().split("-")[0] !== "en";
}
