import type { PageEnvelope } from '@shared/lib';

/** Обогащённый отзыв для модерации (GET /admin/reviews, commit 7c1aaee) */
export interface AdminReview {
  id: string;
  userId: string;
  productId: string;
  /** Виден даже если товар удалён */
  productName: string | null;
  productArticle: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  rating: number;
  text: string | null;
  /**
   * ⚠️ В JSON поле называется `moderated` — не `isModerated`, как объявлено
   * в openapi (дрейф документации); мобилка читает то же имя поля.
   * В запросе модерации, наоборот, бэкенд ждёт `{ isModerated }`.
   */
  moderated: boolean;
  createdAt: string;
}

export type AdminReviewsPage = PageEnvelope<AdminReview>;

export interface AdminReviewListParams {
  isModerated?: boolean;
  page?: number;
  size?: number;
}
