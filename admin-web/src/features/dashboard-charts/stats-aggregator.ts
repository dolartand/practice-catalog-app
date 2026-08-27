import type { AxiosInstance } from 'axios';

import type { AdminOrderListItem } from '@entities/order';
import type { AdminProductListItem, ProductAdminStatus } from '@entities/product';
import type { AdminReview } from '@entities/review';
import { API_ENDPOINTS, httpClient } from '@shared/api';
import type { OrderStatus, PageEnvelope } from '@shared/lib';

export interface ProductStatusCounts {
  ACTIVE: number;
  INACTIVE: number;
  DELETED: number;
}

export interface OrderStatusCounts {
  NEW: number;
  CONFIRMED: number;
  DELIVERED: number;
  CANCELLED: number;
}

export interface ReviewCounts {
  pending: number;
  published: number;
}

export interface DashboardStats {
  products: ProductStatusCounts;
  orders: OrderStatusCounts;
  reviews: ReviewCounts;
}

/**
 * Берёт `total` из конверта пагинации, запрашивая size=1 (чтобы тело ответа было
 * минимальным — нам нужно лишь число). Параллельные запросы, refetchInterval 60s.
 */
async function total<T>(
  url: string,
  params: Record<string, unknown> = {},
  client: AxiosInstance = httpClient,
): Promise<number> {
  const response = await client.get<PageEnvelope<T>>(url, {
    params: { ...params, size: 1, page: 0 },
  });
  return response.data.total;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const productStatuses: readonly ProductAdminStatus[] = ['ACTIVE', 'INACTIVE', 'DELETED'];
  const orderStatuses: readonly OrderStatus[] = ['NEW', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

  const products = await Promise.all(
    productStatuses.map((status) =>
      total<AdminProductListItem>(API_ENDPOINTS.products.adminRoot, { status }),
    ),
  );

  const orders = await Promise.all(
    orderStatuses.map((status) =>
      total<AdminOrderListItem>(API_ENDPOINTS.orders.adminRoot, { status }),
    ),
  );

  const reviews = await Promise.all([
    total<AdminReview>(API_ENDPOINTS.reviews.adminRoot, { isModerated: false }),
    total<AdminReview>(API_ENDPOINTS.reviews.adminRoot, { isModerated: true }),
  ]);

  return {
    products: {
      ACTIVE: products[0] ?? 0,
      INACTIVE: products[1] ?? 0,
      DELETED: products[2] ?? 0,
    },
    orders: {
      NEW: orders[0] ?? 0,
      CONFIRMED: orders[1] ?? 0,
      DELIVERED: orders[2] ?? 0,
      CANCELLED: orders[3] ?? 0,
    },
    reviews: {
      pending: reviews[0] ?? 0,
      published: reviews[1] ?? 0,
    },
  };
}
