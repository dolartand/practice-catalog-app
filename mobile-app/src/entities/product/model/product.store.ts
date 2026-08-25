import { makeAutoObservable, runInAction } from 'mobx';


import { productApi } from '../api/product.api';

import type { Product, ProductListItem, ProductListParams } from './types';

import { DEFAULT_PAGE_SIZE, hasNextPage } from '@shared/lib';

export class ProductStore {
  items: ProductListItem[] = [];
  page = 0;
  size = DEFAULT_PAGE_SIZE;
  total = 0;
  totalPages = 0;

  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;

  private lastParams: ProductListParams = {};
  private byId = new Map<string, Product>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get list(): ProductListItem[] {
    return this.items;
  }

  get hasMore(): boolean {
    return hasNextPage({ page: this.page, totalPages: this.totalPages });
  }

  getCachedById(id: string): Product | undefined {
    return this.byId.get(id);
  }

  async fetchList(params: ProductListParams = {}) {
    this.isLoading = true;
    this.error = null;
    this.lastParams = params;

    try {
      const result = await productApi.getList({ ...params, page: 0, size: this.size });
      runInAction(() => {
        this.items = result.items;
        this.page = result.page;
        this.total = result.total;
        this.totalPages = result.totalPages;
      });
    } catch {
      runInAction(() => {
        this.error = 'catalog_load_failed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async fetchMore() {
    if (!this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    try {
      const nextPage = this.page + 1;
      const result = await productApi.getList({ ...this.lastParams, page: nextPage, size: this.size });

      runInAction(() => {
        this.items = [...this.items, ...result.items];
        this.page = result.page;
        this.totalPages = result.totalPages;
      });
    } finally {
      runInAction(() => {
        this.isLoadingMore = false;
      });
    }
  }

  async fetchOne(id: string): Promise<Product> {
    const cached = this.byId.get(id);
    if (cached) return cached;

    const product = await productApi.getById(id);
    runInAction(() => this.byId.set(id, product));
    return product;
  }

  invalidateCached(id: string) {
    this.byId.delete(id);
  }
}