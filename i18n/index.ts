import * as Localization from 'expo-localization'
import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { createMMKV } from 'react-native-mmkv'

import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import ja from './locales/ja.json'
import pt from './locales/pt.json'

export const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'es', 'ja', 'pt', 'it'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Fran\u00e7ais',
  es: 'Espa\u00f1ol',
  ja: '\u65e5\u672c\u8a9e',
  pt: 'Portugu\u00eas',
  it: 'Italiano',
}

const storage = createMMKV()
const LANGUAGE_STORAGE_KEY = 'app.language'

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  ja: { translation: ja },
  pt: { translation: pt },
  it: { translation: it },
}

function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  if (!value) return null

  const normalized = value.toLowerCase().replace('_', '-')
  const base = normalized.split('-')[0]
  const mapped = base === 'jp' ? 'ja' : base

  if (SUPPORTED_LANGUAGES.includes(mapped as AppLanguage)) {
    return mapped as AppLanguage
  }

  return null
}

function getStoredLanguage(): AppLanguage | null {
  return normalizeLanguage(storage.getString(LANGUAGE_STORAGE_KEY))
}

function getDeviceLanguage(): AppLanguage | null {
  const locales = Localization.getLocales()

  for (const locale of locales) {
    const fromTag = normalizeLanguage(locale.languageTag)
    if (fromTag) return fromTag

    const fromCode = normalizeLanguage(locale.languageCode ?? null)
    if (fromCode) return fromCode
  }

  return null
}

const i18n = createInstance()
const initialLanguage = getStoredLanguage() ?? getDeviceLanguage() ?? 'en'

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
})

export function getCurrentAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.resolvedLanguage) ?? normalizeLanguage(i18n.language) ?? 'en'
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  storage.set(LANGUAGE_STORAGE_KEY, language)
  await i18n.changeLanguage(language)
}

export default i18n
