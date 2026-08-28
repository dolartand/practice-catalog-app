import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { UnistylesRuntime } from 'react-native-unistyles';
import i18n, { setAppLanguage, type SupportedLanguage } from '@shared/i18n/config';
import { kvStorage } from '@shared/lib/storage/kv-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app.theme';

interface AppSettingsState {
  themePreference: ThemePreference;
  language: SupportedLanguage;

  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (lang: SupportedLanguage) => void;
}

function applyTheme(pref: ThemePreference) {
  if (pref === 'system') {
    UnistylesRuntime.setAdaptiveThemes(true);
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(pref);
  }
}

const storage: StateStorage = {
  getItem: async (name: string) => {
    if (name === 'app-settings') {
      const theme = kvStorage.getString(THEME_STORAGE_KEY);
      const lang = kvStorage.getString('app.language');
      return JSON.stringify({
        state: {
          themePreference: (theme as ThemePreference) ?? 'system',
          language: (lang as SupportedLanguage) ?? i18n.language,
        },
      });
    }
    return null;
  },
  setItem: async (name: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state) {
        if (parsed.state.themePreference) {
          kvStorage.setString(THEME_STORAGE_KEY, parsed.state.themePreference);
        }
        if (parsed.state.language) {
          kvStorage.setString('app.language', parsed.state.language);
        }
      }
    } catch {}
  },
  removeItem: async (name: string) => {
    if (name === 'app-settings') {
      kvStorage.delete(THEME_STORAGE_KEY);
      kvStorage.delete('app.language');
    }
  },
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      themePreference: (kvStorage.getString(THEME_STORAGE_KEY) as ThemePreference) ?? 'system',
      language: i18n.language as SupportedLanguage,

      setThemePreference: (pref: ThemePreference) => {
        set({ themePreference: pref });
        kvStorage.setString(THEME_STORAGE_KEY, pref);
        applyTheme(pref);
      },

      setLanguage: (lang: SupportedLanguage) => {
        set({ language: lang });
        kvStorage.setString('app.language', lang);
        setAppLanguage(lang);
      },
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.themePreference);
        }
      },
    }
  )
);