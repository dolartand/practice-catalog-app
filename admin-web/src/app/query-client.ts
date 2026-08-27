import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { showErrorToast } from '@shared/lib';

/**
 * Глобальная обработка ошибок запросов/мутаций (docs/frontend/web/02-architecture.md §5).
 * Мутации с формами помечают meta.skipGlobalError и мапят ошибки в поля сами.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => showErrorToast(error, 'Не удалось загрузить данные'),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.['skipGlobalError']) return;
        showErrorToast(error);
      },
    }),
  });
}
