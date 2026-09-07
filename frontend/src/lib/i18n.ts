import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import viTranslation from '@/locales/vi.json'
import enTranslation from '@/locales/en.json'

const resources = {
  vi: {
    translation: viTranslation,
  },
  en: {
    translation: enTranslation,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    lng: localStorage.getItem('cts_language') || 'vi',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cts_language',
      caches: ['localStorage'],
    },
  })

export default i18n
