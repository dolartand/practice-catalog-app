import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import be from './locales/be.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

import { STORAGE_KEYS } from '@shared/lib/storage/storage-keys';
import { kvStorage } from "@shared/lib/storage/kv-storage";

export const SUPPORTED_LANGUAGES = ['ru', 'en', 'be', 'zh'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.settings.language;

function resolveInitialLanguage(): SupportedLanguage {
    const stored = kvStorage.getString(LANGUAGE_STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        return stored as SupportedLanguage;
    }

    const deviceLocale = Localization.getLocales()[0]?.languageCode;
    if (deviceLocale && (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLocale)) {
        return deviceLocale as SupportedLanguage;
    }

    return 'ru'; // дефолт для завода
}

i18n.use(initReactI18next).init({
    resources: {
        ru: { translation: ru },
        en: { translation: en },
        be: { translation: be },
        zh: { translation: zh },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
});

export function setAppLanguage(lang: SupportedLanguage) {
    i18n.changeLanguage(lang);
    kvStorage.setString(LANGUAGE_STORAGE_KEY, lang);
}

export default i18n;