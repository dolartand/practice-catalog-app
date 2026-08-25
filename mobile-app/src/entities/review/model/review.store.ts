import { makeAutoObservable, runInAction } from 'mobx';


import { reviewApi } from '../api/review.api';

import { toMyReview, type MyReview, type PublicReview } from './types';

import { hasNextPage, kvStorage, REVIEWS_PAGE_SIZE, STORAGE_KEYS } from '@shared/lib';

const PAGE_SIZE = REVIEWS_PAGE_SIZE;

function parseCachedMine(raw: string | null): Map<string, MyReview> {
  const map = new Map<string, MyReview>();
  if (!raw) return map;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return map;
    for (const entry of parsed) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as MyReview).id === 'string' &&
        typeof (entry as MyReview).productId === 'string'
      ) {
        const review = entry as MyReview;
        map.set(review.productId, review);
      }
    }
  } catch {
    // битый кэш игнорируем — начнём с пустой карты
  }
  return map;
}

class ReviewStore {
  items: PublicReview[] = [];
  productId: string | null = null;
  page = 0;
  size = PAGE_SIZE;
  total = 0;
  totalPages = 0;

  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;

  isSubmitting = false;
  pendingDeleteIds = new Set<string>();

  private mine = new Map<string, MyReview>();
  private cacheKey: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get hasMore(): boolean {
    return hasNextPage({ page: this.page, totalPages: this.totalPages });
  }

  getMyReview(productId: string): MyReview | undefined {
    return this.mine.get(productId);
  }

  hasMyReview(productId: string): boolean {
    return this.mine.has(productId);
  }

  isDeleting(productId: string): boolean {
    return this.pendingDeleteIds.has(productId);
  }

  /** Гидрация «моих отзывов» при входе/восстановлении сессии (core/bootstrap) */
  init(userId: string) {
    this.cacheKey = STORAGE_KEYS.myReviews(userId);
    runInAction(() => {
      this.mine = parseCachedMine(kvStorage.getString(this.cacheKey!));
    });
  }

  async fetch(productId: string) {
    this.isLoading = true;
    this.error = null;
    this.productId = productId;
    try {
      const result = await reviewApi.getList(productId, { page: 0, size: this.size });
      runInAction(() => {
        this.items = result.items;
        this.page = result.page;
        this.total = result.total;
        this.totalPages = result.totalPages;
      });
    } catch {
      runInAction(() => {
        this.error = 'reviews_load_failed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async fetchMore() {
    if (!this.productId || !this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    try {
      const nextPage = this.page + 1;
      const result = await reviewApi.getList(this.productId, { page: nextPage, size: this.size });
      runInAction(() => {
        this.items = [...this.items, ...result.items];
        this.page = result.page;
        this.total = result.total;
        this.totalPages = result.totalPages;
      });
    } finally {
      runInAction(() => {
        this.isLoadingMore = false;
      });
    }
  }

  /** Создание; локальную запись ведём строго по ответу сервера */
  async create(productId: string, payload: { rating: number; text?: string }): Promise<MyReview> {
    this.isSubmitting = true;
    try {
      const response = await reviewApi.create(productId, payload);
      const mine = toMyReview(response);
      runInAction(() => {
        this.mine.set(productId, mine);
      });
      this.persist();
      return mine;
    } finally {
      runInAction(() => {
        this.isSubmitting = false;
      });
    }
  }

  async update(productId: string, payload: { rating?: number; text?: string }): Promise<MyReview> {
    const existing = this.mine.get(productId);
    if (!existing) throw new Error('No local review to update');

    this.isSubmitting = true;
    try {
      const response = await reviewApi.update(existing.id, payload);
      const mine = toMyReview(response);
      runInAction(() => {
        this.mine.set(productId, mine);
        // правка не сбрасывает модерацию — элемент в списке остаётся, меняем содержимое
        this.items = this.items.map((item) =>
          item.id === mine.id ? { ...item, rating: mine.rating, text: mine.text } : item,
        );
      });
      this.persist();
      return mine;
    } finally {
      runInAction(() => {
        this.isSubmitting = false;
      });
    }
  }

  async remove(productId: string): Promise<void> {
    const existing = this.mine.get(productId);
    if (!existing) return;

    runInAction(() => this.pendingDeleteIds.add(productId));
    try {
      await reviewApi.remove(existing.id);
      runInAction(() => {
        this.mine.delete(productId);
        this.items = this.items.filter((item) => item.id !== existing.id);
        this.total = Math.max(0, this.total - 1);
      });
      this.persist();
    } finally {
      runInAction(() => {
        this.pendingDeleteIds.delete(productId);
      });
    }
  }

  /** Отзыв исчез на сервере (404 при edit/delete) — забываем локальную запись */
  forget(productId: string) {
    if (!this.mine.has(productId)) return;
    runInAction(() => this.mine.delete(productId));
    this.persist();
  }

  reset() {
    if (this.cacheKey) {
      kvStorage.delete(this.cacheKey);
    }
    this.cacheKey = null;
    this.mine = new Map();
    this.items = [];
    this.productId = null;
    this.page = 0;
    this.total = 0;
    this.totalPages = 0;
    this.isLoading = false;
    this.isLoadingMore = false;
    this.error = null;
    this.isSubmitting = false;
    this.pendingDeleteIds = new Set();
  }

  private persist() {
    if (this.cacheKey) {
      kvStorage.setString(this.cacheKey, JSON.stringify([...this.mine.values()]));
    }
  }
}

export const reviewStore = new ReviewStore();
