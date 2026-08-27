import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { createQueryClient } from './query-client';
import { adminTheme } from './theme';

import { AuthProvider } from '@entities/session';
import { FeedbackBridge } from '@shared/ui';

dayjs.locale('ru');

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={ruRU} theme={adminTheme}>
        <AntdApp>
          <FeedbackBridge />
          <AuthProvider>{children}</AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
