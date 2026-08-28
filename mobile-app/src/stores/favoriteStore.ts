import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { kvStorage } from '@shared/lib/storage/kv-storage';
import { STORAGE_KEYS } from '@shared/lib/storage/storage-keys';
import { favoriteApi } from '../entities/favorite/api/favorite.api';
import { DEFAULT_PAGE_SIZE, FAVORITES_SYNC, hasNextPage } from '@shared/lib';

import type { FavoriteProduct } from '../entities/favorite/model/types';

const LIST_PAGE_SIZE = DEFAULT_PAGE_SIZE;
const { SIZE: SYNC_SIZE, MAX_PAGES: MAX_SYNC_PAGES } = FAVORITES_SYNC;

function parseCachedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

interface FavoriteState {
  items: FavoriteProduct[];
  page: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pendingIds: Set<string>;
  favoriteIds: Set<string>;
  cacheKey: string | null;
  isSyncing: boolean;

  hasMore: boolean;
  count: number;

  has: (productId: string) => boolean;
  isPending: (productId: string) => boolean;

  init: (userId: string) => void;
  fetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  reset: () => void;

  reconcile: (ids: string[]) => void;
  fullSync: () => Promise<void>;
  persistIds: () => void;
}

const storage: StateStorage = {
  getItem: async (name: string) => {
    if (name === 'favorites-storage') {
      const cacheKey = kvStorage.getString('favorites.cacheKey');
      if (!cacheKey) return null;
      const ids = parseCachedIds(kvStorage.getString(cacheKey));
      return JSON.stringify({ state: { favoriteIds: ids, cacheKey } });
    }
    return null;
  },
  setItem: async (name: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state) {
        if (parsed.state.favoriteIds && parsed.state.cacheKey) {
          kvStorage.setString(parsed.state.cacheKey, JSON.stringify(parsed.state.favoriteIds));
        }
      }
    } catch {}
  },
  removeItem: async (name: string) => {
    if (name === 'favorites-storage') {
      const cacheKey = kvStorage.getString('favorites.cacheKey');
      if (cacheKey) kvStorage.delete(cacheKey);
      kvStorage.delete('favorites.cacheKey');
    }
  },
};

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      items: [],
      page: 0,
      total: 0,
      totalPages: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      pendingIds: new Set(),
      favoriteIds: new Set(),
      cacheKey: null,
      isSyncing: false,

      get hasMore() {
        return hasNextPage({ page: get().page, totalPages: get().totalPages });
      },

      get count() {
        return get().favoriteIds.size;
      },

      has: (productId: string) => get().favoriteIds.has(productId),

      isPending: (productId: string) => get().pendingIds.has(productId),

      init: (userId: string) => {
        const cacheKey = STORAGE_KEYS.favoritesIds(userId);
        const cachedIds = parseCachedIds(kvStorage.getString(cacheKey));
        set({ cacheKey, favoriteIds: new Set(cachedIds) });
        get().fullSync();
      },

      fetch: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await favoriteApi.getList({ page: 0, size: LIST_PAGE_SIZE });
          set({
            items: result.items,
            page: result.page,
            total: result.total,
            totalPages: result.totalPages,
            isLoading: false,
          });
          get().reconcile(result.items.map((item) => item.id));
        } catch {
          set({ error: 'favorites_load_failed', isLoading: false });
        }
      },

      fetchMore: async () => {
        const { hasMore, isLoadingMore } = get();
        if (!hasMore || isLoadingMore) return;

        set({ isLoadingMore: true });
        try {
          const nextPage = get().page + 1;
          const result = await favoriteApi.getList({ page: nextPage, size: LIST_PAGE_SIZE });
          set({
            items: [...get().items, ...result.items],
            page: result.page,
            total: result.total,
            totalPages: result.totalPages,
            isLoadingMore: false,
          });
          get().reconcile(result.items.map((item) => item.id));
        } finally {
          set({ isLoadingMore: false });
        }
      },

      toggle: async (productId: string) => {
        const willBeFavorite = !get().favoriteIds.has(productId);
        const previousItems = get().items;
        const previousIds = new Set(get().favoriteIds);

        set({
          pendingIds: new Set([...get().pendingIds, productId]),
          favoriteIds: willBeFavorite
            ? new Set([...get().favoriteIds, productId])
            : new Set([...get().favoriteIds].filter((id) => id !== productId)),
          items: willBeFavorite
            ? previousItems
            : previousItems.filter((item) => item.id !== productId),
        });

        try {
          if (willBeFavorite) {
            await favoriteApi.add(productId);
          } else {
            await favoriteApi.remove(productId);
          }
          get().persistIds();
        } catch (e) {
          set({ favoriteIds: previousIds, items: previousItems });
          throw e;
        } finally {
          set({ pendingIds: new Set([...get().pendingIds].filter((id) => id !== productId)) });
        }
      },

      reset: () => {
        const { cacheKey } = get();
        if (cacheKey) {
          kvStorage.delete(cacheKey);
        }
        set({
          cacheKey: null,
          items: [],
          page: 0,
          total: 0,
          totalPages: 0,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          favoriteIds: new Set(),
          pendingIds: new Set(),
          isSyncing: false,
        });
      },

      reconcile: (ids: string[]) => {
        const newFavoriteIds = new Set([...get().favoriteIds, ...ids]);
        set({ favoriteIds: newFavoriteIds });
        get().persistIds();
      },

      fullSync: async () => {
        const { cacheKey, isSyncing } = get();
        if (!cacheKey || isSyncing) return;

        set({ isSyncing: true });
        try {
          const ids: string[] = [];
          let page = 0;
          let totalPages = 1;

          while (page < Math.min(totalPages, MAX_SYNC_PAGES)) {
            const result = await favoriteApi.getList({ page, size: SYNC_SIZE });
            ids.push(...result.items.map((item) => item.id));
            totalPages = result.totalPages;
            page += 1;
          }

          set({ favoriteIds: new Set(ids) });
          get().persistIds();
        } catch {
        } finally {
          set({ isSyncing: false });
        }
      },

      persistIds: () => {
        const { cacheKey, favoriteIds } = get();
        if (cacheKey) {
          kvStorage.setString(cacheKey, JSON.stringify([...favoriteIds]));
        }
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        favoriteIds: Array.from(state.favoriteIds),
        cacheKey: state.cacheKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.favoriteIds = new Set(state.favoriteIds);
        }
      },
    }
  )
);