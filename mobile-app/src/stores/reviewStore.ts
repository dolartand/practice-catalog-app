import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { reviewApi } from '../entities/review/api/review.api';
import { toMyReview, type MyReview, type PublicReview } from '../entities/review/model/types';
import { hasNextPage, kvStorage, REVIEWS_PAGE_SIZE, STORAGE_KEYS } from '@shared/lib';

export type { PublicReview, MyReview };

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
  }
  return map;
}

interface ReviewState {
  items: PublicReview[];
  productId: string | null;
  page: number;
  size: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isSubmitting: boolean;
  pendingDeleteIds: Set<string>;
  mine: Map<string, MyReview>;
  cacheKey: string | null;

  getMyReview: (productId: string) => MyReview | undefined;
  hasMyReview: (productId: string) => boolean;
  isDeleting: (productId: string) => boolean;

  init: (userId: string) => void;
  fetch: (productId: string) => Promise<void>;
  fetchMore: () => Promise<void>;
  create: (productId: string, payload: { rating: number; text?: string }) => Promise<MyReview>;
  update: (productId: string, payload: { rating?: number; text?: string }) => Promise<MyReview>;
  remove: (productId: string) => Promise<void>;
  forget: (productId: string) => void;
  reset: () => void;
  persist: () => void;
}

const storage: StateStorage = {
  getItem: async (name: string) => {
    if (name === 'reviews-storage') {
      const cacheKey = kvStorage.getString('reviews.cacheKey');
      if (!cacheKey) return null;
      const mine = parseCachedMine(kvStorage.getString(cacheKey));
      return JSON.stringify({ state: { mine: Array.from(mine.entries()), cacheKey } });
    }
    return null;
  },
  setItem: async (name: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state) {
        if (parsed.state.mine && parsed.state.cacheKey) {
          kvStorage.setString(parsed.state.cacheKey, JSON.stringify(parsed.state.mine));
        }
      }
    } catch {}
  },
  removeItem: async (name: string) => {
    if (name === 'reviews-storage') {
      const cacheKey = kvStorage.getString('reviews.cacheKey');
      if (cacheKey) kvStorage.delete(cacheKey);
      kvStorage.delete('reviews.cacheKey');
    }
  },
};

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      items: [],
      productId: null,
      page: 0,
      size: PAGE_SIZE,
      total: 0,
      totalPages: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      isSubmitting: false,
      pendingDeleteIds: new Set(),
      mine: new Map(),
      cacheKey: null,

      getMyReview: (productId: string) => get().mine.get(productId),

      hasMyReview: (productId: string) => get().mine.has(productId),

      isDeleting: (productId: string) => get().pendingDeleteIds.has(productId),

      init: (userId: string) => {
        const cacheKey = STORAGE_KEYS.myReviews(userId);
        const mine = parseCachedMine(kvStorage.getString(cacheKey));
        set({ cacheKey, mine });
      },

      fetch: async (productId: string) => {
        set({ isLoading: true, error: null, productId });
        try {
          const result = await reviewApi.getList(productId, { page: 0, size: get().size });
          set({
            items: result.items,
            page: result.page,
            total: result.total,
            totalPages: result.totalPages,
            isLoading: false,
          });
        } catch {
          set({ error: 'reviews_load_failed', isLoading: false });
        }
      },

      fetchMore: async () => {
        const { productId, page, totalPages, isLoadingMore } = get();
        if (!productId || !hasNextPage({ page, totalPages }) || isLoadingMore) return;

        set({ isLoadingMore: true });
        try {
          const nextPage = page + 1;
          const result = await reviewApi.getList(productId, { page: nextPage, size: get().size });
          set({
            items: [...get().items, ...result.items],
            page: result.page,
            total: result.total,
            totalPages: result.totalPages,
            isLoadingMore: false,
          });
        } finally {
          set({ isLoadingMore: false });
        }
      },

      create: async (productId: string, payload: { rating: number; text?: string }) => {
        set({ isSubmitting: true });
        try {
          const response = await reviewApi.create(productId, payload);
          const mine = toMyReview(response);
          set({ mine: new Map([...get().mine, [productId, mine]]) });
          get().persist();
          return mine;
        } finally {
          set({ isSubmitting: false });
        }
      },

      update: async (productId: string, payload: { rating?: number; text?: string }) => {
        const existing = get().mine.get(productId);
        if (!existing) throw new Error('No local review to update');

        set({ isSubmitting: true });
        try {
          const response = await reviewApi.update(existing.id, payload);
          const mine = toMyReview(response);
          set({
            mine: new Map([...get().mine, [productId, mine]]),
            items: get().items.map((item) =>
              item.id === mine.id ? { ...item, rating: mine.rating, text: mine.text } : item
            ),
          });
          get().persist();
          return mine;
        } finally {
          set({ isSubmitting: false });
        }
      },

      remove: async (productId: string) => {
        const existing = get().mine.get(productId);
        if (!existing) return;

        set({ pendingDeleteIds: new Set([...get().pendingDeleteIds, productId]) });
        try {
          await reviewApi.remove(existing.id);
          const newMine = new Map(get().mine);
          newMine.delete(productId);
          set({
            mine: newMine,
            items: get().items.filter((item) => item.id !== existing.id),
            total: Math.max(0, get().total - 1),
            pendingDeleteIds: new Set([...get().pendingDeleteIds].filter((id) => id !== productId)),
          });
          get().persist();
        } finally {
          set({ pendingDeleteIds: new Set([...get().pendingDeleteIds].filter((id) => id !== productId)) });
        }
      },

      forget: (productId: string) => {
        if (!get().mine.has(productId)) return;
        const newMine = new Map(get().mine);
        newMine.delete(productId);
        set({ mine: newMine });
        get().persist();
      },

      reset: () => {
        const { cacheKey } = get();
        if (cacheKey) {
          kvStorage.delete(cacheKey);
        }
        set({
          cacheKey: null,
          mine: new Map(),
          items: [],
          productId: null,
          page: 0,
          total: 0,
          totalPages: 0,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          isSubmitting: false,
          pendingDeleteIds: new Set(),
        });
      },

      persist: () => {
        const { cacheKey, mine } = get();
        if (cacheKey) {
          kvStorage.setString(cacheKey, JSON.stringify([...mine.values()]));
        }
      },
    }),
    {
      name: 'reviews-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        mine: Array.from(state.mine.entries()),
        cacheKey: state.cacheKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.mine = new Map(state.mine);
        }
      },
    }
  )
);