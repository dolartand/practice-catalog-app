import type { CreateReviewPayload, PublicReview, ReviewResponse, UpdateReviewPayload } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';
import type { PageEnvelope } from '@shared/lib';


export const reviewApi = {
  // Публичный эндпоинт (permitAll на GET /products/**) — токен не обязателен
  async getList(productId: string, params: { page: number; size: number }): Promise<PageEnvelope<PublicReview>> {
    const { data } = await httpClient.get<PageEnvelope<PublicReview>>(
      API_ENDPOINTS.products.reviews(productId),
      { params },
    );
    return data;
  },

  // 201; 409 — уже есть отзыв; 403 — нет DELIVERED-заказа с этим товаром
  async create(productId: string, payload: CreateReviewPayload): Promise<ReviewResponse> {
    const { data } = await httpClient.post<ReviewResponse>(API_ENDPOINTS.products.reviews(productId), payload);
    return data;
  },

  // Только владелец, иначе 404; rating/text независимы и опциональны
  async update(reviewId: string, payload: UpdateReviewPayload): Promise<ReviewResponse> {
    const { data } = await httpClient.patch<ReviewResponse>(API_ENDPOINTS.reviews.byId(reviewId), payload);
    return data;
  },

  // Только владелец, иначе 404
  async remove(reviewId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.reviews.byId(reviewId));
  },
};
