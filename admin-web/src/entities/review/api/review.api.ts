import type { AdminReviewListParams, AdminReviewsPage } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const reviewApi = {
  /** Фильтр isModerated опционален: не задан — все отзывы */
  async getList(params: AdminReviewListParams): Promise<AdminReviewsPage> {
    const { data } = await httpClient.get<AdminReviewsPage>(API_ENDPOINTS.reviews.adminRoot, {
      params,
    });
    return data;
  },

  /**
   * Одобрить (true) или скрыть (false). Тело запроса — { isModerated },
   * хотя в ответе то же поле приходит как `moderated` (см. types.ts).
   */
  async moderate(id: string, isModerated: boolean): Promise<void> {
    await httpClient.patch(API_ENDPOINTS.reviews.adminModeration(id), { isModerated });
  },
};
