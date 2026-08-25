export const lightTheme = {
  colors: {
    primary: '#0A6EBD',
    primaryLight: '#4FC3F7',
    accent: '#00B4D8',
    background: '#FFFFFF',
    surface: '#F4FAFF',
    text: '#0B1F33',
    textSecondary: '#5C7A99',
    border: '#DCEBF7',
    danger: '#E5484D',
    success: '#2FBF71',
    warning: '#F0A93A',
    /** Рейтинг-звёзды */
    star: '#F0A93A',
    /** Полупрозрачная подложка кнопок поверх фото/галерей */
    scrim: 'rgba(15, 23, 42, 0.38)',
  },
  gap: (v: number) => v * 8,
} as const;

export const darkTheme = {
  colors: {
    primary: '#4FC3F7',
    primaryLight: '#89DDFF',
    accent: '#00B4D8',
    background: '#0B1220',
    surface: '#111A2B',
    text: '#E8F1FA',
    textSecondary: '#8AA6C1',
    border: '#1F2C42',
    danger: '#FF6B6B',
    success: '#4ADE80',
    warning: '#F5B84C',
    /** Рейтинг-звёзды */
    star: '#F5B84C',
    /** Полупрозрачная подложка кнопок поверх фото/галерей */
    scrim: 'rgba(15, 23, 42, 0.38)',
  },
  gap: (v: number) => v * 8,
} as const;

export const breakpoints = {
  xs: 0,
  sm: 380,
  md: 500,
  lg: 800,
} as const;