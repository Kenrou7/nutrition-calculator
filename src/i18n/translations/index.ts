import en from "./en.json";
import es from "./es.json";

export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export type TranslationDictionary = typeof en;

const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  es,
};

export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale];
}
