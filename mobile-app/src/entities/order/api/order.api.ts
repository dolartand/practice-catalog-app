import type { CreateOrderRequest, Order } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';
import type { PageEnvelope } from '@shared/lib';


export const orderApi = {
  async getList(params: { page: number; size: number }): Promise<PageEnvelope<Order>> {
    const { data } = await httpClient.get<PageEnvelope<Order>>(API_ENDPOINTS.orders.root, { params });
    return data;
  },

  async getById(id: string): Promise<Order> {
    const { data } = await httpClient.get<Order>(API_ENDPOINTS.orders.byId(id));
    return data;
  },

  async create(payload: CreateOrderRequest): Promise<Order> {
    const { data } = await httpClient.post<Order>(API_ENDPOINTS.orders.root, payload);
    return data;
  },

  async cancel(id: string): Promise<Order> {
    const { data } = await httpClient.post<Order>(API_ENDPOINTS.orders.cancel(id));
    return data;
  },
};
