import { StyleSheet } from 'react-native-unistyles';

import { lightTheme, darkTheme, breakpoints } from './theme';

const appThemes = { light: lightTheme, dark: darkTheme };

declare module 'react-native-unistyles' {
    export interface UnistylesThemes {
        light: typeof lightTheme;
        dark: typeof darkTheme;
    }
    export interface UnistylesBreakpoints {
        xs: number;
        sm: number;
        md: number;
        lg: number;
    }
}

StyleSheet.configure({
    themes: appThemes,
    breakpoints,
    settings: {
        adaptiveThemes: true, // системная тема из коробки
    },
});