// PublicReviewResponse — элемент публичного списка (только moderated=true)
export interface PublicReview {
  id: string;
  userFirstName: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
}

// ReviewResponse — ответ create/update для владельца
export interface ReviewResponse {
  id: string;
  productId: string;
  rating: number;
  text: string | null;
  moderated: boolean;
  createdAt: string;
}

// Локальная запись «мой отзыв на этот товар» (id нужен для PATCH/DELETE,
// а эндпоинта «мой отзыв» на бэкенде нет)
export interface MyReview {
  id: string;
  productId: string;
  rating: number;
  text: string | null;
  moderated: boolean;
  createdAt: string;
}

export interface CreateReviewPayload {
  rating: number;
  /** Отзыв может быть без текста — поле не отправляется, если пусто */
  text?: string;
}

// PATCH: rating и text независимы и опциональны (валидация бэкенда на каждый по отдельности)
export type UpdateReviewPayload = Partial<CreateReviewPayload>;

export function toMyReview(response: ReviewResponse): MyReview {
  const { id, productId, rating, text, moderated, createdAt } = response;
  return { id, productId, rating, text, moderated, createdAt };
}
