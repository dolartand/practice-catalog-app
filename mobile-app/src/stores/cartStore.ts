import { create } from 'zustand';
import { cartApi } from '../entities/cart/api/cart.api';
import type { CartItem } from '../entities/cart/model/types';

function recomputeTotal(items: CartItem[]): number {
  return items.filter((item) => !item.unavailable).reduce((sum, item) => sum + item.totalCents, 0);
}

interface CartState {
  items: CartItem[];
  totalCents: number;
  isLoading: boolean;
  error: string | null;
  pendingItemIds: Set<string>;

  fetch: () => Promise<void>;
  addItem: (skuId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalCents: 0,
  isLoading: false,
  error: null,
  pendingItemIds: new Set(),

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.getCart();
      set({ items: cart.items, totalCents: cart.totalCents, isLoading: false });
    } catch {
      set({ error: 'cart_load_failed', isLoading: false });
    }
  },

  addItem: async (skuId: string, quantity: number) => {
    const cart = await cartApi.addItem(skuId, quantity);
    set({ items: cart.items, totalCents: cart.totalCents });
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    const previousItems = get().items;
    const optimisticItems = previousItems.map((item) =>
      item.id === itemId ? { ...item, quantity, totalCents: item.priceWithDiscountCents * quantity } : item,
    );

    set({ items: optimisticItems, totalCents: recomputeTotal(optimisticItems), pendingItemIds: new Set([...get().pendingItemIds, itemId]) });

    try {
      const cart = await cartApi.updateItem(itemId, quantity);
      set({ items: cart.items, totalCents: cart.totalCents, pendingItemIds: new Set([...get().pendingItemIds].filter(id => id !== itemId)) });
    } catch (e) {
      set({ items: previousItems, totalCents: recomputeTotal(previousItems), pendingItemIds: new Set([...get().pendingItemIds].filter(id => id !== itemId)) });
      throw e;
    }
  },

  removeItem: async (itemId: string) => {
    const previousItems = get().items;
    const optimisticItems = previousItems.filter((item) => item.id !== itemId);

    set({ items: optimisticItems, totalCents: recomputeTotal(optimisticItems), pendingItemIds: new Set([...get().pendingItemIds, itemId]) });

    try {
      await cartApi.removeItem(itemId);
      set({ pendingItemIds: new Set([...get().pendingItemIds].filter(id => id !== itemId)) });
    } catch (e) {
      set({ items: previousItems, totalCents: recomputeTotal(previousItems), pendingItemIds: new Set([...get().pendingItemIds].filter(id => id !== itemId)) });
      throw e;
    }
  },

  reset: () => {
    set({ items: [], totalCents: 0, error: null, pendingItemIds: new Set() });
  },
}));