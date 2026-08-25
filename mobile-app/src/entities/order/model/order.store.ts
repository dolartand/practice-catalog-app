import { makeAutoObservable, runInAction } from 'mobx';


import { orderApi } from '../api/order.api';

import type { CreateOrderRequest, Order, OrderStatus } from './types';

import { DEFAULT_PAGE_SIZE } from '@shared/lib/constants';
import { hasNextPage } from '@shared/lib/pagination';

const ACTIVE_STATUSES: OrderStatus[] = ['NEW', 'CONFIRMED'];

export class OrderStore {
  items: Order[] = [];
  page = 0;
  size = DEFAULT_PAGE_SIZE;
  totalPages = 0;

  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;

  private byId = new Map<string, Order>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // Клиентское деление — сервер не умеет фильтровать по статусу,
  // считается только по уже загруженным страницам
  get activeOrders(): Order[] {
    return this.items.filter((order) => ACTIVE_STATUSES.includes(order.status));
  }

  get pastOrders(): Order[] {
    return this.items.filter((order) => !ACTIVE_STATUSES.includes(order.status));
  }

  get hasMore(): boolean {
    return hasNextPage({ page: this.page, totalPages: this.totalPages });
  }

  getCachedById(id: string): Order | undefined {
    return this.byId.get(id);
  }

  private cache(orders: Order[]) {
    orders.forEach((order) => this.byId.set(order.id, order));
  }

  async fetchList() {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await orderApi.getList({ page: 0, size: this.size });
      runInAction(() => {
        this.items = result.items;
        this.page = result.page;
        this.totalPages = result.totalPages;
        this.cache(result.items);
      });
    } catch {
      runInAction(() => {
        this.error = 'orders_load_failed';
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
      const result = await orderApi.getList({ page: nextPage, size: this.size });
      runInAction(() => {
        this.items = [...this.items, ...result.items];
        this.page = result.page;
        this.cache(result.items);
      });
    } finally {
      runInAction(() => {
        this.isLoadingMore = false;
      });
    }
  }

  async fetchOne(id: string): Promise<Order> {
    const order = await orderApi.getById(id);
    runInAction(() => this.byId.set(id, order));
    return order;
  }

  async create(payload: CreateOrderRequest): Promise<Order> {
    const order = await orderApi.create(payload);
    runInAction(() => {
      this.items = [order, ...this.items];
      this.byId.set(order.id, order);
    });
    return order;
  }

  async cancel(id: string): Promise<Order> {
    const order = await orderApi.cancel(id);
    runInAction(() => {
      this.byId.set(id, order);
      this.items = this.items.map((item) => (item.id === id ? order : item));
    });
    return order;
  }
}