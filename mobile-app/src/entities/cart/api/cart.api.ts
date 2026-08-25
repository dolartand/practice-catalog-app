import type { Cart } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const cartApi = {
  async getCart(): Promise<Cart> {
    const { data } = await httpClient.get<Cart>(API_ENDPOINTS.cart.getCart);
    return data;
  },

  async addItem(skuId: string, quantity: number): Promise<Cart> {
    const { data } = await httpClient.post<Cart>(API_ENDPOINTS.cart.items, { skuId, quantity });
    return data;
  },

  async updateItem(itemId: string, quantity: number): Promise<Cart> {
    const { data } = await httpClient.patch<Cart>(API_ENDPOINTS.cart.item(itemId), { quantity });
    return data;
  },

  async removeItem(itemId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.cart.item(itemId));
  },
};
