import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import taTranslations from './locales/ta.json';
import mrTranslations from './locales/mr.json';

// Get saved language preference or detect device locale
const getInitialLocale = (): string => {
  if (typeof window !== 'undefined') {
    // First check localStorage for saved preference
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && ['en', 'hi', 'ta', 'mr'].includes(savedLang)) {
      return savedLang;
    }
    
    // Fallback to device locale
    if (navigator.language) {
      const lang = navigator.language.split('-')[0].toLowerCase();
      if (['en', 'hi', 'ta', 'mr'].includes(lang)) {
        return lang;
      }
    }
  }
  return 'en'; // Fallback to English
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      ta: { translation: taTranslations },
      mr: { translation: mrTranslations },
    },
    lng: getInitialLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

// Save language preference to localStorage when changed
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
});

export default i18n;
