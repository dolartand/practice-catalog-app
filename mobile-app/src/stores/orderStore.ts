import { create } from 'zustand';
import { orderApi } from '../entities/order/api/order.api';
import type { CreateOrderRequest, Order, OrderStatus } from '../entities/order/model/types';
import { DEFAULT_PAGE_SIZE } from '@shared/lib/constants';
import { hasNextPage } from '@shared/lib/pagination';

export type { Order, OrderStatus };
export { ORDER_STATUS_COLOR_KEY } from '../entities/order/lib/order-status';

const ACTIVE_STATUSES: OrderStatus[] = ['NEW', 'CONFIRMED'];

interface OrderState {
  items: Order[];
  page: number;
  size: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  byId: Map<string, Order>;

  activeOrders: Order[];
  pastOrders: Order[];
  hasMore: boolean;

  fetchList: () => Promise<void>;
  fetchMore: () => Promise<void>;
  fetchOne: (id: string) => Promise<Order>;
  getCachedById: (id: string) => Order | undefined;
  create: (payload: CreateOrderRequest) => Promise<Order>;
  cancel: (id: string) => Promise<Order>;
}

function cacheOrders(state: OrderState, orders: Order[]) {
  const newById = new Map(state.byId);
  orders.forEach((order) => newById.set(order.id, order));
  return newById;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  items: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  byId: new Map(),

  get activeOrders() {
    return get().items.filter((order) => ACTIVE_STATUSES.includes(order.status));
  },

  get pastOrders() {
    return get().items.filter((order) => !ACTIVE_STATUSES.includes(order.status));
  },

  get hasMore() {
    return hasNextPage({ page: get().page, totalPages: get().totalPages });
  },

  fetchList: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await orderApi.getList({ page: 0, size: get().size });
      set({
        items: result.items,
        page: result.page,
        totalPages: result.totalPages,
        isLoading: false,
        byId: cacheOrders(get(), result.items),
      });
    } catch {
      set({ error: 'orders_load_failed', isLoading: false });
    }
  },

  fetchMore: async () => {
    const { hasMore, isLoadingMore } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const nextPage = get().page + 1;
      const result = await orderApi.getList({ page: nextPage, size: get().size });
      set({
        items: [...get().items, ...result.items],
        page: result.page,
        isLoadingMore: false,
        byId: cacheOrders(get(), result.items),
      });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  fetchOne: async (id: string) => {
    const order = await orderApi.getById(id);
    set({ byId: new Map([...get().byId, [id, order]]) });
    return order;
  },

  getCachedById: (id: string) => get().byId.get(id),

  create: async (payload: CreateOrderRequest) => {
    const order = await orderApi.create(payload);
    set({
      items: [order, ...get().items],
      byId: new Map([...get().byId, [order.id, order]]),
    });
    return order;
  },

  cancel: async (id: string) => {
    const order = await orderApi.cancel(id);
    set({
      byId: new Map([...get().byId, [id, order]]),
      items: get().items.map((item) => (item.id === id ? order : item)),
    });
    return order;
  },
}));