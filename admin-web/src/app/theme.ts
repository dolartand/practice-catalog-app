import type { ThemeConfig } from 'antd';

/** Кастомизация AntD под бренд — минимальная, тёмная тема подготовлена токенами на будущее */
export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2f54eb',
    colorInfo: '#2f54eb',
    borderRadius: 8,
  },
  components: {
    Layout: {
      bodyBg: '#f5f6fa',
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      headerHeight: 64,
    },
    Menu: {
      itemBorderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
    },
  },
};
