import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reviewApi } from '../api/review.api';

import type { AdminReviewListParams } from './types';

export const reviewKeys = {
  list: (params: AdminReviewListParams) => ['reviews', params] as const,
  allLists: () => ['reviews'] as const,
};

export function useReviewsQuery(params: AdminReviewListParams) {
  return useQuery({
    queryKey: reviewKeys.list(params),
    queryFn: () => reviewApi.getList(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Модерация. Инвалидация и на успехе, и при ошибке: если автор удалил отзыв
 * между получением списка и действием (404), очередь должна обновиться.
 */
export function useModerateReview() {
  const queryClient = useQueryClient();

  const invalidate = (productId: string) => {
    void queryClient.invalidateQueries({ queryKey: reviewKeys.allLists() });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
    void queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  return useMutation({
    mutationFn: ({
      reviewId,
      isModerated,
    }: {
      reviewId: string;
      productId: string;
      isModerated: boolean;
    }) => reviewApi.moderate(reviewId, isModerated),
    onSuccess: (_data, variables) => invalidate(variables.productId),
    onError: (_error, variables) => invalidate(variables.productId),
  });
}
