import type { FavoriteProduct } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';
import type { PageEnvelope } from '@shared/lib';


export const favoriteApi = {
  async getList(params: { page: number; size: number }): Promise<PageEnvelope<FavoriteProduct>> {
    const { data } = await httpClient.get<PageEnvelope<FavoriteProduct>>(API_ENDPOINTS.favorites.root, { params });
    return data;
  },

  // 204 без тела; идемпотентно (повторное добавление — тихий no-op на сервере)
  async add(productId: string): Promise<void> {
    await httpClient.put(API_ENDPOINTS.favorites.product(productId));
  },

  // 204 без тела; идемпотентно (удаление несуществующей записи — тихий no-op)
  async remove(productId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.favorites.product(productId));
  },
};
