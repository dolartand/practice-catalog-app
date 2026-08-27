import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { orderApi } from '../api/order.api';

import type { AdminOrderListParams } from './types';

import type { OrderStatus } from '@shared/lib';

export const orderKeys = {
  list: (params: AdminOrderListParams) => ['orders', params] as const,
  allLists: () => ['orders'] as const,
  detail: (id: string) => ['order', id] as const,
};

export function useOrdersQuery(params: AdminOrderListParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderApi.getList(params),
    placeholderData: keepPreviousData,
  });
}

/** 404 страница заказа показывает сама — без глобального тоста */
export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.getById(id),
    enabled: id.length > 0,
    retry: false,
    meta: { skipGlobalError: true },
  });
}

/**
 * Смена статуса. Инвалидация и на успехе, и при ошибке:
 * после 409 (заказ изменён другим оператором) карточка должна показать актуальный статус.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  const invalidate = (orderId: string) => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.allLists() });
    void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      orderApi.updateStatus(orderId, status),
    onSuccess: (_data, variables) => invalidate(variables.orderId),
    onError: (_error, variables) => invalidate(variables.orderId),
  });
}
