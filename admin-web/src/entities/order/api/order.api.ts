import type { AdminOrderDetail, AdminOrderListParams, AdminOrdersPage } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';
import type { OrderStatus } from '@shared/lib';


export const orderApi = {
  async getList(params: AdminOrderListParams): Promise<AdminOrdersPage> {
    const { data } = await httpClient.get<AdminOrdersPage>(API_ENDPOINTS.orders.adminRoot, {
      params,
    });
    return data;
  },

  /** Детали: контакты, адрес, позиции (снимки) и история смены статусов */
  async getById(id: string): Promise<AdminOrderDetail> {
    const { data } = await httpClient.get<AdminOrderDetail>(API_ENDPOINTS.orders.adminById(id));
    return data;
  },

  /** Только допустимые переходы валидирует сервер; повторный PATCH — idempotent no-op */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await httpClient.patch(API_ENDPOINTS.orders.adminStatus(id), { status });
  },
};
