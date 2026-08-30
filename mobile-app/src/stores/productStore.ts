import { create } from 'zustand';
import { productApi } from '../entities/product/api/product.api';
import { resolveSkuPrice } from '../entities/product/lib/resolve-sku-price';
import type { Product, ProductListItem, ProductSku, ProductListParams } from '../entities/product/model/types';
import { DEFAULT_PAGE_SIZE, hasNextPage } from '@shared/lib';

export type { Product, ProductListItem, ProductSku };
export { resolveSkuPrice };

interface ProductState {
  items: ProductListItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastParams: ProductListParams;
  byId: Map<string, Product>;

  fetchList: (params?: ProductListParams) => Promise<void>;
  fetchMore: () => Promise<void>;
  fetchOne: (id: string) => Promise<Product>;
  getCachedById: (id: string) => Product | undefined;
  invalidateCached: (id: string) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  items: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  lastParams: {},
  byId: new Map(),

  fetchList: async (params: ProductListParams = {}) => {
    set({ isLoading: true, error: null, lastParams: params });
    try {
      const result = await productApi.getList({ ...params, page: 0, size: get().size });
      set({
        items: result.items,
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch {
      set({ error: 'catalog_load_failed', isLoading: false });
    }
  },

  fetchMore: async () => {
    const { page, totalPages, isLoadingMore } = get();
    if (!hasNextPage({ page, totalPages }) || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const nextPage = page + 1;
      const result = await productApi.getList({ ...get().lastParams, page: nextPage, size: get().size });
      set({
        items: [...get().items, ...result.items],
        page: result.page,
        totalPages: result.totalPages,
        isLoadingMore: false,
      });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  fetchOne: async (id: string) => {
    const cached = get().byId.get(id);
    if (cached) return cached;

    const product = await productApi.getById(id);
    set({ byId: new Map([...get().byId, [id, product]]) });
    return product;
  },

  getCachedById: (id: string) => get().byId.get(id),

  invalidateCached: (id: string) => {
    const newById = new Map(get().byId);
    newById.delete(id);
    set({ byId: newById });
  },
}));