/** Конверт пагинации бэкенда (docs/frontend/web/03-api-integration.md §2) */
export interface PageEnvelope<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
