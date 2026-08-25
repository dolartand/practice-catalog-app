import { makeAutoObservable, runInAction } from 'mobx';

import { cartApi } from '../api/cart.api';

import type { Cart, CartItem } from './types';

function recomputeTotal(items: CartItem[]): number {
  return items.filter((item) => !item.unavailable).reduce((sum, item) => sum + item.totalCents, 0);
}

class CartStore {
  items: CartItem[] = [];
  totalCents = 0;
  isLoading = false;
  error: string | null = null;
  pendingItemIds = new Set<string>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get itemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get hasUnavailableItems(): boolean {
    return this.items.some((item) => item.unavailable);
  }

  private applyCart(cart: Cart) {
    this.items = cart.items;
    this.totalCents = cart.totalCents;
  }

  async fetch() {
    this.isLoading = true;
    this.error = null;
    try {
      const cart = await cartApi.getCart();
      runInAction(() => this.applyCart(cart));
    } catch {
      runInAction(() => {
        this.error = 'cart_load_failed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async addItem(skuId: string, quantity: number) {
    const cart = await cartApi.addItem(skuId, quantity);
    runInAction(() => this.applyCart(cart));
  }

  async updateQuantity(itemId: string, quantity: number) {
    const previousItems = this.items;
    const optimisticItems = this.items.map((item) =>
      item.id === itemId ? { ...item, quantity, totalCents: item.priceWithDiscountCents * quantity } : item,
    );

    runInAction(() => {
      this.items = optimisticItems;
      this.totalCents = recomputeTotal(optimisticItems);
      this.pendingItemIds.add(itemId);
    });

    try {
      // Ответ сервера — источник истины (например, если запрошенное количество
      // превысило подъехавший тем временем остаток и было обрезано)
      const cart = await cartApi.updateItem(itemId, quantity);
      runInAction(() => this.applyCart(cart));
    } catch (e) {
      runInAction(() => {
        this.items = previousItems;
        this.totalCents = recomputeTotal(previousItems);
      });
      throw e;
    } finally {
      runInAction(() => {
        this.pendingItemIds.delete(itemId);
      });
    }
  }

  async removeItem(itemId: string) {
    const previousItems = this.items;
    const optimisticItems = this.items.filter((item) => item.id !== itemId);

    runInAction(() => {
      this.items = optimisticItems;
      this.totalCents = recomputeTotal(optimisticItems);
      this.pendingItemIds.add(itemId);
    });

    try {
      await cartApi.removeItem(itemId); // 204 без тела — синхронизировать нечего, оптимистичное состояние уже верно
    } catch (e) {
      runInAction(() => {
        this.items = previousItems;
        this.totalCents = recomputeTotal(previousItems);
      });
      throw e;
    } finally {
      runInAction(() => {
        this.pendingItemIds.delete(itemId);
      });
    }
  }

  reset() {
    this.items = [];
    this.totalCents = 0;
    this.error = null;
  }
}

export const cartStore = new CartStore();