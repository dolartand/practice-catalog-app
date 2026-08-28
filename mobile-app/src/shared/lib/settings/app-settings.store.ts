import { makeAutoObservable, runInAction, observe } from 'mobx';
import { UnistylesRuntime } from 'react-native-unistyles';
import { useSyncExternalStore } from 'react';

import i18n, { setAppLanguage, type SupportedLanguage } from '@shared/i18n/config';
import { kvStorage } from '@shared/lib/storage/kv-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app.theme';

class AppSettingsStore {
    themePreference: ThemePreference;
    language: SupportedLanguage;

    constructor() {
        this.themePreference = (kvStorage.getString(THEME_STORAGE_KEY) as ThemePreference) ?? 'system';
        this.language = i18n.language as SupportedLanguage;

        makeAutoObservable(this, {}, { autoBind: true });
        this.applyTheme(this.themePreference);
    }

    setThemePreference(pref: ThemePreference) {
        runInAction(() => {
            this.themePreference = pref;
        });
        kvStorage.setString(THEME_STORAGE_KEY, pref);
        this.applyTheme(pref);
    }

    private applyTheme(pref: ThemePreference) {
        if (pref === 'system') {
            UnistylesRuntime.setAdaptiveThemes(true);
        } else {
            UnistylesRuntime.setAdaptiveThemes(false);
            UnistylesRuntime.setTheme(pref);
        }
    }

    setLanguage(lang: SupportedLanguage) {
        runInAction(() => {
            this.language = lang;
        });
        setAppLanguage(lang);
    }
}

export const appSettingsStore = new AppSettingsStore();

export function useAppSettingsStore<T>(selector: (store: AppSettingsStore) => T): T {
    return useSyncExternalStore(
        (callback) => observe(appSettingsStore, callback),
        () => selector(appSettingsStore),
        () => selector(appSettingsStore)
    );
}