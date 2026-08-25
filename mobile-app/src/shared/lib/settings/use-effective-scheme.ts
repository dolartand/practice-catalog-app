import { useColorScheme } from 'react-native';

import { appSettingsStore } from './app-settings.store';

// Единая точка правды: "какая схема реально сейчас активна" —
// нужна и Unistyles (уже решает это сам через adaptiveThemes),
// и Tamagui, и любому месту, где нужен чистый 'light' | 'dark' без учёта 'system'
export function useEffectiveScheme(): 'light' | 'dark' {
    const systemScheme = useColorScheme();
    const pref = appSettingsStore.themePreference;
    if (pref !== 'system') {
        return pref;
    }
    return systemScheme === 'dark' ? 'dark' : 'light';
}