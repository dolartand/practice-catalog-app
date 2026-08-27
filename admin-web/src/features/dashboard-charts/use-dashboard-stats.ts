import { useQuery } from '@tanstack/react-query';

import { fetchDashboardStats } from './stats-aggregator';

export const dashboardKeys = {
  stats: () => ['stats'] as const,
};

/**
 * Сводка через size=1 конверты. Обновление каждые 60 сек — достаточная свежесть для
 * дашборда, без подписки на веб-сокеты.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

export { fetchDashboardStats };
